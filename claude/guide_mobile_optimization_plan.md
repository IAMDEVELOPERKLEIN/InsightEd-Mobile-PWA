# Implementation Plan: Optimize Quick Start Guide for Mobile

The goal is to improve the mobile responsiveness of the School Head Quick Start guide (`public/schoolheadquickstart.html`). Currently, the headings and spacing are too large when viewed on mobile devices, causing overlapping and poor readability.

## Proposed Changes

### Styling Updates

#### [MODIFY] [schoolheadquickstart.html](file:///e:/InsightEd-Mobile-PWA/public/schoolheadquickstart.html)
Update the CSS and HTML classes to scale down effectively on smaller screens.

1.  **Refine Media Queries**: Add specific overrides for devices under 480px width.
2.  **Scale Down Headings**: 
    - Change `text-4xl` to `text-2xl sm:text-3xl md:text-4xl` for Unit headers.
    - Change `text-8xl` to `text-5xl sm:text-7xl md:text-8xl` for the main title.
3.  **Optimize Spacing**:
    - Reduce `.unit-card` padding on mobile.
    - Reduce margins between sections.
4.  **Fix Overflows**: Ensure `overflow-visible` on headings doesn't cause horizontal scrolling.

```css
/* Additional Mobile Adjustments */
@media (max-width: 480px) {
    body { font-size: 70%; }
    .unit-card {
        padding: 1rem;
        margin-bottom: 2rem;
        border-radius: 1rem;
    }
    .step-pill {
        width: 2rem;
        height: 2rem;
        font-size: 0.875rem;
    }
    h1 { font-size: 2.75rem !important; line-height: 1 !important; }
    h2 { font-size: 1.75rem !important; }
    .summary-card { padding: 1rem; }
}
```

## Verification Plan

### Automated Verification
None (Visual change).

### Manual Verification
1.  Open the app in a mobile emulator (e.g., Samsung Galaxy S8+).
2.  Navigate to the **Quick Start** tab.
3.  Verify that:
    - The main title "INSIGHTED OPERATIONAL GUIDE" fits within the screen.
    - Unit headers (e.g., "Welcome to InsightEd") are scaled down and don't overlap.
    - Card padding is reduced, allowing more content to be visible.
    - No horizontal scrolling occurs.
