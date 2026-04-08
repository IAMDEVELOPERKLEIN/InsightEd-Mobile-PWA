#!/bin/bash
# =============================================================================
# check_nginx_concurrency.sh — InsightEd Nginx Concurrency Monitor
# Usage:  bash check_nginx_concurrency.sh [--verbose]
# Requires: curl, ss (or netstat), nginx stub_status at /nginx_status
# =============================================================================

DEBUG_VERBOSE=false
[[ "$1" == "--verbose" || "$1" == "-v" ]] && DEBUG_VERBOSE=true

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; }
info() { echo -e "${CYAN}ℹ️  $*${NC}"; }

DISK_ALERT_PCT=10    # alert if free disk < 10%
BACKEND_PORTS="80 443 5000 5001 3001 3002"
CACHE_DIR="/var/cache/nginx/binary_cache"
ERROR_LOG="/var/log/nginx/error.log"

echo ""
echo "========================================================"
echo "  Nginx Concurrency Monitor — InsightEd"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================================"
echo ""

# ---------------------------------------------------------------------------
# 1. Active Connection Count (stub_status + ss fallback)
# ---------------------------------------------------------------------------
echo -e "${CYAN}[1] Active Nginx Connections${NC}"

STUB=$(curl -sk https://127.0.0.1/nginx_status 2>/dev/null)
if [ -n "$STUB" ] && echo "$STUB" | grep -q "Active connections"; then
    ACTIVE=$(echo "$STUB" | awk '/Active connections/{print $3}')
    READ_LINE=$(echo "$STUB" | grep "Reading:")
    READING=$(echo "$READ_LINE" | awk '{print $2}')
    WRITING=$(echo "$READ_LINE" | awk '{print $4}')
    WAITING=$(echo "$READ_LINE" | awk '{print $6}')
    echo "  Active connections : $ACTIVE"
    echo "  Reading / Writing / Waiting: $READING / $WRITING / $WAITING"
    ok "stub_status reachable (HTTPS)."
else
    warn "stub_status not reachable at https://127.0.0.1/nginx_status — falling back to ss"
    for port in $BACKEND_PORTS; do
        COUNT=$(ss -tn 2>/dev/null | grep -c ":${port} " || echo 0)
        printf "  Port %-5s  ESTABLISHED: %s\n" "$port" "$COUNT"
    done
fi

echo ""

# ---------------------------------------------------------------------------
# 2. Binary Cache Hits / Misses
# ---------------------------------------------------------------------------
echo -e "${CYAN}[2] Binary Cache — ${CACHE_DIR}${NC}"

if [ -d "$CACHE_DIR" ]; then
    CACHE_FILES=$(find "$CACHE_DIR" -type f 2>/dev/null | wc -l)
    CACHE_SIZE=$(du -sh "$CACHE_DIR" 2>/dev/null | cut -f1)
    info "Cache entries: $CACHE_FILES files ($CACHE_SIZE on disk)"

    # Count X-Cache-Status headers from recent access log
    if [ -f /var/log/nginx/access.log ] && [ -s /var/log/nginx/access.log ]; then
        HITS=$(grep -c 'X-Cache-Status: HIT'   /var/log/nginx/access.log 2>/dev/null); HITS=${HITS:-0}
        MISS=$(grep -c 'X-Cache-Status: MISS'  /var/log/nginx/access.log 2>/dev/null); MISS=${MISS:-0}
        BYPASS=$(grep -cE 'X-Cache-Status: (BYPASS|EXPIRED|STALE|UPDATING)' /var/log/nginx/access.log 2>/dev/null); BYPASS=${BYPASS:-0}
        info "Access log cache counts — HIT: $HITS | MISS: $MISS | BYPASS/EXPIRED: $BYPASS"
    else
        info "Access log empty or not flushed yet (buffered, flush every 1m)."
    fi

    ok "Cache directory healthy."
else
    fail "Cache directory NOT found: $CACHE_DIR — run: sudo mkdir -p $CACHE_DIR && sudo chown www-data:www-data $CACHE_DIR"
fi

echo ""

# ---------------------------------------------------------------------------
# 3. Disk Space — Alert if < 10% free on / or /var/log
# ---------------------------------------------------------------------------
echo -e "${CYAN}[3] Disk Space${NC}"

check_disk() {
    local mount=$1
    local pct_used pct_free
    pct_used=$(df "$mount" 2>/dev/null | awk 'NR==2 {gsub(/%/,"",$5); print $5}' | tr -d '[:space:]')
    [[ "$pct_used" =~ ^[0-9]+$ ]] || return 0
    pct_free=$((100 - pct_used))
    if [ "$pct_free" -le "$DISK_ALERT_PCT" ]; then
        fail "CRITICAL: ${mount} only ${pct_free}% free (${pct_used}% used) — ENOSPC risk!"
    elif [ "$pct_used" -ge 90 ]; then
        warn "${mount}: ${pct_used}% used, ${pct_free}% free — monitor closely."
    else
        ok "${mount}: ${pct_used}% used, ${pct_free}% free."
    fi
}

check_disk /
check_disk /var/log 2>/dev/null || true

echo ""

# ---------------------------------------------------------------------------
# 4. Error Log — Scan for critical upstream warnings
# ---------------------------------------------------------------------------
echo -e "${CYAN}[4] Nginx Error Log — Critical Patterns${NC}"

if [ -f "$ERROR_LOG" ]; then
    TIMEOUT_COUNT=$(grep -c "upstream timed out"               "$ERROR_LOG" 2>/dev/null); TIMEOUT_COUNT=${TIMEOUT_COUNT:-0}
    WORKER_COUNT=$(grep -c "worker_connections are not enough" "$ERROR_LOG" 2>/dev/null); WORKER_COUNT=${WORKER_COUNT:-0}
    CONN_REFUSED=$(grep -c "connect() failed.*Connection refused" "$ERROR_LOG" 2>/dev/null); CONN_REFUSED=${CONN_REFUSED:-0}
    NO_PEER=$(grep -c "no live upstreams\|upstream.*unavailable" "$ERROR_LOG" 2>/dev/null); NO_PEER=${NO_PEER:-0}

    [ "$TIMEOUT_COUNT"  -gt 0 ] && warn "upstream timed out:       $TIMEOUT_COUNT occurrences" || ok "No 'upstream timed out' errors."
    [ "$WORKER_COUNT"   -gt 0 ] && warn "worker_connections exceeded: $WORKER_COUNT occurrences" || ok "No 'worker_connections exceeded' errors."
    [ "$CONN_REFUSED"   -gt 0 ] && warn "Connection refused (upstream down?): $CONN_REFUSED" || ok "No 'Connection refused' errors."
    [ "$NO_PEER"        -gt 0 ] && fail "No live upstreams:        $NO_PEER occurrences" || ok "No 'no live upstreams' errors."

    if [ "$DEBUG_VERBOSE" = true ]; then
        echo ""
        info "Last 20 error log lines:"
        tail -20 "$ERROR_LOG"
    fi
else
    warn "Error log not found at $ERROR_LOG"
fi

echo ""

# ---------------------------------------------------------------------------
# 5. PM2 + Endpoint Sanity
# ---------------------------------------------------------------------------
echo -e "${CYAN}[5] Backend Process + Endpoint Sanity${NC}"

pm2 list 2>/dev/null | grep -E "\| online \|| \| errored \|| \| stopped \|" | while IFS= read -r line; do
    if echo "$line" | grep -q "| online |"; then
        echo -e "  ${GREEN}● ${line}${NC}"
    else
        echo -e "  ${RED}● ${line}${NC}"
    fi
done

for label_port in "staging:5001" "production:5000"; do
    label="${label_port%%:*}"
    port="${label_port##*:}"
    code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "http://127.0.0.1:$port/" 2>/dev/null)
    if [[ "$code" == "200" || "$code" == "404" ]]; then
        ok "$label ($port): HTTP $code — process alive"
    else
        fail "$label ($port): HTTP ${code:-TIMEOUT} — process may be down"
    fi
done

echo ""
echo "========================================================"
echo -e "  ${GREEN}Concurrency Check Complete${NC}"
echo "  Run with --verbose for full error log tail."
echo "========================================================"
echo ""
