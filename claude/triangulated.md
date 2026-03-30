# ISSUES in Division Engineer - Implementation Plan (Triangulated Progress)

This document outlines the systematic approach to resolve critical bugs and implement the new project triangulation system for Division Engineers.

## User Review Required

> [!IMPORTANT]
> **Database Schema**: We will add `checklist` (JSONB) and `triangulated_percentage` (NUMERIC) columns to the `engineer_form` table to store the state of the progress validation.
> **Triangulated vs Manual %**: The system will maintain both the manual `accomplishmentPercentage` and the new `triangulated_percentage` for comparison.

## Proposed Changes

### 1. Fix Home Tab Data Persistence
*Resolves the issue where Home tab stats fail to load for Division Engineers.*

- **Dashboard Sync (`src/modules/EngineerDashboard.jsx`)**: 
    - Align fetch mapping with `EngineerProjects.jsx` to ensure all fields (including `number_of_storeys`) are available on the dashboard.
    - Improve error handling and loading states for initial data fetch.

### 2. Time of Last Update
*Display the specific time when project status was last changed.*

- **Formatting (`src/modules/EngineerProjects.jsx`)**:
    - Update `formatDateShort` to `formatDateTime` including `toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })`.
- **Metadata (`src/components/UpdateProjectWizard.jsx`)**:
    - Ensure `statusAsOfDate` is saved as a full ISO string to preserve time components.

### 3. Project Progress Triangulation
*Implements a weight-based checklist system based on building storeys.*

#### Checklist Weights (Based on Spreadsheets)

- **1-Storey**: 22 Tasks (e.g., CHB Laying 7%, Roofing 6%, Wall Plastering 6%)
- **2-Storey**: 19 Tasks (e.g., 2nd Floor Concrete Pouring 7%, Ceiling Works 9%)
- **3-Storey**: 22 Tasks (e.g., Substructure 12%, Superstructure 52%, Finishing 12%)

#### Implementation Steps:
1.  **Backend (`api/index.js`)**: 
    - Add migration to include `checklist` and `triangulated_percentage` in `engineer_form`.
    - Update the `PUT` route to handle these new fields.
2.  **Constants (`src/constants/progressChecklists.js`)**:
    - Store the JSON structures for the 3 checklist types.
3.  **UI (`src/components/UpdateProjectWizard.jsx`)**:
    - Add a "Validation" step that displays the appropriate checklist based on `numberOfStoreys`.
    - Real-time calculation of percentage as tasks are checked.
    - Display comparison between "Manual Progress" slider and "Checklist Calculation".

## Verification Plan

### Manual Verification
1.  **Login Test**: Verify Home tab stats appear immediately for Division Engineers.
2.  **Timestamp Test**: Update a project status and verify it shows "HH:mm" on the project card.
3.  **Triangulation Test**: 
    - Open the wizard for a 3-storey building.
    - Check tasks and verify the triangulated percentage matches the defined weights.
    - Save and verify the checklist state persists upon reopening the wizard.
