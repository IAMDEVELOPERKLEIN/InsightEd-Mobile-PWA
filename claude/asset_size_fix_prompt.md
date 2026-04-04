# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js (Express), PostgreSQL, and Multer environment. Your goal is to fix a critical data persistence bug related to asset file size tracking.

# 🌌 THE VIBE & AESTHETIC
The system must be **Bulletproof & Historically Accurate**. Every byte matters. When a user uploads a document, the system must precisely record the final stored size after optimization/compression, even if the file is a duplicate. This ensures the UI feels trustworthy and professional.

# 🛠️ TECH STACK & ARCHITECTURE
- **Backend:** Node.js (Express)
- **Database:** PostgreSQL (pg pool)
- **File Handling:** Multer (memoryStorage)
- **Pipeline:** Custom `binaryPipeline.js` using `sharp` (images) and `PyMuPDF`/`compress_pdf.py` (PDFs).
- **Storage Pattern:** Single-instance binary storage in `unified_binaries` with deduplication via SHA-256 hashing.

# 📝 CORE REQUIREMENTS
1. **Normalize Size Reporting**: `upsertBinary` must reliably return the final byte count of the buffer stored in the database.
2. **Handle Deduplication**: If a file already exists, the pipeline must return its actual size, not 0 or a "saved" delta that results in 0.
3. **Complete Persistence Coverage**: Ensure the `engineer_documents` upload route includes the `_size` column in its SQL queries.
4. **Variable Safety**: Ensure all local variables (like `finalSize`) are properly scoped and declared.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Pipeline Hardening (binaryPipeline.js)**
- **1a:** Modify `upsertBinary` in `api/utils/binaryPipeline.js`. 
- **1b:** Instead of returning `bytes_saved`, return `stored_size` (the length of `finalBuffer`).
- **1c:** On deduplication (`existing.rows.length > 0`), fetch the `size_bytes` from the `unified_binaries` table and return it as `stored_size`.

**Step 2: Metadata Logic Sync (index.js)**
- **2a:** Update `processPdfInBackground`: Replace `bytes_saved` logic with direct use of `stored_size`. Ensure `finalSize = stored_size`.
- **2b:** Update `/api/upload-image`: Ensure `finalSize` is declared (`let`) and assigned from the new `stored_size` return.
- **2c:** Update `/api/schools/:iern/ownership-docs`: Use `stored_size` for the `file_size` column.

**Step 3: Missing Column Fix (index.js)**
- **3a:** Locate the `/api/upload-project-document` route.
- **3b:** Capture `stored_size` from `upsertBinary`.
- **3c:** Dynamically resolve the size column name (e.g., `pow_size`) and add it to both the `INSERT` column list and the `VALUES` array.
- **3d:** Update the `ON CONFLICT ... DO UPDATE` clause to include `size_column = EXCLUDED.size_column`.

**Step 4: Verification & Diagnostic**
- **4a:** Create `tmp/verify_fix.cjs` to simulate back-to-back duplicate uploads and check if the database reflects non-zero sizes for both.
- **4b:** Execute the script and report the results.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Include a `const DEBUG_FIX = true;` flag in the updated routes that logs:
`[DEBUG_FIX] Upload Result: binary_id=${binaryId} | stored_size=${storedSize} | deduplicated=${deduplicatd}`.

# 🛑 CONSTRAINTS & GUARDRAILS
- ALWAYS use `let` or `const` for new variables.
- ENSURE the `ON CONFLICT` clause in `index.js` remains correct for the `ipc` constraint.
- DO NOT break the existing dual-write logic (replica pool).
