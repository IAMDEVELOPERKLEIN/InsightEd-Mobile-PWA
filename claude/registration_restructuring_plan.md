# [ROBUST SOLUTION] School Head Registration Data Restructuring

## Objective
To decouple the master school list (`schools_IERN`) from the active schools list (`ph_schools`), ensuring `ph_schools` only contains schools that have successfully registered a School Head.

## Systematic Audit (Phase 1)
- **Environment:** Production VM + Azure Postgres
- **Active Tables:**
    - `schools_IERN`: Master list (46,789 entries).
    - `ph_schools`: Active/Profile list (45,796 entries - PRE-POPULATED).
    - `users`: Registration list (2,984 School Heads).
- **Problem:** `ph_schools` is pre-populated with nearly all schools, making it a redundant copy of the master list. The user wants it to only show active (registered) schools.
- **Constraint:** Most existing `users` (2600+) lack a `school_id` or `iern` link in the database, relying on email-prefix conventions.

## Proposed Changes (Phase 2)

### 1. Data Hardening & Backfill
We must map existing users to their schools before culling `ph_schools`.
- **Email Prefix Mapping**: Run migration to extract `school_id` from `@deped.gov.ph` email prefixes and backfill `users.school_id`.
- **User-School Linkage**: Run migration to link matching `ph_schools` entries to these users.

### 2. Implementation of Standalone Logic
Modify the registration flow to ensure populate-on-demand behavior.
- **Search Re-routing**: Ensure `/api/locations/schools` pulls reliably from `"schools_IERN"`.
- **Registration Hydration**: Refactor `/api/register-beta` to be the primary gateway that hydrates `ph_schools` from `schools_IERN`.

### 3. Targeted Cull (Systematic Cleanup)
Clear out non-registered schools from the production environment.
- **Orphan Cleanup**: Delete rows in `ph_schools` that are NOT referenced in the `users` table or other active modules.

## Verification Plan

### Manual Verification
1. Register a new School Head (previously unregistered IERN).
2. Verify `ph_schools` count increases by 1.
3. Verify Dashboard loads with school identity context.
