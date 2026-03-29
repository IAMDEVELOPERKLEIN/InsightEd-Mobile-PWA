# Implementation Plan - School Head Guide visibility and scaling

The goal is to make the "Guide" button in the bottom navigation more visible for School Heads, and to adjust the `schoolheadquickstart.html` content to be "fit to screen" with a 75% font size.

## Proposed Changes

### [Component] Navigation

#### [MODIFY] [BottomNav.jsx](file:///e:/InsightEd-Mobile-PWA/src/modules/BottomNav.jsx)
- Rename "Guide" label to "Quick Start" for School Head role.
- Change icon to `TbSchool` for better visibility.
- Apply a distinct color (e.g., `text-blue-600` instead of `text-slate-300`) even when not active, or add a subtle highlight background.

### [Component] Guide Wrapper

#### [MODIFY] [LegacyGuideWrapper.jsx](file:///e:/InsightEd-Mobile-PWA/src/modules/LegacyGuideWrapper.jsx)
- Ensure the `iframe` container is truly "fit to screen" by removing any restrictive paddings if found.
- Add `overflow-hidden` to prevent double scrollbars if necessary.

### [Component] Quick Start HTML

#### [MODIFY] [schoolheadquickstart.html](file:///e:/InsightEd-Mobile-PWA/public/schoolheadquickstart.html)
- Apply `font-size: 75%;` to the `body` tag in the `<style>` section.
- Ensure `max-width: 100vw` and `overflow-x: hidden` are set to ensure it fits mobile screens perfectly.

## Verification Plan

### Manual Verification
1. Log in as a "School Head".
2. Check the bottom navigation bar.
   - Verify the "Guide" button is now labeled "Quick Start".
   - Verify it has a more prominent appearance.
3. Click the "Quick Start" button.
   - Verify the guide loads and fits the screen exactly (no horizontal scrolling).
   - Verify the font size is noticeably smaller (75% of original).
4. Verify the "Back to Nodes" FAB still works and doesn't overlap weirdly with the new "Quick Start" button styling.
