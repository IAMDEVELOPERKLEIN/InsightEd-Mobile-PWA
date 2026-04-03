# Session: PDF Pipeline Hardening & Division Engineer Upload Alignment
**Date:** 2026-04-04  
**Scope:** `api/index.js`, `compress_pdf.py`, `src/modules/DetailedProjInfo.jsx`, `tmp_stride.conf`, `forensic_heal.sh`, `deploy-staging.sh`

---

## Session Goals

1. Fix a broken PDF upload in the Division Engineer document panel (POW/DUPA/CONTRACT).
2. Align the engineer upload pipeline with the working pattern established in the School Head Unit 1 ownership document module.
3. Harden the Hydra transformation engine against encrypted PDFs and missing Python executors.
4. Decommission `/mnt/uploads` from all infrastructure layers (nginx, staging env, deploy scripts).

---

## Problems Encountered & Resolved

### 1. `42P18` — PostgreSQL Cannot Determine Type of `$N` in `jsonb_build_object`

**Error:**
```
message: 'could not determine data type of parameter $8'
code: '42P18'
```

**Root Cause:**  
`jsonb_build_object` accepts variadic `"any"` arguments. When a parameterized placeholder (`$8`, `$7`, etc.) is used as the *key* argument, PostgreSQL cannot infer its type at parse time. This affected 5 call sites across `api/index.js`:
- `POST /api/upload-project-document` (primary engineer upload route)
- `processPdfInBackground` bulk path — with filename branch
- `processPdfInBackground` bulk path — without filename branch
- LGU background sync `UPDATE lgu_projects`
- LGU dedicated upload endpoint

**Fix:**  
Added `::text` cast to every untyped key parameter:  
`jsonb_build_object($N, $M::jsonb)` → `jsonb_build_object($N::text, $M::jsonb)`

---

### 2. Frontend Used Hardcoded Legacy Disk Path After Upload

**Root Cause:**  
`handleAtomicUpload` in `DetailedProjInfo.jsx` never read the API response body. After a successful upload it set:
```js
const expectedPath = `/uploads/project_docs/${project.ipc}_${key}.pdf`;
```
But the API now stores in Postgres binary and returns `filePath: /api/asset/{binary_id}`. The Download link immediately broke because it pointed to a nonexistent disk file.

**Pattern Reference:**  
`DocumentUpload.jsx` (Unit 1 School Head) correctly reads `result.data.filePath` from the response.

**Fix:**  
Replaced the hardcoded path with a response-driven update:
```js
const resText = await res.text();
const resData = JSON.parse(resText);
const actualPath = resData.filePath || resData.data?.filePath || fallback;
setProject(prev => ({
    ...prev,
    [`${key.toLowerCase()}_pdf`]: actualPath,
    ...(resData.data?.file_size ? { [`${key.toLowerCase()}_size`]: resData.data.file_size } : {}),
}));
```

---

### 3. Hydra "document closed or encrypted" — Silent Failure Loop

**Error:**
```
Hydra Error (Retry): document closed or encrypted | Path exists: True | Size: 2412097
```

**Root Cause:**  
PyMuPDF (`fitz.open()`) opens PDFs with owner-password flags into a locked internal state. Even though no user password is required to view the file, every page operation throws `"document closed or encrypted"` until `doc.authenticate("")` is called. The retry branch in `compress_pdf_hydra` re-opened the file but also never authenticated — hitting the same wall twice.

**Fix:**  
Added `doc.authenticate("")` immediately after `fitz.open()` in three locations:
- `compress_pdf_fitz` (structural compression)
- `compress_pdf_hydra` (initial open)
- `compress_pdf_hydra` (retry branch)

---

### 4. Python Executor Chain — `'py' is not recognized`

**Root Cause:**  
The Python Launcher (`py.exe`) is not installed on the staging VM — only `python` is in PATH. The old executor chain was:
```js
try { execAsync(cmd('python')) }
catch (e1) {
    try { execAsync(cmd('py')) }
    catch (e2) { /* fail silent */ }
}
```
Any real Python error from `python` (e.g., the encryption issue above) caused an immediate fallback to `py`, which always failed with a "not recognized" OS error — masking the actual cause.

