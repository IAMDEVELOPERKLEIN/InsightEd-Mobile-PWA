# Systematic Implementation Plan: Nginx Asset Consolidation

> **SYSTEMATIC RESILIENCE ACTIVE (FULL STACK: VM + AZURE)**

## Phase 1: Multi-Layer Audit
- **Traffic/Environment:** Production VM (Staging).
- **Frontend (React):** Assets failing in `DetailedProjInfo.jsx` and `Unit1SchoolIdentity.jsx` when hosted.
- **Backend (Node/Express):** Asset streamer at `/api/asset/:id` verified on localhost.
- **Infra (Nginx):** Suspected static file interception for `/uploads/` or `/api/`.

## Phase 2: Scientific Hypotheses (Two-Path Rule)
1. **Hypothesis A (Primary):** Nginx has an overlapping `location /uploads/` or `location /api/` block configured as a static root/alias, causing it to look for physical files on disk rather than proxying to the Node.js Postgres-binary logic.
2. **Hypothesis B (Secondary):** Nginx is stripping or incorrectly setting the `Host` or `X-Forwarded-Proto` headers, leading to relative path resolution failures on the client side.

## Phase 3: Diagnostic Request
- Run `sudo nginx -T` to view the full active configuration.
- Check Nginx error logs with `sudo tail -n 50 /var/log/nginx/error.log` during a failed asset load.

## Phase 4: Step-by-Step Execution Plan

**Step 1: Configuration Cleanup**
- **1a:** Identify any `location /uploads/` blocks in Nginx that point to a physical directory.
- **1b:** Comment out or remove these blocks to ensure all `/uploads/` requests fall back to the `/api/` proxy or are explicitly proxied to Express.

**Step 2: Proxy Consolidation**
- **2a:** Ensure the `location /api/` block correctly uses `proxy_pass` to the Node.js port (Use **5001** for Staging as per `deploy-staging.sh`, or **3000** for Local Dev).
- **2b:** Add or verify standard proxy headers (`Host`, `X-Real-IP`, `X-Forwarded-For`).

**Step 3: Permission Audit**
- **3a:** Verify that the user running the Node.js process has read access to nothing outside of what is necessary, as everything is now in Postgres.
- **3b:** Ensure Nginx has permissions to proxy through to the local socket/port.

**Step 4: Verification & Validation**
- **4a:** Run `nginx -t` to validate the new configuration.
- **4b:** Execute `systemctl reload nginx`.
- **4c:** Test image and PDF access from the public staging URL.

## Resilience Note
"To prevent future asset breaks, we are moving away from disk-based locations in Nginx for dynamic assets. By routing all asset requests through the Express middleware, we ensure that the database-first binary registry remains the single source of truth, regardless of the physical server structure."
