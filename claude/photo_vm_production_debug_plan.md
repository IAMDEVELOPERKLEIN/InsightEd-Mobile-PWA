# [MAD DEBUGGER] Production Photo Storage & Nginx Audit

This plan addresses the persistence of broken images in staging/production despite correct Nginx configuration. The focus is on the mismatch between the Backend's storage root and the Nginx mount point.

## 🛠️ TECH STACK & PRODUCTION ARCHITECTURE
- **VM Environment:** Linux (Ubunt/Debian)
- **Mount Point:** `/mnt/uploads/`
- **Nginx Config Location:** `/etc/nginx/sites-available/`
- **Backend Storage Target:** Variable (controlled by `UPLOAD_DIR` in `.env`)

## 🌌 THE VIBE
Bulletproof synchronization between the storage disk, the backend writer, and the Nginx server. Every byte written by Node.js must be instantly reachable by Nginx via the `/uploads/` URL.

## 🐛 [MAD DEBUGGER] INTERACTIVE DIAGNOSTIC SCRIPT
Use a script (e.g., `production_debug_audit.cjs`) for execution on the server.

### What it checks:
1. **Mount Visibility:** Does the Node.js process see the same `/mnt/uploads` that Nginx is pointing to?
2. **Permission Audit:** Are the folders and files owned by `www-data` or the correct service user?
3. **Environment Sync:** Is `UPLOAD_DIR` in `.env` set to the absolute path `/mnt/uploads`?

## 🚀 EXECUTION PLAN

**Step 1: Resource Reconnaissance (Nginx-Pro SOP)**
- Run `nginx -T` to verify if `/uploads/` is using `alias` or `root`.
- **Logic Rule:** If `alias /mnt/uploads/` is used, ensure the backend is ALSO writing to exactly `/mnt/uploads/`.
- **Logic Rule:** If `root /mnt/` is used, the backend must write to `/mnt/uploads/`.

**Step 2: Backend Environment Alignment**
- [CORRECT] Set `.env` to `UPLOAD_DIR=/mnt/uploads`.
- [VERIFY] Check `api/index.js` for any hardcoded `../uploads` paths that might bypass the environment variable.

**Step 3: Permission Restoration**
- Apply the recursive owner fix: `sudo chown -R www-data:www-data /mnt/uploads`
- Apply the directory permission fix: `sudo find /mnt/uploads -type d -exec chmod 755 {} \;`

## 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT restart Nginx without `nginx -t` validation.
- DO NOT use relative paths in production `.env` files.
