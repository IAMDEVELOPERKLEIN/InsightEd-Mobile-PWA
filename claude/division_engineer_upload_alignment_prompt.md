# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js (Express) and PostgreSQL environment. Your goal is to rewrite the Division Engineer PDF upload logic to match the hardened, "perfectly working" School Head Unit 1 pattern.

# 🌌 THE VIBE & AESTHETIC
The implementation must feel "bulletproof" and "enterprise-grade". Every upload must be optimized, tracked with unique binary identifiers, and synchronized across primary and secondary databases with zero data loss. The user experience should be seamless, with rich metadata returned instantly to the frontend.

# 🛠️ TECH STACK & ARCHITECTURE
- **Backend:** Node.js, Express, Multer (Memory Storage)
- **Database:** PostgreSQL (with `pg` pool)
- **Storage Pattern:** Unified Binary Storage (`upsertBinary`), 96 DPI PDF Compression (`compressBufferTo96Dpi`)
- **Persistence Pattern:** HAWKEYE "Single Truth" Protocol (UPSERT on canonical IDs)

# 📝 CORE REQUIREMENTS
1.  **Rich Metadata Response**: Standardize the JSON response to include `binaryId`, `file_size`, and `fileName`.
2.  **Idempotent Persistence**: Ensure the `INSERT ... ON CONFLICT (ipc)` logic is robust and handles concurrent updates correctly.
3.  **Timestamp Synchronization**: Automatically update the `engineer_form.status_as_of` timestamp on every document upload to ensure project cards reflect activity.
4.  **Structured Error Diagnostics**: Implement a deep diagnostic error object in the catch block for forensic debugging.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Backend Route Refactoring (api/index.js)**
- **1a:** Locate `app.post('/api/upload-project-document', ...)` (approx line 10295).
- **1b:** Align the response structure to match the `/api/schools/:iern/ownership-docs` pattern.
- **1c:** Add the `UPDATE engineer_form SET status_as_of = CURRENT_TIMESTAMP` logic focused on the project's `ipc`.

**Step 2: Dual-Write & Timestamp Hardening**
- **2a:** Ensure the Dual-Write logic for LGU projects and Division Engineer projects uses the same canonical `ipc` mapping logic.
- **2b:** Verify that the `engineer_documents` table correctly stores `hydra_manifest` as a merged JSONB object.

**Step 3: Diagnostic Logic Implementation**
- **3a:** Update the error handling for both primary and secondary database writes to provide detailed table/constraint context.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```javascript
/**
 * Division Engineer Upload Diagnostic Script
 * Run this in the console or as a standalone script to verify the upload health.
 */
const checkUploadHealth = async (projectId) => {
    const DEBUG_MODE = true;
    try {
        const res = await fetch(`/api/projects/${projectId}`);
        const data = await res.json();
        
        const docs = {
            pow: !!data.pow_pdf,
            dupa: !!data.dupa_pdf,
            contract: !!data.contract_pdf
        };
        
        if (DEBUG_MODE) {
            console.group('🔧 [EngineerUpload] Health Check');
            console.log('Project IPC:', data.ipc);
            console.table(docs);
            console.log('Status As Of:', data.statusAsOf);
            console.groupEnd();
        }
        
        return docs;
    } catch (err) {
        console.error('❌ [EngineerUpload] Diagnostic Failed:', err.message);
    }
};
```

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT remove existing base64 support (for offline sync) while adding multipart/multer support.
- ENSURE `finalBinaryId` is passed correctly even in fallback scenarios (as null if applicable).
- DO NOT break the non-blocking nature of Dual-Writes.
