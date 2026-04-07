# SYSTEM ROLE
You are an expert full-stack developer operating in a React, Node.js, and PostgreSQL environment. Your goal is to resolve a critical data persistence and state mapping issue in the Unit 7 Physical Facilities module.

# 🌌 THE VIBE & AESTHETIC
This needs to feel **Bulletproof & Enterprise**. We are dealing with data integrity for building inventories. The fix must be logically sound, transactionally safe, and provide clear feedback to the user. No room for "silent failures" or misaligned dashboard statuses.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React, Vite, Framer Motion, IndexedDB (idb) for local drafts.
- **Backend:** Node.js (Express), PostgreSQL (pg-pool), Transactional Updates.
- **Unit Flow:** Modular "InsightEd Quest" dashboard tracking unit completion via `unitX_completed` boolean flags and `unitX` integer status columns (0=Not Started, 1=Done, 2=In Progress).

# 📝 CORE REQUIREMENTS
1. **Align Unit Mapping:** Ensure Dashboard Unit 6 maps to `unit6_completed` and Dashboard Unit 7 maps to `unit7_completed` in the database. Fix the current shift where both units are fighting for the same column.
2. **Persistence Fix:** Ensure `Unit7PhysicalFacilities` correctly saves all buildings and rooms to `ph_buildings_inventory`, and that `fetchMasterData` correctly loads them back using the updated mapping.
3. **Draft Resilience:** Maintain IndexedDB draft integrity for Unit 7 even when the number of buildings is high (14+).
4. **Dashboard Synchronization:** Ensure that a "Partial Sync" in Unit 7 does not accidentally clear the completion status of Unit 6 on the dashboard.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Backend Alignment (api/index.js)**
- **1a:** Update the `GET /api/ph_schools/progress/:schoolId` route. Correct the mapping for Units 6, 7, and 8 so they point to `unit6_completed`, `unit7_completed`, and `unit8_completed` respectively.
- **1b:** Update the `GET /api/ph_schools/unit10/:schoolId/master` route. Ensure the `isCompleted` flag checks `unit7_completed` (the correct column for Physical Facilities).
- **1c:** Audit `POST /api/save-physical-facilities`. Ensure it updates `unit7_completed` and follow the transactional pattern for re-inserting inventory.

**Step 2: Unit 6 Component Fix (Unit6SchoolResources.jsx)**
- **2a:** Change the save logic to target `unit6_completed` instead of `unit7_completed`. 
- **2b:** Update the offline outbox payload to also use `unit6_completed`.

**Step 3: Unit 7 Component Enhancement (Unit7PhysicalFacilities.jsx)**
- **3a:** Update `fetchMasterData` to recognize the corrected `isCompleted` flag from the master fetch.
- **3b:** Robustify the `roomsData` construction to prevent index/ID collisions when many buildings are present.

**Step 4: Verification & Polish**
- **4a:** Verify that saving Unit 7 (either partial or final) no longer clears Unit 6's "Done" status on the dashboard.
- **4b:** Test the loading of 14+ buildings from the database to ensure no data loss occurs during the grouping-by-name phase.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```javascript
const DEBUG_MODE = true;
if (DEBUG_MODE) {
    console.log("[Unit7-Diagnostic] Current Buildings State:", buildings);
    console.log("[Unit7-Diagnostic] Total Rooms Mapped:", roomsData.length);
    console.log("[Unit7-Diagnostic] Payload mapping check - unit7_completed should be used.");
}
```

# 🛑 CONSTRAINTS & GUARDRAILS
- ALWAYS use database transactions for deletions/re-insertions of building inventory.
- DO NOT hardcode unit IDs in the components; always use the `unitId` prop if available, but ensure it matches the actual dashboard position (Unit 7).
- AVOID clearing the entire `roomsData` state unless the user explicitly deletes a building.
