# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js (Express), React, and PostgreSQL environment. Your goal is to write clean, modular, and highly performant code to migrate SDO file storage from Base64 to compressed Postgres binary storage.

# 🌌 THE VIBE & AESTHETIC
This needs to feel like a high-end, secure government portal—trustworthy, lightning-fast, with "Optimizing and Securing..." feedback that reassures the user their data is being handled with modern standards. Sub-100ms feedback for non-blocking operations and clear progress states for heavy optimizations.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React, Vanilla CSS, FormData for binary uploads.
- **Backend:** Node.js Express, Multer (Memory Storage), PostgreSQL (Bytea via unified_binaries).
- **Key Patterns:** Deduped binary storage (SHA-256), async PDF compression (Ghostscript/Python), Hydra transformation (image sharding for large PDFs).

# 📝 CORE REQUIREMENTS
1. **Schema Evolution:** Update `school_documents` to support the binary pipeline.
2. **Backend Refactor:** Modularize SDO upload/resubmit routes to use `memoryUpload` and the `binaryPipeline`.
3. **Frontend Refactor:** Transition `SchoolManagement.jsx` from `FileReader` (Base64) to `FormData` (Binary).
4. **Resilience:** Maintain fallback for legacy Base64 documents during retrieval.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Database Schema & Migration**
- **1a:** Add columns `binary_id`, `file_path`, `file_size`, `original_size`, `hydra_manifest` to `school_documents`.
- **1b:** Ensure `BINARY_ID` index exists for performance.

**Step 2: Backend Route Transformation**
- **2a:** Update `/api/sdo/upload-document` to handle `multipart/form-data`.
- **2b:** Inject `compressBufferTo96Dpi` and `upsertBinary` into the upload flow.
- **2c:** Update `/api/sdo/resubmit-document/:pending_id` with identical logic.
- **2d:** Refactor `GET /api/sdo/document/:id/:type` to resolve from `binary_id` with Base64 fallback.

**Step 3: Frontend Binary Pipeline Integration**
- **3a:** Update `SchoolManagement.jsx` state to hold `File` objects.
- **3b:** Refactor `handleConfirmSubmit` to use `FormData`.
- **3c:** Implement `handleResubmitDocument` binary flow.

**Step 4: Final Polish & Self-Healing Diagnostics**
- **4a:** Add `Optimizing Document...` UI state to SDO dashboard.
- **4b:** Implement a diagnostic check to verify binary integrity post-upload.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```javascript
// SDO Binary Storage Health Check
const DEBUG_SDO_BINARY = true;

const checkSdoBinaryHealth = async (schoolId, docType) => {
    if (!DEBUG_SDO_BINARY) return;
    try {
        const res = await fetch(`/api/sdo/document/${schoolId}/${docType}`);
        const contentType = res.headers.get('Content-Type');
        console.log(`[SDO-Diag] Doc Health: ${schoolId}/${docType} | Type: ${contentType} | Status: ${res.status}`);
        if (!res.ok) throw new Error('Binary unreachable');
    } catch (err) {
        console.error(`[SDO-Diag] Critical: Binary storage check failed:`, err.message);
    }
};
```

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT break legacy Base64 document viewing.
- ALWAYS use `memoryUpload` for the binary pipeline to avoid disk clutter.
- PREFER `binary_id` over `file_path` for internal resolution.
