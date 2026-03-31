# Execution Plan: Unified Engineer Workflow — Gap Analysis & Remediation

**Date:** 2026-03-31
**Status:** In Progress
**Source Plan:** `claude/Unified_Engineer_Workflow_Plan.md`
**Audit Method:** Full read of modified files vs plan spec

---

## Gap Analysis Results

### ✅ Fully Implemented (Previous Session)

| Item | File | Status |
|---|---|---|
| Architect added to AUTHORIZATION_CODES | Register.jsx | ✅ |
| Architect in role dropdown | Register.jsx | ✅ |
| Architect in position dropdown | Register.jsx | ✅ |
| getDashboardPath handles Architect | Register.jsx | ✅ |
| Validation treats Architect like Division Engineer | Register.jsx | ✅ |
| Architect in App.jsx roleToPathId | App.jsx | ✅ |
| Architect added to all engineer ProtectedRoute allowedRoles | App.jsx | ✅ |
| approval_status column migration | api/index.js | ✅ |
| approval_status in /api/projects SELECT | api/index.js | ✅ |
| save-project sets Pending for Division/Architect submitters | api/index.js | ✅ |
| PUT /api/approve-project/:id endpoint | api/index.js | ✅ |
| Role guard on DELETE /api/projects/:id | api/index.js | ✅ |
| DELETE /api/project-images/:id (DB record) | api/index.js | ✅ |
| Delete button in ProjectGallery fullscreen modal | ProjectGallery.jsx | ✅ |
| Delete button in DetailedProjInfo zoom modal | DetailedProjInfo.jsx | ✅ |
| Architect role normalization in fetchProjects | EngineerProjects.jsx | ✅ |
| New Project button restored | EngineerProjects.jsx | ✅ |
| Delete button hidden for Division/Architect | EngineerProjects.jsx | ✅ |
| Waiting for Approval badge | EngineerProjects.jsx | ✅ |
| approvalStatus mapped from API | EngineerProjects.jsx | ✅ |
| RegionalEngineerDashboard.jsx created | NEW file | ✅ |
| RegionalEngineerDashboard route + import in App.jsx | App.jsx | ✅ |

---

### ❌ Missing / Incomplete (To Be Fixed)

#### GAP 1 — Physical file NOT deleted on photo delete
- **Plan says:** `DELETE /api/project-images/:id` must delete from Azure/Local storage
- **Current state:** Only removes DB record; file remains on disk or in Azure
- **Fix:** In `api/index.js` DELETE handler — check `image_data` prefix, then either `fs.unlink` (local `/uploads/` path) or Azure Blob SDK delete (https blob URL)

#### GAP 2 — UPDATE button still at bottom of card
- **Plan says:** "move 'UPDATE' button to top-right"
- **Current state:** UPDATE sits in the bottom action bar (flex-1 alongside LOGS)
- **Fix:** Move UPDATE button into the card header's top-right area; keep LOGS in the action bar

#### GAP 3 — Upload Docs modal not fully removed
- **Plan says:** "Remove 'Upload Docs'"
- **Current state:** `onUploadDocs` prop, all related state (`isDocUploadModalOpen`, `selectedDocType`, `docUploadFile`, `isDocUploading`, `uploadTargetProject`), `handleDocumentUpload` function, and the full Upload Docs portal modal are still in the file — just orphaned/unreachable from the card UI
- **Fix:** Remove all Upload Docs state, handler, modal JSX, and the unused prop from ProjectCards

---

## Implementation Order

1. `api/index.js` — Physical file deletion on photo delete (GAP 1)
2. `EngineerProjects.jsx` — Move UPDATE to top-right + remove Upload Docs (GAP 2, GAP 3)

---

## Risk Notes

- GAP 1: Must guard against `fs.unlink` on non-existent files — use `fs.existsSync` first
- GAP 1: Azure SDK delete needs container name from env; must not crash if blob already gone
- GAP 3: Removing Upload Docs state will break `handleDocumentUpload` — remove the entire function
