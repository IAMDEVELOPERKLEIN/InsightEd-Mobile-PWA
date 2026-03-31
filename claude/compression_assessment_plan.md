# Implementation Plan: Compression Assessment (96 DPI Standard)

## Goal Description
Assess if the PDF and image files uploaded by Division Engineer accounts are being successfully compressed according to the 96 DPI standard. This involves verifying the metadata of existing uploads and validating the end-to-end compression pipeline.

## Proposed Changes

### Diagnostic Tools
- [ ] Create `/tmp/check_dpi.py`: A script using `Pillow` (for images) and `PyMuPDF` (for PDFs) to report the resolution/DPI of a given file.
- [ ] Create `/tmp/audit_uploads.py`: A script that iterates through a subset of the `uploads/project_photos` and `uploads/project_docs` directories to generate a report on file DPIs.

### Assessment Workflow
- [ ] **Sample Audit:** Run the diagnostic script on a selection of files in `uploads/project_photos/` and `uploads/project_docs/`.
- [ ] **Pipeline Validation:** Perform a test upload with a high-resolution file and monitor the `console.log` from `api/index.js` to ensure the background compression script is triggered and finishes successfully.
- [ ] **Infrastructure Check:** Verify if `Pillow` and `PyMuPDF` (fitz) are available in the production server's Python environment.

## Verification Plan

### Automated Verification
- [ ] The `audit_uploads.py` report will serve as proof of standard adherence.

### Manual Verification
- [ ] Inspect the `uploads/` folder directly to compare original vs. optimized file sizes for recent uploads.
