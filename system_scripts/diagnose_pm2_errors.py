#!/usr/bin/env python3
"""
InsightEd PM2 Log Analyzer & Diagnostic Tool (v1.0)
Analyzes PM2 logs to identify infrastructure-related failures (VM, Storage, Postgres).
"""
import sys
import os
import re
import subprocess
import argparse
import time as pytime
from datetime import datetime

# Ensure stdout handles emojis on Windows terminals
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# --- Configuration Patterns ---

DIAGNOSTIC_SIGNATURES = {
    "VM_RESOURCE_ISSUES": {
        "title": "🖥️  VM Configuration (CPU/RAM)",
        "patterns": [
            r"JavaScript heap out of memory",
            r"Ineffective mark-compacts near heap limit",
            r"ENOMEM",
            r"SIGKILL",  # Often indicates OOM killer
            r"Allocation failed - JavaScript heap out of memory"
        ],
        "description": "Indicates the VM instance is hitting memory limits or needs higher tier specs."
    },
    "STORAGE_ISSUES": {
        "title": "💾  Disk Storage (VM Space)",
        "patterns": [
            r"ENOSPC",
            r"No space left on device",
            r"Disk full",
            r"Failed to write to .*"
        ],
        "description": "Indicates the virtual machine disk partition is full."
    },
    "POSTGRES_STORAGE_ISSUES": {
        "title": "🐘  PostgreSQL Storage/Database",
        "patterns": [
            r"database is in read-only mode",
            r"could not extend file",
            r"could not write to file",
            r"code: '53100'",  # Postgres Disk Full
            r"code: '57P03'",  # Postgres cannot connect (recovery/shutdown)
            r"FATAL:  the database system is in recovery mode",
            r"pg_wal"
        ],
        "description": "Indicates issues with the database storage, WAL logs, or read-only status."
    },
    "CONNECTION_ISSUES": {
        "title": "🔌  Connection & Timeouts",
        "patterns": [
            r"timeout exceeded",
            r"timed out",
            r"ECONNREFUSED",
            r"ETIMEDOUT",
            r"504 Gateway Time-out",
            r"502 Bad Gateway",
            r"Login failed",
            r"Authentication failed",
            r"Connection terminated unexpectedly",
            r"Too many connections"
        ],
        "description": "Indicates network or authentication failures between services."
    }
}

# Remote Configuration (Inherited from Jarvis Protocol)
SERVER_IP = "20.24.58.49"
USER = "Administrator1"

def run_remote_command(command, timeout=30):
    """Executes a command via SSH on the remote server."""
    ssh_cmd = [
        "ssh", "-o", "StrictHostKeyChecking=no", "-o", "BatchMode=yes",
        "-o", "ConnectTimeout=10",
        f"{USER}@{SERVER_IP}", command
    ]
    try:
        # We capture bytes and decode manually to avoid charmap errors on Windows
        result = subprocess.run(ssh_cmd, capture_output=True, text=False, timeout=timeout)
        stdout = result.stdout.decode('utf-8', errors='ignore')
        stderr = result.stderr.decode('utf-8', errors='ignore')
        return stdout, stderr
    except subprocess.TimeoutExpired as e:
        e_stdout = e.stdout if e.stdout is not None else b""
        e_stderr = e.stderr if e.stderr is not None else b""
        stdout_str = e_stdout.decode('utf-8', errors='ignore')
        stderr_str = e_stderr.decode('utf-8', errors='ignore')
        err_msg = f"Timeout ({timeout}s) exceeded."
        if stderr_str:
            err_msg += f" Logs: {stderr_str}"
        return stdout_str, err_msg
    except Exception as e:
        return "", f"Error: {str(e)}"

def analyze_lines(lines):
    """Parses log lines and returns categorized findings."""
    report = {key: {"count": 0, "samples": []} for key in DIAGNOSTIC_SIGNATURES}
    
    for line in lines:
        for category, config in DIAGNOSTIC_SIGNATURES.items():
            for pattern in config["patterns"]:
                if re.search(pattern, line, re.IGNORECASE):
                    report[category]["count"] += 1
                    if len(report[category]["samples"]) < 3:
                        report[category]["samples"].append(line.strip())
                    break
    return report

