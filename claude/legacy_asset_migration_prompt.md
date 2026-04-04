# 🚀 Postgres Unified Binary Migration (Legacy Assets)

Perform a full migration of legacy assets from the VM disk (`/mnt/uploads/`) into the centralized **Postgres Binary Registry** (`unified_binaries`). This ensures 100% environment-agnostic persistence and eliminates dependency on the failing VM disk.

## 📋 Pre-Flight Checklist
- Ensure `DATABASE_URL` is set to the Azure Postgres instance.
- Ensure `UPLOAD_DIR` in `.env` correctly maps to the location of legacy files (e.g., `/mnt/uploads/` on VM or `E:/.../uploads` on Local).
- Verify `api/utils/binaryPipeline.js` is available (it handles WebP and PDF compression).

## 🛠️ Execution Logic
Create and run a migration utility `api/scripts/migrate_legacy_assets.js` with the following targets:

### 1. Target Configurations
| Table | Column(s) | Asset Type |
| :--- | :--- | :--- |
| `engineer_image` | `image_data` | Photo (WebP 65) |
| `project_documents` | `file_data` | PDF (96 DPI) |
| `school_ownership_docs` | `file_path` | PDF (96 DPI) |
| `engineer_documents` | `pow_pdf`, `dupa_pdf`, `contract_pdf`, `rta_pdf`, `moa_pdf` | PDF (96 DPI) |

### 2. Migration Algorithm
For each table/column pair:
1.  **Filter:** Select rows where the column contains `/uploads/` AND `binary_id` (or the specific UUID field) is NULL.
2.  **Resolve:** Map the DB path (e.g., `/uploads/school_docs/x.pdf`) to the absolute file system path using `UPLOAD_DIR`.
3.  **Process:** Read the file buffer and pass it to `upsertBinary()`.
    *   This will automatically check for SHA-256 duplicates.
    *   This will automatically apply WebP/PDF compression.
4.  **Link:** Update the database row:
    *   Set the column value to `/api/asset/${binary_id}`.
    *   Set the `binary_id` UUID column.

## 🛡️ Safety & DRY RUN
1.  **Stage 1 (Dry Run):** The script MUST first log the total number of files found and the expected space savings WITHOUT updating the database.
2.  **Stage 2 (Commit):** Once the user approves the dry-run logs, execute the migration in batches of 50 to ensure stability.

## 🧪 Verification
- After migration, verify that `unified_binaries` table size is significantly smaller than the total disk size of the `/uploads/` folder.
- Verify that the frontend (e.g. Project Gallery) resolves these assets via `/api/asset/:id`.
