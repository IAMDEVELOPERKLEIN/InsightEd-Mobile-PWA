# Task Checklist - School Registration List Display

- [x] 1. Backend Verification
    - [x] Check if `/api/monitoring/schools` handles `region`, `division`, and `district` correctly.
    - [x] Ensure the registration status is clearly identifiable (registered vs unregistered).
- [x] 2. MonitoringDashboard.jsx Refactor
    - [x] Ensure `fetchData` in `MonitoringDashboard.jsx` correctly calls the endpoint with current filters.
    - [x] Add a `useEffect` if needed to re-fetch when `coDivision` or `coDistrict` changes at a high level.
- [x] 3. UI Implementation
    - [x] Add a "Regional School List" section below the existing summary cards in the `accomplishment/all` tab.
    - [x] Implement search and pagination within this new list.
    - [x] Use existing card style or a more compact table view.
- [x] 4. Polish & Test
    - [x] Verify that sensitive columns are hidden for certain roles.
    - [x] Ensure name-based search is case-insensitive.
    - [x] Test drill-down behavior and list updates.
