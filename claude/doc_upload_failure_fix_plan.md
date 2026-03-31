# Implementation Plan: Assess PDF Upload Failure in Project Edit

Resolve the "upload failed" alert when submitting a PDF document in the Project Edit modal's "Docs" step.

## User Review Required

> [!IMPORTANT]
> - We need to verify if the backend `PUT /api/update-project/:id` or an individual upload endpoint is failing to parse `multipart/form-data`.
> - If `onSaveDetails` sends `FormData`, the backend must use `multer` correctly.

## Proposed Changes

### [Diagnostic Phase] Investigation

#### [Research] Parent Component & Backend
- **Parent Component:** `DetailedProjInfo.jsx` sends `FormData` if the payload is an instance of `FormData`.
- **Backend Route:** `insighted-backend/api/index.js` line 2107 defines `app.put('/api/update-project/:id', async (req, res) => ...`.
- **Missing Middleware:** The route currently lacks `multer` or `busboy` middleware, but the frontend sends `FormData`. Express `json()` middleware does not parse `multipart/form-data`.

#### [Hypotheses] Two-Path Rule
1. **Hypothesis A (Confirmed):** The backend route `PUT /api/update-project/:id` lacks multipart middleware (like `multer`), causing `req.body` to be empty or malformed when `FormData` is sent from the frontend.
2. **Hypothesis B:** Even if middleware were present, the file storage path or permissions on the VM might prevent saving.

### [Fix Phase] Implementation

#### [Backend] insighted-backend/api/index.js
- Import and configure `multer` for project documents.
- Apply `upload.fields([...])` middleware to the `PUT /api/update-project/:id` route.
- Update the route logic to extract files from `req.files` and data from `req.body`.
- Integrate `processPdfInBackground` if required for optimization.

#### [Frontend] src/components/ProjectEditModal.jsx
- Standardize the `handleSingleUpload` payload to match the backend expectation.

## Verification Plan

### Manual Verification
1. Open Project Edit -> Step 6 (Docs).
2. Select a PDF for POW.
3. Click "Upload Now".
4. Verify "Success" alert and check file existence on VM `/uploads` directory.
