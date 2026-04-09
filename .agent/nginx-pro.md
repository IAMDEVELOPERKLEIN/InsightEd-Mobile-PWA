---
skill_name: vm-nginx-navigator-pro
version: 1.1.0
framework: google-antigravity-awesome-skills
agent_role: infrastructure-vibe-coder
description: Equips the agent with advanced capabilities for navigating virtual machines, managing file structures, and writing highly optimized Nginx configurations for seamless frontend-backend integration. Now includes PWA Cache Hardening patterns for zero-downtime updates.
---

# 🚀 Skill: VM Navigation & Nginx Optimization Expert

## 📋 Overview
This skill package defines the execution parameters for an agent tasked with Virtual Machine (Linux) operations and Nginx web server management. The agent will autonomously navigate server file systems, audit existing configurations, and generate or repair Nginx server blocks to ensure optimal routing, proxying, and asset delivery using advanced directives.

---

## 🛠️ Core Competencies

### 1. Virtual Machine Navigation & Customization
The agent is authorized and trained to perform the following operations within the VM environment:
* **Reconnaissance:** Traverse directories using advanced `find` and `grep` pipelines to locate Nginx configs (`/etc/nginx/`, `/var/log/nginx/`), web roots (`/var/www/`), and backend socket/port configurations.
* **Permission Management:** Ensure correct ownership (`chown -R www-data:www-data`) and permissions (`chmod 755`, `chmod 644`) for static assets and configuration files to prevent 403 Forbidden errors.
* **Service Management:** Validate configurations (`nginx -t`) and apply changes gracefully (`systemctl reload nginx` or `systemctl restart nginx`).
* **Log Analysis:** Read and interpret `access.log` and `error.log` to dynamically debug 502 Bad Gateway or 404 Not Found errors during vibe coding sessions.

### 2. Nginx Location & Routing Optimization
The agent must apply strict logic when structuring Nginx `server` and `location` blocks to connect frontend assets and backend APIs seamlessly.

#### 📌 The Golden Rule: `root` vs. `alias`
This is the most critical distinction the agent must make when serving static files:
* **`root`**: *Appends* the requested URI to the specified path. Use this for standard directory structures.
    * *Example:* `location /static/ { root /var/www/app/; }` 
    * *Request:* `/static/image.png` -> *Maps to:* `/var/www/app/static/image.png`
* **`alias`**: *Replaces* the matched location part of the URI with the specified path. Use this when the URL path does not match the folder structure.
    * *Example:* `location /media/ { alias /var/www/uploads/; }`
    * *Request:* `/media/image.png` -> *Maps to:* `/var/www/uploads/image.png`
    * *Caution:* When using `alias` inside a location block that ends with a slash `/`, the alias path *must* also end with a slash.

#### 📌 Location Match Priority
The agent must structure location blocks based on Nginx's matching hierarchy to avoid routing conflicts:
1.  Exact match: `location = /path`
2.  Preferential prefix: `location ^~ /path`
3.  Regex match: `location ~ \.php$` (case-sensitive) or `location ~* \.(jpg|png)$` (case-insensitive)
4.  Standard prefix: `location /path`

---

## ⚙️ Standard Operating Procedures (SOPs)

When the user initiates a vibe coding session requesting a server setup or fix, the agent must execute the following workflow:

### Step 1: Environment Audit
1.  Run `nginx -v` to check the version.
2.  Run `nginx -T` to dump the current active configuration and analyze the routing tree.
3.  Check the status of the backend service (e.g., Node.js, Python/Gunicorn, PHP-FPM) via `systemctl status <service>` or `netstat -tulnp`.

### Step 2: Configuration Construction
Structure the Nginx configuration separating concerns between the frontend (static assets/SPA routing) and the backend (API proxying).

```nginx
# 💡 AGENT TEMPLATE: Optimized Full-Stack Nginx Configuration

server {
    listen 80;
    server_name example.com [www.example.com](https://www.example.com);

    # Optimize serving of static files
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    # -----------------------------------------
    # FRONTEND: Single Page Application (SPA)
    # -----------------------------------------
    root /var/www/frontend/dist;
    index index.html;

    location / {
        # Try finding the file, otherwise fallback to index.html (crucial for SPAs like React/Vue)
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets to optimize frontend load times
    location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc|woff2|woff)$ {
        expires 1M;
        access_log off;
        add_header Cache-Control "public";
    }

    # -----------------------------------------
    # CUSTOM ASSETS: Using Alias
    # -----------------------------------------
    # The URL /downloads/ maps to the physical folder /mnt/storage/public_files/
    location /downloads/ {
        alias /mnt/storage/public_files/;
        autoindex on; # Optional: allow directory listing
    }

    # -----------------------------------------
    # BACKEND: Reverse Proxy to API
    # -----------------------------------------
    location /api/ {
        # Forward requests to the backend service (e.g., Node.js running on port 3000)
        proxy_pass [http://127.0.0.1:3000/](http://127.0.0.1:3000/);
        
        # Preserve client headers for the backend
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Optimization: Proxy timeout adjustments
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Deny access to hidden files (e.g., .git, .env)
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

---

## 🛡️ PWA Cache Hardening (InsightEd Pattern)

### Problem
PWAs using Service Workers can get users "stuck" on an old version of the app even after a deployment. This is caused by the browser's HTTP cache storing `sw.js` and `index.html` and never asking the server for new ones.

### Root Cause Chain
```
Browser HTTP Cache holds old sw.js
→ Old SW serves old precached JS/CSS bundles
→ User sees old app version indefinitely
→ "Troubleshoot" button reloads but reloads old index.html from HTTP cache
→ Loop continues
```

### Three-Layer Defense Strategy

**Layer 1: Nginx — Kill HTTP Cache for Critical Files**
Add a dedicated block for the Service Worker **before** the general frontend block. Location block specificity (exact/prefix > regex > standard) ensures `sw.js` is matched first.

```nginx
# Layer 1a: Service Worker — NEVER cache (must be before the general /app/ block)
location /insighted/sw.js {
    alias /var/www/html/InsightEd-Mobile-PWA/dist/sw.js;
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    expires off;
    proxy_no_cache 1;
}

