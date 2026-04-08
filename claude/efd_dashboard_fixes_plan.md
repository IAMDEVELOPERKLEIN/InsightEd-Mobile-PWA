# Implementation Plan - EFD Engineer Dashboard UI Optimization

This plan focuses on resolving UI and functional bugs in the EFD Engineer dashboard.

## User Review Required

> [!NOTE]
> **Data Source Migration Deferred**: As requested, the migration to `engineer_form_cleaned` is excluded from this plan. All operations will continue to use the existing `engineer_form` table.

## Proposed Changes

### 1. Scroll Position Persistence

#### [MODIFY] [EFDHome.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/EFDHome.jsx)
- **State Preservation**: 
    - Save `activeTab` to `sessionStorage` whenever it changes.
    - Save the current window scroll position to `sessionStorage` when navigating away from the dashboard.
- **Restoration Logic**:
    - On component mount, initialize `activeTab` from `sessionStorage`.
    - Implement a mechanism to scroll back to the saved position immediately after the project list has been rendered. This will use a `useLayoutEffect` or a precise `useEffect` toggle to ensure no visible "jump" or delay where possible.

### 2. Filter Drawer Fixes

#### [MODIFY] [FilterDrawer.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/components/FilterDrawer.jsx)
- **Option Source logic**:
    - Modify the `options` derivation to always pull `Funding Year` and `Batch of Funds` from the `projects` array. 
    - Currently, if `locations` is provided, it ignores `projects` for these fields, but `locations` (from the reference API) often lacks project-specific metadata like Batch or Year.

#### [MODIFY] [EFDHome.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/EFDHome.jsx)
- **Prop Correction**:
    - Update the `<FilterDrawer />` call to match the component's signature (passing `initialYears`, `initialBatches`, `onApply`, etc. instead of direct state setters).

---

## Verification Plan

### Manual Verification
1. **Scroll Test**: Navigate to EFD Dashboard -> Projects Tab -> Scroll down -> Click a project -> Click 'X' -> Verify you are back at the same scroll position in the Projects Tab.
2. **Filter Test**: Open Filter Drawer -> Verify "Funding Year" and "Batch of Funds" now show choices (e.g., 2024, 2025, Batch 1, etc.).
