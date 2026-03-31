# Implementation Plan - "Document Upload Fix" (400 Bad Request Resolution)

This plan resolves the 400 Bad Request error encountered during immediate document uploads by harmonizing field names and consolidating duplicate backend routes.

# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js/Express environment. Your goal is to eliminate technical debt (duplicate routes) and ensure API robustness.

# 🌌 THE VIBE & AESTHETIC
The fix should be **"Clean & Decisive"**. We are removing redundant code blocks and ensuring that the frontend and backend speak the same language (CamelCase vs. Snake_Case) to achieve a zero-error upload experience.

# 🛠️ TECH STACK & ARCHITECTURE
- **Backend:** Node.js / Express (api/index.js)
- **Problem:** Field mismatch (`projectId` vs `project_id`) and duplicate route definition for `/api/upload-project-document`.

# 📝 CORE REQUIREMENTS
1. **Remove Duplicate Route**: Delete the legacy/redundant `/api/upload-project-document` block at line 8575.
2. **Harmonize Parameters**: Update the active endpoint (line 10027) to robustly handle both `projectId` and `project_id`.
3. **Verify Background Process**: Ensure `processPdfInBackground` is correctly called with the resolved ID and IPC.

# 🚀 STEP-BY-STEP EXECUTION PLAN

### Step 1: Backend - Route Consolidation
- **1a:** Search for `app.post('/api/upload-project-document'` in `api/index.js`.
- **1b:** DELETE the entire block starting at line 8574 to 8601. This block contains the snake_case validation that is failing.

### Step 2: Backend - Parameter Naming Harmonization
- **2a:** [MODIFY] `api/index.js` around line 10027:
    - Update destructuring to: `const { projectId, project_id, type, uid, ipc } = req.body;`.
    - Add fallback logic: `const finalProjectId = projectId || project_id;`.
    - Update validation: `if (!finalProjectId || !type || (!base64 && !req.file)) { ... }`.

### Step 3: Frontend - Verification Script
- **3a:** Use the console log added in `DetailedProjInfo.jsx` to verify that `projectId` is being sent.
- **3b:** Perform a manual upload of a POW document and verify it reaches the Mad-Debugger-enabled endpoint without a 400 error.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
In the consolidated backend route, add a specific log:
```javascript
console.log(`🔍 DEBUG: Received ID [${projectId}] or [${project_id}] -> Selected: ${finalProjectId}`);
```
This will confirm that the harmonization logic is working as expected.

# 🛑 CONSTRAINTS & GUARDRAILS
- **DO NOT** change the frontend `FormData` names unless absolutely necessary (Backend should be flexible).
- **KEEP** the Mad-Debugger logging groups (`📂 Incoming Doc Upload`) as they are essential for site monitoring.
