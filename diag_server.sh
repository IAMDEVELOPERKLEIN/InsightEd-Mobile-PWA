#!/bin/bash
# =============================================================================
# diag_server.sh — InsightEd Staging Server Diagnostic Script
# Target: 20.24.58.49 | User: Administrator1
# Usage:  bash diag_server.sh [--verbose]
# =============================================================================

DEBUG_VERBOSE=false
[[ "$1" == "--verbose" || "$1" == "-v" ]] && DEBUG_VERBOSE=true

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; }
info() { echo -e "${CYAN}ℹ️  $*${NC}"; }

echo ""
echo "========================================================"
echo "  InsightEd Server Diagnostic"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================"
echo ""

# --- 1. Disk Space Check ---
echo -e "${CYAN}[1] Disk Space${NC}"
DISK_OUTPUT=$(df -h / 2>/dev/null)
echo "$DISK_OUTPUT"
DISK_USAGE=$(df / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
if [ "$DISK_USAGE" -ge 95 ]; then
    fail "CRITICAL: Disk usage at ${DISK_USAGE}% — ENOSPC imminent!"
elif [ "$DISK_USAGE" -ge 90 ]; then
    warn "WARNING: Disk usage at ${DISK_USAGE}% — monitor closely."
else
    ok "Disk usage at ${DISK_USAGE}% — healthy."
fi

echo ""

# --- 2. PM2 Process Status ---
echo -e "${CYAN}[2] PM2 Process Status${NC}"
PM2_OUTPUT=$(pm2 list 2>/dev/null)
echo "$PM2_OUTPUT"

ERRORED=$(echo "$PM2_OUTPUT" | grep -c "errored" || true)
STOPPED=$(echo "$PM2_OUTPUT" | grep -c "stopped" || true)

if [ "$ERRORED" -gt 0 ]; then
    fail "${ERRORED} PM2 process(es) in 'errored' state."
elif [ "$STOPPED" -gt 0 ]; then
    warn "${STOPPED} PM2 process(es) are stopped."
else
    ok "All PM2 processes appear online."
fi

echo ""

# --- 3. Endpoint Validation ---
echo -e "${CYAN}[3] Endpoint Validation${NC}"

check_endpoint() {
    local label=$1
    local url=$2
    local allow_404=${3:-false}
    local response
    response=$(curl -s -o /dev/null -w "%{http_code} in %{time_total}s" --connect-timeout 5 "$url" 2>/dev/null)
    local code=$(echo "$response" | awk '{print $1}')
    if [[ "$code" == "200" || "$code" == "301" || "$code" == "302" ]]; then
        ok "${label}: HTTP ${response}"
    elif [[ "$allow_404" == "true" && "$code" == "404" ]]; then
        ok "${label}: HTTP ${response} (404 = API server alive, no root route)"
    elif [[ -z "$code" || "$code" == "000" ]]; then
        fail "${label}: TIMEOUT/NO_RESPONSE — server is down or port not listening."
    else
        fail "${label}: HTTP ${response} — unexpected response."
    fi
}

check_endpoint "insighted-staging  (5001)" "http://localhost:5001/"       "true"
check_endpoint "insighted-backend  (5000)" "http://localhost:5000/"       "true"
check_endpoint "Nginx proxy (80)"          "http://localhost/"

echo ""

# --- 4. Verbose Log Tail ---
if [ "$DEBUG_VERBOSE" = true ]; then
    echo -e "${CYAN}[4] PM2 Log Tails (DEBUG_VERBOSE=true)${NC}"

    for app in insighted-staging insighted-backend; do
        echo ""
        echo "--- ${app} stdout (last 20 lines) ---"
        pm2 logs "$app" --lines 20 --nostream 2>/dev/null | grep "out-0.log" -A 20 || true
        echo "--- ${app} stderr (last 10 lines) ---"
        pm2 logs "$app" --lines 10 --nostream 2>/dev/null | grep "error-0.log" -A 10 || true
    done

    echo ""
    echo "--- Nginx error log (last 20 lines) ---"
    sudo tail -20 /var/log/nginx/error.log 2>/dev/null || warn "Cannot read nginx error log."
fi

echo ""
echo "========================================================"
echo -e "  ${GREEN}Diagnostic Complete${NC}"
echo "  Run with --verbose for log output."
echo "========================================================"
echo ""
