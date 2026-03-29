# Investigation Plan - School-Head Guide 404 Error

The objective is to resolve the 404 error encountered when accessing the School Head guide directly via the production URL `stride.deped.gov.ph/School-Head/`, despite it working within the app's navigation.

## Current Findings

1.  **File System Structure (`public/`):**
    - `public/School-Head/index.html` (The "premium" guide).
    - `public/schoolheadquickstart.html` (The "condensed" guide, used inside the React app's iframe).
2.  **Navigation Logic:**
    - The bottom nav uses a **Hash Route** (`#/guide/school-head`). This is handled by React and works correctly.
    - The Direct URL (`/School-Head`) is a **Server Route**. It relies on Nginx to find the physical directory and serve `index.html`.
3.  **Potential Causes:**
    - **Nginx Configuration:** The server might be configured as a strict Single Page Application (SPA), sending all unknown paths to the root `/index.html`. If it doesn't have a rule for the `School-Head` directory, it will fail.
    - **Case Sensitivity:** Linux servers (standard for VMs) are case-sensitive. If the URL is `school-head` but the folder is `School-Head`, it will 404.
    - **Missing Trailing Slash:** If the user visits `/School-Head` without the slash, Nginx might not automatically redirect to the folder's `index.html` depending on its configuration.

## Proposed Investigation & Resolution Steps

### 1. Verify Production Path Syntax
- Confirm if the 404 occurs on both `stride.deped.gov.ph/School-Head/` (with slash) and `stride.deped.gov.ph/School-Head` (without slash).

### 2. Standardize File Naming (Optional but Recommended)
- Ensure the folder name used in URLs matches the physical folder name exactly (e.g., all lowercase `school-head` is often safer for web URLs).

### 3. Nginx Configuration Check (User Action Required)
- Provide the user with the correct Nginx block to ensure static folders in `public/` are served correctly before the SPA fallback.
- **Example Nginx Snippet:**
  ```nginx
  location /School-Head/ {
      alias /var/www/insighted/public/School-Head/;
      index index.html;
      try_files $uri $uri/ =404;
  }
  ```

### 4. Consolidated Route Strategy
- If the `index.html` inside `School-Head` is meant to be the same as `schoolheadquickstart.html`, we should consolidate them to a single source of truth to avoid confusing pathing.

## Verification
- Test direct access to `stride.deped.gov.ph/School-Head/index.html`.
- Test direct access to `stride.deped.gov.ph/School-Head/`.
- Verify the bottom navigation still functions correctly.
