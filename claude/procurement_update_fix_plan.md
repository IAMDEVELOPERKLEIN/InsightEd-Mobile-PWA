# Implementation Plan: Fix Procurement Update & Input Focus Loss

This plan addresses a backend failure in project updates and a frontend UI bug causing focus loss on mobile.

## User Review Required
> [!IMPORTANT]
> The focus loss fix involves moving component definitions (like `Field` and `StatCard`) OUTSIDE of their parent functions. This is a standard React performance and bug-fix pattern but changes the file structure slightly.

## Proposed Changes

### [Component] Backend API ([api/index.js](file:///e:/InsightEd-Mobile-PWA/api/index.js))
- **Robust Numeric Parsing**: Update `parseIntOrNull` and `parseNumberOrNull` to strip non-numeric characters (currency symbols, commas) from string inputs.
- **Data Integrity**: Include all missing columns (`mother_moa_id`, `sangguniang_resolution_id`, etc.) in the history insertion query for `/api/update-project/:id`.
- **Safety**: Ensure `savings` calculation handles cleaned numeric values.

### [Component] Frontend Modules
- **DetailedProjInfo.jsx**: Move `Field` and `SectionHeader` definitions outside the main component to fix the focus loss bug.
- **UpdateProjectWizard.jsx**: Move `PhotoCard` outside the main component.
- **MonitoringDashboard.jsx**: Move `StatCard` outside the main component.

## Verification Plan
### Automated Tests
- Run `tmp/repro_procurement_fix.js` to simulate a project update with formatted currency strings.
### Manual Verification
- Verify focus retention in `DetailedProjInfo` edit mode on mobile.
- Verify procurement status update preserves existing project data.

