# Implementation Plan: Document Upload Improvement (Edit Project Modal)

## Goal Description
Improve the document upload UI in the "Edit Project" modal to show actual filenames (both for existing on-file documents and newly selected ones) and provide an explicit "Upload" button for immediate feedback. Currently, it shows generic "New File" or "✓ On File" labels.

## Proposed Changes

### Frontend: [ProjectEditModal.jsx](file:///e:/InsightEd-Mobile-PWA/src/components/ProjectEditModal.jsx)
- [ ] **Extract Filenames:** Add a helper to parse filenames from paths (e.g., `path.split('/').pop()`).
- [ ] **UI Update (Step 6):**
    - Replace the "✓ On File" badge with the actual filename (e.g., `project.pow_pdf.split('/').pop()`).
    - Replace the "New File" badge with the local filename (`documentFiles[key].name`).
- [ ] **Individual Upload Button:**
    - Add an "Upload" button that appears when a new file is selected.
    - Implement `handleIndividualUpload(key)` to upload the specific file immediately via `FormData`.
    - This allows users to see "Success" for each file without waiting for the final "Save Details" at Step 7.

### Backend: [api/index.js](file:///e:/InsightEd-Mobile-PWA/api/index.js)
- [ ] **Upload Endpoint:** Verify or add a `multipart/form-data` endpoint for individual project documents (POW, DUPA, CONTRACT).
- [ ] **Background Processing:** Ensure `processPdfInBackground` is triggered for these individual uploads to maintain the 96 DPI standard.

## Verification Plan

### Manual Verification
- [ ] Open the **Edit Project** modal -> **Docs** step.
- [ ] Check if existing files show their names (e.g., `pow_123.pdf`).
- [ ] Select a new file and see if the name occupies the "New File" slot.
- [ ] Click **Upload** and verify the "Success" state and server-side file existence.
