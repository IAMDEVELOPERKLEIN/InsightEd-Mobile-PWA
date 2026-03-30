# InsightEd PWA Enhancements Implementation Plan (Restructured)

This plan outlines the functional and UI improvements for the InsightEd PWA, specifically targeting the EFD Engineer and Division Engineer roles, while adhering to the existing database schema and "append-only snapshot" project architecture.

## User Review Required

> [!NOTE]
> **Audit Trail Strategy**: Confirmation that `engineer_form` already creates a new row for every update. No new columns will be added; instead, the project update route will be fixed to correctly store the name of the user performing the update into the `engineer_name` column for that snapshot.

## Proposed Changes

### [Backend] API Fixes
Summary: Correct the project update logic to capture the current user's name for each new snapshot.

#### [MODIFY] [index.js](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/api/index.js)
- **`PUT /api/update-project/:id`**: Update the `insertValues` mapping (around line 8607) to use `finalUserName` (the person performing the update) instead of carrying over the original `oldData.engineer_name`. This ensures the latest snapshot in the audit trail correctly reflects the last person who updated the record.
- **[NEW] `POST /api/upload-project-document`**: Create an endpoint that accepts a PDF file and updates the `engineer_documents` table for a specific project. This will reuse the existing PDF compression service.

---

### [Frontend] EFD Engineer Dashboard
Summary: Optimize the EFD dashboard UI and restrict permissions as requested.

#### [MODIFY] [EFDHome.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/EFDHome.jsx)
- **Refactor "Funding Year" Chart**: Change the vertical column chart to a horizontal bar chart layout (similar to the Regional Graph) for better label readability.
- **Hide "Edit" Button**: Add conditional rendering to the project card to hide the "Edit" button if the user role is `EFD Engineer`.
- **Fix Data Binding**: Add an `onClick` handler to the project card container (line 1310) to navigate to the project details view.

---

### [Frontend] Division Engineer Enhancements
Summary: Add document upload functionality and the audit trail display on project cards.

#### [MODIFY] [DetailedProjInfo.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/DetailedProjInfo.jsx)
- **Add "Upload Documents" Button**: Implement a button in the Overview tab to allow uploading PDF documents (POW, DUPA, Contract).
- **Implement Upload Modal**: Create a simple modal for selecting document type and file selection, calling the new backend upload endpoint.

#### [MODIFY] [EngineerProjects.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/EngineerProjects.jsx)
- **Update Project Card**: Relabel "Updated By" or "Assigned To" into "Last updated by" and ensure it displays the `engineerName` from the latest project snapshot.

## Open Questions

1.  **Assigned Engineer vs. Last Updated**: Do you still want to preserve the name of the "Original Assigned Engineer"? Since `engineer_name` is being updated in each snapshot to the person doing the update, we'll see who last touched it, but we might lose the original "owner" unless it's tracked in another way (e.g., `assigned_engineer_id` which seems to also exist in the table).

## Verification Plan

### Manual Verification
- **EFD Role**: Log in as `EFD Engineer`, verify the horizontal chart, check the project card click-through, and ensure the "Edit" button is missing.
- **Division Role**:
  1. Log in as `Division Engineer`, perform a status update.
  2. Log in as another user (Admin) and update that same project.
  3. Verify the project card now shows the Admin's name as the "Last updated by".
  4. Test document upload functionality.
