#!/usr/bin/env python3
# =============================================================================
# nginx_concurrency_control.py — InsightEd Full-Stack Orchestrator
# Supports local execution (Linux) or Remote execution (Windows/Linux -> VM).
# =============================================================================

import argparse
import subprocess
import os
import time
import sys

# Colors
RED = '\033[0;31m'; GREEN = '\033[0;32m'; YELLOW = '\033[1;33m'; CYAN = '\033[0;36m'; NC = '\033[0m'

# Paths (local repository relative)
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP_NGINX_CONF = os.path.join(ROOT_DIR, "tmp_nginx.conf")
TMP_STRIDE_CONF = os.path.join(ROOT_DIR, "tmp_stride.conf")

# Remote Server Paths
REMOTE_CACHE_DIR = "/var/cache/nginx/binary_cache"
REMOTE_NGINX_CONF = "/etc/nginx/nginx.conf"
REMOTE_STRIDE_CONF = "/etc/nginx/sites-enabled/stride.conf"

class Orchestrator:
    def __init__(self, host=None, user=None):
        self.host = host
        self.user = user
        self.is_remote = host is not None
        
        if not self.is_remote and os.name == 'nt':
            print(f"{RED}ERROR: Local execution is not possible on Windows.{NC}")
            print(f"{YELLOW}Please provide a target host:  --host 20.24.58.49{NC}")
            sys.exit(1)

    def run(self, cmd, sudo=False, capture=True, timeout=None):
        if sudo:
            # -n: Non-interactive, fails if password is required
            cmd = f"sudo -n {cmd}"
        
        if self.is_remote:
            # -t: Force pseudo-tty, which sudo often requires
            full_cmd = ["ssh", "-t", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", f"{self.user}@{self.host}", cmd]
        else:
            full_cmd = cmd if isinstance(cmd, list) else cmd.split()
            
        try:
            # Use provided timeout, or default to 15s for sysctl and 60s for others
            if timeout is None:
                timeout = 15 if "sysctl" in cmd else 60
                
            # Explicitly use utf-8 to handle PM2's special characters on Windows
            result = subprocess.run(full_cmd, capture_output=capture, text=True, check=True, timeout=timeout, encoding='utf-8', errors='replace')
            
            if capture:
                return (result.stdout or "").strip()
            return "Success"
            
        except subprocess.TimeoutExpired:
            print(f"{RED}Command timed out ({timeout}s): {cmd}{NC}")
            return None
        except subprocess.CalledProcessError:
            # Error details are often in stderr if captured
            return None
        except Exception as e:
            print(f"{RED}Unexpected error: {e}{NC}")
            return None

    def upload(self, local_path, remote_path):
        if not self.is_remote:
            return os.path.exists(local_path)
            
        try:
            subprocess.run(["scp", "-o", "ConnectTimeout=10", "-q", local_path, f"{self.user}@{self.host}:{remote_path}"], check=True, timeout=60)
            return True
        except subprocess.TimeoutExpired:
            print(f"{RED}Upload timed out (60s): {local_path}{NC}")
            return False
        except subprocess.CalledProcessError:
            print(f"{RED}Failed to upload {local_path} to {remote_path}{NC}")
            return False

def header(text):
    print(f"{CYAN}========================================================{NC}")
    print(f"{CYAN}  InsightEd Orchestrator — {text}{NC}")
    print(f"{CYAN}========================================================{NC}")

def harden_system(orc):
    header("Harden: OS-level TCP Tuning")
    print(f"{YELLOW}Applying aggressive kernel parameters...{NC}")
    
    tweaks = [
        "fs.file-max=2097152",
        "net.core.somaxconn=65535",
        "net.ipv4.tcp_max_syn_backlog=65535",
        "net.ipv4.ip_local_port_range='1024 65535'",
        "net.ipv4.tcp_tw_reuse=1",
        "net.ipv4.tcp_fin_timeout=15",
        "net.ipv4.tcp_slow_start_after_idle=0",
        "net.core.netdev_max_backlog=16384"
    ]
    
    for tweak in tweaks:
        print(f"Set {tweak:35} -> ", end="", flush=True)
        if orc.run(f"sysctl -w {tweak}", sudo=True):
            print(f"{GREEN}OK{NC}")
        else:
            print(f"{RED}FAILED/SKIPPED{NC}")
    
    print(f"{GREEN}Hardening phase complete.{NC}")

def heavy_purge(orc):
    header("Purge: Active Socket Termination")
    print(f"{RED}DANGER: Terminating all established connections on 80/443...{NC}")
    
    res = orc.run("ss -K dport = :80 or dport = :443", sudo=True)
    if res:
        print(f"{GREEN}Heavy socket purge complete.{NC}")
    else:
        print(f"{YELLOW}ss -K failed. Restarting Nginx binary...{NC}")
        orc.run("systemctl restart nginx", sudo=True)

def pm2_manage(orc, restart=False, show_logs=False, app_name="all"):
    action = "Restart & Logs" if restart else "Logs"
    header(f"PM2: {action} ({app_name})")
    
    if restart:
        print(f"{YELLOW}Restarting PM2 application: {app_name}...{NC}")
        orc.run(f"pm2 restart {app_name}", sudo=False)
        time.sleep(2)
        
    if show_logs:
        print(f"{YELLOW}Fetching latest logs for {app_name}...{NC}")
        logs = orc.run(f"pm2 logs {app_name} --lines 50 --nostream", sudo=False)
        if logs:
            print(logs)
        else:
            print(f"{RED}No logs found or PM2 unreachable.{NC}")

def pg_manage(orc, status=False, purge=False, optimize=False, db="stride_prod"):
    header(f"Postgres: Management ({db})")
    
    if status:
        print(f"{YELLOW}Auditing connection pool...{NC}")
        query = "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
        res = orc.run(f"sudo -u postgres psql -d {db} -c \"{query}\"")
        if res: print(res)

    if purge:
        print(f"{RED}Terminating idle database connections...{NC}")
        query = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND usename != 'postgres';"
        orc.run(f"sudo -u postgres psql -d {db} -c \"{query}\"")
        print(f"{GREEN}Idle connections cleared.{NC}")

    if optimize:
        print(f"{YELLOW}Running VACUUM ANALYZE (Bloat Reduction)...{NC}")
        orc.run(f"sudo -u postgres psql -d {db} -c \"VACUUM ANALYZE;\"", timeout=300)
        print(f"{GREEN}Database optimization complete.{NC}")

def main():
    parser = argparse.ArgumentParser(description="InsightEd Full-Stack Maintenance Orchestrator")
    parser.add_argument("--host", default=None, help="Target Linux VM IP")
    parser.add_argument("--user", default="Administrator1", help="SSH Username")
    parser.add_argument("--db", default="stride_prod", help="Target Postgres Database name")
    
    parser.add_argument("--status", action="store_true", help="Show system health (Nginx + Postgres)")
    parser.add_argument("--purge-cache", action="store_true", help="Clear Nginx binary cache")
    parser.add_argument("--purge-connections", action="store_true", help="Gracefully cycle Nginx workers")
    parser.add_argument("--pool", action="store_true", help="Apply Nginx keepalive/locking configs")
    parser.add_argument("--harden", action="store_true", help="Apply aggressive TCP tuning")
    parser.add_argument("--heavy-purge", action="store_true", help="Nuclear: Kill all active 80/443 sockets")
    parser.add_argument("--pm2", action="store_true", help="Restart PM2 apps and show logs")
    parser.add_argument("--pg-purge", action="store_true", help="Kill idle Postgres backends")
    parser.add_argument("--pg-optimize", action="store_true", help="Run Postgres VACUUM ANALYZE")
    parser.add_argument("--all", action="store_true", help="Full stacked maintenance cycle")
    
    args = parser.parse_args()
    orc = Orchestrator(host=args.host, user=args.user)

    run_all = getattr(args, 'all', False)
    do_harden = getattr(args, 'harden', False)
    do_heavy = getattr(args, 'heavy_purge', False)
    do_pool = getattr(args, 'pool', False)
    do_status = getattr(args, 'status', False)
    do_purge_cache = getattr(args, 'purge_cache', False)
    do_purge_conn = getattr(args, 'purge_connections', False)
    do_pm2 = getattr(args, 'pm2', False)
    do_pg_purge = getattr(args, 'pg_purge', False)
    do_pg_opt = getattr(args, 'pg_optimize', False)

    if args.host or run_all:
        orc.run("rm -f /etc/nginx/sites-enabled/*.bak.*", sudo=True)

    if not any([do_status, do_purge_cache, do_purge_conn, do_pool, do_harden, do_heavy, do_pm2, do_pg_purge, do_pg_opt, run_all]):
        print(f"{YELLOW}No action specified. Defaulting to --all...{NC}")
        run_all = True

    target_label = f"Remote: {args.host}" if args.host else "Local"

    if run_all or do_harden:
        harden_system(orc)

    if run_all or do_pool:
        header(f"Pool: Apply Optimizations ({target_label})")
        if not os.path.exists(TMP_NGINX_CONF) or not os.path.exists(TMP_STRIDE_CONF):
            print(f"{RED}Error: Local templates missing.{NC}")
        else:
            ts = int(time.time()); orc.run("mkdir -p ~/nginx_backups", sudo=False)
            orc.run(f"cp {REMOTE_NGINX_CONF} ~/nginx_backups/nginx.conf.bak.{ts}", sudo=True)
            orc.run(f"cp {REMOTE_STRIDE_CONF} ~/nginx_backups/stride.conf.bak.{ts}", sudo=True)
            if orc.upload(TMP_NGINX_CONF, "/tmp/nginx.conf.tmp") and orc.upload(TMP_STRIDE_CONF, "/tmp/stride.conf.tmp"):
                orc.run(f"cp /tmp/nginx.conf.tmp {REMOTE_NGINX_CONF}", sudo=True)
                orc.run(f"cp /tmp/stride.conf.tmp {REMOTE_STRIDE_CONF}", sudo=True)
                if orc.run("nginx -t", sudo=True) is not None:
                    orc.run("systemctl reload nginx", sudo=True)
                    print(f"{GREEN}Nginx optimizations applied.{NC}")

    if run_all or do_purge_cache:
        header(f"Purge: Binary Cache")
        size_out = orc.run(f"du -sh {REMOTE_CACHE_DIR}", sudo=True)
        if size_out and isinstance(size_out, str):
            orc.run(f"rm -rf {REMOTE_CACHE_DIR}/*", sudo=True)
            print(f"{GREEN}Cache successfully purged.{NC}")

    if run_all or do_purge_conn:
        header(f"Purge: Dead Connections")
        if orc.run("nginx -s reload", sudo=True) is not None:
            print(f"{GREEN}Nginx workers cycled.{NC}")

    if run_all or do_pg_purge:
        pg_manage(orc, purge=True, db=args.db)

    if run_all or do_pg_opt:
        pg_manage(orc, optimize=True, db=args.db)

    if do_heavy:
        heavy_purge(orc)

    if run_all or do_pm2:
        pm2_manage(orc, restart=True, show_logs=True)

    if run_all or do_status:
        header(f"Status Report")
        status = orc.run("curl -sk https://127.0.0.1/nginx_status", sudo=True)
        if status: print(status)
        pg_manage(orc, status=True, db=args.db)

if __name__ == "__main__":
    main()
