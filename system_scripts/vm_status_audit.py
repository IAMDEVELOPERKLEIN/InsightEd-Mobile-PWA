#!/usr/bin/env python3
"""
Jarvis Protocol: Infrastructure Oracle (v2.0)
Proactive status audit for InsightEd VM and Azure DB.
"""
import os
import sys
import math
import time
import psycopg2
from dotenv import load_dotenv

# Ensure stdout handles emojis on Windows terminals
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    import psutil
except ImportError:
    print("Warning: 'psutil' not found. Local VM diagnostics will be limited.")
    psutil = None

# Vibe: authoritative, proactive
DEBUG = os.getenv("JARVIS_VERBOSE", "false").lower() == "true"

# Thresholds for Status Protocol
CPU_THRESHOLD_YELLOW = 70.0
RAM_THRESHOLD_YELLOW = 85.0
DISK_THRESHOLD_YELLOW = 85.0
DISK_THRESHOLD_RED = 95.0

def format_size(size_bytes: int) -> str:
    """Convert bytes to human-readable units."""
    if size_bytes == 0: return "0B"
    size_name = ("B", "KB", "MB", "GB", "TB")
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_name[i]}"

def get_vm_stats():
    """Collect local VM telemetry using psutil."""
    stats = {
        'CPU': {'val': 0.0, 'status': 'GREEN'},
        'RAM': {'val': 0.0, 'status': 'GREEN', 'used': '0B', 'total': '0B'},
        'Disk': {'val': 0.0, 'status': 'GREEN', 'free': '0B', 'total': '0B', 'free_bytes': 0}
    }
    if not psutil:
        return stats
    
    # CPU Usage
    cpu_val = psutil.cpu_percent(interval=0.1)
    stats['CPU']['val'] = cpu_val
    if cpu_val > CPU_THRESHOLD_YELLOW:
        stats['CPU']['status'] = 'YELLOW'
        
    # RAM Usage
    ram = psutil.virtual_memory()
    stats['RAM']['val'] = ram.percent
    stats['RAM']['used'] = format_size(ram.used)
    stats['RAM']['total'] = format_size(ram.total)
    if ram.percent > RAM_THRESHOLD_YELLOW:
        stats['RAM']['status'] = 'YELLOW'
        
    # Disk Usage (Primary Drive)
    path = "C:\\" if os.name == 'nt' else "/"
    try:
        disk = psutil.disk_usage(path)
        stats['Disk']['val'] = disk.percent
        stats['Disk']['free'] = format_size(disk.free)
        stats['Disk']['total'] = format_size(disk.total)
        stats['Disk']['free_bytes'] = disk.free
        if disk.percent > DISK_THRESHOLD_RED:
            stats['Disk']['status'] = 'RED'
        elif disk.percent > DISK_THRESHOLD_YELLOW:
            stats['Disk']['status'] = 'YELLOW'
    except Exception as e:
        if DEBUG: print(f"[DEBUG] Disk check failed: {e}")
        pass

    return stats

def get_db_stats(db_url: str):
    """Collect remote Azure DB telemetry using psycopg2."""
    stats = {
        'Size': 'Unknown', 
        'Connections': 0, 
        'CacheHit': 'N/A', 
        'status': 'GREEN', 
        'size_bytes': 0,
        'Error': None
    }
    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            # Database Size
            cur.execute("SELECT pg_database_size('insightEd')")
            row = cur.fetchone()
            if row:
                size_bytes = row[0]
                stats['Size'] = format_size(size_bytes)
                stats['size_bytes'] = size_bytes
            
            # Active Connections
            cur.execute("SELECT count(*) FROM pg_stat_activity")
            row = cur.fetchone()
            if row:
                stats['Connections'] = row[0]
            
            # Cache Hit Ratio (Public Schema Performance)
            cur.execute("SELECT (sum(heap_blks_hit) * 100.0 / NULLIF(sum(heap_blks_read) + sum(heap_blks_hit), 0)) FROM pg_statio_user_tables")
            row = cur.fetchone()
            if row and row[0] is not None:
                ratio = float(row[0])
                stats['CacheHit'] = f"{ratio:.2f}%"
                if ratio < 90.0:
                    stats['status'] = 'YELLOW'
            
        conn.close()
    except Exception as e:
        stats['status'] = 'RED'
        stats['Error'] = str(e)
    return stats

