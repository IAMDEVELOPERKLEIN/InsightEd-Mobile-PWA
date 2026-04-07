# SYSTEM ROLE
You are an expert full-stack developer operating in a React and Node.js environment. Your goal is to fix a critical data integrity bug in the Unit 7 Physical Facilities module.

# 🌌 THE VIBE & AESTHETIC
A reliable, data-consistent engineering tool. When a user creates multiple buildings, they must remain distinct and correctly associated with their rooms, no matter how many times they save, load, or re-edit. The architecture must feel stable and "heavy"—nothing should shift or collapse unexpectedly.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React, TailwindCSS.
- **Backend:** Node.js, PostgreSQL (ph_buildings_inventory table).
- **Key Pattern:** Flat room-level storage with embedded building attributes (`building_name`).

# 📝 CORE REQUIREMENTS
1. Fix the "Building Collapse" bug where multiple buildings merge into one during re-edit.
2. Ensure `building_name` is correctly populated and persisted for every room.
3. Fix the "N/A" building tag issue caused by missing room-to-building associations.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Audit and Fix fetchMasterData in Unit7PhysicalFacilities.jsx**
- **1a:** Locate the `fetchMasterData` function (around line 385).
- **1b:** Inside the `inventory.forEach` loop, find the `allRooms.push` logic.
- **1c:** Add `building_name: b.building_name` to the room object being pushed.
- **1d:** Also ensure `is_in_use: r.is_in_use !== false` is correctly mapped (using `!== false` to handle boolean defaults).

**Step 2: Verification of State Resilience**
- **2a:** Verify that when `buildings` state is set from `inventory`, each building object correctly contains its unique name.
- **2b:** Verify that `roomsData` now contains the `building_name` for every room, ensuring that any subsequent save payload correctly includes this critical metadata.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```javascript
const DEBUG_UNIT7_SYNC = true;
const verifyBuildingIntegirty = (buildings, rooms) => {
    if (!DEBUG_UNIT7_SYNC) return;
    const roomBuildingNames = new Set(rooms.map(r => r.building_name).filter(Boolean));
    const buildingNames = new Set(buildings.map(b => b.building_name));
    
    console.log(`[Unit7-Sync-Debug] Buildings (${buildings.length}):`, Array.from(buildingNames));
    console.log(`[Unit7-Sync-Debug] Rooms tagged with buildings:`, Array.from(roomBuildingNames));
    
    if (buildingNames.size > 1 && roomBuildingNames.size === 1) {
        console.error("❌ CRITICAL: Building collapse detected! All rooms are pointing to a single building name.");
    }
};
```

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT change the backend GET route logic yet; fix the data source in the frontend first.
- DO NOT remove `building_local_id` as it is used for local state mapping before save.
- ENSURE `is_in_use` is handled correctly as it is a boolean field in the database.
