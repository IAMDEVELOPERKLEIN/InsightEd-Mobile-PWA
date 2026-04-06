# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js (Express), PostgreSQL, and Python (PyMuPDF) environment. Your goal is to write clean, modular, and highly performant code to enhance binary storage audit transparency.

# 🌌 THE VIBE & AESTHETIC
This needs to feel like a "High-Resolution Forensic Audit". The data must be precise, the storage savings must be undeniable, and the system should provide absolute clarity on where every byte is saved. It should feel robust, efficient, and bulletproof.

# 🛠️ TECH STACK & ARCHITECTURE
- **Backend:** Node.js (Express) with `pg` for PostgreSQL.
- **Binary Pipeline:** Custom `upsertBinary` with SHA-256 deduplication and Python-based PDF compression (PyMuPDF/fitz).
- **Database:** PostgreSQL (v15+) with JSONB for manifests and BIGINT for file sizes.
- **Key Patterns:** Dedup-first storage, redundant-safety compression, and Forensic Audit Reporting.

# 📝 CORE REQUIREMENTS
1. **Persistent Originality**: Capture and store the *true* original file size before any compression occurs.
2. **Schema Hardening**: Add `original_size` columns to `school_ownership_docs` and `engineer_documents` tables.
3. **Audit Alignment**: Update the binary storage audit script to calculate savings based on these new "ground truth" original sizes.
4. **De-duplication Safety**: Ensure that even if a file is deduplicated, we still track the original size of the logical reference.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Database Schema Expansion**
- **1a:** Add `original_size` (BIGINT) to `school_ownership_docs`.
- **1b:** Add `pow_original_size`, `dupa_original_size`, `contract_original_size`, `moa_original_size`, `rta_original_size` to `engineer_documents`.
- **1c:** Verify the columns exist using `psql` or a health check script.

**Step 2: Binary Pipeline Enhancement**
- **2a:** Update `upsertBinary` in `api/utils/binaryPipeline.js` to accept `originalSize` as a parameter.
- **2b:** Modify `upsertBinary` to return an object containing both `original_size` and `stored_size`.
- **2c:** Ensure the pipeline skips redundant compression if the buffer is already optimized.

**Step 3: Route Integration & Data Persistence**
- **3a:** Update `/api/schools/:iern/ownership-docs` to pass `req.file.size` to the pipeline and save the result to the new columns.
- **3b:** Update `processPdfInBackground` to handle original size tracking for all engineer document types.
- **3c:** Implement "Data Healing" logic: if a record exists but `original_size` is NULL, initialize it with the current `file_size` (best effort for legacy data).

**Step 4: Audit Reporting & Final Polish**
- **4a:** Update `system_scripts/binary_storage_audit.py` to use `COALESCE(original_size, file_size)` for its savings calculations.
- **4b:** Refine the "Recent PDF Uploads" table to show the true "Saving %" based on the new columns.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Create `tmp/audit_size_health.js` that:
- Connects to the DB and scans for any `binary_id` records where `file_size` (stored) is unexpectedly larger than `original_size`.
- Provides a summary of "Audit Transparency Coverage" (% of records with `original_size` populated).
- Includes a `const DEBUG_LEVEL = 'verbose';` toggle for per-record size validation logs.

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT break the existing SHA-256 deduplication logic.
- AVOID blocking the main thread with heavy PDF operations (keep them in background workers where possible).
- ENSURE all new columns are BIGINT to support large file uploads up to 50MB.
