# Media & Persistence Fixes

Resolve broken project images and missing PDF documents in the Division Engineer project details view.

## Proposed Changes

### Frontend - `DetailedProjInfo.jsx`

#### [MODIFY] [DetailedProjInfo.jsx](file:///e:/InsightEd-Mobile-PWA/src/modules/DetailedProjInfo.jsx)
- **Fix `getImageSrc`**: Ensure that paths starting with `/uploads/` are treated as absolute URLs (starting with `/`) to avoid relative path traversal errors when the user is on a deep route.
- **Standardize Photo Uploads**: Update the `handleSaveProject` function to send site photos as `multipart/form-data` instead of base64 JSON, ensuring consistent handling with the backend `projectPhotosUpload` middleware.
- **Fix Document Uploads**: Update the `handleSaveProject` function to ensure it uses the correct multipart format for PDFs, matching the updated backend.

### Backend - `api/index.js` (Root)

#### [MODIFY] [index.js](file:///e:/InsightEd-Mobile-PWA/api/index.js)
- **Update `/api/upload-project-document`**: 
    - Add `upload.single('document_pdf')` middleware to handle multipart file uploads.
    - Integrate `processPdfInBackground` to compress and save the PDF to `uploads/project_docs/`.
    - Update the `engineer_documents` table with the new file path and original filename.
- **Enhance Logging**: Add descriptive logs to the background image optimizer and document processor to facilitate easier debugging.

## Verification Plan

### Automated Tests
- Upload a new "Internal" photo and verify it appears correctly in the gallery.
- Upload a "POW" PDF, save the project, and verify it appears in the "Project Documents" section.
- Inspect the browser Network tab to ensure requests for `/uploads/...` are following absolute paths.

### Manual Verification
1. Open a project in the Division Engineer view.
2. Upload a site photo and a PDF document.
3. Click "Save Changes".
4. Refresh the page and verify both assets are visible and not "broken".
