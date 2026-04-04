# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js and Python environment. Your goal is to finalize the PDF compression stabilization by ensuring the 96 DPI standard is strictly enforced across all upload paths.

# 🌌 THE VIBE & AESTHETIC
"Bulletproof & Silent." The system should handle heavy PDF uploads by backgrounding the compression, ensuring the 96 DPI target is hit every time, and minimizing storage footprint without user intervention.

# 🛠️ TECH STACK & ARCHITECTURE
- **Backend:** Node.js (Express) with Busboy for streaming.
- **Compression Engine:** Python (`compress_pdf.py`) utilizing `PyMuPDF` (fitz) or `Ghostscript` (gs).
- **Automation Pipeline:** `api/utils/binaryPipeline.js` for unified storage logic.

# 📝 CORE REQUIREMENTS
1. **Sync Backend Parameters:** Explicitly pass the `96` DPI argument in every shell execution of `compress_pdf.py`.
2. **Ghostscript Parity:** Ensure the `gs` fallback in `compress_pdf.py` uses the same resolution targets as the primary `fitz` method.
3. **Audit Readiness:** Ensure the `binary_storage_audit.py` correctly reports these savings to verify the pipeline.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Harden the Python Compression Logic (COMPLETED/VERIFIED)**
- **1a:** `compress_pdf.py` already includes Ghostscript DPI flags and ASCII-safe logging.

**Step 2: Update the Multipart Upload Pipeline**
- **2a:** Update `api/index.js` in the `/api/upload/multipart-finalize` route.
- **2b:** Change the command construction to explicitly include the `96` DPI argument. 
- **Current:** `const cmd = (py) => \`${py} "${scriptPath}" "${tempInput}" "${outputPath}"\`;`
- **Target:** `const cmd = (py) => \`${py} "${scriptPath}" "${tempInput}" "${outputPath}" 96\`;`

**Step 3: Verification & Cleanup**
- **3a:** Perform a test upload of a high-resolution PDF.
- **3b:** Run `python system_scripts/binary_storage_audit.py` to confirm the "DB Size" is significantly lower than "Original Size".

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```javascript
// Add this temporary log in api/index.js to verify the command
console.log(`[COMPRESSION] Executing: ${cmd('python')}`);
```

# 🛑 CONSTRAINTS & GUARDRAILS
- Stick to 96 DPI for all document types.
- Ensure `tempInput` is always unlinked in the `finally` block.
