# Implementation Plan - School Registration List Display

## Objective
Display a comprehensive list of schools (based on `schools_IERN` joined with registration data) at the bottom of the Monitoring Dashboard, filtered by the user's jurisdiction (Region or Division).

## Proposed Changes

### 1. Backend Integration
- Ensure `/api/monitoring/schools` correctly handles filtering by `region`, `division`, and `district` while joining with `ph_schools` and `school_summary`.

### 2. Frontend Changes (`src/modules/MonitoringDashboard.jsx`)
- **State Management**:
    - Ensure `districtSchools` state is consistently populated when a jurisdiction is selected.
    - Implement a permanent "Schools List" section at the bottom of the `accomplishment` tab.
- **UI Components**:
    - Add a new section `SchoolListSection` below the Division/District summary cards.
    - Reuse the existing paginated school card design for consistency.
    - Add Search and Sorting functionality (Name, Completion %).
    - Indicate status: "Registered" (with completion %) vs "Unregistered".
- **Filtering Logic**:
    - RO View: Display schools across all divisions in the region (paginated).
    - SDO View: Display schools across all districts in the division (paginated).
    - Drill-down: If a specific Division or District is selected, narrow the list further.

### 3. Execution Steps
1. **Research**: Verify the exact trigger for `fetchData` and ensure it fetches schools for the current scope.
2. **Refactor**: Extract the school list rendering logic into a reusable section if possible, or replicate it safely at the bottom of the `accomplishment` view.
3. **Enhancement**: Add a "Registration Status" indicator (Registered/Pending) as requested.
4. **Validation**: Test with RO, SDO, and Central Office roles to ensure proper filtering.

## Concurrency & Resilience
- **Pagination**: Use server-side pagination (limit/offset) to handle 1000+ schools efficiently.
- **Cleanup**: Ensure `abortController` is used if rapid jurisdiction changes occur (optional but good practice).
- **Graceful Loading**: Show a skeleton or spinner while the school list is fetching.
