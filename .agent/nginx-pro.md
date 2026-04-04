---
skill_name: vm-nginx-navigator-pro
version: 1.0.0
framework: google-antigravity-awesome-skills
agent_role: infrastructure-vibe-coder
description: Equips the agent with advanced capabilities for navigating virtual machines, managing file structures, and writing highly optimized Nginx configurations for seamless frontend-backend integration.
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