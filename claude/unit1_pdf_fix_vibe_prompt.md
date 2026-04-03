# SYSTEM ROLE
You are an expert full-stack developer operating in a React (Vite PWA) and Node.js/Postgres environment. Your goal is to resolve a critical document handling issue for school identity profiles by standardizing on the system's "Bulletproof PDF" pattern.

# 🌌 THE VIBE & AESTHETIC
**Bulletproof & Enterprise Reliability.**
This fix must translate a flaky, relative-path-based link into a robust, context-aware download/preview experience. When a School Head or Auditor clicks "View Document," the browser should immediately recognize it as a PDF asset and either preview it inline or download it with a descriptive, professional filename—matching the "smooth as butter" behavior already implemented in the Engineer POW/DUPA modules.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React, TailwindCSS, centralized `assetHelper.js` utility.
- **Backend/State:** Node.js/Express asset streaming via `/api/asset/:id`, Postgres Binary Registry for storage.
- **Key Patterns:** 
  - Centralized URL resolution using `resolveDocUrl`.
  - Conditional `download=1` query parameter for backend-enforced `Content-Disposition`.
  - Client-side `download` attribute on `<a>` tags for filename control.

# 📝 CORE REQUIREMENTS
1. **Standardize Unit 1 Links:** Convert all `resolveAssetUrl` calls in `Unit1SchoolIdentity.jsx` to `resolveDocUrl` with the `{ download: true }` option.
2. **Hardened Upload Preview:** Ensure the standalone `DocumentUpload` component correctly resolves the preview link for recently uploaded assets using the same utility.
3. **Controlled Filenames:** Explicitly set the `download` attribute on links to ensure consistent naming conventions (e.g., `Ownership_Document_<SchoolID>.pdf`).
4. **Context Support:** Maintain functionality across "Edit Mode," "Review Mode," and "Audit Review Mode" (isReadOnly).

# 🚀 STEP-BY-STEP EXECUTION PLAN
Follow these steps in strict order to ensure absolute alignment with existing system patterns:

**Step 1: Dependency Check & Import Alignment**
- **1a:** Verify `resolveDocUrl` is available in `src/utils/assetHelper.js`.
- **1b:** Add `import { resolveDocUrl } from "../../utils/assetHelper";` to `Unit1SchoolIdentity.jsx`.

**Step 2: Refactor Unit 1 Review Mode**
- **2a:** Locate the "View Document" link (around line 922) in `Unit1SchoolIdentity.jsx`.
- **2b:** Wrap the `href` in `resolveDocUrl(formData.local_file_path, { download: true })`.
- **2c:** Add `download={`Ownership_Document_${formData.school_id}.pdf`}` attribute to the anchor tag.

**Step 3: Refactor DocumentUpload Component**
- **3a:** Import `resolveDocUrl` into `src/components/modular/DocumentUpload.jsx`.
- **3b:** Wrap the success-state `href` (around line 226) in `resolveDocUrl(uploadedPath, { download: true })`.
- **3c:** Add a generic `download` attribute to the anchor tag.

**Step 4: Logic Validation**
- **4a:** Ensure `formData.local_file_path` is safely checked before rendering the link to avoid "nexus" redirects (use `#` fallback from `resolveDocUrl`).

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Provide a lightweight debug component or console snippet that can be pasted into the browser to verify the resolved URL:
```javascript
const DEBUG_UNIT1_ASSET = (path) => {
    const url = resolveDocUrl(path, { download: true });
    console.group("🔍 Unit 1 PDF Debugger");
    console.log("Raw Path:", path);
    console.log("Resolved URL:", url);
    console.log("Is Absolute:", url.startsWith('http') || url.startsWith('blob:'));
    console.log("Includes Download Param:", url.includes('download=1'));
    console.groupEnd();
};
// Usage: DEBUG_UNIT1_ASSET(formData.local_file_path);
```

# 🛑 CONSTRAINTS & GUARDRAILS
- **NEVER** use raw path strings; always route through `resolveDocUrl`.
- **AVOID** relying on `resolveAssetUrl` for documents; it is intended for UI images/assets, not secure PDF streams.
- **GUARD** against empty or `null` paths by ensuring the Link component correctly handles the `#` fallback.
