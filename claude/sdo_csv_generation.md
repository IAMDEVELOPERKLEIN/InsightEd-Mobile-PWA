# SYSTEM ROLE
You are an expert full-stack developer operating in a React (Vite) and Node.js (Express) environment. Your goal is to write clean, modular, and highly performant code to add a CSV generation feature to the SDO Monitoring Dashboard.

# 🌌 THE VIBE & AESTHETIC
The dashboard must feel like a premium, enterprise-grade monitoring tool. The "Generate CSV" feature should be a seamless, high-performance utility that feels built-in, not an afterthought. It should match the existing dark/light mode aesthetic with professional interactions.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React with Vite, Tailwind CSS, Lucide Icons (`fi`).
- **Backend:** Node.js (Express), PostgreSQL (Neon DB).
- **Communication:** Axios for API calls.
- **Key Patterns:** Client-side CSV generation using the local state to ensure instant execution and zero additional server load.

# 📝 CORE REQUIREMENTS
1. Update the backend `/api/monitoring/schools` endpoint to join with `ph_school_completion` to retrieve the `total_completion` metric as `completion_percentage`.
2. Implement a `handleGenerateCSV` function in `MonitoringDashboard.jsx` that export the current filtered list of schools.
3. The CSV must include the following columns: Region, Division, District, School ID, School Name, Registered (Yes/No), and Accomplishment (%).
4. Add a "Generate CSV" button to the dashboard header with appropriate icons and styling.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Backend Data Integration**
- **1a:** Modify `insighted-backend/api/index.js` (around line 3636).
- **1b:** Add a `LEFT JOIN ph_school_completion psc ON sp.school_id = (SELECT school_id FROM ph_schools WHERE iern = psc.iern LIMIT 1)`.
- **1c:** Include `psc.total_completion AS completion_percentage` in the `SELECT` list.

**Step 2: CSV Generation Logic**
- **2a:** In `MonitoringDashboard.jsx`, create a helper function `convertSchoolsToCSV(list)` that maps school objects to CSV rows.
- **2b:** Logic should map `is_registered` (or derived from `school_name`) to "Yes/No" and format `completion_percentage` with a "%" suffix.
- **2c:** Implement `handleGenerateCSV` using `Blob` and `URL.createObjectURL` to trigger the download.

**Step 3: UI Integration**
- **2a:** Locate the header/search area in `MonitoringDashboard.jsx`.
- **2b:** Insert a button with `FiDownload` icon and text "Export CSV".
- **2c:** Style the button using Tailwind classes: `bg-indigo-600`, `hover:bg-indigo-700`, `text-white`, `rounded-xl`, etc.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Provide a custom hook or console utility within `MonitoringDashboard` to:
- Log `DEBUG: Exporting N schools` when the button is clicked.
- Validate that all required columns are present in the first row of the generated data.
- Toggle telemetry with `const DEBUG_EXPORT = true;`.

# 🛑 CONSTRAINTS & GUARDRAILS
- Ensure the CSV filename includes a timestamp (e.g., `monitoring_report_20240407.csv`).
- Handle cases where `completion_percentage` might be null (default to "0.00%").
- DO NOT add external CSV libraries; use native JavaScript for the export to minimize bundle size.
