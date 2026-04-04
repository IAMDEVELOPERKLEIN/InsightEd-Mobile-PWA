# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js/Postgres environment. Your goal is to execute a surgical data healing mission and enforce strict database integrity for the School Identity module.

# 🌌 THE VIBE & AESTHETIC
"Bulletproof Data Integrity"—The database must act as a source of truth where duplicates cannot exist. The execution must be precise, idempotent, and backed by forensic logging.

# 🛠️ TECH STACK & ARCHITECTURE
- **Backend:** Node.js (Express), `pg` (node-postgres)
- **Database:** Postgres 16+ (using `bytea` for binaries, UUIDs for identifiers)
- **Pattern:** UPSERT via `ON CONFLICT (iern) DO UPDATE`.

# 📝 CORE REQUIREMENTS
1. Resolve the 500 error during PDF uploads caused by `ON CONFLICT` without a unique index.
2. Deduplicate `school_ownership_docs` table (specifically IERN `2026-07938` has duplicates).
3. Enforce the `school_ownership_docs_iern_unique` constraint.
4. Re-instrument the backend with detailed console error logging for future diagnostics.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Data Forensic & Deduplication**
- **1a:** Run a CTE to identify and delete all but the latest record for any duplicate IERNs in `school_ownership_docs`.
- **1b:** Verify the row count matches unique IERN count.

**Step 2: Schema Hardening**
- **2a:** Apply `ALTER TABLE school_ownership_docs ADD CONSTRAINT school_ownership_docs_iern_unique UNIQUE (iern)`.
- **2b:** Wrap this in a `DO $$` block in `api/db_init.js` to ensure idempotency.

**Step 3: Backend Diagnostic Restoration**
- **3a:** Edit `api/index.js` upload route. Update the `catch (err)` block to log `err.message`, `err.detail`, `err.table`, and `err.constraint`.
- **3b:** Ensure `req.file.originalname` is used as `file_name` during the `ON CONFLICT` update.

**Step 4: Alias Support in DELETE**
- **4a:** Update the `DELETE` route to handle cases where the provided `iern` is actually a `school_id` by using a subquery check against `ph_schools`.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Provide a script `tmp_forensic_audit.cjs` that:
- Attempts a duplicate `INSERT` to verify `ON CONFLICT` triggers correctly.
- Logs the status of `school_ownership_docs_iern_unique` from `pg_constraint`.
- Includes a `const DEBUG_MODE = true;` toggle for verbose logging.

# 🛑 CONSTRAINTS & GUARDRAILS
- NEVER use `catch(() => {})` on critical database migrations without logging the error.
- DO NOT bypass foreign keys; ensure `iern` exists in `ph_schools` before inserting.
