# Implementation Plan: Multigrade/Mixed Organization UI Refactor

Refactor the Multigrade and Mixed organization entry flow in Unit 2 (Learners) and Unit 3 (Organized Classes) to use a multi-screen wizard pattern instead of inline list entry.

## User Review Required

> [!IMPORTANT]
> The population input (Male/Female) is exclusive to **Unit 2**. In **Unit 3**, the corresponding "Next Page" will instead focus on **Section Counts** (Total Sections and Class Size Distribution) for the selected combination.

## Proposed Changes

### Unit 2: Learner Profile (Census)

#### [MODIFY] [Unit2Learners.jsx](file:///e:/InsightEd-Mobile-PWA/src/components/modular/Unit2Learners.jsx)
- **Step 3 Refactor**:
    - **Step 3a (Manager)**: A high-level list of current combinations with "Add" and "Edit" actions.
    - **Step 3b (Selection)**: A dedicated screen for selecting grade levels for a new/existing combination.
        - Implement `disabled` states for grade levels already assigned to other combinations.
        - Add a "Confirm Grade Selection" button.
    - **Step 3c (Population)**: A screen for entering `Total`, `Male`, and `Female` counts for each grade level in the active combination.
    - **Warning Logic**: Display a prominent note/warning if a single combination includes 4 or more grade levels.

### Unit 3: Organized Classes (Logistics)

#### [MODIFY] [Unit3OrganizedClasses.jsx](file:///e:/InsightEd-Mobile-PWA/src/components/modular/Unit3OrganizedClasses.jsx)
- **Combination Sync**: Ensure combinations defined in Unit 2 (or retrieved from the DB) follow the same multi-screen pattern:
    - Screen 1: Selection (if allowed to edit).
    - Screen 2: Section Distribution (Total Sections, Below/Within/Above standard).

## Verification Plan

### Automated Tests
- `npm run test` to ensure no regression in data sync logic.
- Verify that selecting 4+ grades triggers the "Are you sure?" warning.

### Manual Verification
1. Navigate to Unit 2 as a pure elementary school.
2. Select "Mixed Organization".
3. Add a combination (e.g., G1 + G2).
4. Verify that G1 and G2 are excluded from the next combination selection.
5. Verify the "4+ grades" warning by selecting G1, G2, G3, G4.
6. Complete the census and verify the summary table reflects the new combination data.
