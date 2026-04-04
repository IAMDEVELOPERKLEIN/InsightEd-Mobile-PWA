# SYSTEM ROLE
You are a Senior Full-Stack Engineer and Infrastructure Specialist. Your mission is to restore the integrity of the project photo submission flow and the accuracy of the user-facing success system by realigning Nginx API proxies and refactoring the frontend "Silent Success" logic.

# 🚀 THE VIBE & AESTHETIC
The vibe for this restoration is **"Honesty & Infrastructure Precision"**. We are ensuring that the platform never "lies" to the user about successful uploads while simultaneously fixing the underlying Nginx routing that is causing those uploads to fail. This is about building a system that is both technically sound and transparently reliable.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (within a multi-portal architecture using aliases like `/insighted/`).
- **Backend:** Node.js (Ports 5000 and 5001).
- **Web Server:** Nginx.
- **Core Challenge:** Nginx intercepts relative API calls (like `/insighted/api/...`) at the frontend alias level, causing them to 404. Furthermore, the frontend logic in `EngineerProjects.jsx` ignores individual upload failures and incorrectly reports a "Success" state.

# 📝 CORE REQUIREMENTS
1. **Explicit API Proxying:** Implement dedicated Nginx location blocks in `stride.conf` to bridge the gap between sub-portal paths (`/insighted/api/`) and the correct Node.js ports.
2. **Honest Frontend Reporting:** Refactor `handleSaveProject` in `EngineerProjects.jsx` to await every photo upload's response.
3. **Atomic Error Feedback:** Ensure that any failed upload results in a formal Error Alert to the user, correctly identifying specifically what failed (e.g., "1 of 3 photos failed to sync").

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Nginx API Realignment**
- **1a:** Add the following proxy blocks to the 443 server in `/etc/nginx/sites-available/stride.conf`:
```nginx
location /insighted-staging/api/ {
    proxy_pass http://localhost:5001/api/;
    # ... required proxy headers ...
}
location /insighted/api/ {
    proxy_pass http://localhost:5000/api/;
    # ... required proxy headers ...
}
```
- **1b:** Ensure `client_max_body_size 100M` is applied to these locations.
- **1c:** Test and reload Nginx: `sudo nginx -t && sudo systemctl reload nginx`.

**Step 2: Frontend Logic Transformation**
- **2a:** Locate `handleSaveProject` (approx. line 856) in `EngineerProjects.jsx`.
- **2b:** Refactor the photo upload loop (approx. line 952). Instead of catching errors silently, implement a `photoSuccessCount` or a direct response verification:
```javascript
const resp = await fetch(`${API_BASE}/api/upload-image`, { method: "POST", body: formData });
if (!resp.ok) throw new Error("A photo upload failed");
```
- **2c:** Update the final success alert (approx. line 970) to only trigger if the catch block for the entire `handleSaveProject` is NOT hit.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Provide a JS script that:
- Triggers a POST to `https://stride.deped.gov.ph/insighted-staging/api/upload-image` and verifies if it returns a 400 (Multer err) or 404 (Nginx err).
- Confirms the Node processes on 5000/5001 can receive large payloads from their respective portal paths.

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT break the existing root-level `/api/` or `/uploads/` blocks.
- MAINTAIN compatibility with the current `UpdateProjectWizard` file-passing logic.
- ENSURE the final alert correctly reflects partial failures to ensure data integrity.
