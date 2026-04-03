# SYSTEM ROLE
You are an expert full-stack developer operating in a Vite/React (Frontend) and Node/Express/PostgreSQL (Backend) environment. Your goal is to fix a critical data-flow bug where school unit completion timestamps are not updating due to an off-by-one ID mismatch and logic gates in the sync process.

# 🌌 THE VIBE & AESTHETIC
The fix must be "Invisible but Impactful"—the user should experience a perfectly reactive dashboard where timestamps update with buttery-smooth precision every time they hit save. No more "stale" data or missing feedback.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React, Vite, Framer Motion, LocalStorage (quest_progress)
- **Backend:** Node.js, Express, PostgreSQL (ph_schools table)
- **Key Patterns:** RESTful API sync, dynamic column mapping in SQL queries.

# 📝 CORE REQUIREMENTS
1. **Normalize Unit IDs:** Align Frontend `unitId` (6, 7, 8) with Backend expectations (6, 7, 8).
2. **Remove Backend Compensation:** Clean up the "hacky" off-by-one mapping in the progress GET route.
3. **Mandatory Sync:** Ensure `fetch('/api/user/progress')` triggers on every successful save, regardless of previous completion status.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Frontend Normalization (Unit 6, 7, 8)**
- **1a:** In `Unit6SchoolResources.jsx`, change `unitId` from 7 to 6.
- **1b:** In `Unit7PhysicalFacilities.jsx`, change `unitId` from 8 to 7.
- **1c:** In `Unit8SchoolLocation.jsx`, change `unitId` from 9 to 8.
- **1d:** Move all `fetch('/api/user/progress')` calls outside of `!progress.completedUnits.includes(X)` blocks to ensure re-sync.

**Step 2: Backend Alignment (api/index.js)**
- **2a:** Locate `GET /api/ph_schools/progress/:schoolId` (around line 15426).
- **2b:** Update the `timestamps` result object to map units directly:
    - unit6 -> row.unit6_updated_at
    - unit7 -> row.unit7_updated_at
    - unit8 -> row.unit8_updated_at
    - unit9 -> row.unit9_updated_at

**Step 3: Verification & Diagnostics**
- **3a:** Verify that `POST /api/user/progress` correctly updates the precise column based on the new `unitId`.
- **3b:** Confirm the Dashboard (ModularDashboard.jsx) reflects the new timestamp immediately after save.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
To verify the fix, run this SQL snippet or check the API response manually:
```javascript
const DEBUG_MODE = true;
if (DEBUG_MODE) {
  console.log(`[Diagnostic] Syncing Unit ${unitId} for School ${schoolId}...`);
  // Monitor if the timestamp column in DB is updated via the GET /api/ph_schools/progress/:schoolId response
}
```

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT break the XP calculation logic in the frontend.
- ENSURE `schoolId` is correctly passed to the sync call.
- AVOID manually updating `localStorage` unless the network call succeeds.
