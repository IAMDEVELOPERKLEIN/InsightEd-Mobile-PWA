# ADR-0005: Frontend State Derivation Patterns

## Status
Accepted

## Context
A critical regression in `EFDHome.jsx` resulted in a `ReferenceError: filteredProjects is not defined`. This occurred because the variable was referenced in the JSX but lacked a corresponding declaration in the component's state or `useMemo` logic. Similar issues were found with `totalABC` (header statistics) and `viewMode` (table/card toggle). These errors were symptomatic of a lack of standardized patterns for handling filtered data in the frontend.

## Decision
We have standardized the "Derived State Pattern" across all dashboard modules (`EFDHome`, `AgencyDashboard`, etc.):
1.  **Filtered State**: All project filtering must be performed within a `useMemo` hook named `filteredProjects`, wrapping the source `projects` state and all relevant filter dependencies (search, region, division, category).
2.  **Aggregated State**: Summary statistics (e.g., `totalABC`) must be derived from the `filteredProjects` result using `useMemo` to ensure they stay in sync with the visible data.
3.  **UI View States**: Any UI-only state (like `viewMode`) must be explicitly declared with `useState` and initialized with a safe default (e.g., `'card'`).
4.  **Redundancy Purge**: Any legacy variables (e.g., `totalABCValue`, `newlyCreatedCount`) that have been superseded by the `useMemo` pattern must be removed to prevent naming collisions.

## Consequences
- **Positive**: Eliminates `ReferenceError` crashes during render. Ensures that header statistics accurately reflect active filters.
- **Negative**: Adds slight complexity to the component initialization.
- **Neutral**: Requires developers to keep the `useMemo` dependency arrays synchronized with the filter UI.

---
*Date: 2026-03-28*
*Authored by: Antigravity (Avid Documenter)*
