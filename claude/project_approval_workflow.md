# Implementation Plan: Project Approval Workflow for Division Engineers & Architects

This plan outlines the implementation of a project approval system. Projects added by Division Engineers or Architects will require approval from the Central Office (EFD Engineers) before they can be edited or updated.

## Finalized Requirements

1. **Restricted Roles:** Applies to both **Division Engineers** and **Architects**.
2. **Visibility for Restricted Roles:** Projects are visible in their "Projects" tab immediately after adding, but are **locked/disabled** for updates.
3. **Visibility for Central Office:** Projects are visible in the EFD Engineer's "Projects" tab with a distinct badge for easy identification.
4. **Approval Badge:** Both views must show a "Pending Central Office Approval" tag/badge on the project card.
5. **Regional Engineer Monitoring:** Regional Engineers can monitor projects created by Division Engineers or Architects within their region and see their approval status.
6. **Permissions:**
   - **Division Engineer / Architect:** Can view project, but cannot Update or Delete.
   - **Regional Engineer:** Can view project and its approval status, but cannot Approve, Update, or Delete.
   - **EFD Engineer (Central Office):** Can view, Approve, and Delete projects.

## Proposed Changes

### Backend: `api/index.js`

- **Role Check:** Standardize the detection of Division Engineers and Architects in the project creation and update routes.
- **REST API (`POST /api/projects`):** Ensure `approval_status` is set to `'Pending'` if the creator is a Division Engineer or Architect.
- **REST API (`PUT /api/update-project/:id`):** Add logic to block updates if the project is `Pending` and the user is not an Admin/EFD Engineer.
- **REST API (`DELETE /api/projects/:id`):** Restrict deletion to EFD Engineers, Central Office, and Admins.

---

### Frontend: Project Cards

#### [MODIFY] [EngineerProjects.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/EngineerProjects.jsx) & [EFDHome.jsx](file:///c:/Users/KleinZebastianCatapa/Documents/INSIGHTEDCODES2026/src/modules/EFDHome.jsx)

- **Badge Component:** Implement a `Pending Approval` badge that appears on the project card if `approval_status === 'Pending'`. This must be visible to Division Engineers, Architects, Regional Engineers, and EFD Engineers.
- **Button Locking:** 
    - Disable the "Update" button if the user is a Division Engineer/Architect and the project is `Pending`.
    - Hide the "Delete" button for Division Engineers, Architects, and Regional Engineers.
    - Regional Engineers will have a read-only view of the project data and status.
- **Approval Button:** Add an "Approve" button to the project card that only appears for EFD Engineers when a project is `Pending`.

---

## Verification Plan

### Manual Verification

1. **Division Engineer / Architect Test:**
   - Add a new project.
   - Check the "Projects" tab. The project should be visible.
   - Verify the "Pending Central Office Approval" badge is shown.
   - Verify the **Update** button is disabled and the **Delete** button is hidden.

2. **Regional Engineer Monitoring Test:**
   - Log in as a Regional Engineer for the same region.
   - Check the "Projects" tab. The project should be visible.
   - Verify the "Pending Central Office Approval" badge is shown.
   - Verify that no "Approve," "Delete," or "Update" buttons are available.

3. **EFD Engineer (Central Office) Test:**
   - View the same project in the EFD dashboard.
   - Verify the badge is visible.
   - Click the **Approve** button.
   - Verify the badge disappears and the project becomes "Approved."
   - Log back in as the Engineer/Architect and verify they can now update the project.
   - Verify the EFD Engineer can still **Delete** the project if needed.
