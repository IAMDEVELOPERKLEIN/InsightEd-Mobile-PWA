# Implementation Plan - "Unit 1 Mirror" Media Persistence System

This plan refactors the Division Engineer media system (images and documents) to mirror the School Head "Unit 1" pattern: immediate, disk-based, and permanently linked to the core entity (IPC) across all project versions.

# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js/Express and React environment. Your goal is to simplify and harden the Division Engineer media pipeline.

# 🌌 THE VIBE & AESTHETIC
The media system should feel **"Bulletproof & Instant"**. When an engineer uploads a site photo or a POW document, it should be processed (compressed to 100 DPI), stored on disk immediately, and become a permanent part of that project's lineage (IPC) without complex version-tracking logic for the assets themselves.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (DetailedProjInfo.jsx)
- **Backend:** Node.js / Express (api/index.js)
- **Storage:** Local Disk (`uploads/project_docs`, `uploads/project_images`)
- **Database:** PostgreSQL (Primary and Secondary/Dual-Write)
- **Key Pattern:** **IPC-Anchored Media**. Assets are linked to the project's permanent `IPC` (Unique Identifier) rather than a specific `project_id` (Snapshot ID).

# 📝 CORE REQUIREMENTS
1. **Wipe Legacy Logic**: Remove base64 storage dependencies and snapshot-specific media carry-over logic that causes "disappearing" files.
2. **Immediate IPC Linking**: All uploads (POST `/api/upload-project-document` and `/api/upload-project-image`) must resolve the `IPC` from the `project_id` and store the file path against that `IPC` in a unified way.
3. **Mandatory Compression**: 
    - **Images**: Downscale to **100 DPI** (JPEG, 80% quality) before storage.
    - **PDFs**: Run through the `compress_pdf.py` pipeline (100 DPI target).
4. **Permanent Visibility**: The Project Profile retrieval must join on `IPC` to fetch the latest available files, ensuring they remain accessible even after a project is updated or realigned.

# 🚀 STEP-BY-STEP EXECUTION PLAN

### Step 1: Database Hardening
- Ensure `engineer_documents` and `engineer_image` have an `ipc` column (Verified).
- Ensure a UNIQUE constraint on `(ipc)` or `(project_id)` in `engineer_documents` to prevent row fragmentation.

### Step 2: Backend Refactor (The "Unit 1" Mirror)
- **[MODIFY] api/index.js**:
    - Update `POST /api/upload-project-document` and `POST /api/upload-project-image` to:
        1. Resolve `IPC` from the provided `projectId`.
        2. Process/Compress the file (100 DPI).
        3. Save to disk in a flattened structure: `/uploads/project_docs/[IPC]_[TYPE].pdf`.
        4. UPSERT into the database using `ipc` as the conflict target (or `project_id` for the current snapshot, but ensuring retrieval is IPC-based).

### Step 3: Frontend Alignment
- **[MODIFY] DetailedProjInfo.jsx**:
    - Simplify the rendering loop. Always look for documents/images by IPC-based properties.
    - Ensure the "Download" links are permanently available if a path exists in the `project` object.

### Step 4: Verification
- Run the `check_talifara_docs.js` script to verify that multiple document types for the same IPC are now unified in the database.

# 🛑 CONSTRAINTS & GUARDRAILS
- **NO Base64**: Never store raw image/PDF data in the DB. Only store relative paths (e.g., `/uploads/project_docs/doc_123.pdf`).
- **Path Integrity**: Always include the leading `/` in stored paths to ensure frontend compatibility.
- **Transactional Safety**: Media uploads are independent of project "Save" transactions (Unit 1 Pattern).
