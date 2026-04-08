#!/bin/bash
# =============================================================================
# audit_remote.sh — InsightEd Production Server Periodic Audit
# Target: 20.24.58.49 | User: Administrator1
# Usage:  bash audit_remote.sh [--verbose] [--once] [--interval 300]
# Logs CPU/RAM every 5 min, alerts if free mem or disk < 10%
# =============================================================================

DEBUG_VERBOSE=false
RUN_ONCE=false
INTERVAL=300   # seconds between checks
LOG_FILE="/var/www/html/InsightEd-Staging/audit_remote.log"
MEM_ALERT_PCT=10
DISK_ALERT_PCT=10
LOG_TRUNCATE_MB=100    # auto-truncate Nginx access.log if > 100MB

# Parse args
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)  DEBUG_VERBOSE=true; shift ;;
        --once)        RUN_ONCE=true; shift ;;
        --interval)    INTERVAL="$2"; shift 2 ;;
        *) shift ;;
    esac
done

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log() {
    local level=$1; shift
    local msg="$*"
    local ts; ts=$(date '+%Y-%m-%d %H:%M:%S')
    local line="[$ts] [$level] $msg"
    echo "$line" >> "$LOG_FILE" 2>/dev/null || true
    case $level in
        CRIT)  echo -e "${RED}${line}${NC}" ;;
        WARN)  echo -e "${YELLOW}${line}${NC}" ;;
        OK)    echo -e "${GREEN}${line}${NC}" ;;
        *)     echo -e "${CYAN}${line}${NC}" ;;
    esac
}

# ---------------------------------------------------------------------------
run_audit() {
    echo ""
    echo "========================================================"
    log INFO "Audit cycle — $(date '+%Y-%m-%d %H:%M:%S')"
    echo "========================================================"

    # --- 1. CPU / Load ---
    LOAD=$(awk '{print $1}' /proc/loadavg)
    CPU_CORES=$(nproc)
    log INFO "Load avg (1m): $LOAD | CPU cores: $CPU_CORES"

    # --- 2. Memory ---
    MEM_TOTAL=$(free -m | awk '/^Mem/{print $2}')
    MEM_FREE=$(free -m  | awk '/^Mem/{print $4}')
    MEM_AVAIL=$(free -m | awk '/^Mem/{print $7}')
    MEM_USED_PCT=$(( (MEM_TOTAL - MEM_AVAIL) * 100 / MEM_TOTAL ))
    MEM_FREE_PCT=$(( 100 - MEM_USED_PCT ))

    MEM_MSG="RAM: ${MEM_USED_PCT}% used | ${MEM_AVAIL}MB available of ${MEM_TOTAL}MB"
    if [ "$MEM_FREE_PCT" -le "$MEM_ALERT_PCT" ]; then
        log CRIT "CRITICAL — $MEM_MSG"
    elif [ "$MEM_USED_PCT" -ge 80 ]; then
        log WARN "WARNING — $MEM_MSG"
    else
        log OK "$MEM_MSG"
    fi

    # --- 3. Disk (/) ---
    DISK_USED=$(df / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
    DISK_FREE=$(df / | awk 'NR==2 {print $4}')
    DISK_FREE_PCT=$(( 100 - DISK_USED ))
    DISK_MSG="Disk /: ${DISK_USED}% used | ${DISK_FREE}KB free"

    if [ "$DISK_FREE_PCT" -le "$DISK_ALERT_PCT" ]; then
        log CRIT "CRITICAL — $DISK_MSG — ENOSPC imminent!"
        # Auto-truncate Nginx access.log if > threshold
        ACCESS_MB=$(du -sm /var/log/nginx/access.log 2>/dev/null | cut -f1)
        if [ "${ACCESS_MB:-0}" -gt "$LOG_TRUNCATE_MB" ]; then
            sudo truncate -s 0 /var/log/nginx/access.log 2>/dev/null
            log WARN "Auto-truncated access.log (was ${ACCESS_MB}MB)"
        fi
        # Flush PM2 logs
        pm2 flush 2>/dev/null
        log WARN "PM2 logs flushed (disk emergency)"
    elif [ "$DISK_USED" -ge 90 ]; then
        log WARN "WARNING — $DISK_MSG"
    else
        log OK "$DISK_MSG"
    fi

    # --- 4. PM2 Process Health ---
    if command -v pm2 &>/dev/null; then
        PM2_OUT=$(pm2 list 2>/dev/null)
        ERRORED=$(echo "$PM2_OUT" | grep -c "errored" || true); ERRORED=${ERRORED:-0}
        STOPPED=$(echo "$PM2_OUT" | grep -c "stopped" || true); STOPPED=${STOPPED:-0}

        if [ "$ERRORED" -gt 0 ]; then
            log CRIT "PM2: $ERRORED process(es) ERRORED"
        elif [ "$STOPPED" -gt 0 ]; then
            log WARN "PM2: $STOPPED process(es) STOPPED"
        else
            ONLINE=$(echo "$PM2_OUT" | grep -c "online" || true); ONLINE=${ONLINE:-0}
            log OK "PM2: $ONLINE process(es) online"
        fi

        # Check insighted-backend memory (alert if > 2GB — possible leak)
        BACKEND_MEM=$(echo "$PM2_OUT" | grep "insighted-backend" | grep -oE '[0-9]+(\.[0-9]+)?mb' | head -1 | sed 's/mb//')
        if [ -n "$BACKEND_MEM" ]; then
            BACKEND_MB=$(echo "$BACKEND_MEM" | awk '{printf "%d", $1}')
            if [ "$BACKEND_MB" -gt 2000 ]; then
                log WARN "insighted-backend using ${BACKEND_MB}MB — possible memory leak, consider restart"
            fi
        fi
    else
        log WARN "PM2 not found on PATH"
    fi

    # --- 5. Nginx log sizes ---
    ACCESS_MB=$(du -sm /var/log/nginx/access.log 2>/dev/null | cut -f1)
    ERROR_MB=$(du -sm /var/log/nginx/error.log 2>/dev/null | cut -f1)
    log INFO "Nginx logs — access: ${ACCESS_MB:-0}MB | error: ${ERROR_MB:-0}MB"
    if [ "${ACCESS_MB:-0}" -gt 500 ]; then
        log WARN "access.log > 500MB — run: sudo truncate -s 0 /var/log/nginx/access.log"
    fi

    # --- 6. Verbose: top processes ---
    if [ "$DEBUG_VERBOSE" = true ]; then
        log INFO "--- Top 10 processes by CPU ---"
        ps aux --no-headers --sort=-%cpu | head -10 | while read -r line; do
            log INFO "  $line"
        done
        log INFO "--- Top 10 processes by MEM ---"
        ps aux --no-headers --sort=-%mem | head -10 | while read -r line; do
            log INFO "  $line"
        done
    fi
}

# ---------------------------------------------------------------------------
log INFO "========================================="
log INFO "InsightEd Remote Audit Started"
log INFO "Interval: ${INTERVAL}s | Mem alert: <${MEM_ALERT_PCT}% | Disk alert: <${DISK_ALERT_PCT}%"
log INFO "Log: $LOG_FILE"
log INFO "========================================="

if [ "$RUN_ONCE" = true ]; then
    run_audit
else
    while true; do
        run_audit
        sleep "$INTERVAL"
    done
fi