def print_jarvis_report(vm: dict, db: dict):
    """Synthesize metrics into the Jarvis Status Report."""
    # Logic to aggregate multiple vitals into a single "Status Protocol" color
    vm_vitals = [vm['CPU']['status'], vm['RAM']['status'], vm['Disk']['status']]
    vm_status = 'RED' if 'RED' in vm_vitals else ('YELLOW' if 'YELLOW' in vm_vitals else 'GREEN')
    
    # Combined Protocol
    protocol = 'RED' if db['status'] == 'RED' or vm_status == 'RED' else \
               ('YELLOW' if db['status'] == 'YELLOW' or vm_status == 'YELLOW' else 'GREEN')
    
    print("\n" + "="*50)
    print(f"STATUS PROTOCOL: [{protocol}]")
    print("="*50)
    
    # Virtual Machine Section
    print("\n#### 🖥️  Virtual Machine Diagnostics")
    vm_health_desc = "Stable" if vm_status == "GREEN" else ("Degraded" if vm_status == "YELLOW" else "Critical")
    print(f"* **Overall Health:** {vm_health_desc}")
    print(f"* **Storage Vitals:** {vm['Disk']['val']}% utilization. {vm['Disk']['free']} free out of {vm['Disk']['total']}.")
    print(f"* **Compute & Memory:** CPU at {vm['CPU']['val']}%. RAM at {vm['RAM']['val']}% ({vm['RAM']['used']} used).")
    
    # Database Section
    print("\n#### ☁️  Azure Database Condition")
    db_health_desc = "Optimal" if db['status'] != "RED" else "Connection Failed"
    if db['status'] == 'RED' and db.get('Error'):
        db_health_desc = f"CRITICAL ERROR: {db['Error']}"
        
    print(f"* **Overall Health:** {db_health_desc}")
    print(f"* **Resource Utilization:** Cache Hit Ratio is {db['CacheHit']}.")
    print(f"* **Storage & Connections:** Database size is {db['Size']}. Active connections: {db['Connections']}.")
    
    # Predictive Section
    print("\n#### 🔮 Predictive Analysis & Crash Forecast")
    
    # VM Storage Forecast (Mock growth rate of 0.1GB/day)
    if psutil and vm['Disk']['free_bytes'] > 0:
        growth_rate_bytes = 0.1 * 1024 * 1024 * 1024 
        days_left = int(vm['Disk']['free_bytes'] / growth_rate_bytes)
        print(f"* **Storage Forecast:** At an estimated growth of 100MB/day, VM storage will reach capacity in ~{days_left} days.")
    else:
        print("* **Storage Forecast:** Insufficient snapshot data for local storage trajectory.")
    
    # Database Growth Forecast (Mock growth rate of 10MB/day)
    db_limit_bytes = 2.0 * 1024 * 1024 * 1024 # Standard/Basic Tier limit assumption
    if db.get('size_bytes', 0) > 0:
        remaining_db = max(0.0, float(db_limit_bytes) - float(db['size_bytes']))
        db_growth_per_day = 0.01 * 1024 * 1024 * 1024 
        db_days = int(remaining_db / db_growth_per_day)
        print(f"* **Database Risk:** Azure DB size is {db['Size']}. Estimated {db_days} days until 2GB limit.")
    else:
        print("* **Database Risk:** Unable to calculate DB trajectory (Network isolated or credentials invalid).")
        
    risk_level = 'Low' if protocol == 'GREEN' else ('Elevated' if protocol == 'YELLOW' else 'CRITICAL')
    risk_desc = 'within safety margins' if protocol == 'GREEN' else 'approaching or exceeding thresholds'
    print(f"* **Immediate Crash Risk:** {risk_level}. System vitals are {risk_desc}.")
    print("="*50 + "\n")

def main():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    
    if DEBUG: print("[DEBUG] Starting Jarvis Protocol...")
    
    # Gather Data
    vm_stats = get_vm_stats()
    db_stats = get_db_stats(db_url) if db_url else {
        'status': 'RED', 
        'Error': 'No DATABASE_URL found in .env', 
        'Size': 'Unknown', 
        'Connections': 0, 
        'CacheHit': 'N/A', 
        'size_bytes': 0
    }
    
    # Report Synthesis
    print_jarvis_report(vm_stats, db_stats)

if __name__ == "__main__":
    main()
