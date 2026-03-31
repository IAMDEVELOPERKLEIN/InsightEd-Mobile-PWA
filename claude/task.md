# Task: Correct Last Update Date in Division Engineer Cards

- [x] Research and Identify relevant components and logic <!-- id: 0 -->
    - [x] Fix project timestamps in Division Engineer cards
- [x] Improve document upload UI in Edit Project modal
    - [x] Display actual filenames instead of "New File" / "✓ On File"
    - [x] Add individual "Upload Now" buttons for immediate document persistence
    - [x] Update database schema to track filenames
- [x] Audit PDF/Image compression (96 DPI standard) <!-- id: 4 -->
    - [x] Verify if `updated_at` (or equivalent) changes in DB on update <!-- id: 5 -->
    - [x] Check if frontend receives the updated timestamp <!-- id: 6 -->
    - [x] Check if there are any database triggers preventing the update <!-- id: 7 -->
- [x] Implement Fix <!-- id: 8 -->
    - [x] Update backend `GET /api/projects` to return full `status_as_of` timestamp <!-- id: 9 -->
    - [x] Update backend `PUT /api/update-project/:id` to handle full timestamps <!-- id: 10 -->
    - [x] Update frontend `EngineerProjects.jsx` to send and display full timestamps <!-- id: 11 -->
    - [x] Update `UpdateProjectWizard.jsx` to ensure consistent timestamp handling <!-- id: 12 -->
- [ ] Verify Fix <!-- id: 13 -->
    - [ ] Perform manual update and check card timestamp <!-- id: 14 -->
    - [ ] Verify with 1000+ user concurrency considerations (Resilience Note) <!-- id: 15 -->
