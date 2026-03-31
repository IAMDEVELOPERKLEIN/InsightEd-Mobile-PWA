# Implementation Plan: Fix Division Engineer File Uploads, Retrieval, and Update Timestamps

Resolve multiple issues in the Division Engineer module: 
1. Project photos and PDF documents (POW, DUPA, CONTRACT) are not displaying in the project profile.
2. The "Last Update" date and time in the project cards do not update after a project submission.

Investigation revealed that `insighted-backend/api/index.js` is missing critical logic for carrying over document links and serving static files. Additionally, a naming mismatch and date-only formatting in the API prevent the frontend from displaying accurate update timestamps.

## User Review Required

> [!IMPORTANT]
> - The fix modifies the primary production backend (`insighted-backend`) to ensure data persistence and correct file serving.
> - We are standardizing on `created_at` as the source for "Last Update" to provide exact time tracking for project versions.

## Proposed Changes

### [Backend] insighted-backend

#### [MODIFY] [index.js](file:///e:/InsightEd-Mobile-PWA/insighted-backend/api/index.js)
- **File Serving**: Add `express.static` middleware to serve the root `uploads` directory.
- **Multer Config**: Configure `multer` with `diskStorage` to handle `project_photos` and `project_docs`.
- **Project Retrieval**: Update `GET /api/projects` and `GET /api/projects/:id` to:
  - Join with `engineer_documents` to retrieve PDF paths (`pow_pdf`, `dupa_pdf`, etc.).
  - Return `created_at` formatted with both date and time (e.g., `YYYY-MM-DD HH24:MI:SS`) aliased as `statusAsOf`.
- **Project Updates**: Update `PUT /api/update-project/:id` to:
  - Carry over existing PDF documents from the previous version of the project.
  - Support multipart file uploads for POW/DUPA/CONTRACT.
- **Image Uploads**: Update `POST /api/upload-image` to handle `multipart/form-data` and save images to disk.

### [Frontend] src/modules

#### [MODIFY] [EngineerProjects.jsx](file:///e:/InsightEd-Mobile-PWA/src/modules/EngineerProjects.jsx)
- Update `fetchProjects` mapping to ensure `statusAsOf` correctly picks up the timestamp from the API response.

#### [MODIFY] [DetailedProjInfo.jsx](file:///e:/InsightEd-Mobile-PWA/src/modules/DetailedProjInfo.jsx)
- Update "Last Update" display to show both date and time if available.

## Verification Plan

### Automated Tests
- None available for the backend.

### Manual Verification
1. **Document persistence**: Upload a POW/DUPA, perform a status update, and verify the documents are still there in the new version.
2. **Image rendering**: Upload a photo and verify it displays (no "broken" icon).
3. **Timestamp accuracy**: Perform an update and verify the "Last Update" time on the project card changes to the current time.
