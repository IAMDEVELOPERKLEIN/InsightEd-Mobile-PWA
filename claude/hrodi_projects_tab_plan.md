# Implementation Plan - HRODI Dashboard Projects Tab

Currently, the HRODI Dashboard (`EFDHome.jsx`) hides the project list ("Project Inventory") behind a button at the bottom of the summary view. The objective is to introduce a clear tab-based navigation to allow users to switch between the "Summary" (analytics) and "Projects" (list) views while maintaining all active filters.

## Proposed Changes

### [HRODI Dashboard Component] - [EFDHome.jsx](file:///e:/InsightEd-Mobile-PWA/src/modules/EFDHome.jsx)

1.  **Introduce Tab Navigation UI:**
    - Add a sleek, modern tab bar below the header but above the main content area.
    - Two tabs: **Summary** and **Projects**.
    - Use active styling (blue underline/text) for the selected tab.

2.  **Standardize Tab State:**
    - Rename the internal state `list` to `projects` for `activeTab` to match the UI labels (optional but recommended for clarity).
    - Ensure `activeTab` is initialized from `localStorage` or URL if needed in the future (currently `summary` is fine).

3.  **Refactor Conditional Rendering:**
    - Ensure the "Header" and "Filter Panel" remain visible above both tabs.
    - The `Summary` tab will show the existing charts and analytics.
    - The `Projects` tab will show the "Project Inventory" list (formerly the 'list' view).

4.  **Integrate Input Stability Fix:**
    - Include the previously planned **Debouncing Fix** for the search input to ensure smooth filtering across both tabs without keyboard flickering or focus loss.

#### [MODIFY] [EFDHome.jsx](file:///e:/InsightEd-Mobile-PWA/src/modules/EFDHome.jsx)

- **Line ~763:** Inject the Tab Bar component.
- **Line 807:** Modify conditional rendering block to use the new `activeTab` logic.
- **Line 1117:** Remove the redundant "Browse Detailed Project Records" button at the bottom of the summary, as the tab bar now provides this navigation.

## Design Aesthetic
- Use a "Glassmorphism" effect for the tab bar or a clean, rounded pill-style design.
- Animated transitions (e.g., Framer Motion `layout` or `AnimatePresence`) when switching tabs for a premium feel.

## Verification Plan

### Manual Verification
1.  **Tab Switching Test:**
    - Click "Projects" tab. Verify the project list appears with correct filters.
    - Click "Summary" tab. Verify charts re-render correctly.
2.  **Filter Persistence Test:**
    - Set a filter (e.g., Region: NCR) in the Projects tab.
    - Switch to the Summary tab.
    - **Expected Outcome:** The charts should reflect only NCR data.
3.  **Search Input Stability:**
    - Rapidly type in the search bar on either tab.
    - **Expected Outcome:** Keyboard stays open, focus is maintained, and results update after the debounce delay.
