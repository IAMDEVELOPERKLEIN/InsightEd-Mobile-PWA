# Implementation Plan - Printable PDF School Head Guide

The goal is to create a high-quality, "Proper Format" printable version of the School Head Quick Start guide, optimized for PDF generation.

## Proposed Changes

### [HTML/Design] [print_guide.html](file:///e:/InsightEd-Mobile-PWA/claude/print_guide.html)
- **A4/Letter Layout**: Use a fixed-width container (e.g., `800px`) centered on the page for printing.
- **Remove Interactivity**: Hide the mobile navigation sidebar, FAB buttons, and the bottom nav bar.
- **Typography Adjustments**:
  - Revert font size to 100% (approx. `16px`).
  - Use high-contrast colors (no light-gray-on-white) for better ink/toner results.
- **Page Breaks**: Insert `page-break-after: always` (or `break-after: page`) between each Unit (01-12) to ensure a clean document.
- **Asset Localizing**: Ensure all logos (`logo1.png`, `InsightEd1.png`, etc.) are correctly linked and sized for the printed page.
- **Remove Animations/GIFs**: Replace GIFs with high-quality static screenshots if possible, or hide them to avoid "broken" looking printouts.

### [Script] [generate_pdf.js](file:///e:/InsightEd-Mobile-PWA/scripts/generate_pdf.js)
- Use `jspdf` to attempt a programmatic PDF generation.
- **Note**: If the Tailwind layout is too complex for basic `jspdf` rendering, I will provide a button in the HTML that triggers `window.print()` for the user to "Save as PDF" using their browser's professional-grade engine.

## Verification Plan

### Manual Verification
1. Open `claude/print_guide.html` in a browser.
2. Inspect the layout (it should look like a long, clean document, not a mobile app).
3. Test "Print" (Ctrl+P) and check the PDF preview for:
   - Proper page breaks.
   - Legible text.
   - Missing mobile UI elements.
