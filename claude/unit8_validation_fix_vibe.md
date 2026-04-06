# SYSTEM ROLE
You are an expert full-stack developer specializing in Node.js, PostgreSQL, and Zod. Your goal is to implement a robust, "bulletproof" fix for a Status 500 validation failure in the School Location module (Unit 8/9).

# 🌌 THE VIBE & AESTHETIC
**Vibe:** Bulletproof & Enterprise.
This implementation must be extremely resilient. It should handle edge cases like missing IERNs, ensure strict type safety via Zod, and maintain perfect data integrity in the database. Every database operation must be transactional or idempotent (UPSERT).

# 🛠️ TECH STACK & ARCHITECTURE
- **Backend:** Node.js (Express), `pg` (PostgreSQL client)
- **Validation:** Zod 3.x
- **Database:** PostgreSQL (Azure/Local)
- **Frontend Logic:** React-Hook-Form, Fetch API

# 📝 CORE REQUIREMENTS
1. **Schema Resilience:** Ensure `school_location_profiles` has all required columns including `risk_index` and `insurgency_threats_6mo`.
2. **Robust UPSERT:** The `POST /api/school-location` route must handle conflicts on both `school_id` and `iern`.
3. **Data Integrity:** Synchronize the `hazard_risk_score` in the main `ph_schools` table when the profile is saved.
4. **Safety Score Hardening:** Ensure the `calculateRiskIndex` utility handles null/undefined nested array data without crashing.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Database Schema Hardening**
- **1a:** Modify `api/db_init.js` to add `IF NOT EXISTS` columns to `school_location_profiles`: `risk_index` (int), `insurgency_threats_6mo` (int), `updated_at` (timestamp).
- **1b:** Add a `UNIQUE` constraint or ensure `school_id` is indexed/unique to support fallback UPSERT.

**Step 2: API Logic Refinement**
- **2a:** Update the Zod schema in `api/index.js` to ensure all fields are coerced correctly and handle nulls.
- **2b:** Rewrite the `INSERT ... ON CONFLICT` query to be more robust. If `iern` is missing, ensure the conflict handling moves to `school_id`.
- **2c:** Harden the `values` array by ensuring no `undefined` values are passed to `pool.query`.

**Step 3: Completion Flag Synchronization**
- **3a:** Update the `UPDATE ph_schools` query to include `hazard_risk_score = $4` in addition to the completion flags.

**Step 4: Utility Hardening**
- **4a:** Update `api/utils/safetyScore.js` with defensive checks for array items (e.g., `data.water_proximity.some(w => w?.distance_km < 0.5)`).

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Create `api/diag_unit8.cjs`. It must:
- Test DB connection.
- Verify the existence and types of all columns in `school_location_profiles`.
- Attempt a dry-run UPSERT with a record lacking an `iern`.
- Toggle `const DEBUG_SCHEMA = true;` to log detailed table metadata.

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT remove existing columns.
- DO NOT break compatibility with the frontend `SchoolLocation.jsx` field names.
- ALWAYS use parameterized queries to prevent SQL injection.
