# Walkthrough - Media & Persistence Fixes

I have resolved the issues with broken project photos and missing PDF documents by standardizing the upload and retrieval protocols across the frontend and backend.

## Changes Made

### 1. Frontend Path Resolution
Fixes the "Broken Image" issue.
- **`DetailedProjInfo.jsx`**: Updated `getImageSrc` to treat paths starting with `/uploads/` as absolute URLs. This prevents relative path traversal errors (e.g., trying to load `/project-details/uploads/...`) when viewing project details from deep routes.

### 2. Standardized Upload Protocol (Multipart)
Fixes the "Document Not Showing" and "Sync Error" issues.
- **Backend (`api/index.js`)**: 
    - Updated `/api/upload-project-document` to support `multipart/form-data`.
    - Updated `PUT /api/update-project/:id` to handle PDF uploads synchronously using `processPdfFile`.
    - Documents are now consistently optimized and saved to `uploads/project_docs/` with their original filenames.
- **Frontend (`DetailedProjInfo.jsx`)**:
    - Updated `handleSaveProject` and `onSaveDetails` to use `FormData` (multipart) for both site photos and PDF documents.
    - Standardized `projectId` field naming to match backend expectations.

### 3. Syntax & UI Fixes
- **`EngineerProjects.jsx`**: Fixed a JSX syntax error (extra closing brace) that was causing a Vite warning/crash.
- **`ProjectEditModal.jsx`**: Fixed a duplicate `switch-case` in the multi-step form, ensuring the "Finance" step (Step 3) is correctly rendered.

## Verification Results

### Media Persistence
- **Photos**: Site photos uploaded via the "Edit" modal or the "Detailed Info" page are now correctly saved as files in `uploads/project_photos/` and rendered via absolute paths in the UI.
- **Documents**: PDF documents (POW, DUPA, CONTRACT) are correctly optimized and saved to `uploads/project_docs/`. The original filenames are preserved in the DB.

### Console Logs (Backend)
```text
📂 Incoming Doc Upload: [POW] for Project [1000340] (Multipart: true)
📄 Processing PDF: E:\InsightEd-Mobile-PWA\uploads\748fa...
✅ [BG] PDF Processed and stored at: /uploads/project_docs/doc_177494...
✅ Updated POW in engineer_documents for project_id 1000340
```

## Proof of Work
render_diffs(file:///e:/InsightEd-Mobile-PWA/src/modules/DetailedProjInfo.jsx)
render_diffs(file:///e:/InsightEd-Mobile-PWA/api/index.js)
render_diffs(file:///e:/InsightEd-Mobile-PWA/src/modules/EngineerProjects.jsx)
render_diffs(file:///e:/InsightEd-Mobile-PWA/src/components/ProjectEditModal.jsx)
