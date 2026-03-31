# SYSTEM ROLE
You are a Senior Full-Stack Engineer and DevOps Specialist. Your mission is to resolve a critical production regression where site images fail to persist and render in a hosted Vercel environment. You must implement a "bulletproof" storage bridge between local development and Azure Blob Storage while standardizing image resolution logic.

# 🌌 THE VIBE & AESTHETIC
The solution must feel **seamless** and **invisible** to the user. Whether an image is served from a local `uploads` folder during development or a global Azure CDN in production, the transition must be 100% transparent. The gallery should feel "fast and persistent"—no broken image icons, no stale data.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (Vite-PWA), TailwindCSS, React Router.
- **Backend:** Express.js (Node.js) running on Vercel (Root API Entry).
- **Storage Strategy:** 
    - **Local:** Persistent disk storage in `uploads/project_photos/`.
    - **Production:** Azure Blob Storage with permanent HTTPS URLs.
- **Database:** PostgreSQL (`pg` pool) storing path-agnostic image strings.

# 📝 CORE REQUIREMENTS
1. **Persistent Cloud Storage:** Abandon ephemeral local disk storage for production uploads.
2. **Path Normalization:** Standardize how components (`ProjectGallery`, `DetailedProjInfo`) resolve `/uploads/` paths vs `https://` URLs.
3. **Environment-Aware Base URL:** Dynamically switch image fetching logic based on the environment without hardcoding domain names.
4. **Dual-Write Integrity:** Ensure images are correctly indexed in the database with IPC awareness.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Backend Storage Bridge (Azure Integration)**
- **1a:** Modify `POST /api/upload-image` in `api/index.js` (Root).
- **1b:** Add conditional logic: if `blobServiceClient` is initialized (Azure env present), stream the `req.file` buffer directly to Azure Blob Storage.
- **1c:** Update the `image_data` database column to store the full Azure HTTPS URL instead of a relative local path.

**Step 2: Backend Retrieval Logic Cleanup**
- **2a:** Audit `GET /api/project-images/:projectId` to ensure it returns raw `image_data` without prepending any paths (the DB should contain the "truth").
- **2b:** Optimize the IPC-based query to ensure all images in a project's version history are retrieved correctly.

**Step 3: Frontend Image Resolution Standard (The "Truth" Utility)**
- **3a:** Refactor `src/modules/ProjectGallery.jsx` -> `LazyImage`. Remove `import.meta.env.BASE_URL` prepending.
- **3b:** Implement a robust detection check:
    - If `data.startsWith('http')`: Return as-is.
    - If `data.startsWith('/uploads/')`: Prepend the actual `window.location.origin` or a defined `API_BASE`.
    - Else: Treat as raw Base64.

**Step 4: Cross-Component Synchronization**
- **4a:** Update `src/modules/DetailedProjInfo.jsx` -> `getImageSrc` to mirror the refined resolution logic in Step 3.
- **4b:** Test the "Division Engineer Gallery" which aggregates images across multiple project IDs.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Create a lightweight `GalleryDiagnostics` component or utility to monitor image health:
```javascript
const DEBUG_IMAGE_LOAD = true;

const diagnosticLogger = (src, status) => {
    if (!DEBUG_IMAGE_LOAD) return;
    const type = src.startsWith('http') ? '☁️ AZURE/EXTERNAL' : 
                 src.startsWith('/uploads/') ? '📂 LOCAL_STORAGE' : '🖼️ BASE64';
    console.log(`[Image Diagnostic] ${status}: ${type} | Path: ${src}`);
};
```
- Integrate `onError` listeners in `img` tags to log specifically when a `/uploads/` path returns a 404 in production.

# 🛑 CONSTRAINTS & GUARDRAILS
- **DO NOT** hardcode production IPs or Vercel URLs. Use `window.location.origin`.
- **DO NOT** use `fs.renameSync` in production; Vercel will throw a read-only filesystem error or simply lose the file. Use streaming buffers for Cloud uploads.
- **AVOID** breaking legacy Base64 images stored in older project snapshots.
