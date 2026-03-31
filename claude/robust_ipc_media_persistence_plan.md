# Implementation Plan - Robust IPC-Common Media Persistence

The goal is to replace legacy media logic with a clean, IPC-centric storage and retrieval system. This ensures that site photos and project documents follow the project across its entire lifecycle (all updates and versions).

## Proposed Changes

### Database Layer
- **[MODIFY] engineer_image**: Add `file_path` column to store disk-based paths.
- **[MODIFY] indices**: Add B-Tree indices on `ipc` across `engineer_form`, `engineer_image`, and `engineer_documents`.
- **[NEW] Partial Indexing**: Add a partial index on `engineer_form(ipc)` where `ipc IS NOT NULL` for optimized retrieval.

### Backend API (`api/index.js`)
- **[REFACT] /api/save-project**:
    - **Transactional Integrity**: Wrap the snapshot creation (`engineer_form` + `engineer_documents`) in a single DB transaction (`BEGIN`/`COMMIT`).
    - Strictly reuse the incoming `ipc` if valid; generate only if new.
    - Every save remains a "Distinct Snapshot" (new `project_id`).
    - Carry over document paths from the previous `ipc` record if not provided in the payload.
- **[REFACT] /api/upload-image**:
    - **Compression Pipeline**: Every image must pass through `compress_image.py` (standardizing to 100 DPI, JPEG 80% quality) before storage.
    - Wipe out any remaining Base64 logic.
    - Strictly storage to `uploads/project_photos/`.
    - Update `engineer_image` using the `file_path` column and link via `ipc`.
- **[REFACT] /api/upload-project-document**:
    - **PDF Optimization**: Use `processPdfFile` (or a Python equivalent) to compress PDFs (re-sampling images to 100 DPI) before final storage.
    - Wipe out legacy paths.
    - **Path Sanitization**: Ensure filenames are sanitized to prevent directory traversal.
    - Strictly storage to `uploads/project_docs/`.
    - Update `engineer_documents` and link via `ipc`.
- **[NEW] Storage Partitioning**: Organize `uploads/` subdirectories by year or IPC (e.g., `uploads/project_photos/YYYY/`) to avoid folder bloat.
- **[MODIFY] /api/projects/:id**:
    - Use `LEFT JOIN LATERAL` to fetch the latest documents and images based on the project's `ipc`, rather than just the snapshot's `project_id`.

### Frontend (`DetailedProjInfo.jsx`)
- Ensure that the latest `project_id` (snapshot ID) is used for state but refers to `ipc` for historical data (Photos/Docs).

## Verification Plan

### Automated Tests
- No existing unit tests for these endpoints. I will verify via manual API testing and UI validation.

### Manual Verification
1. **Create New Project**: Verify a unique IPC is generated and files are saved to disk.
2. **"Save Modifications"**: Verify a NEW `project_id` is created, but the `IPC` stays the same.
3. **Media Persistence**: Upload a photo in Version 1. Update project to Version 2. Verify Version 2 still shows the photo from Version 1 via the IPC link.
4. **Document Persistence**: Upload a PDF. Update project. Verify the PDF remains accessible.
5. **Dashboard**: Verify the "Projects" tab only shows ONE card per IPC (the latest one).

## Expert Suggestions (Hardening)

### 🚀 [Senior Dev] Structural Integrity
- **Atomicity**: If the document record fails to insert, the project snapshot must also rollback.
- **Soft Deletes**: Consider adding a `deleted_at` column to `engineer_image` instead of hard-deleting files, allowing for recovery of accidentally removed site photos.

### 🐍 [Python Data Master] Data Optimization
- **Deduplication**: Before saving a file, check if a file with the same hash exists. Point the `file_path` to the existing file to save disk space.
- **Partitioned Storage**: Structure the `uploads` folder as `uploads/project_photos/<IPC>/<filename>` for clean organization and faster OS-level file lookups.

### 🔍 [Systematic Debugger] Resilience
- **Link Integrity Check**: Implement a diagnostic endpoint `/api/projects/diagnostics/links` that identifies database records pointing to non-existent files.
- **Fail-Fast Validation**: Use a strict regex or **Zod** schema to validate the `IPC` format at the API entry point.
- **Compression Logging**: Always log the "original vs compressed" file sizes to monitor optimization efficiency.
