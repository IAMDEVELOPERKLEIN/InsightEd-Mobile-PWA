# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js (Express) and React (Vite) environment. Your goal is to write clean, modular, and highly performant code based on the following specifications.

# 🌌 THE VIBE & AESTHETIC
The Unit 7 Physical Facilities audit needs to feel authoritative yet user-friendly. The UI should be premium, featuring sleek transitions and tactile toggles. The room audit process in Step 3 should feel organized and efficient, using a clear "In Use" vs "Not Used" visual state change (e.g., color shift, badge update).

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (Vite), TailwindCSS, Framer Motion, Lucide Icons.
- **Backend:** Node.js, Express, PostgreSQL (pool client).
- **Key Patterns:** Modular wizard-style forms, partial sync via REST API, local draft persistence in IndexedDB.

# 📝 CORE REQUIREMENTS
1. **Fix Completion Bug:** Ensure `save-physical-facilities` backend only marks the unit as completed if `isPartial` is FALSE.
2. **Room Usage Toggle:** Add an `is_in_use` (BOOLEAN) field to each room in `ph_buildings_inventory` and the frontend state.
3. **Draft Identity Fix:** Ensure Unit 7 drafts are saved with the correct unit ID (`7`) instead of `8`.
4. **UI Integration:** Add a modern, accessible toggle for "In Use / Not Used" in the Granular Room Setup (Step 3).

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Backend Implementation**
- **1a:** Update `api/index.js` to include `is_in_use` in the `ph_buildings_inventory` table DDL.
- **1b:** Modify the `INSERT` logic for rooms to include the `is_in_use` value.
- **1c:** Wrap the completion flag update (`unit8_completed`, `unit7_completion`) in a conditional check for `!data.isPartial`.

**Step 2: Frontend State & Room Generation**
- **2a:** Update `Unit7PhysicalFacilities.jsx` room generation (around line 507) to include `is_in_use: true` by default.
- **2b:** Ensure `is_in_use` is captured in the backend payload.

**Step 3: Granular Room UI Setup**
- **3a:** Add the "In Use" vs "Not Used" toggle in Step 3 (around line 1795). 
- **3b:** Style the room card to change appearance (e.g., opacity or border color) when a room is marked as "Not Used".

**Step 4: Draft Logic Fix**
- **4a:** Correct `handleSaveDraftAndExit` in `Unit7PhysicalFacilities.jsx` to use unit ID `7`.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```javascript
// Unit 7 Diagnostic Hook
const useUnit7Diagnostics = (roomsData, isPartial) => {
    const DEBUG_MODE = true;
    useEffect(() => {
        if (DEBUG_MODE) {
            console.log("[Unit 7 Diagnostic] State Update:", {
                roomCount: roomsData.length,
                unusedRooms: roomsData.filter(r => !r.is_in_use).length,
                isPartialMode: isPartial
            });
            
            // Check for potential completion flag leaks
            if (isPartial && localStorage.getItem('quest_progress')?.includes('"7"')) {
                console.warn("[Unit 7 Diagnostic] Critical: Unit 7 marked completed in local storage during partial sync!");
            }
        }
    }, [roomsData, isPartial]);
};
```

# 🛑 CONSTRAINTS & GUARDRAILS
- ALWAYS use the most specific Lucide/Fi icons for the toggle.
- DO NOT break existing room validation (Step 3).
- ENSURE `is_in_use` is persisted in the partial sync payload.
