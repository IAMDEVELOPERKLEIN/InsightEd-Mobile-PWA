# [NUCLEAR] Disk Path Restoration & Alignment Plan

This plan aims to force total symmetry between the Node.js backend and the Nginx web server by aligning the physical storage location on the VM disk.

## 🛠️ ARCHITECTURAL RECONCILIATION
- **Goal:** Backend must write to `/mnt/uploads/` and Nginx must serve from the same path.
- **Constraints:** No Azure Blob Storage; Disk-only persistence.

## 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Environment Hardening (VM)**
- [MODIFY] `.env` on VM: Set `UPLOAD_DIR=/mnt/uploads` (must be absolute).
- [ACTION] Restart the backend service: `pm2 restart insighted-backend`.

**Step 2: Nginx Optimization**
- [MODIFY] Nginx Config:
  ```nginx
  location /uploads/ {
      alias /mnt/uploads/;
  }
  ```
- [ACTION] Test and Reload: `sudo nginx -t && sudo systemctl reload nginx`.

**Step 3: Permission Reset**
- [ACTION] Execute: `sudo chown -R www-data:www-data /mnt/uploads`.
- [ACTION] Execute: `sudo chmod -R 755 /mnt/uploads`.

**Step 4: Legacy Asset Migration (Nuclear)**
- [ACTION] Run a `find` to find any orphaned photos in the `uploads` folder in the project root and move them to `/mnt/uploads/`.
- ```bash
  # Identify project root uploads folder
  SRC="/var/www/insighted-backend/uploads/project_photos/"
  DEST="/mnt/uploads/project_photos/"
  # Move and preserve permissions
  sudo cp -r $SRC* $DEST && sudo rm -rf $SRC*
  ```

## 🧪 VERIFICATION PLAN
1. **Upload Check:** Capture a new photo on staging. 
2. **Network Audit:** Verify the URL is `/uploads/project_photos/[file].jpg` and returns 200 OK.
3. **Audit Script:** Run `node production_debug_audit.cjs` on the VM to verify total asset health.

## 🛑 CONSTRAINTS & GUARDRAILS
- NEVER use relative paths in production `.env`.
- ALWAYS verify `nginx -t` before reloading.
