# Staging Server Forensic Healing Prompt

**Objective**: Generate a `forensic_heal.sh` bash script to resolve `EACCES` permission errors, missing Python dependencies, and Nginx timeout issues on the Staging Server (`20.24.58.49`).

## Context
- **OS**: Ubuntu 24.04 (Noble)
- **User**: `Administrator1` (member of `www-data` group)
- **Process**: PM2 ID 31 (`insighted-staging`) runs as `Administrator1`.
- **Target Dir**: `/mnt/uploads` (currently owned by `www-data:www-data`, 775)
- **Error**: `EACCES: permission denied, open '/mnt/uploads/comp_in_...'` when Node tries to create temp PDF files.
- **Python**: `PyMuPDF` (fitz) is installed but sometimes pathing is an issue.

## 🛠️ Requirements for the Healing Script

### 1. Process Hygiene
- Identify and **kill** any Node.js processes running as `root` for the staging directory (`/var/www/html/InsightEd-Staging`).
- Restart the PM2 process `insighted-staging` with `--update-env` after all permission changes are made.

### 2. Permission Lockdown
- `sudo chown -R Administrator1:www-data /mnt/uploads`
- `sudo chmod -R 775 /mnt/uploads`
- Ensure the `sticky bit` or `g+s` is set on `/mnt/uploads` so new files inherit the `www-data` group.

### 3. Dependency Verification
- Check if `python3 -c "import fitz"` succeeds for the `Administrator1` user.
- If not, provide the `pip3 install --break-system-packages pymupdf` fallback.

### 4. Nginx Audit & Hardening (ADR-003)
- Verify `/etc/nginx/sites-enabled/stride.conf` contains `proxy_read_timeout 600s;`, `proxy_send_timeout 600s;`, and `proxy_request_buffering off;`.
- If missing or set to `300s`, use `sed` to update them to the `600s` hardened standard.
- Ensure the `/insighted-staging/api/` block is targeted specifically.

### 5. Database Schema Patch (Optional but Recommended)
- Provide a `psql` command to check if the `school_ownership_docs` table has the `school_id` column and add it if missing:
  `ALTER TABLE school_ownership_docs ADD COLUMN IF NOT EXISTS school_id VARCHAR(20);`

## Output Format
Deliver a single, commented, robust Bash script (`forensic_heal.sh`) that can be copy-pasted directly into the staging terminal.
