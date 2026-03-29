# Task: Debug HRODI Dashboard Input & Project Enhancements

- [x] Environment Setup & CLI Fix
    - [x] Identify Git Bash path (`C:\Users\SebastianCheng\AppData\Local\Programs\Git\bin\bash.exe`)
    - [x] Set `CLAUDE_CODE_GIT_BASH_PATH` environment variable
    - [x] Locate HRODI Dashboard component (`src/modules/EFDHome.jsx`)
    - [x] Identify search input and state handling logic
    - [x] Analyze re-render triggers (`searchQuery` -> `localStorage` -> `fetchSummary`)
- [x] Workspace Compliance
    - [x] Move task and implementation plan to `/claude` directory
- [/] Implementation Planning
    - [x] Create `claude/hrodi_input_fix_plan.md` for debouncing search input
    - [/] Request user review
- [ ] Execution
    - [ ] Implement `localSearchQuery` and debouncing logic in `EFDHome.jsx`
    - [ ] Update `onChange` handlers to use local state
    - [ ] Ensure `searchQuery` updates only after debounce
- [/] Projects Tab Implementation
    - [x] Research existing dashboard structure
    - [x] Create `claude/hrodi_projects_tab_plan.md`
    - [/] Request user review
    - [ ] Implement Tab Navigation in `EFDHome.jsx`
    - [ ] Update conditional rendering for 'projects' tab
- [/] Production 404 Error Investigation
    - [x] Analyze file structure in `public/`
    - [x] Create `claude/hrodi_404_investigation_plan.md`
    - [/] Request user review
    - [ ] Verify Nginx configuration recommendations
- [/] Compression Standardization (PDF & Photo - Path Based)
    - [x] Research Unit 1 PDF optimization logic
    - [x] Create revised `claude/hrodi_compression_standardization_plan.md` (Path Based)
    - [/] Request user review
    - [ ] Refactor `processPdfFile` for explicit DPI & Path support
    - [ ] Implement `compress_image.py` and `processImageFile` for Path storage
    - [ ] Update Engineer upload routes to save paths in `api/index.js`
- [ ] Verification
    - [ ] Manually test search input on mobile emulator/device
    - [ ] Verify keyboard stability and search functionality
    - [ ] Verify tab switching and filter persistence
    - [ ] Test direct access to `School-Head/` in production

---

# Task: Blank Region/Division & Test Schools

## Status: PLANNING (Expansion)

- [x] Research existing registration and location logic
- [x] Identify database schema for `schools_IERN`
- [x] Create implementation plan in `claude/blank_region_division_plan.md` (Updated)
- [x] Notify user for plan review
- [x] Execution (Initial)
    - [x] Create `api/scripts/seed_test_schools.js`
    - [x] Run the seeding script
    - [x] Verify database records
- [x] Expansion (999000-999999)
    - [x] Create `claude/test_schools_expansion_plan.md`
    - [x] Request user review
    - [x] Update Zod schema `RegisterBetaSchema` to allow nulls for coordinates <!-- id: 8 -->
    - [x] Execute `api/seed_test_schools_v2.js` <!-- id: 5 -->
- [x] Verification
    - [x] Verify 1000 test schools exist with coordinates
    - [ ] Verify registration flow in frontend
    - [x] Final walkthrough

---

# Task: Fix Syntax Error in api/db_init.js

## Status: VERIFICATION

- [x] Identify root cause of SyntaxError
- [x] Create implementation plan in `claude/db_init_syntax_fix_plan.md`
- [x] Request user review
- [x] Execution
    - [x] Fix escaped template literals in `api/db_init.js`
    - [x] Verify server startup
