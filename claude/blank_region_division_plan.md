# Implementation Plan - Test Schools & Blank Location Hierarchy

This plan outlines the steps to add a complete "Blank" location hierarchy (Region, Division, District, Municipality) to the school head registration process, along with 100 test schools (IDs 999900-999999).

## Proposed Changes

### [Component] Backend (Database Seeding)

#### [NEW] [seed_test_schools.js](file:///e:/InsightEd-Mobile-PWA/api/scripts/seed_test_schools.js)
Create a standalone script to populate the `schools_IERN` table with test data.

- **Objective:** Insert test locations and schools into the database.
- **Hierarchy:**
    - **Region:** "Blank Region"
    - **Division:** "Blank Division"
    - **District:** "Blank District"
    - **Municipality:** "Blank Municipality"
    - **Province:** "Blank Province"
    - **Legislative District:** "Blank District"
- **Schools:** 100 schools with IDs from `999900` to `999999`.
- **School Name:** `[ID] Test School`
- **IERN:** Same as `SchoolID`.

### [Component] Frontend (Registration Verification)

- **Verification:** Ensure that `src/Register.jsx` correctly fetches and displays these new options. Since the frontend uses cascading dropdowns that query the backend for unique values from `schools_IERN`, adding these records to the database will automatically make them available in the UI.

## Verification Plan

### Automated Verification
- Run a SQL query to verify the records in `schools_IERN`:
  ```sql
  SELECT count(*) FROM "schools_IERN" WHERE "Region" = 'Blank Region';
  ```
- Test the API endpoints:
  - `GET /api/locations/regions` -> should include "Blank Region"
  - `GET /api/locations/schools?region=Blank%20Region&...` -> should include the test schools.

### Manual Verification
1.  Open the Registration page.
2.  Select **School Head** role.
3.  Select **Blank Region** -> **Blank Division** -> **Blank District** -> **Blank Municipality**.
4.  Verify that the schools list contains "999900 Test School" through "999999 Test School".
5.  Complete a test registration with one of these IDs.
