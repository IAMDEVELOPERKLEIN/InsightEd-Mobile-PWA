# [PLAN] Fix: Procurement Status UI Reversion

## Problem
When a user updates "Procurement Status" to "Under procurement", the update is successful in the database (verified by audit), but the UI in the Engineer Dashboard reverts to "Not yet procured" or shows a stale state.

## Root Cause
- **Casing Mismatch:** The backend `statusMapping` in `api/index.js` converts the string to Title Case: `"Under Procurement"`. 
- **Frontend Expectation:** The `<select>` dropdown in `EngineerProjects.jsx` uses the value `"Under procurement"` (lowercase 'p').
- **Display Failure:** Because the value from the database (`"Under Procurement"`) does not exactly match any `<option>` value in the frontend, the dropdown fails to select the item and reverts to the default/placeholder.

## Proposed Changes

### 1. Backend: Standardize Status Strings
- **File:** `api/index.js`
- **Change:** Update `statusMapping` to match the frontend constant values. Specifically:
    - `'under procurement': 'Under procurement'` (lowercase 'p')
    - `'not yet started': 'Not yet started'` (lowercase 'y', 's'? Wait, let's check construction status too.)

### 2. Database Cleanup (Optional but Recommended)
- Standardize existing records with a one-time SQL update:
  `UPDATE engineer_form SET procurement_status = 'Under procurement' WHERE procurement_status = 'Under Procurement';`

## Verification Plan

### Automated Verification
- Run a Node.js script to check the casing of "Under procurement" in the database after an update.

### Manual Verification
1. Open the Engineer Dashboard.
2. Select a project and update Procurement Status to "Under procurement".
3. Verify the success message appears.
4. Verify the dropdown REMAINS on "Under procurement" instead of reverting.
5. Refresh the page and verify the state persists correctly.
