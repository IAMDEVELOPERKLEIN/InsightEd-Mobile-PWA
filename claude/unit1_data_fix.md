# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js/Express and PostgreSQL environment. Your goal is to write clean, modular, and highly performant code to restore Unit 1 data persistence.

# 🌌 THE VIBE & AESTHETIC
This fix needs to feel "Bulletproof" and "Self-Healing". The data flow must be robust, ensuring that when a school head returns to their dashboard, their previously submitted School Identity data is instantly and accurately restored. The backend should act as a reliable "Single Source of Truth".

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (Vite), Framer Motion (already implemented in Unit1SchoolIdentity.jsx)
- **Backend:** Express.js (insighted-backend/api/index.js)
- **Database:** PostgreSQL (pg pool)
- **Key Patterns:** Recursive Error Rectification, SQL Upsert (ON CONFLICT), Persistent Binary Registry for documents.

# 📝 CORE REQUIREMENTS
1. **Schema Stabilization**: Ensure `ph_schools` table has the necessary columns (`local_file_path`, `local_file_name`) for document persistence.
2. **Retrieve Details**: Implement a robust `GET /api/ph_schools/:schoolId` endpoint that returns all Unit 1 fields.
3. **Persist Everything**: Update the `POST /api/ph_schools/unit1` endpoint to save the full dataset sent by the frontend, including ownership details and file references.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Database Schema Migration**
- **1a:** Add `local_file_path` and `local_file_name` to `ph_schools` using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- **1b:** Add any other missing Unit 1 columns identified during research.

**Step 2: Backend Implementation (index.js)**
- **2a:** Implement `app.get('/api/ph_schools/:schoolId', ...)` to return `{ exists: true, data: { ... } }` from `ph_schools`.
- **2b:** Refactor `app.post('/api/ph_schools/unit1', ...)` to capture all fields from `req.body` and perform a robust `UPDATE` or `INSERT`.

**Step 3: Verification & Diagnostics**
- **3a:** Create a diagnostic script `system_scripts/verify_unit1_persistence.js` to test the full loop (Save -> Load -> Verify).
- **3b:** Run the script and fix any discrepancies.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Provide a script `system_scripts/unit1_health_check.js` that:
- Connects to the DB and checks if a specific school's Unit 1 data is consistent.
- Logs any null fields that should be populated for a "Complete" unit.
- Includes a `DEBUG_MODE` toggle for detailed SQL query logging.

# 🛑 CONSTRAINTS & GUARDRAILS
- USE explicit column names in SQL queries; DO NOT use `SELECT *` in production code.
- ENSURE `iern` and `school_id` are handled consistently as identifiers.
- AVOID breaking existing routes.