# Thresholds for Health Protocol
THRESHOLDS = {
    "RAM_YELLOW": 80.0,
    "RAM_RED": 95.0,
    "DISK_YELLOW": 80.0,
    "DISK_RED": 95.0,
    "CPU_YELLOW": 70.0,
    "LATENCY_YELLOW": 500, # ms (Reduced for better sensitivity to DB slowness)
    "LATENCY_RED": 2000     # ms
}

def get_system_vitals():
    """Fetches real-time system metrics via SSH."""
    # Initialize vitals with explicit types to satisfy Pyre
    vitals = {
        "cpu": {"val": 0.0, "status": "GREEN", "desc": "N/A"},
        "ram": {"val": 0.0, "status": "GREEN", "desc": "N/A"},
        "disk": {"val": 0.0, "status": "GREEN", "desc": "N/A"},
        "db": {"size": "N/A", "status": "GREEN", "latency": 0, "sessions": "0", "desc": "N/A"},
        "web_users": {"val": 0, "status": "GREEN"}
    }
    
    # 1. CPU (Load/Usage)
    stdout, _ = run_remote_command("top -bn1 | grep 'Cpu(s)' | awk '{print $2 + $4}'")
    try:
        vitals["cpu"]["val"] = float(stdout.strip())
        if vitals["cpu"]["val"] > THRESHOLDS["CPU_YELLOW"]:
            vitals["cpu"]["status"] = "YELLOW"
    except: pass

    # 2. RAM (Robust Regex)
    stdout, _ = run_remote_command("free -m")
    try:
        match = re.search(r"Mem:\s+(\d+)\s+(\d+)", stdout)
        if match:
            total, used = int(match.group(1)), int(match.group(2))
            pct = (used / total) * 100
            vitals["ram"]["val"] = pct
            vitals["ram"]["desc"] = f"{used}MB / {total}MB"
            if pct > THRESHOLDS["RAM_RED"]: vitals["ram"]["status"] = "RED"
            elif pct > THRESHOLDS["RAM_YELLOW"]: vitals["ram"]["status"] = "YELLOW"
    except: pass

    # 3. Disk (Robust POSIX parsing)
    stdout, _ = run_remote_command("df -Ph /")
    try:
        # Use POSIX format (-P) to ensure 1 line per filesystem
        lines = stdout.splitlines()
        for line in lines[1:]: # Skip header
            parts = line.split()
            if len(parts) >= 6 and (parts[5] == "/" or parts[5].endswith("/")):
                pct_str = parts[4].replace("%", "")
                avail = parts[3]
                total_size = parts[1]
                
                vitals["disk"]["val"] = float(pct_str)
                vitals["disk"]["desc"] = f"{avail} free of {total_size}"
                if vitals["disk"]["val"] > THRESHOLDS["DISK_RED"]: vitals["disk"]["status"] = "RED"
                elif vitals["disk"]["val"] > THRESHOLDS["DISK_YELLOW"]: vitals["disk"]["status"] = "YELLOW"
                break
    except Exception as e:
        vitals["disk"]["desc"] = f"Error: {str(e)}"

    # 4. DB Size & Latency & Active Sessions (Consolidated Query)
    ENV_PATH = "/var/www/html/InsightEd-Mobile-PWA/.env"
    
    # We use current_database() to avoid hardcoding naming, and count active sessions
    cmd = f"DB_URL=$(grep DATABASE_URL {ENV_PATH} | cut -d '=' -f2 | sed 's/\"//g'); " \
          f"psql -Atc \"SELECT pg_size_pretty(pg_database_size(current_database())), (SELECT count(*) FROM pg_stat_activity WHERE state = 'active');\" $DB_URL"
    
    start = pytime.time()
    stdout, stderr = run_remote_command(cmd)
    end = pytime.time()
    
    if stdout:
        parts = stdout.strip().split('|')
        if len(parts) >= 2:
            vitals["db"]["size"] = parts[0].strip()
            vitals["db"]["sessions"] = parts[1].strip()
    else:
        vitals["db"]["size"] = "Error"
        vitals["db"]["desc"] = stderr.strip()[:100]
        vitals["db"]["status"] = "RED" # Explicitly flag errors as RED
    
    vitals["db"]["latency"] = int((end - start) * 1000)
    # Only update status for high latency if it's not already flagged as RED due to connection error
    if vitals["db"]["status"] != "RED":
        if vitals["db"]["latency"] > THRESHOLDS["LATENCY_RED"]:
            vitals["db"]["status"] = "RED"
        elif vitals["db"]["latency"] > THRESHOLDS["LATENCY_YELLOW"]:
            vitals["db"]["status"] = "YELLOW"

    # 5. Concurrent Web Users (TCP connections on 80/443)
    stdout, _ = run_remote_command("netstat -an | grep -E ':80|:443' | grep ESTABLISHED | wc -l")
    try:
        vitals["web_users"]["val"] = int(stdout.strip())
    except:
        vitals["web_users"]["val"] = 0

    return vitals

