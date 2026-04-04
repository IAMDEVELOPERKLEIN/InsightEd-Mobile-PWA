# SYSTEM ROLE
You are an expert full-stack developer operating in a React (Vite), Express, and PostgreSQL environment. Your goal is to write clean, modular, and highly performant code to fix a data mapping inconsistency between the frontend and backend.

# 🌌 THE VIBE & AESTHETIC
The fix must be seamless and invisible to the user. The "Units" dashboard should feel reactive and reliable, ensuring that "Done" status and "Last Updated" timestamps appear immediately after form completion, reflecting the true state of the school's data progress.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React, React Router, LocalStorage for progress caching.
- **Backend/State:** Node/Express API with PostgreSQL (pg pool).
- **Key Patterns:** Shifted unit mapping (UI ID vs. DB Col ID) handled via API payload adjustment.

# 📝 CORE REQUIREMENTS
1. Ensure UI Unit 8 (School Terrain) sends `unitId: 9` to the backend.
2. Ensure UI Unit 6 (School Resources) sends `unitId: 7` to the backend.
3. Update local `quest_progress` cache in browser to reflect completion immediately.
4. Maintain existing XP and Success Modal logic.

# 🚀 STEP-BY-STEP EXECUTION PLAN
Please implement the feature by following these steps in strict order:

**Step 1: Frontend Modification (Unit 8)**
- **1a:** Locate `handleSaveSuccess` in `Unit8SchoolLocation.jsx`.
- **1b:** Change the `unitId` in the `fetch('/api/user/progress')` call from `8` to `9`.

**Step 2: Frontend Modification (Unit 6)**
- **2a:** Locate `handleFinalSubmit` in `Unit6SchoolResources.jsx`.
- **2b:** Change the `unitId` in the `fetch('/api/user/progress')` call from `6` to `7`.

**Step 3: Verification & Polish**
- **3a:** Verify that `Unit7PhysicalFacilities.jsx` already correctly sends `unitId: 8`.
- **3b:** Ensure the `quest_progress` in LocalStorage is still updated using the UI IDs (8 and 6) to keep the dashboard logic consistent.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```javascript
// --- Progress Sync Diagnostic Tool ---
(async function diagnoseProgressSync() {
    console.group("🔍 Antigravity Progress Diagnostic");
    const DEBUG_MODE = true;
    
    if (DEBUG_MODE) {
        const schoolId = localStorage.getItem('schoolId');
        console.log("🏫 School ID:", schoolId);
        
        // Check local cache
        const stored = localStorage.getItem('quest_progress');
        const progress = stored ? JSON.parse(stored) : null;
        console.log("📦 Local Progress Cache:", progress);
        
        // Verify Mappings
        const mappings = {
            6: 7, // UI 6 -> DB 7
            7: 8, // UI 7 -> DB 8
            8: 9  // UI 8 -> DB 9
        };
        console.log("🗺️ Expected Mappings:", mappings);
        
        // Test Fetch (Read-only check)
        try {
            const res = await fetch(`/api/ph_schools/progress/${schoolId}`);
            const data = await res.json();
            console.log("🌐 Server Progress Data:", data.progress);
            
            if (data.progress.timestamps.unit8) {
                console.log("✅ Unit 8 (UI) / Unit 9 (DB) has timestamp:", data.progress.timestamps.unit8);
            } else {
                console.warn("❌ Unit 8 (UI) / Unit 9 (DB) timestamp is MISSING.");
            }
        } catch (e) {
            console.error("❌ Diagnostic Fetch Failed:", e);
        }
    }
    console.groupEnd();
})();
```

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT change the UI IDs used in `localStorage.setItem('quest_progress', ...)` as the `ModularDashboard.jsx` relies on these IDs (1-8).
- ONLY update the `unitId` sent to the `/api/user/progress` POST endpoint to align with the database column indices.
