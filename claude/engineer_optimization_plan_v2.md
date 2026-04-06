# Implementation Plan - Dashboard & Map Enhancements

This plan addresses map interaction safety, filter reliability for EFD Engineers, and UI stability during navigation.

## Proposed Changes

### 1. Map Interaction (Lock/Unlock Toggle)

#### [MODIFY] [EditProjectModal.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/components/EditProjectModal.jsx)
- Add a new state: `const [isLocationEditing, setIsLocationEditing] = useState(false)`.
- In `renderLocation`, replace the static header with a row containing the title and an "Edit Location" button (using a lock/unlock icon).
- Pass `disabled={!isLocationEditing}` to the `LocationPickerMap`.

#### [MODIFY] [LocationPickerMap.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/components/LocationPickerMap.jsx)
- Ensure the `DraggableMarker` component's `draggable` attribute is strictly tied to the `disabled` prop.
- Disable the map's "Click to place" logic when `disabled` is true.

### 2. Filter Drawer Fixes (EFD Engineer)

#### [MODIFY] [FilterDrawer.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/components/FilterDrawer.jsx)
- Debug the "Immediate Closure": Ensure internal state updates for `selectedDivision`, `selectedProvince`, etc., do not trigger an immediate `onApply` or parent re-render that might reset the component.
- Fix for choice reflection: Ensure `MultiSelectField` buttons (Years/Batches) correctly highlight when selected by strictly comparing types (String vs Number).

#### [MODIFY] [EngineerProjects.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/EngineerProjects.jsx)
- **Stabilization**: Prevent background project fetches from updating the `projects` state *if* `isFilterOpen` is true. This prevents the "native select closing" bug caused by DOM re-renders.
- **Filtering Logic**: Update the `filteredProjects` useMemo to correctly filter by `selectedYears` and `selectedBatchFunds`. These arrays should be checked against both `p.funding_year` and `p.batchOfFunds`.

### 3. Project List Navigation Glitch

#### [MODIFY] [EngineerProjects.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/EngineerProjects.jsx)
- **Consistency**: Ensure the sort order (`ORDER BY project_id DESC`) is applied both in the `projects` and `filteredProjects` useMemos.
- **Loading State**: Implement a stable container height or a clearer "Hydrating..." state to prevent layout jumps when transitioning from cache to network data.
- **Scroll Management**: Add a `useEffect` to handle scroll restoration more gracefully during `PageTransition`.

---

## Verification Plan

### Automated Tests
- N/A (Manual visual verification required)

### Manual Verification
1. **Map Editing**:
   - Open a project. Try to drag the marker (should be disabled).
   - Click "Edit Location". Try to drag the marker (should be enabled).
2. **Filter behavior**:
   - Open the Filter Drawer as an EFD Engineer.
   - Click "Division" dropdown. It should STAY open.
   - Select multiple "Funding Years". Apply. Verify filtering accuracy.
3. **List Navigation**:
   - Scroll down the project list.
   - Click into a project.
   - Click "Back".
   - Verify the list doesn't "jump" to the top.
