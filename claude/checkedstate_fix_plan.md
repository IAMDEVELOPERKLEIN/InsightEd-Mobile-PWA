# checkedstate_fix_plan.md

> **SYSTEMATIC RESILIENCE ACTIVE (FULL STACK: VM + AZURE)**

## Phase 1: Multi-Layer Audit (Token-Minimized)
* **Frontend (React):** `src/components/UpdateProjectWizard.jsx` contains multiple undefined variable references: `checkedState`, `setCheckedState`, `setStatusAsOf`, `setInternalPreviews`, and `setExternalPreviews`.

## Phase 2: Scientific Hypotheses (Two-Path Rule)
1. **Hypothesis A:** [Likelihood: High] The component was refactored or partially implemented, leaving behind references to states that were never declared or were renamed during the process.
2. **Hypothesis B:** [Likelihood: Low] Missing imports or context providers (not the case here as these are clearly local state patterns).

## Phase 3: The Hardened Fix
I will declare the missing states and fix the incorrect function names.

### [MODIFY] `src/components/UpdateProjectWizard.jsx`

```javascript
// Add missing state
const [checkedState, setCheckedState] = useState({});

// Fix incorrect references
setStatusAsOf -> setStatusAsOfDate
setInternalPreviews -> setActivePreviews (with category update)
setExternalPreviews -> setActivePreviews (with category update)
```

## Phase 4: Verification Plan
1.  **Checklist Interaction**: Open the wizard, go to Step 3, and toggle checklist items. Verify no `ReferenceError`.
2.  **Date Update**: Verify "Status As Of Date" field updates the state correctly.
3.  **Photo Clear**: Verify that opening the modal for a new project clears files and previews without error.
