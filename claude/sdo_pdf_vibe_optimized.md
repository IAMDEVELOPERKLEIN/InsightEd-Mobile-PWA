# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js (Express), React, and Python environment. Your goal is to write clean, modular, and highly performant code to finalize the SDO PDF compression and binary storage migration.

# 🌌 THE VIBE & AESTHETIC
"High-End Governance." The user experience must feel extremely secure and professional. When a document is uploaded, the UI should provide sophisticated feedback ("Optimizing & Securing Document...") during the 96 DPI rasterization and SHA-256 deduplication process. The final storage must be bulletproof, environment-agnostic (via Postgres Binary), and storage-efficient.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React, Multer (Memory Storage), Custom "Optimizing" UI states.
- **Backend:** Node.js Express, `api/utils/binaryPipeline.js` (Unified Storage), `compress_pdf.py` (Python PyMuPDF/Ghostscript engine).
- **Key Patterns:** Buffer-to-Buffer processing, 96 DPI enforcement, SHA-256 deduplication, background PDF-to-Image (Hydra) for large files (> 1.5MB).

# 📝 CORE REQUIREMENTS
1. **DPI Enforcement:** Strictly enforce 96 DPI for all SDO school document uploads.
2. **Binary Primary Path:** Migrate SDO from Base64/Disk storage to `unified_binaries` (Postgres Bytea).
3. **Robust Error Handling:** Log full Python tracebacks to the server console to catch environment-specific failures (like missing Ghostscript).
4. **Resilience:** Fallback to original buffer ONLY if all compression methods fail, and ensure a Base64 fallback exists for legacy document retrieval.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Harden the Compression Utility (Logic & Logging)**
- **1a:** Update `api/index.js:compressBufferTo96Dpi` to capture and log the full `stderr` from Python executors.
- **1b:** Ensure `compress_pdf.py` is correctly resolved using absolute paths across all calls.

**Step 2: Backend Route Alignment (SDO Upload & Resubmit)**
- **2a:** Refactor `POST /api/sdo/upload-document` to use the unified `upsertBinary` pipeline.
- **2b:** Apply identical logic to `POST /api/sdo/resubmit-document/:pending_id`.
- **2c:** Ensure `binary_id` is the primary key for retrieval, with `file_path` as a secondary resolve/redirect.

**Step 3: Frontend UX Refinement (SDO Dashboard)**
- **3a:** Ensure `SchoolManagement.jsx` provides "Optimizing & Securing..." feedback during the upload process.
- **3b:** Display original vs. optimized file size savings in the dashboard post-upload to build user trust.

**Step 4: Cleanup & Vacuum**
- **4a:** Unlink ALL temporary files in all branch outcomes (Success/Fail/Error).
- **4b:** Perform a "Binary Integrity Test" by fetching a newly uploaded document.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```javascript
// SDO Binary Pipeline Health Mirror
const DEBUG_SDO_PDF = true;
const logSdoDebug = (msg, data = null) => {
    if (!DEBUG_SDO_PDF) return;
    console.log(`[SDO-PDF-Audit] ${msg}`, data || '');
};

// Insert into api/index.js to verify the exact command being sent to Python
// console.log(`[PDF-CMD-DEBUG] Executing: ${cmd(executor)}`);
```

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT use relative paths for `path.resolve` without verifying `__dirname` consistency.
- AVOID redundant compression (if `compressBufferTo96Dpi` succeeded, tell `upsertBinary` to skip its internal check).
- NEVER store null `binary_id` if a buffer was successfully processed.
