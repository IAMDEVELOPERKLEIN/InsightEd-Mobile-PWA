# SYSTEM ROLE
You are an expert full-stack developer operating in a React (Vite), Express, and PostgreSQL environment. Your goal is to implement file size tracking and display for all assets, ensuring that the **actual compressed/optimized size** is what's stored and shown.

# 🌌 THE VIBE & AESTHETIC
The file size information should feel like a first-class citizen of the document metadata. Use clean, subtle typography (e.g., text-xs, text-gray-500) and ensure perfect alignment. The formatting must be human-readable (KB/MB) with a premium, technical feel.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React with TailwindCSS, Framer Motion, and React Icons.
- **Backend:** Express with `pg` for PostgreSQL, `multer` for uploads.
- **Binary Pipeline:** Custom deduplication and compression logic in `api/utils/binaryPipeline.js`.
- **Database:** PostgreSQL with tables: `school_ownership_docs`, `engineer_documents`, `engineer_image`, `lgu_forms`.

# 📝 CORE REQUIREMENTS
1. **Schema Update:** Add `file_size` (BIGINT) columns to all relevant asset tables.
2. **Binary Pipeline Integration:** Implement actual PDF compression in `binaryPipeline.js` using the existing `compress_pdf.py` script.
3. **Accuracy:** Store the size **after** compression/optimization (WebP for images, optimized PDF for docs).
4. **Visibility:** Display formatted sizes in the School Head Unit 1 dashboard and Engineer Project profiles.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Database Migrations**
- **1a:** Add `file_size` to `school_ownership_docs`.
- **1b:** Add `file_size` to `engineer_image`.
- **1c:** Add `pow_size`, `dupa_size`, `contract_size`, `moa_size`, `rta_size` to `engineer_documents`.
- **1d:** Add same size columns to `lgu_forms`.

**Step 2: Binary Pipeline Hardening**
- **2a:** Update `api/utils/binaryPipeline.js` to implement `compressPDF`. It should stage the buffer to a temp file, run `compress_pdf.py`, and read back the optimized buffer.
- **2b:** Ensure `upsertBinary` returns the `finalBuffer.length` as part of its result.

**Step 3: Backend Logic Updates**
- **3a:** Update `POST /api/schools/:iern/ownership-docs` in `api/index.js` to store the size from `upsertBinary`.
- **3b:** Update `processPdfInBackground` in `api/index.js` to persist the final compressed size to the database.
- **3c:** Update `GET /api/projects/:id` and other fetch routes to return these new size fields.

**Step 4: Frontend UI Integration**
- **4a:** Update `src/components/modular/DocumentUpload.jsx` to display the formatted size.
- **4b:** Update `src/components/modular/Unit1SchoolIdentity.jsx` to show sizes in Review Mode.
- **4c:** Update `src/modules/DetailedProjInfo.jsx` (or equivalent) to show document sizes.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Create a script `scripts/verify_asset_sizes.js` that:
- Queries all asset tables and logs the `file_size` vs the physical `size_bytes` in `unified_binaries`.
- Alerts if any mission-critical documents have null or zero sizes.

# 🛑 CONSTRAINTS & GUARDRAILS
- Use `BIGINT` for file sizes to handle large assets.
- Use `fs.promises` for all async file operations in the backend.
- Ensure `compress_pdf.py` is called correctly across different environments (python/py/python3).
