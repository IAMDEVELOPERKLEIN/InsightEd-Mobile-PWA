# ADR-0013: Production Database Lock Cascade — Root Cause & Resolution

**Date:** 2026-04-09  
**Status:** Resolved  
**Severity:** P0 — Total service outage  
**Author:** Antigravity (AI Pair Programmer)

---

## Context

InsightEd production was experiencing widespread `timeout exceeded when trying to connect` errors across all API endpoints — logins, saves, region dropdowns, and school fetches. The pg-pool telemetry showed:

```
[DB-POOL-ALERT] Total: 12 | Idle: 0 | WAITING: 51–81
```

All 12 connection pool slots were permanently occupied, queuing 50–80 requests that could never execute. From the user's perspective, the entire application returned HTTP 500 on every request.

---

## Root Cause Analysis

### Primary Blocker — Stale TRUNCATE (PID 376641)
A `TRUNCATE TABLE all_locations` query, issued from `unify_location_data_v3.py` (or v2), had been running for **41+ minutes** without ever committing or rolling back.

```sql
-- Query stuck for 41 minutes (identified via pg_stat_activity)
TRUNCATE TABLE all_locations;  -- pid 376641
```

This was caused by `conn.autocommit = True` being set in those scripts. In psycopg2, `autocommit = True` means each statement auto-commits — **but `TRUNCATE` in PostgreSQL acquires an `ACCESS EXCLUSIVE` lock on the table**. When the connection was left open (e.g., script hung or was abandoned mid-run), the lock was never released.

### Secondary Blocker — Idle-in-Transaction (PID 373608)
A `SELECT DISTINCT region FROM all_locations` had been stuck in `idle in transaction` for **57+ minutes**. This was caused by `add_legislative_district.py` opening two separate connections (one for reading dropdowns, one for inserting), leaving the read connection open without a `COMMIT` or `CLOSE`.

### Cascade Effect
Both blockers held locks on `all_locations`. Any subsequent query touching this table entered a `Lock wait` state. This cascaded to **773 blocked queries** — saturating Azure PostgreSQL's connection limit and starving the Node.js `pg-pool` of all 12 available slots.

```
TRUNCATE (pid 376641, 41min)
    ↓ blocks
SELECT DISTINCT region (pid 375259, ...)
SELECT DISTINCT municipality (pid 376435, ...)
UPDATE schools_IERN (pid 376168, ...)
    ↓ cascades to
773 total blocked connections → pg-pool WAITING: 81
    ↓
All API routes → 500 Internal Server Error
```

---

## Resolution

### Step 1 — Killed All Blocking Transactions
Used `pg_terminate_backend()` to kill:
- All active queries running > 5 minutes
- All `idle in transaction` sessions > 5 minutes
- All connections waiting on a `Lock`

Result: **785 active → 3 active / 71 idle. Zero lock waiters.**

A reusable emergency script was created at:
```
fave_scripts/relief_db_locks.py
```
Run this any time the site is down with `timeout exceeded` errors.

### Step 2 — Fixed PgBouncer SSL Misconfiguration
PgBouncer was configured to connect to `127.0.0.1:5432` (localhost Postgres) instead of the Azure host. Updated `/etc/pgbouncer/pgbouncer.ini`:
```ini
[databases]
insightEd = host=stride-posgre-prod-01.postgres.database.azure.com port=5432 dbname=insightEd user=Administrator1 password=*** pool_size=100

[pgbouncer]
pool_mode = transaction
max_client_conn = 2000
default_pool_size = 100
server_tls_sslmode = require
```

### Step 3 — Fixed Node.js Pool SSL Conflict
The application's `.env` contained `DATABASE_URL=postgres://...@127.0.0.1:6432/insightEd?ssl=false`. The `?ssl=false` query parameter in the URL was being ignored when `ssl: { rejectUnauthorized: false }` was specified in the Pool config — resulting in `The server does not support SSL connections` errors on startup.

Fixed in `api/index.js`:
```js
// Before
ssl: isLocal ? false : { rejectUnauthorized: false },

// After — PgBouncer proxies SSL to Azure, app connects plaintext locally
ssl: false,
```

### Step 4 — Hardened Location Scripts
The scripts causing the lock leaks were hardened with explicit transaction management:

**`unify_location_data_v2.py` and `v3.py`:**
```python
# Before (UNSAFE)
conn.autocommit = True
cur.execute('TRUNCATE TABLE all_locations')  # locks table, never atomic

# After (SAFE)
conn.autocommit = False
cur.execute('TRUNCATE TABLE all_locations')
cur.execute('INSERT INTO all_locations ...')
conn.commit()   # atomic: both succeed or both roll back
```

**`add_legislative_district.py`:**
- Removed dual-connection pattern (read conn + write conn)
- Unified to single connection with `autocommit = False`
- Added `conn.rollback()` on exception and `KeyboardInterrupt`

---

## Prevention Rules

1. **Never use `TRUNCATE` without wrapping it and its subsequent `INSERT` in the same atomic transaction.** A crash between TRUNCATE and INSERT leaves the table empty and locked.

2. **Never leave `autocommit = True` on a connection that runs DDL (`TRUNCATE`, `DROP`, `ALTER`).** Use `conn.autocommit = False` and call `conn.commit()` explicitly.

3. **Always close connections in a `finally` block.** Dangling open connections hold implicit transactions.

4. **Run `fave_scripts/relief_db_locks.py`** immediately when:
   - PM2 logs show `timeout exceeded when trying to connect`
   - `[DB-POOL-ALERT] Idle: 0 | WAITING: N` with N growing
   - Site returns HTTP 500 on all endpoints

---

## Files Changed

| File | Change |
|------|--------|
| `api/index.js` | `ssl: false` — disabled client-side SSL for PgBouncer connection |
| `/etc/pgbouncer/pgbouncer.ini` | Corrected upstream host to Azure, enabled `server_tls_sslmode = require`, pool_size = 100 |
| `/var/www/html/InsightEd-Mobile-PWA/.env` | `DATABASE_URL` set to `postgres://...@127.0.0.1:6432/insightEd` (PgBouncer) |
| `fave_scripts/unify_location_data_v2.py` | Removed `autocommit = True`, wrapped TRUNCATE+INSERT in atomic transaction |
| `fave_scripts/unify_location_data_v3.py` | Same as above |
| `fave_scripts/add_legislative_district.py` | Unified to single connection, added explicit commit/rollback |
| `fave_scripts/relief_db_locks.py` | **NEW** — emergency DB lock relief script |
