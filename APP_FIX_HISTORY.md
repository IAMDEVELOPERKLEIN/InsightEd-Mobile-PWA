# InsightED Application Fix History

This document tracks technical improvements, bug fixes, and feature implementations made during development.

## 2026-03-24
### Strict Dynamic Grade Level Filtering
- **Issue**: Grade level fields in Units 2, 3, 7, and 8 were not strictly restricted based on the Unit 1 school classification (curricular offering), leading to potential data entry for non-applicable grades.
- **Fix**: Synchronized all modular units (2, 3, 7, and 8) to use a strict mapping rule based on the `curricular_offering` saved in the Azure Postgres database:
  - **Purely Elementary**: Kinder to Grade 6
  - **ES and JHS (K-10)**: Kinder to Grade 10
  - **Junior High and Senior High**: Grade 7 to Grade 12
  - **All Offering (K to 12)**: Kinder to Grade 12
  - **Purely Junior High School**: Grade 7 to Grade 10
  - **Purely Senior High School**: Grade 11 and Grade 12
- **Benefit**: Ensures data integrity by preventing users from entering data for grade levels not offered by their specific school classification.

## 2026-03-12
### Unit 6 Routing and Backend Alignment
- **Issue**: Mismatch between frontend unit numbering and backend API routes leading to data saving errors and navigation confusion.
- **Fixes**:
  - Aligned backend unit labels: **Unit 6** is now dedicated to **Teaching Personnel**, and **Unit 7** is dedicated to **Physical Resources/WASH/Utilities**.
  - Cleaned up `api/index.js` by removing redundant/incorrectly labeled routes (`PUT /api/ph_schools/unit6/:schoolId` for physical facilities).
  - Consolidated teacher roster API calls to use unified `ph_teachers_list` via `/api/ph_schools/:schoolId/teachers`.
  - Updated frontend components (`TeachingPersonnel.jsx`, `Unit6Summary.jsx`, `Unit7SchoolResources.jsx`) to point to correctly aligned endpoints.
### Unit 8 Refactoring and Building Status Integration
- **UX Improvement**: Simplified the Unit 8 wizard from 5 steps to **4 steps** by removing the separate demolition assessment page.
- **Implementation**:
  - Integrated **Building Status** (Newly Built, Good Condition, Repair, For Condemnation, Condemned) directly into the Building Registration modal (Step 2).
  - Dynamically display **Justifications for Condemnation/Demolition** checkboxes when a building is marked for condemnation.
  - Relocated the **Finalize Audit** section to Step 4 (Repair Assessment).
  - Cleaned up all legacy `demolitionRecords` state and logic to resolve potential ReferenceErrors and simplify data flow.

## 2026-03-11
### Bug Reporting System
- **Implementation**: Created a dedicated `bug_reports` table in the database and implemented a reporting API to allow users to document app issues directly from the chatbot.

### Contact Us Section
- **Fix**: Resolved an error preventing successful submission in the "Contact Us" feature.

## 2026-03-10
### Mobile Visualization Fixes
- **Issue**: Drill-down functionality in charts was failing on mobile devices.
- **Fix**: Implemented robust click/tap handlers for Plotly charts and reduced reliance on global variables to ensure consistent behavior across screen sizes.

### Chatbot Knowledge Migration
- **Implementation**: Migrated the chatbot FAQ database from a local JSON file to a PostgreSQL table with `pgvector` support for better search performance and scalability.

### Ollama VM Setup
- **Implementation**: Provisioned and configured an Azure VM (20.24.58.49) with Ollama to host AI models (`llama3`, `nomic-embed-text`) for localized chatbot intelligence.

- **Unit 5 Baseline Fix (Teacher Count)**: Fixed an issue where "Total Registered Teachers" in Unit 6 was displaying as 0. The system now calculates the baseline teacher headcount from the master list during Unit 5's finalization and includes a dynamic fallback in the school data fetching route.
- **Workload Metric Refactor (Weekly to Daily)**: Transitioned teacher workload tracking from "Weekly Capacity" to "Daily Teaching Load". Renamed UI labels in Unit 6 roster and summary pages, and adjusted the backend calculation to return a daily average for the school-wide workload metric.
- **Unit 6 Flow Consolidation**: Merged the "Finalize Roster" and "Submit" steps into a single "Finalize and Submit" action within the roster view. Removed the redundant Unit 6 Summary page, route, and component to streamline the user experience.
- **Unit 9 Navigation Refactor**: Replaced the icon-based stepper header in School Geography & Safety (Unit 9) with a sleek, horizontal progress bar and dynamic step labeling (e.g., "Step 1 of 5") to improve focus and visual clarity.
- **Unit 6 Conditional Completion**: Refined the Unit 6 finalization flow. Users can now proceed to Unit 7 even if some personnel have zero teaching load (Partial Submission), but the unit will remain as "Incomplete" on the dashboard and Roadmap until all workloads are fully assigned, ensuring data integrity without blocking progress.
- **Unit 8 Data Integrity**:
    - Refactored Building Detail inputs to strictly disallow leading zeros and enforce a minimum value of 1 for Storeys and Classrooms.
    - Implemented mandatory grade level selection in Step 3 (Granular Room Setup), blocking navigation until all rooms have an assigned grade level.
    - Fixed the Building Name dropdown in the Demolition form by refactoring from a `datalist` to a proper `select` element for better reliability.

### Super User Access Restructuring
- **UX Improvement**: Reorganized the Super User dashboard into "General Access" and "Infrastructure Monitoring" categories to improve navigation for administrative users.

### Response UI Refinement
- **Fix**: Resolved sticky column styling issues in the Information Database that caused data to be hidden on mobile screens.

## 2026-03-09
### Analytics Mobile View
- **UX Improvement**: Renamed tabs to "Graphical View" and "Table View" for better layout fit on mobile headers.
- **Optimization**: Condensed the header statistics display to reduce vertical clutter on small screens.
