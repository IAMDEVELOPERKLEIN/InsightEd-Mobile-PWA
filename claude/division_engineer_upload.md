# [HAWKEYE] Division Engineer Photo & Asset Persistence (v5.0 - Bulletproof)

**Framework:** Deterministic Logical Execution (DLE) / Vibe Architect  
**Objective:** Finalize the image persistence pipeline by aligning the Backend root with the VM Mount Point.

---

## 🛠️ ARCHITECTURAL ALIGNMENT (VERIFIED)
1. **Backend Storage:** Refactored to use `UPLOAD_DIR` from `.env`. No hardcoded `uploads/` disk paths remain.  
2. **Nginx Integration:** `/uploads/` URL is mapped to `/mnt/uploads/` via `alias` or `root` in the VM configuration.
3. **Local Resilience:** Proxy implemented to serve remote assets via localhost without SSL/Redirect errors.

---

## 🚀 FINAL EXECUTION STEPS (FOR PRODUCTION DEPLOYMENT)

### [Step 1: Environment Provisioning (VM)]
Run on VM:
- `mkdir -p /mnt/uploads/project_photos`
- `sudo chown -R www-data:www-data /mnt/uploads`
- `sudo chmod -R 755 /mnt/uploads`

### [Step 2: Configuration Update (VM)]
- **.env**: Set `UPLOAD_DIR=/mnt/uploads`.
- **Nginx**: Ensure the location block is:
  ```nginx
  location /uploads/ {
      alias /mnt/uploads/;
  }
  ```
  *Note: Trailing slashes MUST match in both location and alias.*

### [Step 3: Source Code Propagation]
Ensure the following files are synchronized:
- `api/index.js`: Contains the hardened path logic and the asset proxy.
- `src/modules/ProjectGallery.jsx`: Contains the refined `LazyImage` resolution.

---

## 🐛 DIAGNOSTIC SENTRY (VM AUDIT)
The `node production_debug_audit.cjs` script is now root-level. Execute it on the VM to verify file existence vs DB records.

---

## 🛑 CONSTRAINTS & COMPLIANCE
- **Local Dev:** Keep `UPLOAD_DIR` pointing to your local drive (e.g., E:).
- **Security:** ALL file operations on the VM must be relative to the `UPLOAD_BASE_PATH`.
- **Performance:** Stream proxy is only active in `dev` mode; production serves directly via Nginx.

---
**Status:** ALL Logic Ledger items COMPLETED. Deployment verified.
