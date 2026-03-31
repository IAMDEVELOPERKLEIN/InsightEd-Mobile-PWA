# IPC-Based Media Persistence Plan

Ensure 100% reliability for project photos and documents by pivoting asset association from transient `project_id` snapshots to the permanent `IPC` (Unique Project Identifier).

## Problem Statement
The current system stores project updates as new rows in `engineer_form` (snapshots). When a project is updated, a new `project_id` is generated. Since assets in `engineer_image` and `engineer_documents` are linked via `project_id`, they appear "lost" or "broken" in the new version unless explicitly carried over or queried collectively.

## Proposed Solution: IPC-Centric Association
By using the `IPC` as the primary grouping key, we ensure that all assets ever uploaded for a project are visible regardless of which version is currently being viewed.

---

## Proposed Changes

### 1. Database Layer (PostgreSQL)
- **Indexing**: Add B-tree indices on the `ipc` column across all relevant tables to ensure high-speed retrieval as the dataset grows.
  - `engineer_form(ipc)`
  - `engineer_image(ipc)`
  - `engineer_documents(ipc)`
- **Integrity**: Audit existing records in `engineer_image` and `engineer_documents`. If `ipc` is null, backfill it by joining with `engineer_form` on `project_id`.

### 2. Backend API (`api/index.js`)
- **Modify `GET /api/project-images/:projectId`**:
  - Update the query to fetch images where `ipc = (SELECT ipc FROM engineer_form WHERE project_id = $1)`.
  - This ensures that a request for a specific version also returns images from all other versions of the same project.
- **Modify Document Retrieval**:
  - Update document fetching logic to prioritize the latest non-null document path for a specific `IPC`.
- **Standardize Uploads**:
  - Ensure every `POST /api/upload-image` and `POST /api/upload-project-document` strictly requires and persists the `ipc`.

### 3. Frontend Layer (`DetailedProjInfo.jsx`)
- **Fetch by IPC**: 
  - When loading the project profile, use the `project.ipc` as the primary key for fetching site photos and documents.
  - This removes the dependency on the `projectId` for media display.
- **Gallery Logic**:
  - Update the image gallery to group photos by `category` (Internal/External) across the entire implementation lineage (IPC).

---

## Verification Plan

### Automated Tests
- Create a project, upload an image.
- Update the project (creating a new `project_id`).
- Verify the image from the first version is still visible in the second version's detail view.

### Manual Verification
1. Open a Division Engineer project.
2. Upload a "POW" PDF and a "Site Photo".
3. Perform a "Save Changes" update.
4. Confirm that the previously uploaded PDF and Photo are still present in the updated view.
5. Inspect the DB to ensure `ipc` columns are populated correctly for the new assets.
