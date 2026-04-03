# SYSTEM ROLE
You are an expert full-stack developer operating in a "Hybrid" environment. Your goal is to configure the localhost development environment to be 100% compatible with the VM's `/mnt/uploads` storage pattern while ensuring all existing remote assets remain visible via a "Smart Fallback Proxy."

# 🌌 THE VIBE & AESTHETIC
"Resilient Convergence." Local development should feel identical to the production environment. When a developer captures a photo, it should persist locally to a path that mimics the VM mount. If they open the gallery, legacy images from the production DB should load seamlessly from the staging server.

# 🛠️ TECH STACK & ARCHITECTURE
- **Localhost:** Windows/Node.js, using `process.env.UPLOAD_DIR` mapping.
- **Remote VM:** Linux-based storage at `/mnt/uploads/`.
- **Backend:** Node.js (Express) with `express.static` and a "Catch-All Proxy" for 404 assets.
- **Credentials:** Refer to the `.env` file for VM host (`OLLAMA_BASE_URL` IP) and Database access to verify sync.

# 📝 CORE REQUIREMENTS
1. **Directory Mapping:** Create and link a local storage root (e.g., `E:/InsightEd-Mobile-PWA/uploads`) to represent the VM mount.
2. **Environment Synchronization:** Update the local `.env` to point `UPLOAD_DIR` to the mapped path.
3. **Smart Asset Fallback:** Implement a middleware in `api/index.js` that catches 404s on `/uploads/` and proxies the request to `https://insighted-staging.com/uploads/...`.
4. **VM Integration:** Use the credentials in the `.env` file to establish any necessary SSH/File tunnels if requested.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Local Environment Provisioning**
- **1a:** Identify the local storage path in `.env`. Replace `ReplaceWithYourLocalPath` with `E:/InsightEd-Mobile-PWA/uploads`.
- **1b:** Ensure the folder exists: `mkdir E:/InsightEd-Mobile-PWA/uploads/project_photos`.

**Step 2: Backend Resilience Middleware**
- **2a:** Locate the `app.use('/uploads', express.static(...))` block in `api/index.js`.
- **2b:** Inject a fallback middleware *after* the static server that handles 404s by redirecting to the staging asset URL.

**Step 3: Verification**
- **3a:** Upload a new photo locally and verify it appears in `project_photos/`.
- **3b:** Open the `ProjectGallery.jsx` on localhost and verify that broken placeholders for cloud-only images are replaced by live assets via the proxy.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Provide a lightweight diagnostic script `test_resilience.js`:
- Attempt to fetch a known local asset.
- Attempt to fetch a known remote asset via the localhost proxy.
- Log if any `ECONNREFUSED` or `404` errors occur during path resolution.

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT use the local fallback proxy in production builds (check `process.env.NODE_ENV !== 'production'`).
- ALWAYS preserve the `/uploads/` URL structure to ensure code symmetry.
- AVOID double-dots `..` in absolute paths in `.env` for Windows compatibility.
