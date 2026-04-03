# 🛠️ Staging Recovery & Maintenance Commands

A collection of "one-click" commands and diagnostics for the InsightEd staging server (`20.24.58.49`).

## 🚀 Deployment & Healing
The primary command to build, deploy, and fix environment issues on staging.
```powershell
# Run from local project root
powershell -ExecutionPolicy Bypass -Command "npm run heal:staging"
```

## 🩺 Diagnostics & Logs
Monitor the staging application in real-time.
```bash
# View active Node.js logs (last 100 lines)
ssh Administrator1@20.24.58.49 "pm2 logs insighted-staging --lines 100"

# Monitor system resources
ssh Administrator1@20.24.58.49 "pm2 monit"

# Check Nginx configuration state
ssh Administrator1@20.24.58.49 "sudo nginx -t"
```

## 🛠️ Infrastructure Checks
Verify that the hardening settings from ADR-003 are active.
```bash
# Check Nginx timeouts and buffering for Staging API
ssh Administrator1@20.24.58.49 "grep -A 10 'location /insighted-staging/api/' /etc/nginx/sites-enabled/stride.conf"

# Verify PDF scratch directory permissions
ssh Administrator1@20.24.58.49 "ls -ld /tmp/insighted-pdf-tmp"
```

## 🧹 Cleanup
Safe cleanup of local deployment artifacts.
```powershell
rm staging-deploy.tmp.tar.gz
```

---
*Verified by Antigravity (Avid Documenter Module) - 2026-04-04*