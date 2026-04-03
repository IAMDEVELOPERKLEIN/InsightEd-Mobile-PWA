# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js (Express), React (Vite), and PostgreSQL environment. Your goal is to resolve critical asset retrieval issues (broken images and PDF download extensions) and a UI discrepancy where PDF filenames are not being displayed correctly in the school identity module.

# 🌌 THE VIBE & AESTHETIC
The system must feel **Reliable** and **Polished**. Assets should resolve correctly regardless of subpath nesting, and users should see descriptive filenames (e.g., `proof.pdf`) rather than internal UUIDs. The implementation must be **Environment-Agnostic**, supporting both root and subpath deployments.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React 18, Vite, HashRouter.
- **Backend:** Express, PostgreSQL (`pg`).
- **Binary Storage:** Postgres Binary Registry with `/api/asset/:id`.
- **Key Patterns:** Centralized asset resolution, original filename persistence, and standard `Content-Disposition`.

# 📝 CORE REQUIREMENTS
1. **Universal Asset Resolution:** Update `assetHelper.js` to correctly handle subpaths using `BASE_URL` or relative paths (mimicking the working logic in `ProjectGallery.jsx`).
2. **PDF Filename Persistence:** Ensure original filenames are captured during upload and returned by the school profile API.
3. **Unit 1 UI Enhancement:** Display the original filename in the `DocumentUpload` and `Unit1SchoolIdentity` review modes instead of the technical asset path/ID.
4. **Consistency:** Synchronize `ProjectGallery.jsx` with the centralized `assetHelper.js`.
5. **PDF Download extension fix:** Ensure the backend sets the correct filename with `.pdf` extension and the frontend triggers it correctly.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Backend API Hardening**
- **1a:** Modify `POST /api/schools/:iern/ownership-docs` in `api/index.js` to return `fileName` in the JSON response.
- **1b:** Update `GET /api/ph_schools/:schoolId` in `api/index.js` to include the `file_name` of the latest ownership document.
- **1c:** Verify `/api/asset/:id` correctly sets the filename with appropriate extension in `Content-Disposition`.

**Step 2: Universal Path Resolver & Subpath Support**
- **2a:** Refactor `src/utils/assetHelper.js` to use relative paths (`./`) in production when `VITE_API_BASE_URL` is missing, ensuring subpath compatibility.
- **2b:** Update `src/modules/ProjectGallery.jsx` to use `resolveAssetUrl` from the helper.

**Step 3: Frontend Filename Display Logic**
- **3a:** Update `src/components/modular/DocumentUpload.jsx` to track the `fileName` and display it in the success state.
- **3b:** Update `src/components/modular/Unit1SchoolIdentity.jsx` to store `local_file_name` in `formData` and render it in review mode.
- **3c:** Ensure `onUploadSuccess` in both components correctly propagates the filename.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Provide a lightweight diagnostic tool in `assetHelper.js` (or a separate hook) that:
- Logs the resolved URL and the source (origin vs BASE_URL).
- Includes a `DEBUG_RESOLVER = true` flag.

# 🛑 CONSTRAINTS & GUARDRAILS
- **RELATIVE PATHS:** Favor relative paths (`./`) for assets in `HashRouter` production builds to ensure maximum portability.
- **NO DATA LOSS:** Ensure existing documents are still accessible even if they lack filename metadata (fall back to the path).
