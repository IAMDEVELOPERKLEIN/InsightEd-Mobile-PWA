# Implementation Plan - PDF & Photo Compression (File-Path Optimized)

Standardize the file upload and optimization process for Division Engineer accounts. This revision ensures that all assets are stored as **file paths** in the local server directory instead of Base64 strings, preventing PostgreSQL database bloat.

## Objectives
- **Mitigate Data Bloat:** Transition from Base64 to physical file storage (`uploads/`).
- **Standardize Optimization:** Enforce **96 DPI** for all project PDFs.
- **Image Optimization:** Implement automated resizing and quality compression for project photos.

## Proposed Changes

### 1. Storage Infrastructure
- **Directories:** Ensure the following directories exist on the local server:
  - `uploads/project_docs/` (for POW, DUPA, CONTRACT, MOA, RTA)
  - `uploads/project_photos/` (for site images)
- **Nginx/Express:** Ensure the `/uploads` directory is served statically (Done: `app.use('/uploads', ...)` at line 223).

### 2. Backend: PDF Compression Hook
- **File:** [api/index.js](file:///e:/InsightEd-Mobile-PWA/api/index.js)
- **Action:** 
  - Update `processPdfFile` to accept a `targetPath` and `dpi` (default 96).
  - Modify all Engineer handlers (`update-project`, `upload-mother-moa`, etc.) to:
    1.  Save the physical file via Multer.
    2.  Store the relative path (`/uploads/project_docs/filename.pdf`) in the DB.
    3.  Run background optimization and replace the physical file with the 96 DPI version.

### 3. Backend: Image Optimization logic
- **New Script:** `compress_image.py` (Python + PIL)
  - Automatically resizes images larger than 1600px width.
  - Compresses to 70% JPEG quality to maintain "premium" looks while reducing size by up to 90%.
- **Action:** Update `/api/upload-image` to save the file to `uploads/project_photos/` and store its path in `engineer_image.image_path` (or reuse `image_data` column as a path-container).

### 4. Database Schema Migration (Optional but Recommended)
- While the current `TEXT` columns can hold a path string, we should eventually rename them for clarity (e.g., `image_path` instead of `image_data`).
- **Compatibility:** Update the GET handlers to check if the stored value is a path (starts with `/uploads/`) or legacy Base64.

## Verification Plan

### Automated Tests
- Upload a 10MB PDF and verify the DB stores a path and the physical file is <1MB.
- Upload a 5MB JPG and verify the DB stores a path and the physical file is <500KB.

### Manual Verification
- Verify that clicking "View File" in the dashboard loads the PDF/Image correctly from the URL.
- Inspect the PostgreSQL `engineer_form` and `engineer_image` tables to ensure they contain short path strings, not long Base64 blobs.