**Fix:**  
Replaced with a smart loop across `['python', 'python3', 'py']`:
- Silently skips executors that aren't installed (detected via "not recognized / not found / No such file" in stderr)
- **Breaks immediately** on a real Python error — no point trying further executors if Python ran and failed
- Applied to both Hydra and compression paths
- Removed the silent `/* fail silent */` catch, replaced with a warning log

---

### 5. `/mnt/uploads` EACCES on Staging

**Error:**
```
EACCES: permission denied, open '/mnt/uploads/comp_in_1775234768180_5heh5.pdf'
```

**Root Cause:**  
The staging `.env` had `UPLOAD_DIR=/mnt/uploads`. The PM2 process (`Administrator1`) didn't have write access to that directory. All files are stored in Postgres binary — `/mnt/uploads` is only needed as a **scratch space** for the Python compression subprocess (temp files exist for seconds then are deleted).

**Fix — Three Layers:**
1. **Immediate**: SSH one-liner to patch staging `.env` and restart PM2:
   ```bash
   mkdir -p /tmp/insighted-pdf-tmp && chmod 775 /tmp/insighted-pdf-tmp
   sed -i "s|UPLOAD_DIR=.*|UPLOAD_DIR=/tmp/insighted-pdf-tmp|g" .env
   pm2 restart insighted-staging --update-env
   ```
2. **Deploy pipeline**: Updated `deploy-staging.sh` — every deploy now creates `/tmp/insighted-pdf-tmp` and restarts with `--update-env`.
3. **Forensic script**: Updated `forensic_heal.sh` Phase 2 to create the temp dir instead of fixing `/mnt/uploads` perms. Injects `UPLOAD_DIR` into `ecosystem.config.cjs` if found.

---

### 6. Nginx — `/uploads/` Leak & Missing Directives

**Changes to `tmp_stride.conf`:**
- Added `location ^~ /uploads/ { return 410; }` — `^~` prefix takes priority over catch-all `location /`; returns `410 Gone` (semantically accurate — moved to Postgres) with a JSON body pointing to `/api/asset/:id`
- Moved `proxy_read/connect/send_timeout 300s` to server-block level (covers all proxy_pass locations)
- Added `X-Real-IP` and `X-Forwarded-For` headers to all API proxy blocks (were missing)
- Added `location ~ /\.` hidden file deny

**Changes to `forensic_heal.sh` Phase 4:**
- Replaced `sed`-based timeout injection with a compliance check (4 assertions)
- On any failure, deploys `tmp_stride.conf` wholesale and runs `nginx -t` before reloading
- Auto-reverts to backup if `nginx -t` fails

---

## Architectural Decisions Made This Session

See:
- [ADR-0007: PDF Pipeline Scratch Directory](../adr/ADR-0007-PDF-Pipeline-Scratch-Directory.md)
- [ADR-0008: Engineer Upload Postgres Binary Alignment](../adr/ADR-0008-Engineer-Upload-Postgres-Binary-Alignment.md)

---

## Files Modified

| File | Change |
|---|---|
| `api/index.js` | `::text` cast on all `jsonb_build_object` key params (5 sites); smart Python executor loop; stderr logging; Hydra forensic hardening |
| `compress_pdf.py` | `doc.authenticate("")` after every `fitz.open()` (3 sites) |
| `src/modules/DetailedProjInfo.jsx` | `handleAtomicUpload` reads actual `filePath` from API response |
| `tmp_stride.conf` | `410` block for `/uploads/`; 300s timeouts at server level; security headers; hidden file deny |
| `forensic_heal.sh` | Phase 2 rewritten (temp dir, not `/mnt/uploads`); Phase 4 rewritten (deploy authoritative conf) |
| `deploy-staging.sh` | Post-deploy step creates `/tmp/insighted-pdf-tmp` and restarts PM2 with `--update-env` |

---

## Next Steps

- Confirm staging PDF upload succeeds end-to-end after applying immediate SSH fix
- Monitor PM2 logs for `📂 [Storage] Active Upload Root: /tmp/insighted-pdf-tmp`
- Verify Hydra shards generate correctly for PDFs > 1.5MB now that auth fix is in place
- Run `forensic_heal.sh` on the VM for a full compliance sweep
