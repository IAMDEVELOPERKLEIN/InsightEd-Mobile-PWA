# [PLAN] Deleting Incomplete School Head Profiles

## Objective
To maintain data integrity by removing user accounts where `role` is 'School Head' but the `registrant_type` is missing (NULL). These records represent incomplete or legacy registrations that may cause logic errors in the "InsightEd" dashboard and mobile application.

## Systematic Audit (Phase 1)
- **Table:** `users`
- **Total Records to be Deleted:** 180
- **Total School Heads Remaining:** 3
- **Criteria:** `role = 'School Head'` AND `registrant_type IS NULL`
- **Impact Assessment:** 
    - No impact on the 3 valid registrations.
    - 180 records are confirmed as incomplete/legacy entries.

## Proposed Changes (Phase 2)

### 1. Database Deletion
- **Command:** `DELETE FROM users WHERE role = 'School Head' AND registrant_type IS NULL;`
- **Safety Protocol:**
    - Perform a `SELECT` count immediately before deletion to confirm the scope.
    - Wrap the operation in a transaction (optional for single statement but good for logging).

### 2. Activity Logging
- Log the number of deleted records for administrative audit.

## Verification Plan

### Automated Verification
1. Run `SELECT count(*)` with the same criteria.
2. Expected Result: `0`.

### Manual Verification
1. Attempt to login with one of the sampled "orphaned" emails (if known).
2. Expected Result: Login fails (user not found).
