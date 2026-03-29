# Implementation Plan - Update School Resources Chair Types

Update the learner seating inventory in Unit 6 (School Resources) to include 8 specific chair types and ensure that 2-seater chairs are accounted for as accommodating 2 learners in capacity calculations.

## Proposed Changes

### [Component] School Resources (Modular)

#### [MODIFY] [Unit7SchoolResources.jsx](file:///e:/InsightEd-Mobile-PWA/src/components/modular/Unit7SchoolResources.jsx)

- **State Management**:
    - Update `initialGradeForm` and `generalRoomsData` to include the 8 new chair types:
        - `armchair_wood_func`, `armchair_wood_broken`
        - `armchair_plastic_func`, `armchair_plastic_broken`
        - `armchair_plastic_steel_func`, `armchair_plastic_steel_broken`
        - `individual_table_chair_func`, `individual_table_chair_broken`
        - `two_seater_wood_func`, `two_seater_wood_broken`
        - `two_seater_wood_steel_func`, `two_seater_wood_steel_broken`
        - `wooden_chair_only_func`, `wooden_chair_only_broken`
        - `plastic_chair_only_func`, `plastic_chair_only_broken`
- **Logic**:
    - Update `gradeStats` useMemo to calculate `totalCapacity` by summing all functional chairs, multiplying 2-seater types by 2.
    - Update `Phase 1` summary calculation (line 889) to reflect the new types.
    - Update `openGradeModal` to map the new fields.
- **UI (GradeModal & General Rooms)**:
    - Replace the existing 3 furniture input sections with 8 sections corresponding to the new types.
    - Maintain consistent styling and error handling.

## Verification Plan

### Automated Tests
- No existing automated tests cover this specific UI logic.
- I will run a manual verification script (if possible) or rely on visual inspection via the browser tool if requested.

### Manual Verification
1. Open the School Resources (Unit 6) unit in the Modular Dashboard.
2. Navigate to Phase 1: Grade Level Inventory.
3. Open a Grade Level for auditing.
4. Verify that the 8 new chair types are listed with Functional and Broken inputs.
5. Enter values for 2-seater chairs and verify that the "Combined Capacity" correctly counts them as 2 learners each.
6. Verify that saving a grade level correctly updates its status to "Verified".
7. Verify the "General Classrooms" section also shows the same 8 chair types.
8. Submit the unit and verify that the summary correctly calculates the total functional seats.
