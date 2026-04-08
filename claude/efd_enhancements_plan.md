# Implementation Plan - EFD Engineer Dashboard Enhancements

This plan outlines the changes required to address seven feature requests and improvements for the EFD Engineer dashboard, focusing on improving visual indicators, navigation, and data transparency.

## User Review Required

> [!IMPORTANT]
> The "Checklist" tab will display the same tasks used in the `UpdateProjectWizard`. Please confirm if the weights or task descriptions should differ for the read-only view.

> [!NOTE]
> For the "All Regions" filter, I will add a "Select All" toggle to the Region chips for a cleaner UI experience compared to a separate button.

## Proposed Changes

### Project Gallery & Media
Implement visual indicators and a smoother viewing experience for project photos.

#### [MODIFY] [DetailedProjInfo.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/DetailedProjInfo.jsx)
- **Feature 1: Gallery Indicator**
    - Update the Header's "Gallery" button style.
    - If `projectImages.length === 0`, apply a grayed-out style (`bg-slate-400/20 text-slate-400 border-slate-200/20`) and disable the button.
- **Feature 2: Image Gallery Slider**
    - Refactor the `selectedZoomImage` modal to handle an index.
    - Add `selectedImageIndex` state.
    - Implement `handlePrevImage` and `handleNextImage` functions to cycle through `projectImages`.
    - Add clickable Left/Right arrow overlays and keyboard support (Arrow keys) for navigation.

### Project Details & Tabs
Expand data visibility and reorganize tab layouts.

#### [MODIFY] [DetailedProjInfo.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/DetailedProjInfo.jsx)
- **Feature 3: Expanded Location Details**
    - Update `renderLocation` function.
    - Add rows for **Region**, **Division**, and **Municipality/City** before the Latitude/Longitude coordinates.
- **Feature 6: Checklist Tab**
    - Add `'Checklist'` to the `TABS` array.
    - Create `renderChecklist` function.
    - Display tasks from the triangulation checklist (Mobilization, Foundation, etc.) with their completion status derived from `project.checklist` (object mapping ID to boolean).
- **Feature 7: Rename Progress to Photos**
    - Update the `TABS` array constant: Change `{ id: 'Progress', label: 'Progress', ... }` to `{ id: 'Progress', label: 'Photos', ... }`.

### Dashboard & Filtering
Improve dashboard aesthetics and filtering efficiency.

#### [MODIFY] [EFDMonitoring.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/EFDMonitoring.jsx)
- **Feature 5: Remove Live Monitoring Badge**
    - Locate and delete the "Live Monitoring" badge in the header section (lines 379-381).

#### [MODIFY] [FilterDrawer.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/components/FilterDrawer.jsx)
- **Feature 4: All Region Filter**
    - Add a "SELECT ALL" button/toggle within the Regions section.
    - Logic: Clicking "SELECT ALL" will populate `selectedRegions` with all available region names. Clicking it again (when all are selected) will clear the selection.

## Verification Plan

### Automated Tests
- Use the Browser tool to verify:
    - Navigation between images in the gallery slider.
    - Verification of "Photos" tab name change.
    - Verification of "Checklist" tab content.
    - Applying "All Regions" filter and checking result counts.

### Manual Verification
- Verify that the Gallery button correctly grays out when a project has no images.
- Confirm that Region/Division/Municipality details appear correctly in the Location tab.
- Ensure the "Live Monitoring" badge is removed from the EFD Monitoring view.
