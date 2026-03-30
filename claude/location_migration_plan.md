# Implementation Plan: Migrating Location Data to all_locations & ph_barangays

This plan outlines the steps to replace the static `locations.json` file with dynamic, database-driven location dropdowns sourced from the **`all_locations`** and **`ph_barangays`** tables.

## User Review Required

> [!IMPORTANT]
> **Unified Source of Truth**: We will use the existing **`all_locations`** and **`ph_barangays`** database tables as the sole sources for location data.
> - `all_locations`: Provides Region, Division, District, Legislative District, Province, and Municipality.
> - `ph_barangays`: Provides the granular Barangay mappings.
> 
> **Offline Support**: Moving to a database-driven approach will require a stable connection during registration. We will consider a small client-side cache for the most frequently used regions.

## Proposed Changes

### [Database] Schema Usage

- **`all_locations`**: Primary table for administrative hierarchy (Region through Municipality).
- **`ph_barangays`**: Reference table for Barangay-level selection.

### [Backend] API Layer

#### [MODIFY] [api/index.js](file:///e:/InsightEd-Mobile-PWA/api/index.js)
- Ensure robust endpoints exist for:
  - `/api/locations/regions` (from `all_locations`)
  - `/api/locations/provinces?region=...` (from `all_locations`)
  - `/api/locations/municipalities?region=...&province=...` (from `all_locations`)
  - `/api/locations/barangays?region=...&province=...&municipality=...` (from `ph_barangays`)

### [Frontend] Components

#### [MODIFY] [src/components/modular/Unit1SchoolIdentity.jsx](file:///e:/InsightEd-Mobile-PWA/src/components/modular/Unit1SchoolIdentity.jsx)
- Replace `locationData` logic with cascading `fetch` calls.
- Implement a simple caching mechanism for fetched options.

#### [MODIFY] [src/Register.jsx](file:///e:/InsightEd-Mobile-PWA/src/Register.jsx)
- Similar refactoring to use API endpoints for LGU and Agency registration.

### [Frontend] Assets

#### [DELETE] [src/locations.json](file:///e:/InsightEd-Mobile-PWA/src/locations.json)
- Remove the file once migration is verified to reduce bundle size.

## Verification Plan

### Automated Tests
- Run integration tests to ensure cascading dropdowns correctly filter based on previous selections.
- Verify that "Blank" location support (implemented for test schools) still works.

### Manual Verification
- Test registration flow for a School Head.
- Test LGU registration flow.
- Verify that performance is acceptable over a throttled network connection.
