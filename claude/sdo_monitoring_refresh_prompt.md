# SYSTEM ROLE
You are an expert full-stack developer operating in a Vite-based React PWA environment. Your goal is to write clean, modular, and highly performant code based on the following specifications.

# 🌌 THE VIBE & AESTHETIC
The SDO Monitoring Dashboard should feel focused and efficient. We are removing redundant "Insights" and focusing on "Districts" as the primary organizational unit for SDO users. The UI remains premium with glassmorphism and smooth Framer Motion transitions, but we are simplifying the school list by removing non-essential data like enrollment and non-functional icons to prioritize completion tracking.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (Vite), Tailwind CSS, Framer Motion
- **Icons:** `react-icons/fi` (Feather), `react-icons/tb` (Tabler)
- **State Management:** React Hooks (useState, useMemo, useEffect), Context API (AuthContext)
- **Routing:** React Router v6

# 📝 CORE REQUIREMENTS
1.  **Leading District Focus**: In the SDO monitoring view, replace the "Leading Division" statistic card with a "Leading District" card that dynamically displays the top-performing district within the current division.
2.  **Streamlined School List**:
    - Reorder and filter columns in the school drilldown table.
    - Show `School` details first, followed by `Completion Percentage`.
    - Remove the `Enrolment` column entirely as it is redundant for this tracking view.
    - Remove the "Chevron Right" arrow icon from each school row as it currently lacks functionality.
3.  **Navigation Cleanup**: Remove the "Insights" tab from the bottom navigation bar for both `Regional Office` and `School Division Office` roles, as it mirrors the Home tab functionality.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Data Logic Optimization in MonitoringDashboard.jsx**
- **1a:** Create a new `useMemo` called `leadingDistrict` that iterates over `districtList` to find the district with the highest `avgPct`.
- **1b:** Update the `TopStatCard` for "Leading Division" to display "Leading District" instead.
- **1c:** Map the `value` and `secondaryValue` of the card to the new `leadingDistrict` data.

**Step 2: School List UI Refinement**
- **2a:** Locate the table header in the `level === 'schools'` section and remove the "Enrolled" span.
- **2b:** Adjust the grid layout from `grid-cols-[1fr_auto_auto]` to `grid-cols-[1fr_auto]` (or adjusted for mobile/desktop parity) to accommodate the removal.
- **2c:** In the school row mapping, remove the `span` displaying `total_enrollment`.
- **2d:** Remove the `button` containing `FiChevronRight` at the end of each row.

**Step 3: Bottom Navigation Update in BottomNav.jsx**
- **3a:** Locate `navConfigs` for 'Regional Office'.
- **3b:** Remove the `Insights` object from the array.
- **3c:** Locate `navConfigs` for 'School Division Office'.
- **3d:** Remove the `Insights` object from the array.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```javascript
// Add this to MonitoringDashboard.jsx temporarily for verification
useEffect(() => {
  if (DEBUG_MODE) {
    console.log('[MonitoringDebug] Leading District:', leadingDistrict);
    console.log('[MonitoringDebug] Total Districts:', districtList.length);
    console.log('[MonitoringDebug] School List Columns:', document.querySelector('.grid-cols-\\[1fr_auto_auto\\]') ? 'Old' : 'Updated');
  }
}, [leadingDistrict, districtList, schoolList]);
const DEBUG_MODE = true;
```

# 🛑 CONSTRAINTS & GUARDRAILS
- Maintain the existing design system (Tailwind colors like `slate`, `blue`, `emerald`).
- Ensure `AnimatePresence` and `motion` components are preserved for smooth transitions.
- Do NOT break the logic for other roles (Regional Office, Central Office) while modifying shared components, focusing on the conditional rendering or specific role configurations.
