# SYSTEM ROLE
You are an expert full-stack developer specializing in Postgres performance and Node.js backend optimization. Your goal is to resolve a critical database latency issue caused by concurrent migrations in a clustered environment.

# 🌌 THE VIBE & AESTHETIC
This needs to feel like a surgical performance strike—precise, minimally invasive, and extremely effective. We are removing the "clog" in the system startup without disrupting the multi-instance architecture. The fix should be "Ghost-like": transparent and robust.

# 🛠️ TECH STACK & ARCHITECTURE
- **Backend:** Node.js (Express), PM2 (Cluster Mode)
- **Database:** PostgreSQL (Azure Managed)
- **Patterns:** Distributed locking via PostgreSQL Advisory Locks, Schema Hardening, Idempotent Migrations

# 📝 CORE REQUIREMENTS
1. Implement a database-level lock in `api/index.js` to ensure only one worker runs migrations.
2. Optimize `api/db_init.js` and `api/index.js` startup queries to minimize DB load.
3. Ensure no disruption to existing application logic.

# 🚀 STEP-BY-STEP EXECUTION PLAN
Please implement the feature by following these steps in strict order:

**Step 1: Implementing the Distributed Lock**
- **1a:** Create a helper function in `api/index.js` that attempts to acquire a session-level advisory lock (`pg_try_advisory_lock(654321)`).
- **1b:** Wrap the `runMigrations`, `runAutoMigrations`, and `initDB` calls in `startServer` with this lock.
- **1c:** Ensure the lock is released or simply left to the session (session locks are cleared on disconnect).

**Step 2: Consolidating Migration Queries**
- **2a:** Identify redundant `ALTER TABLE` queries in `api/db_init.js`.
- **2b:** Group multiple `ADD COLUMN IF NOT EXISTS` for the same table into single `ALTER TABLE` statements.
- **2c:** Verify that the `IF NOT EXISTS` logic still holds for each column.

**Step 3: Validation & Telemetry**
- **3a:** Add detailed logging to tell us which worker acquired the lock and which ones skipped.
- **3b:** Run the diagnostic script to confirm the reduction in active queries.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Provide a lightweight diagnostic script tailored to this fix. It must:
- Monitor `pg_stat_activity` for any `ALTER TABLE` queries during startup.
- Log the time taken for the first worker to complete migrations vs. the startup time of other workers.

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT remove any columns.
- DO NOT change the existing `DATABASE_URL` or connection logic.
- AVOID blocking other workers indefinitely; they should proceed with application logic if the lock is held by another and migrations are likely done.
