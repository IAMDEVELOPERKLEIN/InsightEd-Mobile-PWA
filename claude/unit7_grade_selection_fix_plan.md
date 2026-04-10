# Implementation Plan: Fix Unit 7 Grade Selection Bug

The objective is to resolve a bug where disabled grade levels (4, 5, 6) from Unit 2 still appear in the Unit 7 Physical Facilities room selection interface.

## User Review Required

> [!IMPORTANT]
> This fix strictly enforces the `is_active` status derived from Unit 2 data. If a grade is disabled in Unit 2, it will be excluded from the selection list in Unit 7, regardless of whether it has recorded enrollment totals of 0 or greater.

## Proposed Changes

### Modular Components

#### [MODIFY] [Unit7PhysicalFacilities.jsx](file:///c:/InsightED%20and%20STRIDE/InsightED%20v2/InsightEd-Mobile-PWA/src/components/modular/Unit7PhysicalFacilities.jsx)

- **Change:** Update the `availableGrades` reconstruction logic (around line 324).
- **Rationale:** The current condition `hasEnrollment || (isOffered && isActive)` incorrectly includes grades where `hasEnrollment` is true (due to `total >= 0`) even if `isActive` is false.
- **New Logic:**
    ```javascript
    const isActive = u2Entry ? u2Entry.is_active !== false : isOffered;
    if (isActive) {
        detectedGrades.push({ id: pg.id, label: pg.label, isMultigrade: false });
    }
    ```
- **Robustness:** This ensures that the user's intent to "disable" a grade in Unit 2 is respected throughout the system.

## Verification Plan

### Automated Tests
- N/A (UI-centric logic).

### Manual Verification
1. Open Unit 2: Disable Grade 4, 5, 6.
2. Save Unit 2 and ensure it's in the outbox or saved to server.
3. Open Unit 7: Navigate to Phase 2 (Rooms).
4. Verify Grade 4, 5, 6 are missing from the grade selection buttons in the room inventory.
5. Enable them back in Unit 2 and verify they reappear in Unit 7.