# Layer 1b: Frontend SPA with nested index.html no-cache
location /insighted/ {
    alias /var/www/html/InsightEd-Mobile-PWA/dist/;
    try_files $uri $uri/ /insighted/index.html;

    # Nested location: force browser to revalidate index.html on every visit
    location ~* /insighted/index\.html$ {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        expires off;
    }
}
```

> ⚠️ **Agent Rule:** The `sw.js` location block MUST come before the general `location /app/` block, otherwise Nginx's prefix matching will swallow it.

**Layer 2: HTML Meta Tags — Client-Side Fail-safe**
Add to `index.html` `<head>` for browsers that ignore server headers:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

**Layer 3: SW Registration Cache-Buster — App Code**
In `ServiceWorkerContext.jsx`, append a version string to the SW registration URL:
```js
const APP_VERSION = '1.0.23'; // Increment on every release
const swUrl = `${basePath}sw.js?v=${APP_VERSION}`.replace('//', '/');
```
This tricks the browser into treating it as a new resource every release, bypassing all caches.

### What is NOT affected
| Data Store | Affected by no-cache? | Why |
| :--- | :--- | :--- |
| **Service Worker Precache** | ❌ No | It's a browser-side DB, independent of HTTP headers |
| **IndexedDB (Drafts/Outbox)** | ❌ No | Completely separate from HTTP cache layer |
| **LocalStorage** | ❌ No | Browser-managed, not touched by Nginx |
| **Offline Mode** | ❌ No | SW intercepts before hitting the network |

### Validation Commands
After applying the Nginx changes:
```bash
# 1. Test config syntax
sudo nginx -t

# 2. Apply changes
sudo systemctl restart nginx

# 3. Verify headers on sw.js
curl -I https://stride.deped.gov.ph/insighted/sw.js | grep -i cache

# 4. Verify headers on index.html
curl -I https://stride.deped.gov.ph/insighted/ | grep -i cache

# Expected output for both:
# Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0
```

---

## 🔬 Live Verification Report — stride.deped.gov.ph (April 9, 2026)

### Test Commands Run
```bash
# Test 1: HTTPS path (user-facing traffic)
curl -I https://stride.deped.gov.ph/sw.js | grep -i cache

# Test 2: HTTP path (VM-direct traffic)
curl -I http://stride.deped.gov.ph/sw.js | grep -i cache
```

### Results

**HTTPS (user-facing):**
```
HTTP/2 200
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate  ✅
x-nextjs-cache: HIT
```

**HTTP (VM-direct):**
```
HTTP/1.1 301 Moved Permanently   → Redirects to https://
(No Cache-Control — redirect body only, 195 bytes)
```

### Architecture Discovery
This verification revealed that `stride.deped.gov.ph` has a **dual-environment architecture**:

| Traffic Path | Handler | Cache-Control Status |
| :--- | :--- | :--- |
| `https://` (all user traffic) | **Vercel CDN** | ✅ `no-cache, no-store, must-revalidate` confirmed |
| `http://` port 80 | **Nginx VM** | ✅ Redirects to HTTPS (301) |
| VM direct `http://` (internal) | **Nginx → Express :5000** | ✅ Config updated with PWA hardening blocks |

### Agent Rule: Dual-Environment Awareness
> ⚠️ When `x-nextjs-cache` appears in response headers, the request is being served by **Vercel**, not the local Nginx VM. This is identifiable via `curl -I https://`.
> For this project, `https://` = Vercel, `http://` VM-direct = Nginx → Express.
> Always test **both** paths when debugging caching issues.

### Final Protection Status (as of April 9, 2026)

| Layer | File | Status |
| :--- | :--- | :--- |
| Vercel HTTPS (user traffic) | `sw.js` | ✅ `no-cache` confirmed live |
| Nginx VM config | `deploy/nginx/stride.conf` | ✅ PWA hardening blocks added |
| App SW registration | `src/context/ServiceWorkerContext.jsx` | ✅ `?v=1.0.23` cache-buster added |
| HTML entry point | `index.html` | ✅ Anti-cache `<meta>` tags added |
| UI button | `src/modules/UserProfile.jsx` | ✅ "Optimize App" merged button implemented |
| App version string | `UserProfile.jsx` + `ServiceWorkerContext.jsx` | ✅ Bumped to `v1.0.23` |
