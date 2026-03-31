# Implementation Plan: Correct Last Update Date for Division Engineer Cards

## Goal Description
Fix the "Last Update" timestamp on the Division Engineer cards in the PWA. Currently, updates to projects do not reflect the new timestamp on the card.

## Proposed Changes

### Backend (insighted-backend)
- [ ] Modify `app.get('/api/projects')` in `api/index.js` to return `status_as_of` as a full ISO string (or just raw) instead of `TO_CHAR(..., 'YYYY-MM-DD')`.
- [ ] Rename the returned field from `statusAsOfDate` to `statusAsOf` for consistency.
- [ ] Modify `app.put('/api/update-project/:id')` to default `status_as_of` to `CURRENT_TIMESTAMP` if not provided, or ensure it accepts a full ISO string.

### Frontend (src/)
- [ ] In `src/modules/EngineerProjects.jsx`, update the `applyStatusChange` function to send the full current timestamp for `statusAsOf`.
- [ ] In `src/modules/EngineerProjects.jsx`, update the card rendering to correctly handle the new `statusAsOf` field.
- [ ] Audit `src/components/UpdateProjectWizard.jsx` for similar timestamp logic.

## Verification Plan

### Automated Tests
- [ ] TBD: Create a simple script to update a project and verify the `updated_at` field changing in the database.

### Manual Verification
- [ ] Log in as a Division Engineer.
- [ ] Update a project's details or completion rate.
- [ ] Verify the "Last Update" text on the card displays the current date/time.
