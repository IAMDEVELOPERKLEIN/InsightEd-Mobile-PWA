# Implementation Plan - "Immediate PDF" Individual Upload System (v1.2)

This plan refactors the Division Engineer document system to support **individual, row-level uploads** that persist immediately to the disk and database via the IPC, independent of the main project snapshot.

# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js/Express and React environment. Your goal is to provide a seamless, high-confidence media management experience.

# 🌌 THE VIBE & AESTHETIC
The "Documents" tab should function as a **Live Control Center**. Each row (POW, DUPA, CONTRACT) acts as an autonomous module. Uploading a file provides instant feedback—a progress bar, a success pulse, and an immediate "Download" link—making the interface feel reactive and authoritative.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (DetailedProjInfo.jsx)
- **Backend:** Node.js / Express (api/index.js)
- **Pattern:** **Atomic Persistence**. Each upload is a self-contained transaction that updates the `engineer_documents` table keyed by IPC.
- **Diagnostics:** Custom `MediaHealthMonitor` component for real-time path verification.

# 📝 CORE REQUIREMENTS
1. **Row-Level Buttons**: Replace the global "Save" dependency with individual "Upload" buttons in each document row.
2. **Instant IPC Upsert**: Backend must UPSERT based on IPC immediately to ensure the file is linked to the project's lineage, even if the current snapshot is old.
3. **100 DPI Enforcement**: Pass the IPC-named filename to `processPdfFile` for deterministic storage.
4. **Interactive Status**: Show "Uploading...", "Success ✅", or "Retry ❌" per document row.

# 🚀 STEP-BY-STEP EXECUTION PLAN

### Step 1: Frontend - State & Lifecycle
- **1a:** Define `docStatus` state: `const [docStatus, setDocStatus] = useState({ POW: 'idle', DUPA: 'idle', CONTRACT: 'idle' });`
- **1b:** Initialize `project` state with IPC-linked documents on mount.

### Step 2: Frontend - Atomic Upload Controller
- **2a:** Implement `handleAtomicUpload(key, file)`:
    - Set `docStatus[key]` to `uploading`.
    - Create `FormData` with `type`, `ipc`, `projectId`, and `document_pdf`.
    - Call `/api/upload-project-document`.
    - On success: Update local `project` object and set status to `success`.
    - On failure: Set status to `error` and alert the user.

### Step 3: UI - The Control Center Refactor
- **3a:** Update `renderDocuments` in `DetailedProjInfo.jsx`:
    - Inject the `handleAtomicUpload` trigger into the `input.onChange` handler.
    - Add a "Clear/Replace" button for existing documents.
    - Implement a "Progress Spinner" inline with the "Missing/Download" labels.

### Step 4: Backend - Snapshot Link Maintenance
- **4a:** Update `api/index.js:app.post('/api/upload-project-document')`:
    - Ensure the `ON CONFLICT (ipc)` logic correctly updates the `project_id` to the *current* active snapshot to keep the link fresh.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Add a `ProjectMediaDiagnostic` component (enabled via `const DEBUG_MEDIA = true;`) that:
- Prints the resolved IPC and Project ID to the console before every upload.
- Checks if the returned `filePath` matches the expected `/uploads/project_docs/[IPC]_[TYPE].pdf` format.
- Logs a ⚠️ warning if the `navigator.onLine` is false during a trigger.

# 🛑 CONSTRAINTS & GUARDRAILS
- **DO NOT** wait for the global save. The link must be "Permanently accessible... even upon going back".
- **Unique IPC**: Block uploads if `project.ipc` is null or undefined (Safety guard).
- **Compression Check**: Verify that the backend response includes "PDF compressed: [X] KB" in logs.
