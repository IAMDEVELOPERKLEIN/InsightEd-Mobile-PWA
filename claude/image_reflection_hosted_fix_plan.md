# SYSTEM ROLE
You are a Senior Full-Stack Engineer specializing in VM-based deployments (Nginx, PM2, Node.js). Your goal is to restore reliable image persistence and rendering on a standalone VM environment, bypassing the previous Azure Blob Storage plan and prioritizing local `/uploads` directory integrity.

# 🌌 THE VIBE & AESTHETIC
"Reliable & Consistent". The application must treat the VM's filesystem as the absolute source of truth. Images uploaded by engineers must be immediately persisted to the VM's disk and rendered via robust path resolution that survives subfolder-based hosting (e.g., `/insighted-staging/`).

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (Vite), hosted at `/insighted-staging/` subdirectory.
- **Backend:** Node.js (Express) running via PM2 on Port 5001.
- **Storage:** Local `/uploads` directory on the VM's filesystem.
- **Proxy:** Nginx handling the bridge between Port 80 and Port 5001.

# 📝 CORE REQUIREMENTS
1. **Revert Azure Transition:** Remove Azure-specific logic to simplify the code for the VM environment.
2. **Subfolder-Aware Pathing:** Fix the frontend logic to correctly resolve `/uploads/` paths when the app is hosted in a subfolder (e.g. `/insighted-staging/`).
3. **Storage Persistence:** Ensure the `uploads` directory is correctly mapped and served by the Express backend.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Revert/Simplify Backend Storage**
- **1a:** Modify Root `api/index.js`. Revert the `upload-image` logic to save files directly to the local disk.
- **1b:** Remove `projectPhotosMemoryUpload` and references to `blobServiceClient` in the upload route to prevent potential overhead or errors.
- **1c:** Ensure `image_data` stores the local path (e.g., `/uploads/project_photos/photo-123.jpg`).

**Step 2: Universal Path Resolution (Frontend)**
- **2a:** Update `src/modules/ProjectGallery.jsx` -> `LazyImage`. 
- **2b:** Instead of `window.location.origin`, use a relative path resolution that respects `import.meta.env.BASE_URL`.
    - Logic: `const finalSrc = src.startsWith('/uploads/') ? (import.meta.env.BASE_URL + src.substring(1)).replace('//', '/') : src;`
- **2c:** This ensures that in production (`BASE_URL = /insighted-staging/`), the path becomes `/insighted-staging/uploads/...`, which maps to the VM's hierarchy.

**Step 3: Nginx Configuration (VM Server)**
- **3a:** Create/Update `/etc/nginx/sites-available/default` (or `insighted`) with the following block to bridge the frontend and backend:
```nginx
server {
    listen 80;
    server_name 20.24.58.49;

    # Frontend (React PWA)
    location /insighted-staging/ {
        alias /var/www/html/InsightEd-Staging/dist/;
        try_files $uri $uri/ /insighted-staging/index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Uploaded Images Proxy
    location /uploads/ {
        proxy_pass http://localhost:5001/uploads/;
        proxy_set_header Host $host;
    }
}
```

**Step 4: Synchronization & Verification**
- **3a:** Apply the same `finalSrc` logic to `DetailedProjInfo.jsx` -> `getImageSrc`.
- **3b:** Verify that site photos uploaded in the "Wizard" appear in the "Profile" AND "Gallery" on the VM.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Add a manual path inspector to each component to dump the resolved URL to the console when `localStorage.getItem('debug_images')` is set:
```javascript
useEffect(() => {
    if (localStorage.getItem('debug_images')) {
        console.log(`[IMAGE_PATH_DEBUG] Input: ${rawPath} | Resolved: ${src}`);
    }
}, [src]);
```

# 🛑 CONSTRAINTS & GUARDRAILS
- **DO NOT** assume `/uploads` is at the domain root. Always prefix with `BASE_URL` or use relative paths.
- **DO NOT** use Azure SDKs if the VM doesn't have outbound internet or if the user explicitly prefers local storage.
- **ENSURE** the `deploy-staging.sh` script does not accidentally wipe the `uploads` directory during deployment (use `rm -rf dist api` but keep `uploads`).
