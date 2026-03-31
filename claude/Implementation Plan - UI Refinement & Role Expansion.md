# Implementation Plan: UI Refinement & Role Expansion

This plan addresses specific UI/UX updates for the Division Engineer dashboard and the addition of the Regional Engineer role to the registration system.

## User Review Required

> [!IMPORTANT]
> **Button Relocation:** In the project card list, the "UPDATE" button will move from the top-right back to the bottom action bar, positioned beside the "LOGS" button.
> **Page Header Update:** In the detailed project view, "Edit Details" (UPDATE) will move to the top-right page header, and "Upload Docs" will be completely removed.

## Proposed Changes

### 1. Division Engineer Dashboard (Card View)
#### [MODIFY] [EngineerProjects.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/EngineerProjects.jsx)
- **Reposition UPDATE Button:** Move the `UPDATE` button from its current top-right position inside `ProjectCards` to the bottom action area, immediately preceding the `LOGS` button.
- **Styling:** Ensure the `UPDATE` and `LOGS` buttons share the same height and aligned visual weight.

### 2. Detailed Project View (Header & Actions)
#### [MODIFY] [DetailedProjInfo.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/DetailedProjInfo.jsx)
- **Remove "Upload Docs":** Remove any remaining "Upload Docs" button or trigger in the detailed view.
- **Relocate "Edit Details":** Move the "Edit Details" button (which toggles edit mode) to the top-right section of the premium blue header, near the `X` (Exit) button.

### 3. Registration System (Regional Engineer)
#### [MODIFY] [Register.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/Register.jsx)
- **Role Dropdown:** Add "Regional Engineer" as an option in the "Your Role" selection.
- **Categorization Logic:** Ensure that when a user selects "Regional Engineer", the `accountCategory` is automatically set to `DepEd Engineer` during the save/submission process.
- **Auth Code:** Assign the standard engineering auth code (`E5T8-B2W3`) to the Regional Engineer role.

## Verification Plan

### Automated/Subagent Tests
- **UI Validation:** 
  - Verify "UPDATE" button is visible beside "LOGS" in `EngineerProjects.jsx`.
  - Verify "Edit Details" is in the top-right header of `DetailedProjInfo.jsx`.
- **Registration Flow:** 
  - Simulate a "Regional Engineer" registration and verify the `account_category` in the database payload is `DepEd Engineer`.

### Manual Verification
- Visual check of button alignments on various screen sizes (mobile/desktop).
- Confirm "Upload Docs" is no longer visible in the Progress or Overview tabs of the detailed view.
