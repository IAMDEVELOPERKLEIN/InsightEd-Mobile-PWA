# Task Checklist: Nginx Consolidation & Asset Resolution & Infrastructure Fix Task List

## Completed
- [x] Analyze `api/utils/binaryPipeline.js` to understand binary storage logic
- [x] Find and analyze the `/api/asset/:id` or `/asset/:id` route in `api/index.js`
- [x] Investigate the frontend components `EngineerOutbox.jsx`, `Unit1SchoolIdentity.jsx`, and `DetailedProjInfo.jsx` for asset retrieval logic
- [x] Identify the root cause of broken images and PDFs
- [x] Restore 4-Site Multi-Config (Staging, Production, Opdash, STRIDE)
- [x] Save consolidated Nginx configuration for future reference in `docs/`

## Planned: 502 Bad Gateway Investigation
- [x] Audit Nginx `proxy_pass` port vs PM2 `PORT` (Suspected Mismatch: 3000 vs 5001).
- [x] Audit active Nginx configuration with `nginx -T`.
- [x] Identifying conflicts in `stride.conf` port (Fixed: Updated 5000 -> 5001).
- [x] Restore 4-Site Multi-Config (Staging, Production, Opdash, STRIDE): RESTORED.
- [x] Map all 4 sites to correct ports (Opdash=3001, Staging=5001, Prod=5000, STRIDE=3002).
- [x] Consolidate proxy logic in `stride.conf` to avoid server name conflicts (Fixed: removed redundant `stride` symlink).
- [x] Removing conflicting `/uploads/` Nginx blocks to enable DB-first asset registry.
- [x] Verify fix by testing Express connectivity (Received 404 from Express, 502 resolved).
- [x] Verified site visibility with `curl` on VM.

## Goal
Fix broken project photos for Division Engineers on the staged VM (`/insighted-staging/`). Photos work on localhost but return 404 or wrong content-type in production.

---

- [ ] **1. Diagnostic — Confirm root cause**
    - [ ] 1a. Open staging URL in browser, open DevTools → Network tab, filter by image requests. Check if broken images return `404` or `200 text/html` (SPA fallback).
    - [ ] 1b. Run: `curl -I http://20.24.58.49:5001/uploads/project_photos/<filename>` — confirm Express serves the file directly on port 5001.
    - [ ] 1c. Run: `curl -I http://20.24.58.49/insighted-staging/uploads/project_photos/<filename>` — confirm Nginx returns 404 for this path (expected before the fix).
    - [ ] 1d. Run: `ssh Administrator1@20.24.58.49 "ls /var/www/html/InsightEd-Staging/uploads/project_photos/ | head -10"` — confirm files physically exist on disk.

- [ ] **2. Apply Nginx Fix**
    - [ ] 2a. SSH to VM: `ssh Administrator1@20.24.58.49`
    - [ ] 2b. Edit Nginx config: `sudo nano /etc/nginx/sites-available/<config-file>` (find the right one with `sudo nginx -T | grep insighted`)
    - [ ] 2c. Add the uploads location block inside the `server {}` block:
        ```nginx
        location /insighted-staging/uploads/ {
            alias /var/www/html/InsightEd-Staging/uploads/;
            expires 7d;
            add_header Cache-Control "public, immutable";
            try_files $uri =404;
        }
        ```
    - [ ] 2d. Validate and reload: `sudo nginx -t && sudo systemctl reload nginx`

- [ ] **3. Verify fix**
    - [ ] 3a. Re-run: `curl -I http://20.24.58.49/insighted-staging/uploads/project_photos/<filename>` — expect `200 OK` with `Content-Type: image/jpeg`.
    - [ ] 3b. Open staging in browser, navigate to a Division Engineer project, confirm photos render in the Profile tab and Gallery.
    - [ ] 3c. Upload a new photo via the staging app, confirm it appears immediately without page reload.

- [ ] **4. Document Nginx config**
    - [ ] 4a. Add comment to `deploy-staging.sh` noting that `uploads/` is intentionally excluded from cleanup.
