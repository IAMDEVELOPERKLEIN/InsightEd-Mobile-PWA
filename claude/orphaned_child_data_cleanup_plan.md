# [PLAN] Pruning Orphaned Child Data (ph_ tables)

## Objective
To remove "orphaned" child data associated with schools that are not successfully registered. This ensures that the operational database (`ph_` tables) only contains data relevant to active "beta" or "production" users, preventing data bloat and potential analytics errors.

## Systematic Audit (Phase 1)
Identified tables starting with `ph_` and their current "orphaned" status (records not linked to a registered School Head):

| Table | Total Records | Orphaned Records | Link Column |
|-------|---------------|------------------|-------------|
| `ph_teachers_list` | 8,231 | 8,231 | `school_id` |
| `ph_performance_logs` | 141 | 141 | `school_id` |
| `ph_buildings_inventory` | 2 | 2 | `school_id` |
| `ph_inventory_repairs` | 2 | 2 | `school_id` |
| `school_ownership_docs` | TBD | TBD | `iern` |
| `ph_school_buildable_spaces`| 0 | 0 | `iern` |

## Proposed Changes (Phase 2)

### 1. Targeted Deletion
Perform a multi-table deletion of records where the `school_id` (or `iern`) is not found in the list of registered users.

**Criteria for "Registered School":**
A school is considered registered if it exists in the `users` table with `registrant_type IS NOT NULL`.

### 2. Execution Sequence
To maintain referential integrity, deletions will be performed in the following order:
1.  **Child Tables (Leaf Nodes):** 
    - `ph_teachers_list`
    - `ph_performance_logs`
    - `ph_buildings_inventory`
    - `ph_inventory_repairs`
    - `ph_school_buildable_spaces`
    - `ph_ecart_batches`
2.  **Parent Table:**
    - `ph_schools` (Only entries NOT linked to registered users)

## Verification Plan

### Automated Verification
- Re-run the audit script `tmp/audit_ph_tables.js`.
- **Expected Result:** Orphaned count for all tables should be `0`.

### Manual Verification
- Verify that valid registered schools and their data (if any) remain intact.
