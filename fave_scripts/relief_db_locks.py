"""
relief_db_locks.py
==================
Emergency script to relieve Azure PostgreSQL lock cascades and connection saturation.

Run this whenever you see:
  - 500 errors sitewide
  - PM2 logs showing "timeout exceeded when trying to connect"
  - [DB-POOL-ALERT] with high WAITING counts

Steps performed:
  1. Diagnose - show current lock/connection state
  2. Kill stale TRUNCATE / long-running active queries (> 5 min)
  3. Kill idle-in-transaction sessions (> 5 min)
  4. Kill all remaining Lock waiters
  5. Final report
"""

import paramiko
import sys

SERVER_IP = "20.24.58.49"
USER = "Administrator1"
PASS = "7v52E69TYgTE"
DB = "insightEd"
PG_HOST = "127.0.0.1"
PG_PORT = "6432"
PG_USER = "Administrator1"
PG_PASS = "pRZTbQ2T1JD7"

def psql(client, sql, label=""):
    cmd = f'PGPASSWORD={PG_PASS} psql -h {PG_HOST} -p {PG_PORT} -U {PG_USER} -d {DB} -c "{sql}"'
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if label:
        print(f"\n{'='*60}")
        print(f"  {label}")
        print('='*60)
    print(out)
    if err and "WARNING" not in err and "NOTICE" not in err:
        print(f"[ERR] {err}")
    return out

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=SERVER_IP, port=22, username=USER, password=PASS)

    try:
        print("\n🔍 STEP 1 — Diagnosing current DB connection state...\n")
        psql(client,
            "SELECT count(*), state FROM pg_stat_activity WHERE datname='insightEd' GROUP BY state;",
            "Connection counts by state")

        psql(client,
            "SELECT count(*) AS blocked, wait_event_type, wait_event "
            "FROM pg_stat_activity WHERE datname='insightEd' "
            "GROUP BY wait_event_type, wait_event ORDER BY blocked DESC LIMIT 10;",
            "Lock wait breakdown")

        psql(client,
            "SELECT pid, state, round(EXTRACT(EPOCH FROM (now() - query_start))) AS age_sec, "
            "left(query, 80) AS query "
            "FROM pg_stat_activity WHERE datname='insightEd' AND state != 'idle' "
            "ORDER BY age_sec DESC LIMIT 10;",
            "Longest-running queries")

        print("\n💣 STEP 2 — Killing stale active queries (running > 5 minutes)...\n")
        psql(client,
            "SELECT pg_terminate_backend(pid), pid, state, "
            "round(EXTRACT(EPOCH FROM (now() - query_start))) AS age_sec, "
            "left(query, 60) AS query "
            "FROM pg_stat_activity "
            "WHERE datname='insightEd' "
            "  AND state IN ('active', 'idle in transaction') "
            "  AND now() - query_start > interval '5 minutes' "
            "  AND pid != pg_backend_pid();",
            "Terminated stale queries")

        print("\n⛔ STEP 3 — Killing all Lock waiters...\n")
        psql(client,
            "SELECT pg_terminate_backend(pid), pid, state, wait_event "
            "FROM pg_stat_activity "
            "WHERE datname='insightEd' "
            "  AND wait_event_type = 'Lock' "
            "  AND pid != pg_backend_pid();",
            "Terminated lock waiters")

        print("\n✅ STEP 4 — Final connection state after relief...\n")
        psql(client,
            "SELECT count(*), state FROM pg_stat_activity WHERE datname='insightEd' GROUP BY state;",
            "Final counts by state")

        psql(client,
            "SELECT count(*) AS lock_waiters FROM pg_stat_activity "
            "WHERE datname='insightEd' AND wait_event_type = 'Lock';",
            "Remaining lock waiters (should be 0)")

        print("\n🎉 DB relief complete. Monitor PM2 logs for the next 60s to confirm recovery.\n")

    finally:
        client.close()

if __name__ == "__main__":
    main()