def print_audit_report(report, source_name, vitals=None):
    print("\n" + "="*70)
    print(f"📊 SYSTEM HEALTH & DIAGNOSTIC AUDIT: {source_name}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)

    # Vitals Section (Profound Analysis)
    if vitals:
        print("\n#### 🖥️  Infrastructure Vitals")
        
        # Determine overall vibe
        statuses = [vitals["cpu"]["status"], vitals["ram"]["status"], vitals["disk"]["status"], vitals["db"]["status"]]
        overall = "RED" if "RED" in statuses else ("YELLOW" if "YELLOW" in statuses else "GREEN")
        
        vibe = "🚀 OPTIMAL"
        if vitals["db"]["size"] == "Error":
            vibe = "❌ DATABASE DOWN / CONNECTION ERROR"
        elif vitals["db"]["status"] == "RED":
            vibe = "🐌 SLUGGING (Critical Latency)"
        elif vitals["db"]["status"] == "YELLOW":
            vibe = "⚠️  SLUGGISH (High Latency)"
        elif overall == "YELLOW":
            vibe = "⚠️  DEGRADED"
        elif overall == "RED":
            vibe = "🔥 CRITICAL"
        
        print(f"* **Overall Performance:** {vibe}")
        print(f"* **CPU Usage:**     {vitals['cpu']['val']}% [{vitals['cpu']['status']}]")
        print(f"* **Memory (RAM):**  {vitals['ram']['val']:.1f}% ({vitals['ram']['desc']}) [{vitals['ram']['status']}]")
        print(f"* **Disk Storage:**  {vitals['disk']['val']}% used ({vitals['disk']['desc']}) [{vitals['disk']['status']}]")
        print(f"* **Postgres DB:**   {vitals['db']['size']} (Round-trip: {vitals['db']['latency']}ms) [{vitals['db']['status']}]")
        
        print("\n#### 👥 Real-time Activity")
        print(f"* **Concurrent Users (Web):** {vitals['web_users']['val']} established connections")
        print(f"* **Active DB Sessions:**     {vitals['db']['sessions']} sessions")
        
        # Bottleneck Prediction
        print("\n#### 🔮 Bottleneck Analysis")
        bottlenecks = []
        if vitals["db"]["status"] != "GREEN":
            bottlenecks.append(f"Postgres Latency ({vitals['db']['latency']}ms)")
        if vitals["ram"]["status"] != "GREEN":
            bottlenecks.append(f"Memory (RAM) @ {vitals['ram']['val']:.1f}%")
        if vitals["disk"]["status"] != "GREEN":
            bottlenecks.append(f"Storage (Disk) @ {vitals['disk']['val']}%")
        if vitals["cpu"]["status"] != "GREEN":
            bottlenecks.append(f"Compute (CPU) @ {vitals['cpu']['val']}%")
        
        if not bottlenecks:
            print("* No immediate bottlenecks detected. System is running within safety margins.")
        else:
            print(f"* **Current Bottlenecks:** {', '.join(bottlenecks)}")
            if vitals["db"]["status"] != "GREEN":
                print(f"* **Insight:** DB diagnostic round-trip of {vitals['db']['latency']}ms includes SSH and network overhead. If the app feels snappy, this is likely just infrastructure ping time.")

    # Errors Section
    print("\n#### 🔍 Log Error Signatures")
    found_errors = False
    for category, findings in report.items():
        if findings["count"] > 0:
            found_errors = True
            config = DIAGNOSTIC_SIGNATURES[category]
            print(f"\n{config['title']}")
            print(f"  Flags Found: {findings['count']}")
            # print(f"  Diagnosis:   {config['description']}")
            print("  Sample Entries:")
            for sample in findings["samples"]:
                print(f"    - {sample}")
        
    if not found_errors:
        print("\n✅ CLEAN LOGS: No fatal error patterns detected in PM2 logs.")
    
    print("\n" + "="*70)

def main():
    parser = argparse.ArgumentParser(description="InsightEd PM2 Log Analyzer")
    parser.add_argument("--file", help="Analyze a specific local log file")
    parser.add_argument("--env", choices=["staging", "production"], help="Analyze remote logs via SSH")
    parser.add_argument("--app", help="Process name (for --env mode)")
    parser.add_argument("--lines", type=int, default=200, help="Number of lines to fetch (default: 200)")
    parser.add_argument("--test-parsing", action="store_true", help="Run diagnostic parsing tests with mock data")

    args = parser.parse_args()
    
    if args.test_parsing:
        print("🧪 RUNNING DIAGNOSTIC PARSING TESTS...")
        # Mock run_remote_command
        global run_remote_command
        def mock_run(cmd):
            if "df -Ph /" in cmd:
                return "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        30G   20G  8.5G  71% /\n", ""
            if "psql" in cmd and "current_database" in cmd:
                return "1.2 GB | 14\n", ""
            if "free -m" in cmd:
                return "              total        used        free      shared  buff/cache   available\nMem:           8192        4096        2048         100        2048        4096\n", ""
            if "top" in cmd:
                return "15.5\n", ""
            if "netstat" in cmd:
                return "42\n", ""
            return "", ""
        
        run_remote_command = mock_run
        vitals = get_system_vitals()
        print_audit_report({}, "Mock Test Environment", vitals)
        return
        if not os.path.exists(args.file):
            print(f"Error: File {args.file} not found.")
            return
        with open(args.file, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
        report = analyze_lines(lines)
        print_audit_report(report, f"Local File: {args.file}")

    elif args.env:
        app_name = args.app or ("insighted-backend" if args.env == "production" else "insighted-staging")
        print(f"📡 Remote Audit Initialized for {args.env.upper()} ({app_name})...")
        
        vitals = get_system_vitals()
        cmd = f"pm2 logs {app_name} --lines {args.lines} --nostream"
        stdout, stderr = run_remote_command(cmd)
        
        if not stdout:
            print(f"❌ Failed to fetch remote logs: {stderr}")
            if vitals: # Still show vitals if logs fail
                 print_audit_report({}, f"Remote {args.env.upper()} (Vitals Only)", vitals)
            return
            
        lines = stdout.splitlines()
        report = analyze_lines(lines)
        print_audit_report(report, f"Remote {args.env.upper()} App: {app_name}", vitals)

    else:
        # Default behavior: Audit both environments
        print("🚀 AUTOMATIC PRO-LEVEL INFRASTRUCTURE AUDIT")
        print("="*70)
        
        envs = [
            ("staging", "insighted-staging"),
            ("production", "insighted-backend")
        ]
        
        for env_name, app_name in envs:
            print(f"\n📡 Auditing {env_name.upper()}...")
            vitals = get_system_vitals()
            cmd = f"pm2 logs {app_name} --lines {args.lines} --nostream"
            stdout, stderr = run_remote_command(cmd)
            
            if not stdout:
                print(f"⚠️  Could not fetch logs for {env_name}: {stderr.strip()}")
                if vitals:
                    print_audit_report({}, f"Remote {env_name.upper()} Port: {app_name} (Vitals Only)", vitals)
                continue
                
            lines = stdout.splitlines()
            report = analyze_lines(lines)
            print_audit_report(report, f"Remote {env_name.upper()} App: {app_name}", vitals)

if __name__ == "__main__":
    main()
