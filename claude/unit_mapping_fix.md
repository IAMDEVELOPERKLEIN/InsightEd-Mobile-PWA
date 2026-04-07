# [SYSTEM ROLE]
You are an expert full-stack developer operating in a Node.js/PostgreSQL environment. Your goal is to restore logical 1-to-1 mapping between UI Units and Database columns to resolve data synchronization failures.

# 🌌 THE VIBE & AESTHETIC
The implementation must be **Bulletproof** and **Deterministic**. There should be zero ambiguity in how a Unit ID is translated to its database counterpart. The fix should feel like a "total alignment" of the system's gears, resolving all off-by-one friction.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (Modular Components Unit 1-10)
- **Backend:** Node.js / Express / `pg` (PostgreSQL)
- **Key Pattern:** 1-to-1 Deterministic Mapping (`UI Unit X` -> `DB Unit X`)

# 📝 CORE REQUIREMENTS
1. **Unify Mapping:** Eliminate the `+1` offset for Units 6, 7, and 8 in `getDBUnitFromUIUnit`.
2. **Synchronize Records:** Ensure `unit8_updated_at` is correctly populated during Unit 8 (School Terrain) saves.
3. **Audit Reporting:** Fix the `Fetch Quest Progress` mapping to correctly report timestamps for units 6-10.
4. **Data Integrity:** Update the `PATCH /api/schools/.../complete` route to return all unit status columns correctly.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Correct the Mapping Heuristic**
- **1a:** Refactor `getDBUnitFromUIUnit` (line 908) to return `parseInt(uiUnit)` directly for any value 1-10.
- **1b:** Audit `updateSchoolTotalCompletion` (line 917) to ensure it loops through all 10 possible units rather than capping at 8.

**Step 2: Fix Unit-Specific Save Routes**
- **2a:** **Phys Facilities (Unit 7)**: Update line 12118-12138 to use `unit7`, `unit7_completed`, and `unit7_updated_at`. Rename `isUnit7Completed` to avoid confusion if necessary, but strictly map to index 7.
- **2b:** **School Location (Unit 8)**: Update line 17881-17884 to use `unit8`, `unit8_completed`, and `unit8_updated_at`. Ensure the `updated_at` timestamp is explicitly set.

**Step 3: Fix Reporting & Patch Endpoints**
- **3a:** **Quest Progress Fetch**: Update the `timestamps` mapping (line 16133) to be a direct 1-to-1 map (`unitN` -> `row.unitN_updated_at`).
- **3b:** **Unit Completion Patch**: Update line 783-807 to include `unit6` in the `RETURNING` clause and fix the response JSON mapping.

**Step 4: Hot-Fix & Verification**
- **4a:** Execute a diagnostic script to verify that saving Unit 8 now correctly populates `unit8_updated_at`.
- **4b:** Check the dashboard "Last Updated" display for Unit 8.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Provide a lightweight JS script (`system_scripts/verify_unit_alignment.cjs`) that:
- Queries the `ph_schools` table for a specific ID.
- Compares the `unitX_completed` flag with the presence of `unitX_updated_at`.
- Highlights any mismatches (e.g., "Unit 8 completed but timestamp is null").
- Includes a simple `const FIX_MODE = true;` to backfill missing timestamps from `updated_at` if found.

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT skip any unit index (6, 7, 8).
- AVOID hardcoding the number of units as `8` where the system supports 10.
