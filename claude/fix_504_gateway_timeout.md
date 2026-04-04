# SYSTEM ROLE
You are an expert full-stack developer operating in a Node.js (Vite/Express) and Nginx environment on a Windows/Linux hybrid staging setup. Your goal is to resolve a critical production-blocking 504 Gateway Time-out for large PDF uploads.

# 🌌 THE VIBE & AESTHETIC
This needs to feel like "Bulletproof Infrastructure". The user should be able to upload a 27MB PDF (and larger) without any anxiety about the connection dropping. The system should be robust, resilient, and "infinite" in its patience during the upload phase.

# 🛠️ TECH STACK & ARCHITECTURE
- **Frontend:** React (Vite)
- **Backend:** Node.js (Express @5.2.1) using `busboy` for streaming uploads.
- **Proxy:** Nginx
- **Environment:** Staging server at `stride.deped.gov.ph`.

# 📝 CORE REQUIREMENTS
1. **Zero-Buffering Proxying:** Disable Nginx request buffering to allow Node.js to receive data as it arrives.
2. **Hardened Timeouts:** Increase all relevant Nginx and Node.js timeouts to 600s (10 minutes).
3. **Graceful Large Body Handling:** Ensure `client_max_body_size` is consistently set to `100M`.

# 🚀 STEP-BY-STEP EXECUTION PLAN

**Step 1: Nginx Configuration Hardening**
- **1a:** Modify `/etc/nginx/sites-enabled/stride.conf` on the staging server.
- **1b:** Update the `location /insighted-staging/api/` block to include `proxy_request_buffering off;`, `proxy_read_timeout 600s;`, `proxy_send_timeout 6000s;`, `client_body_timeout 600s;`.
- **1c:** Verify syntax with `nginx -t` and reload Nginx.

**Step 2: Node.js Server Timeout Alignment**
- **2a:** Modify `insighted-backend/api/index.js`.
- **2b:** Explicitly set `server.timeout = 600000;`, `server.keepAliveTimeout = 610000;`, and `server.headersTimeout = 620000;` on the instance returned by `app.listen`.

**Step 3: Verification & Recovery**
- **3a:** Restart the staging backend via PM2 (`pm2 restart insighted-staging`).
- **3b:** Perform a test upload of the 27MB PDF and monitor Nginx error logs and PM2 logs.

# 🐛 DIAGNOSTIC & DEBUGGING SCRIPT
Provide a lightweight "Upload Heartbeat" log in the backend:
- Log a message every 5MB received by `busboy` to verify the stream is flowing.
- Log the time taken between `bb.on('file')` start and `bb.on('close')`.

# 🛑 CONSTRAINTS & GUARDRAILS
- DO NOT restart the production server (`insighted` on port 5000). Only target staging (`insighted-staging` on port 5001).
- ALWAYS backup Nginx config before editing (though autonomous, be careful).
