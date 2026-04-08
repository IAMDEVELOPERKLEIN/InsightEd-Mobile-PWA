#!/bin/bash
# =============================================================================
# diag_heal.sh -- InsightEd Staging Diagnostic & Health Check
# Usage: bash diag_heal.sh
# Checks endpoints, redirect cycles, disk, and memory pressure
# =============================================================================

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
crit() { echo -e "${RED}[CRIT]${NC}  $*"; }
info() { echo -e "${CYAN}[INFO]${NC}  $*"; }

echo ""
echo "================================================================"
info "diag_heal.sh -- $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================================"

# --- 1. Endpoint health checks ---
echo ""
info "=== Endpoint Health Checks ==="

check_endpoint() {
    local label=$1
    local url=$2
    local result
    result=$(curl -sI --max-time 5 "$url" 2>&1 | head -1)
    local code
    code=$(echo "$result" | grep -oE '[0-9]{3}' | head -1)
    case $code in
        200|201|204)  ok  "$label ($url) → HTTP $code" ;;
        301|302|307|308)
            local location
            location=$(curl -sI --max-time 5 "$url" 2>&1 | grep -i '^location:' | head -1 | tr -d '\r')
            warn "$label ($url) → HTTP $code | $location" ;;
        404)          ok  "$label ($url) → HTTP 404 (expected for bare API)" ;;
        000)          crit "$label ($url) → Connection refused / timeout" ;;
        *)            warn "$label ($url) → HTTP ${code:-unknown}" ;;
    esac
}

check_endpoint "STRIDE dashboard  (3002)" "http://localhost:3002"
check_endpoint "Production backend (5000)" "http://localhost:5000"
check_endpoint "Staging backend    (5001)" "http://localhost:5001"

# --- 2. Redirect cycle detection in Nginx logs ---
echo ""
info "=== Nginx Log Redirect Cycle Check (last 20 lines) ==="

ACCESS_LOG="/var/log/nginx/access.log"
if [ -f "$ACCESS_LOG" ]; then
    LAST20=$(tail -20 "$ACCESS_LOG" 2>/dev/null)
    REDIRECT_COUNT=$(echo "$LAST20" | grep -cE '" (301|302|307|308) ' 2>/dev/null); REDIRECT_COUNT=${REDIRECT_COUNT:-0}
    CYCLE_INDICATOR=$(echo "$LAST20" | grep -cE '(insighted-staging|insighted-production).*" (301|302) ' 2>/dev/null); CYCLE_INDICATOR=${CYCLE_INDICATOR:-0}

    if [ "$CYCLE_INDICATOR" -gt 5 ]; then
        crit "Possible redirect CYCLE detected: $CYCLE_INDICATOR redirect(s) in last 20 lines pointing to app routes"
        echo "$LAST20" | grep -E '" (301|302|307|308) ' | tail -5 | while read -r line; do
            warn "  $line"
        done
    elif [ "$REDIRECT_COUNT" -gt 0 ]; then
        warn "$REDIRECT_COUNT redirect response(s) in last 20 log lines (no cycle detected)"
    else
        ok "No redirects in last 20 Nginx log lines"
    fi

    # Show last 5 entries for context
    info "Last 5 access log entries:"
    tail -5 "$ACCESS_LOG" | while read -r line; do
        echo "  $line"
    done
else
    warn "Access log not found: $ACCESS_LOG"
fi

# --- 3. Disk usage ---
echo ""
info "=== Disk Usage ==="
DISK_USED=$(df / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
DISK_FREE_KB=$(df / | awk 'NR==2 {print $4}')
DISK_FREE_PCT=$(( 100 - DISK_USED ))

DISK_MSG="/ → ${DISK_USED}% used | ${DISK_FREE_KB}KB free"
if [ "$DISK_FREE_PCT" -le 5 ]; then
    crit "ENOSPC IMMINENT -- $DISK_MSG"
elif [ "$DISK_FREE_PCT" -le 10 ]; then
    crit "CRITICAL -- $DISK_MSG"
elif [ "$DISK_USED" -ge 90 ]; then
    warn "HIGH -- $DISK_MSG"
else
    ok "$DISK_MSG"
fi

# Nginx log sizes
ACCESS_MB=$(du -sm "$ACCESS_LOG" 2>/dev/null | cut -f1); ACCESS_MB=${ACCESS_MB:-0}
ERROR_MB=$(du -sm /var/log/nginx/error.log 2>/dev/null | cut -f1); ERROR_MB=${ERROR_MB:-0}
info "Nginx logs -- access: ${ACCESS_MB}MB | error: ${ERROR_MB}MB"
if [ "$ACCESS_MB" -gt 100 ]; then
    warn "access.log > 100MB -- consider: sudo truncate -s 0 $ACCESS_LOG"
fi

# --- 4. Memory pressure ---
echo ""
info "=== Memory Pressure ==="
MEM_TOTAL=$(free -m | awk '/^Mem/{print $2}')
MEM_AVAIL=$(free -m | awk '/^Mem/{print $7}')
MEM_USED_PCT=$(( (MEM_TOTAL - MEM_AVAIL) * 100 / MEM_TOTAL ))
MEM_FREE_PCT=$(( 100 - MEM_USED_PCT ))

MEM_MSG="RAM: ${MEM_USED_PCT}% used | ${MEM_AVAIL}MB available of ${MEM_TOTAL}MB"
if [ "$MEM_FREE_PCT" -le 10 ]; then
    crit "CRITICAL -- $MEM_MSG"
elif [ "$MEM_USED_PCT" -ge 80 ]; then
    warn "HIGH -- $MEM_MSG"
else
    ok "$MEM_MSG"
fi

# Top 5 memory consumers
info "Top 5 processes by RSS:"
ps aux --no-headers --sort=-%mem | head -5 | awk '{printf "  %-20s %6s MB\n", $11, int($6/1024)}'

echo ""
echo "================================================================"
ok "diag_heal.sh complete"
echo "================================================================"
