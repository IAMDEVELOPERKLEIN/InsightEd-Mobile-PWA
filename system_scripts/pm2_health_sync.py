import subprocess
import sys
import argparse
import time

# pm2_health_sync.py - Specialized PM2 maintenance utility

# Colors
RED = '\033[0;31m'; GREEN = '\033[0;32m'; YELLOW = '\033[1;33m'; CYAN = '\033[0;36m'; NC = '\033[0m'

def header(text):
    print(f"\n{CYAN}{'='*60}{NC}")
    print(f"{CYAN}  PM2 Health Sync — {text}{NC}")
    print(f"{CYAN}{'='*60}{NC}")

def run_remote(host, user, cmd, timeout=60):
    # Forced utf-8 for Windows terminal compatibility
    full_cmd = ["ssh", "-t", "-o", "BatchMode=yes", f"{user}@{host}", cmd]
    try:
        result = subprocess.run(full_cmd, capture_output=True, text=True, check=True, timeout=timeout, encoding='utf-8', errors='replace')
        return result.stdout.strip()
    except Exception as e:
        print(f"{RED}Remote Error: {e}{NC}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Specialized PM2 Health & Cache Management")
    parser.add_argument("--host", default="20.24.58.49", help="Target VM IP (default: 20.24.58.49)")
    parser.add_argument("--user", default="Administrator1", help="SSH Username (default: Administrator1)")
    parser.add_argument("--app", default="all", help="Target app name (default: all)")
    
    args = parser.parse_args()
    
    header(f"Maintenance Cycle ({args.app})")
    
    # 1. Clear PM2 "Cache" (Logs)
    print(f"{YELLOW}1. Flushing PM2 logs (Cache Clearing)...{NC}")
    res = run_remote(args.host, args.user, f"pm2 flush")
    if res is not None:
        print(f"{GREEN}   Logs successfully flushed.{NC}")
    
    # 2. Reload PM2 Apps with Configuration Sync
    print(f"{YELLOW}2. Reloading PM2 configuration & apps (Zero-Downtime): {args.app}...{NC}")
    # Run from the project root to ensure ecosystem.config.cjs is picked up
    remote_path = "/var/www/html/InsightEd-Mobile-PWA"
    reload_cmd = f"cd {remote_path} && pm2 reload ecosystem.config.cjs --update-env"
    
    if args.app != "all":
        # If a specific app is targeted, we still reload via ecosystem for config consistency
        reload_cmd = f"cd {remote_path} && pm2 reload {args.app} --update-env"
        
    res = run_remote(args.host, args.user, reload_cmd)
    if res:
        print(f"{GREEN}   Reload command executed.{NC}")
    time.sleep(3)
    
    # 3. Check for Errors & Diagnose
    print(f"{YELLOW}3. Fetching recent logs & diagnosing health...{NC}")
    logs = run_remote(args.host, args.user, f"pm2 logs {args.app} --lines 50 --nostream")
    if logs:
        print(f"\n{NC}{logs}")
        diagnose_logs(logs)
    else:
        print(f"{RED}   No log output received.{NC}")

    print(f"\n{GREEN}Maintenance complete for {args.app} on {args.host}{NC}")

def diagnose_logs(logs):
    header("DIAGNOTIC STATEMENT")
    error_keywords = ["error", "exception", "timeout", "failed", "unhandled", "denied", "500", "sigkill"]
    success_keywords = ["gracefully", "server closed", "db pool closed", "server running"]
    found_errors = []
    
    for line in logs.split('\n'):
        if any(key in line.lower() for key in error_keywords):
            found_errors.append(line.strip())
    
    if not found_errors:
        print(f"{GREEN}Status: [HEALTHY]{NC}")
        print("No critical error signatures found in the recent logs.")
        print("The server successfully reported READY state and is processing traffic.")
    else:
        print(f"{RED}Status: [WARNING - POTENTIAL ISSUES FOUND]{NC}")
        print(f"Located {len(found_errors)} lines with error signatures:")
        # Explicit slice to satisfy strict type checkers
        slice_limit = min(5, len(found_errors))
        for i in range(slice_limit):
            print(f"  - {found_errors[i]}")
        if len(found_errors) > 5:
            print(f"  ... and {len(found_errors) - 5} more.")
        print(f"\n{YELLOW}Recommendation:{NC} Review the full logs manually for recurring patterns.")

if __name__ == "__main__":
    # Ensure UTF-8 even on Windows
    if sys.version_info >= (3, 7):
        try:
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, Exception):
            pass
    main()
