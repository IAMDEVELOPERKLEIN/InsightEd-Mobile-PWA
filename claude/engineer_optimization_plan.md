# Implementation Plan - Account Optimization (Division & EFD Engineer)

This plan addresses map interactivity for Division Engineers/Architects and fixes filtering issues in the EFD Engineer project dashboard.

## Proposed Changes

### 1. Map Interaction Improvements
Currently, the location picker map may be read-only or restricted to Variation Orders. We will enable it for general project location editing for Division Engineers and Architects.

#### [MODIFY] [EditProjectModal.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/components/EditProjectModal.jsx)
- Ensure the `Project Location` section (`renderLocation`) is interactive when the user is a Division Engineer or Architect.
- Verify `readOnly` logic allows `LocationPickerMap` to be interactive (`disabled={false}`) for these roles.
- Ensure `handleLocationSelect` correctly updates the project's `latitude` and `longitude` in the state.

### 2. Filtering & UI Cleanup (EFD Engineer Dashboard)
The "Funding Year" and "Batch of Funds" dropdowns are currently empty or non-functional.

#### [MODIFY] [FilterDrawer.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/components/FilterDrawer.jsx)
- **Fix Dropdowns**: Audit the `options` derivation logic. Ensure `funding_year`/`fundingYear` and `batch_of_funds`/`batchOfFunds` are correctly extracted from the `projects` array.
- **Remove Label**: Delete the "Global Criteria" header in the drawer to clean up the UI.
- **Logic Robustness**: Add defensive checks to ensure the `years` and `batches` arrays are populated correctly even if one naming convention is missing.

---

## Verification Plan

### Automated Tests
- N/A

### Manual Verification
1. **Map Editing**:
   - Log in as a Division Engineer or Architect.
   - Open a project in the editing modal.
   - Drag the marker or click a new location on the map.
   - Save and verify the new coordinates persist in the database.
2. **Filtering**:
   - Log in as an EFD Engineer.
   - Open the Filter Drawer.
   - Verify "Funding Year" and "Batch of Funds" now show options derived from the project list.
   - Verify "Global Criteria" is no longer visible.
