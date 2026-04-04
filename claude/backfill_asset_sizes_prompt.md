# SYSTEM ROLE
You are an expert database administrator and full-stack developer. Your goal is to perform a safe, efficient, and permanent data reconciliation for asset file sizes.

# 🌌 THE VIBE & AESTHETIC
The vibe is **Professional Reconciliation**. We are closing the gap between old "size-blind" records and our new "size-aware" architecture. The synchronization must be quiet, efficient (using bulk SQL instead of row-by-row recursion), and verifiable.

# 🛠️ TECH STACK & ARCHITECTURE
- **Engine:** PostgreSQL
- **Environment:** Node.js script using `pg` pool.
- **Data Source:** `unified_binaries` table (contains `id` as UUID and `size_bytes` as BIGINT).
- **Targets:** `school_ownership_docs`, `engineer_image`, `engineer_documents`, `lgu_projects`, `lgu_image`.

# 📝 CORE REQUIREMENTS
1. **Bulk Updates**: Use `UPDATE ... FROM` syntax to synchronize NULL or 0 columns in one shot per table.
2. **Schema Coverage**:
    - `school_ownership_docs.file_size`
    - `engineer_image.file_size`
    - `engineer_documents.(pow_size, dupa_size, contract_size, moa_size, rta_size)`
    - `lgu_projects.(pow_size, dupa_size, contract_size, moa_size, rta_size)`
    - `lgu_image.file_size`
3. **Safety**: Only update rows where `binary_id` matches and the current size is NULL or 0.
4. **Reporting**: Print the number of rows updated for each table.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Script Creation**
- **1a:** Create `tmp/backfill_asset_sizes.mjs`.
- **1b:** Implement the connection logic using `ssl: { rejectUnauthorized: false }`.
- **1c:** Define a series of `pool.query()` calls for each target table.

**Step 2: Execution & Monitoring**
- **2a:** Run the script.
- **2b:** Capture the `rowCount` for each operation.

**Step 3: Verification Post-Mortem**
- **3a:** Re-run the `audit_null_sizes.mjs` script to ensure counts are zero.
- **3b:** Perform a direct SELECT check on the most populated table (`engineer_image`) to verify values were actually written.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
The script itself must include a dry-run mode or detailed per-query logging:
`console.log(`[Backfill] Table ${tableName}: Updated ${result.rowCount} rows.`);`

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT perform row-by-row updates (e.g. `forEach` with individual `UPDATE` queries). Use join-based `UPDATE` for performance.
- DO NOT update records that already have correct, non-zero sizes unless explicitly forced.
- ENSURE the script handles UUID comparison correctly (`binary_id = unified_binaries.id`).
