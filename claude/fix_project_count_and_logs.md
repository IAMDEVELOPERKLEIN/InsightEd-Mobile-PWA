# Implementation Plan: Fix Project Count & Status Persistence

This plan addresses two critical issues in the Division Engineer and Architect workflow:
1. **Project Count Limit:** Accurate reporting of total projects on the Home tab.
2. **Log Persistence:** Decoupling procurement updates from construction status logs to prevent false activity entries.

## Proposed Changes

---

### Component: Frontend Dashboards

#### [MODIFY] [EngineerDashboard.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/EngineerDashboard.jsx)
- **Current Issue:** The dashboard fetches projects via `/api/projects` using the default limit of 50, causing inaccurate summary statistics.
- **Fix:** Update the API request URL to include `&limit=all`. This tells the backend to return the full set of projects for the engineer's jurisdiction, allowing accurate "Total ABC" and "Status Mix" calculations.

#### [MODIFY] [UpdateProjectWizard.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/components/UpdateProjectWizard.jsx)
- **Current Issue:** In `handleSubmit`, the logic defaults `finalStatus` to `"Not Yet Started"` if the project is still under procurement. If the project's original status was `null` in the database, this triggers a "Construction Status Change" log entry.
- **Fix:** Update `handleSubmit` to strictly preserve the existing construction status from the `project` object if `isProcurementComplete` is false.
- **UI Update:** Ensure the Step 5 (Confirm) screen accurately reflects that construction status is "Preserved" rather than "Reset" during procurement updates.

---

### Component: Backend API

#### [MODIFY] [index.js](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/api/index.js)
- **Feature Update: "Turn off Limit" for `/api/projects`:**
    - Modify the GET route logic to check for `limit=all`.
    - If `limit=all` is provided, omit the `LIMIT` and `OFFSET` clauses from the SQL query to return all matching records.
- **Fixes for Update Route:**
    1. **Normalization:** Standardize `statusMapping` to be case-insensitive.
    2. **Robust Log Detection:** Update the `changes` array logic:
        - Treat `null` and `"Not Yet Started"` as logically equivalent for construction status if no actual construction data was in the request.
        - Ensure construction status is only logged if it was actually part of the update payload.

## Verification Plan

### Automated Tests
- None (manual verification using the browser is preferred for UI/Log synchronization).

### Manual Verification
1. **Project Count:**
    - Log in as a Division Engineer with more than 50 projects.
    - Verify that the "Total Projects" counter and "ABC" values on the Home tab reflect the actual totals, not 50.
2. **Status Logging:**
    - Open the **Update Project Wizard** for a project currently "Under Procurement."
    - Update only the procurement milestones or status (e.g., set to "Under Procurement" with a new justification).
    - Save the project and then click the **LOGS** button on the project card.
    - Verify that the log entry **only** mentions "Procurement Status" and does not include a "Construction Status" entry if it wasn't changed.
3. **Construction Activation:**
    - Update a project to "Procurement Complete."
    - Verify that in a subsequent update, construction status can be changed (e.g., to "Ongoing") and that this change **is** correctly logged in the activity history.
