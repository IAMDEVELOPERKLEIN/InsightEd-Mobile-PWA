# wizard_refactor_fix_plan.md

> **SYSTEMATIC RESILIENCE ACTIVE**

## Phase 1: High-Fidelity Diagnostics
* **Wizard Refactor**: 5 tabs (Procurement, Construction, Accomplishment, Checklist, Summary). Locking logic based on Procurement status.
* **Schema Errors**:
    - `engineer_documents`: missing `pow_filename`, `dupa_filename`, `contract_filename`.
    - `school_profiles`: missing `submitted_by`.

## Phase 2: The Hardened Fix

### 1. UpdateProjectWizard.jsx
- Consolidate `STEPS_CONSTRUCTION` and `STEPS_PROCUREMENT` into a single `STEPS` array.
- Implement conditional rendering for tab content.
- Update `handleNextStep` to handle skipping logic.

### 2. Database Migrations (api/db_init.js)
- Add the following columns:
    - `engineer_documents`: `pow_filename` (TEXT), `dupa_filename` (TEXT), `contract_filename` (TEXT).
    - `school_profiles`: `submitted_by` (TEXT).

## Phase 3: Verification Plan
1. **Wizard Flow**: Test with incomplete vs complete procurement.
2. **Data Integrity**: Verify project list loads without SQL errors.
