# Implementation Plan: Unified Engineer Workflow, Role Expansion, & Asset Synchronization

This plan outlines the final restructuring of the engineering project management system, focusing on asset synchronization, role expansion (Architect/Regional Engineer), and the project approval workflow.

## User Review Required

> [!IMPORTANT]
> **Synced Photo Deletion:** Deleting a photo from the **Project Gallery** will automatically remove it from the **Progress Tab** in the project details view, and vice versa. This ensures a "single source of truth" for site documentation.
> **Architect Identity:** "Architect" is officially added as both a **Role** and a **Position**.

## Proposed Changes

### 1. Registration & User Identity
#### [MODIFY] [Register.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/Register.jsx)
- **Role Selection:** Add "Architect" to the role dropdown.
- **Position Selection:** Add "Architect" to the position dropdown for all engineering roles.
- **Routing:** Update `getDashboardPath` and route guards in `App.jsx` to treat "Architect" similarly to "Division Engineer".

### 2. Synced Asset Management (Photos)
#### [MODIFY] [api/index.js](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/api/index.js)
- **Backend Sync:** Add `DELETE /api/project-images/:id`. 
  - Removes record from `engineer_image`.
  - Deletes physical file from Azure/Local storage.

#### [MODIFY] [ProjectGallery.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/ProjectGallery.jsx)
- **Shared Deletion UI:** Add a "Delete Photo" button to the fullscreen preview modal.
- **State Update:** Trigger a refresh/re-fetch after deletion to stay in sync.

#### [MODIFY] [DetailedProjInfo.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/DetailedProjInfo.jsx)
- **Progress Tab Sync:** Add a "Delete Photo" button to the `selectedZoomImage` modal within the Progress tab.
- **Contextual Deletion:** Ensure that removing a photo here updates the UI immediately and reflects in the global gallery.

### 3. Database & Approval Workflow Foundations
#### [MODIFY] [api/index.js](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/api/index.js)
- **Workflow Schema:** Add `approval_status` column to `engineer_form`.
- **Pending Submission:** Update `/api/save-project` to default all new Division/Architect submissions to `Pending`.
- **Validation:** Add `/api/approve-project` for EFD Engineers.
- **Secure Deletion:** Project deletion restricted to EFD, Regional Engineers, and Super Users only.

### 4. UI Streamlining & Dashboard Logic
#### [MODIFY] [EngineerProjects.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/EngineerProjects.jsx)
- **Visual Cleanup:** Remove "Upload Docs", move "UPDATE" button to top-right, and hide project deletion for Division Engineers.
- **Status Indicator:** Add a "Waiting for Approval" badge for `Pending` projects.
- **Restoration:** Re-enable the "New Project" creation button.

#### [NEW] [RegionalEngineerDashboard.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/RegionalEngineerDashboard.jsx)
- **Home View:** Division-wise project stats for the regional jurisdiction.
- **Interactive Monitoring:** Drill-down from division cards to filtered project cards.

## Verification Plan

### Automated/Subagent Tests
- **Deletion Sync:** 
  - Delete a photo in `DetailedProjInfo` -> Verify it disappears from `ProjectGallery`.
  - Delete a photo in `ProjectGallery` -> Verify it disappears from `DetailedProjInfo`.
- **Role Verification:** Register as an "Architect" and verify access to the project creation workflow.

### Manual Verification
- UI Aesthetic Check: Confirm placement of "Delete Photo" trash icon in both modals.
- Workflow Check: Verify "Waiting for Approval" badge visibility for new projects.
