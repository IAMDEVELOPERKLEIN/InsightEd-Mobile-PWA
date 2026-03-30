# ISSUES in Division Engineer - Implementation Plan

This document outlines the systematic approach to resolve critical bugs in the InsightEd Division Engineer module.

## User Review Required

> [!IMPORTANT]
> **Data Attribution**: The system will now force-query the `users` table for the current user's name on every status update to ensure the `engineer_name` column is never null or incorrect.
> **Timestamp Logic**: Status updates from project cards will now explicitly set `status_as_of` to the current date, fixing the issue where this column remains null.

## Proposed Changes

### 1. Fix "Last Updated By" & Timestamp
*Ensures every project update is correctly attributed and timed.*

- **Backend (`api/index.js`)**: 
    - In `PUT /api/update-project/:id`, default `newStatusAsOf` to the current server date if `data.statusAsOfDate` is missing.
    - Re-retrieve the user's full name from the `users` table using `data.uid` on every update to maintain accurate attribution.
- **Frontend (`src/modules/EngineerProjects.jsx`)**:
    - Update the `applyStatusChange` function to include `statusAsOfDate` and `uid` in the payload sent to the server.

### 2. Fix Initial Data Reflection
*Ensures the dashboard populated with data immediately upon login.*

- **Frontend (`src/modules/EngineerDashboard.jsx`)**:
    - Add `user?.uid` as a dependency to the main data-fetching `useEffect`.
    - Implement a "force-refresh" on the first mount after a login event to bypass potentially stale local caches.

### 3. Replace Chat with Guide Tab
*Modernizes the navigation specifically for the Division Engineer role.*

- **Navigation (`src/modules/BottomNav.jsx`)**: 
    - Replace the "Chat" item with "Guide" in the `Division Engineer` config, pointing to `/guide/division-engineer`.
- **Route (`src/App.jsx`)**:
    - Add a new route for `/guide/division-engineer`.
- **Guide Content**:
    - Use `LegacyGuideWrapper` to serve the `DivisionEngineerQuickStart_1.html` documentation.

## Verification Plan

### Manual Verification
1.  **Status Sync**: Update a project status and verify `engineer_name` and `status_as_of` are populated correctly.
2.  **Login Reflection**: Logout/Login and verify the Home tab shows projects instantly.
3.  **Guide Tab**: Verify clicking the "Guide" tab in the bottom bar opens the QuickStart guide.
