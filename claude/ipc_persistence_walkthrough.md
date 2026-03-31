# Walkthrough - Project Duplication & Media Persistence Fix

I have resolved the "Longstanding Problem" of duplicate project cards and missing assets by pivoting the system's asset association to the permanent `IPC` (Unique Project Identifier).

## Critical Fixes Implemented

### 1. Fixed Project Duplication (Root Cause)
Previously, the `/api/save-project` endpoint ignored incoming IPCs and generated a new one for every "Save Modifications".
- **Fix**: Updated `/api/save-project` in `api/index.js` to reuse the existing `IPC` from the request. This ensures all modifications for a project stay within the same implementation lineage.

### 2. Ensured Document Persistence
Previously, snapshots (new rows) with null document fields would cause the UI to hide existing files.
- **Fix**: Added "Document Carry-over" logic in `/api/save-project`. It now automatically fetches the latest document paths from the previous version of the IPC and carries them into the new snapshot.

### 3. IPC-Based Retrieval (Robust Solution)
- **Gallery**: Updated `GET /api/project-images/:projectId` to fetch photos by `IPC`. Now, photos uploaded to any version of the project appear in all versions.
- **Project Lists**: Updated the main dashboard query to use a `LATERAL JOIN` for documents by `IPC`. This ensures the "POW/DUPA/CONTRACT" icons appear on the dashboard cards even if the last modification didn't involve a file upload.

## Existing Data Cleanup

Since the system was producing duplicates for a long time, you likely have multiple cards for the same project. I've provided a script to unify them:

1.  **File**: `cleanup_duplicates.js`
2.  **Usage**: 
    ```bash
    node cleanup_duplicates.js
    ```
    *Note: Ensure your `DATABASE_URL` is correct in the script.*

## Proof of Work
render_diffs(file:///e:/InsightEd-Mobile-PWA/api/index.js)
render_diffs(file:///e:/InsightEd-Mobile-PWA/src/modules/DetailedProjInfo.jsx)
render_diffs(file:///e:/InsightEd-Mobile-PWA/src/modules/EngineerProjects.jsx)
