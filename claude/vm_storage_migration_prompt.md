# 🛰️ VM Storage Migration: Professional Prompt

# SYSTEM ROLE
You are an expert Backend & Resiliency Engineer specializing in Azure infrastructure and Node.js optimization. Your goal is to migrate a production upload system from a congested root partition to a high-capacity /mnt volume on a Linux Ubuntu instance.

# 🌌 THE VIBE & AESTHETIC
The execution must feel "Bulletproof and Proactive." This is a mission-critical infrastructure shift. Every step must prioritize data integrity, zero-downtime path transitions, and "Jarvis-level" visibility into the migration progress.

# 🛠️ TECH STACK & ARCHITECTURE
- **Backend:** Node.js (Express), Multer (DiskStorage), Dotenv.
- **Infrastructure:** Azure Linux VM (Ubuntu 24.04), /mnt (Temporary Data Volume).
- **Communication:** SSH2 (Node.js) for remote automation.
- **Key Pattern:** Environment-driven Path Resolution (Local-to-Cloud abstraction).

# 📝 CORE REQUIREMENTS
1. Implement a dynamic `UPLOAD_BASE_PATH` in the API that switches between a local relative path and the `/mnt/uploads` absolute path based on environment variables.
2. **Environment Parity:** Ensure that whether the application is running via `local-staging` or `local-deploy`, it consistently references the same `/mnt/uploads` directory on the VM for all photos and documents.
3. **Compression Enforcement (96 DPI - Pre-Storage):** 
    - All PDFs and Images must be compressed to 96 DPI **BEFORE** being moved to the permanent `/mnt/uploads` directory. 
    - Audit existing background compression tasks and convert them to synchronous, pre-storage processing to prevent large uncompressed files from accumulating.
    - **Infrastructure Audit:** Verify that `compress_pdf.py` and `compress_image.py` dependencies (e.g., `Pillow`, `PyMuPDF`) are correctly configured on the VM to ensure the 96 DPI standard is strictly enforced.
4. **Storage Cleanup:** Identify and report existing large files (>50MB) on the VM root partition as part of the migration diagnostic to ensure they are either compressed or migrated to the data volume.
5. Ensure all file write operations are redirected to the new high-capacity volume.
6. Automate the remote folder structure creation and file synchronization from the system root to the data volume.
7. Provide a fail-safe Nginx configuration update guide to maintain public access to the migrated files.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Codebase Refactoring (Dynamic Pathing)**
- **1a:** Update `api/index.js` to define a global `UPLOAD_DIR` constant retrieved from `process.env.UPLOAD_DIR` with a fallback to the current root `./uploads`.
- **1b:** Refactor all Multer `diskStorage` destinations and static file middleware to reference this new constant.
- **1c:** Update the `.env` template to include the `/mnt/uploads` entry for production use.

**Step 2: Remote Infrastructure Orchestration**
- **2a:** Create an SSH script using the `ssh2` library to connect to the VM (`20.24.58.49`).
- **2b:** Logic: Create the `/mnt/uploads` directory tree and set `chown` permissions to the `Administrator1` user.
- **2c:** Logic: Use `rsync` or `mv` to securely migrate the contents of the old `uploads/` to the new `/mnt/uploads` location.

**Step 3: Traffic Routing (Nginx Alignment)**
- **3a:** Draft a step-by-step shell guide for the user to update the Nginx server block. 
- **3b:** Shift the `location /uploads` block from a relative `root` to an `alias /mnt/uploads/;`.

**Step 4: Verification & Handover**
- **4a:** Implement a "Post-Migration Diagnostic" script that verifies read/write access to the new volume.
- **4b:** Perform a test upload and confirm the physical file exists in the `/mnt` directory.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Provide a lightweight `verify_migration.cjs` script that uses `ssh2` to:
- Log the current disk utilization of both `/` and `/mnt` post-migration.
- Perform a "File Existence Check" on a known migrated asset.
- Alert if the `Administrator1` user lacks write permissions on the new `/mnt/uploads` mount point.
- Toggle-ready via `const VERBOSE_TELEMETRY = true;`.

# 🛑 CONSTRAINTS & GUARDRAILS
- NEVER delete the original files until the `rsync` verification returns a zero-exit code.
- AVOID absolute paths in the source code; use `path.resolve` for cross-platform compatibility (Windows Local vs. Linux VM).
