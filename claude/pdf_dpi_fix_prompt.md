# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js and Python environment. Your goal is to fix a PDF compression issue where the target 96 DPI standard is not being consistently applied, causing storage bloat in a PostgreSQL-backed PWA.

# 🌌 THE VIBE & AESTHETIC
The solution must be robust, "bulletproof", and enterprise-grade. It should feel like a high-performance infrastructure fix—precise, well-documented, and focused on systemic efficiency.

# 🛠️ TECH STACK & ARCHITECTURE
- **Backend:** Node.js (Express)
- **PDF Processing:** Python script (`compress_pdf.py`) using `PyMuPDF` (fitz) and `Ghostscript` (gs)
- **Storage:** PostgreSQL with Unified Binary Registry (BLOB storage)
- **Deployment:** Windows Server environment

# 📝 CORE REQUIREMENTS
1. **Fix DPI Enforcement:** Ensure the 96 DPI target is correctly passed and used by both `PyMuPDF` and `Ghostscript` methods in `compress_pdf.py`.
2. **Standardize Backend Calls:** Update `api/index.js` and `api/utils/binaryPipeline.js` to consistently pass the 96 DPI argument to the Python script.
3. **Ghostscript Optimization:** Refactor `compress_pdf_gs` to explicitly set the resolution to 96 DPI instead of relying on the generic `/screen` preset which may vary.
4. **Fallback Safety:** Ensure that if compression fails, the system logs a warning but still allows the upload (as a fallback) per the "PostgresMaster_LeanBLOB" guidelines.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Harden the Python Compression Script**
- **1a:** Modify `compress_pdf_gs` in `compress_pdf.py` to include Ghostscript arguments for explicit resolution: `-dPDFSETTINGS=/screen -dColorImageResolution=96 -dGrayImageResolution=96 -dMonoImageResolution=96`.
- **1b:** Verify `compress_pdf_fitz`'s use of `page.get_pixmap(dpi=dpi)` and ensure it handles potential rendering errors gracefully.

**Step 2: Align Backend Integration**
- **2a:** In `api/index.js`, update the command generation for `multipart-finalize` to include the `96` DPI argument: `const cmd = (py) => \`${py} "${scriptPath}" "${tempInput}" "${outputPath}" 96\`;`.
- **2b:** Audit `api/utils/binaryPipeline.js` to ensure `compressPDF` is correctly handling the output and verifying size reduction.

**Step 3: Diagnostic Validation**
- **3a:** Create a test script to compare PDF metadata (DPI/Resolution) before and after compression.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
```python
import fitz # PyMuPDF
import sys

def check_pdf_dpi(file_path):
    doc = fitz.open(file_path)
    for i, page in enumerate(doc):
        # Note: This is an approximation for embedded images
        imgs = page.get_images(full=True)
        print(f"Page {i+1} has {len(imgs)} images.")
        for img in imgs:
            xref = img[0]
            pix = fitz.Pixmap(doc, xref)
            print(f"  - Image XREF {xref}: Resolution {pix.width}x{pix.height}, DPI {pix.xres}x{pix.yres}")
    doc.close()

if __name__ == "__main__":
    check_pdf_dpi(sys.argv[1])
```

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT remove the Ghostscript fallback; it is essential for environments where PyMuPDF might fail.
- AVOID hardcoding paths; use `path.resolve` and environment-aware script paths.
- ENSURE all temporary files are unlinked in `finally` blocks to prevent disk leakage.
