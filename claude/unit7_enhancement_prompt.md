# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js/React (Vite) and PostgreSQL environment. Your goal is to write clean, modular, and highly performant code to restore missing seating capacity data and fix redundant grade level selections in Unit 7 Physical Facilities.

# 🌌 THE VIBE & AESTHETIC
The interface should feel robust and precise—an "Architecture Profile" that is both detailed and easy to scan. Selection logic must be "smart" to reduce cognitive load on the user by hiding redundant options.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React, TailwindCSS, Lucide/Feather Icons (FiX/FiCheck), Framer Motion.
- **Backend:** Node.js Express, `pg` (PostgreSQL) pool.
- **Key Patterns:** Granular room setup with automated building-to-room relationship mapping.

# 📝 CORE REQUIREMENTS
1. **Database Schema Enforcement**: Add `seats` column to `ph_buildings_inventory`.
2. **Data Persistence**: Update the `/api/save-physical-facilities` POST handler to save `room.seats`.
3. **Smart Grade Filtering**: In the frontend, filter out monogrades (e.g., Grade 1) if they are part of an active multigrade group (e.g., "Grades 1, 2, and 3").
4. **Summary Visibility**: Display the `seats` count in the Summary Dashboard's room table.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Backend DDL & Persistence Layer**
- **1a:** In `api/index.js`, add an idempotent `ALTER TABLE` to ensure `ph_buildings_inventory` has the `seats` column.
- **1b:** Update the `INSERT` statement in the `/api/save-physical-facilities` handler to include the `seats` field.

**Step 2: Frontend "Smart" Grade logic**
- **2a:** In `src/components/modular/Unit7PhysicalFacilities.jsx`, update the `useEffect` that initializes `availableGrades`.
- **2b:** Implement logic to parse multigrade group labels and filter the `detectedGrades` list accordingly.

**Step 3: UI Enhancement (Summary Table)**
- **3a:** Update the `SummaryDashboard` component in `Unit7PhysicalFacilities.jsx` to add a "Seats" header and cell to the room listing table.

**Step 4: Final Verification**
- **4a:** Ensure data saves and persists across page reloads.
- **4b:** Verify the "smart" filtering works for various multigrade permutations.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```javascript
// Add this temporary snippet in Step 3 of the component to sanity check the available grades
const DEBUG_AVAILABLE_GRADES = true;
if (DEBUG_AVAILABLE_GRADES) {
    console.log("🔍 Unit 7 Grade Selection Debug:", {
        available: availableGrades.map(g => g.label),
        mgGroups: mgGroups.map(m => m.label)
    });
}
```

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT break existing room generation logic.
- AVOID adding `seats` to the Summary table if it makes the table look too crowded on mobile (use `text-[9px]` or similar sizing).
- ENSURE `seats` defaults to an empty string if not provided, to avoid "null" or "0" appearing incorrectly.
