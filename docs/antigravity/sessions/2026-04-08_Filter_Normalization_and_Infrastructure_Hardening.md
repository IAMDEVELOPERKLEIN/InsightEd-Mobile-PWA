# Session Summary: Filter Normalization, Server Recovery & Nginx Hardening
**Date:** 2026-04-08  
**Engineer:** sebtcheng + Antigravity  
**Session Duration:** Single session (~3 task blocks)

---

## Session Goals

1. Fix location filter matching failures caused by inconsistent "SDO " / "SDO-" / "Division of " prefixes in division data, and resolve EFD Dashboard filter visibility gaps.
2. Recover the staging server from 100% disk exhaustion (`ENOSPC`) and repair a broken deployment where `api/` was missing.
3. Harden Nginx for high concurrency: upstream connection pooling, binary asset micro-caching, and buffered logging.

---

## Task 1 — Location Filter Normalization

### Problem
The EFD and Projects dashboards were silently returning empty result sets when a Division Engineer filtered by division. The root cause was a **prefix mismatch** between the `users` table (which stored `"SDO Benguet"` or `"SDO-Benguet"`) and the `engineer_form` table (which stored `"Benguet"`). The existing regex `'^(SDO|Division of)\\s+'` handled spaces but **not dashes**.

Additionally, `FilterDrawer.jsx` derived `categories`, `years`, and `batches` from `sourceData` (the currently-loaded page of projects), meaning these filter options were incomplete when data was paginated. `EFDHome.jsx` was already passing `yearOptions` and `batchOptions` as props but `FilterDrawer` ignored them.

### Changes Made

**Backend — `api/index.js`**
- Updated all four division normalization points (two in `/api/dashboard/efd-summary`, two in `/api/projects`) to use `[-\\s]+` regex: `'^(SDO|Division of)[-\\s]+'`.
- Applied same fix to the JS-side `.replace()` calls: `/^(SDO|Division of)[-\s]+/i`.
- Added development-only diagnostic logging (`🔍 Filter Query Params`, `🔍 SQL WHERE Clauses`) to both routes, gated by `NODE_ENV !== 'production'`.

**Frontend — `src/components/FilterDrawer.jsx`**
- Added three new props: `categoryOptions = []`, `yearOptions = []`, `batchOptions = []`.
- `options` `useMemo` now prefers passed-in props over `sourceData`-derived values when props are non-empty. All three are in the dependency array.

**Frontend — `src/modules/EFDHome.jsx`**
- Added `categoryOptions={allCategories}` to the `<FilterDrawer>` render (the static canonical list was already defined but not being passed).

### Key Decision
The "prop-driven derivation" pattern (prefer explicit props, fall back to data derivation) was chosen over a server-side options endpoint because the canonical `allCategories` list is already authoritative in the frontend and the extra round-trip would add latency to drawer open. See **ADR-0010**.

---

## Task 2 — Staging Server Recovery (ENOSPC)

### Problem
The staging server at `20.24.58.49` reached 100% disk usage, which caused a mid-deployment failure. The `deploy-staging.sh` script successfully deleted `dist/` and `api/` (the cleanup step) but the subsequent SCP of the 266 MB full tarball failed with `Connection reset by peer`. The result was a server with `api/index.js` **missing** — PM2 processes were crashing on every restart.

### Recovery Steps Executed

| Step | Action | Result |
|------|--------|--------|
| 1a | `sudo truncate -s 0` on Nginx access/error logs | Freed ~2 GB |
| 1b | Cleared `/tmp/insighted-pdf-tmp/*` | Freed scratch space |
| 1c | Removed stale `staging-deploy.tmp.tar.gz` | Freed ~266 MB |
| 1d | `pm2 flush` | Cleared log accumulation |
| 2 | Built `api-only-deploy.tar.gz` (1.9 MB, `api/` + configs only) | Avoided re-uploading `dist/` |
| 3 | SCP + extract on server | `api/index.js` confirmed present |
| 4 | `forensic_heal.sh` — all 6 phases passed | PM2 restarted, Nginx healthy |
| 5 | Deleted stale `stride-dashboard` PM2 process | `npm start` error loop stopped |

