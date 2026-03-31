# Task Checklist — Unified Engineer Workflow Remediation
**Date:** 2026-03-31

## Gaps Fixed

- [x] GAP 1: `api/index.js` — Physical file deletion (local `/uploads/` + Azure blob) on `DELETE /api/project-images/:id`
- [x] GAP 2: `EngineerProjects.jsx` — Moved UPDATE button from bottom action bar to top-right of card header
- [x] GAP 3: `EngineerProjects.jsx` — Removed Upload Docs modal, all state variables, and `handleDocumentUpload`

## Verification

- [x] `npm run build` passes with 0 errors (✓ built in 43.15s)
- [x] Photo delete removes file from disk (fs.unlink + Azure SDK)
- [x] UPDATE button appears top-right on project cards
- [x] Upload Docs fully purged from EngineerProjects.jsx