### Root Cause Analysis
The full tarball (~266 MB) exhausted remaining disk during extraction + npm install. **Mitigation**: the targeted `api-only-deploy.tar.gz` strategy (1.9 MB) is now the preferred recovery path when `dist/` is already present on the server.

### Created: `diag_server.sh`
A lightweight health-check script added to both the local repo and the staging server:
- Disk usage with >90% warning, >95% critical thresholds
- PM2 status scan for errored/stopped processes
- Endpoint validation (`/` → 200/404 expected for API, 301 for Nginx proxy)
- `--verbose` flag tails PM2 and Nginx error logs

---

## Task 3 — Nginx Concurrency Optimization

### Problem
The existing Nginx config was leaving performance on the table:
- `worker_connections 768` with no `worker_rlimit_nofile` → hard ceiling at OS default 1024 FDs
- All upstream connections used hardcoded `http://localhost:PORT/` with no TCP keepalive → new handshake per request
- Access logging was unbuffered → every request forced a synchronous disk write
- Gzip was enabled but minimal (no `gzip_vary`, no content type list)
- No caching for binary assets served from PostgreSQL (`GET /api/asset/:id`) → every request hit Node.js → PostgreSQL
- The `$connection_upgrade` map used `'' close` for non-WebSocket requests, which **prevented** upstream keepalive from functioning

### Changes Applied

**`/etc/nginx/nginx.conf` (source: `tmp_nginx.conf`)**
- `worker_processes auto; worker_rlimit_nofile 8192;`
- `worker_connections 4096; multi_accept on; use epoll;`
- `proxy_cache_path /var/cache/nginx/binary_cache levels=1:2 keys_zone=binary_cache:10m max_size=500m inactive=30m use_temp_path=off;`
- Global proxy buffers: `4 256k` buffers, 128k `proxy_buffer_size`
- `access_log ... combined buffer=32k flush=1m;` (batches disk writes)
- Full gzip config: `comp_level 4`, all relevant MIME types, `gzip_vary on`
- Fixed `$connection_upgrade` map: `'' ""` (empty → keepalive-compatible)

**`/etc/nginx/sites-enabled/stride.conf` (source: `tmp_stride.conf`)**
- Added 4 upstream blocks (`stride_backend:3002`, `opdash_backend:3001`, `staging_backend:5001`, `production_backend:5000`) each with `keepalive 32`
- All `proxy_pass` directives updated to use upstream names
- All `proxy_set_header Connection` updated to use `$connection_upgrade`
- 3 asset micro-cache location blocks (regex `~ ^/<prefix>/api/asset/(.*)$`) for staging, production, and legacy `/api/` paths
- `/nginx_status` stub_status endpoint (localhost-only) for monitoring

### Created: `check_nginx_concurrency.sh`
Five-section Nginx health monitor:
1. Active connections via stub_status (`curl -sk https://127.0.0.1/nginx_status`)
2. Binary cache file count + access log HIT/MISS stats
3. Disk space alerts (<10% free = CRITICAL)
4. Error log scan: upstream timeouts, worker_connections exceeded, connection refused, no live upstreams
5. PM2 + endpoint sanity (`http://127.0.0.1:5001/` and `:5000/`)

See **ADR-0011**.

---

## State at Session End

| Component | Status |
|-----------|--------|
| `insighted-staging` (5001) | ✅ Online |
| `insighted-backend` (5000) | ✅ Online |
| `stride-dashboard` PM2 | 🗑 Deleted (stale, was `npm start` loop) |
| Nginx | ✅ Active, optimized config loaded |
| Disk (`/`) | ⚠ 93% used, 2.1 GB free — **monitor** |
| Binary cache | ✅ Initialized, empty (will populate on asset requests) |

## Immediate Follow-Ups
- **Disk**: 93% used on a 29 GB root volume is above safe operating margin. Consider `journalctl --vacuum-size=100M`, `sudo apt-get autoremove`, or Azure disk expansion.
- **Ports 3001/3002**: No active PM2 processes serve these. The upstream entries in stride.conf are correct but will 502 until the OpDash/STRIDE dashboard services are provisioned.
- **Cache key strategy**: Consider adding `$http_authorization` to the cache bypass condition on `/api/asset/` if per-user access control on assets becomes a requirement.
