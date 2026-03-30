# --- CONFIGURATION ---
$SERVER_IP = "20.24.58.49"
$SERVER_DIR = "/var/www/html/InsightEd-Staging"
$USER = "Administrator1"
$ARCHIVE = "staging-deploy.tar.gz"
$INCLUDE = "api", "src", "public", "index.html", "package.json", "vite.config.js", "postcss.config.js", "tailwind.config.js"

Write-Output "----------------------------------------------------"
Write-Output "Starting optimized staging deployment..."
Write-Output "----------------------------------------------------"


# 2. Create Archive
Write-Output "Step 1: Local Production Build..."
tar -czf $ARCHIVE $INCLUDE
if ($LASTEXITCODE -ne 0) { Write-Output "Pruning local node_modules... (to avoid syncing unnecessary dev files)"
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue; exit }

# 2.3 Remote Cleanup (to avoid ENOSPC)
Write-Output "🧹 2.3 Cleaning remote destination to free up space..."
ssh "${USER}@${SERVER_IP}" "rm -rf ${SERVER_DIR}/dist ${SERVER_DIR}/api"

# 2. Upload via SCP
Write-Output "📤 2. Uploading to VM via SCP..."
# Using scp (ensure SSH agent is running or just enter pass if prompted, though usually automated)
scp $ARCHIVE "${USER}@${SERVER_IP}:${SERVER_DIR}/"
if ($LASTEXITCODE -ne 0) { Write-Output "❌ SCP Upload failed."; exit }

# 3. Remote Build
Write-Output "Step 2: Syncing build artifacts to /var/www/html/..."
ssh "${USER}@${SERVER_IP}" "cd ${SERVER_DIR} && tar -xzf ${ARCHIVE} && npm install --legacy-peer-deps && npm run build -- --base=/insighted-staging/ && pm2 restart insighted-staging || PORT=5001 pm2 start api/index.js --name insighted-staging"


Write-Output "✅ Deployment Complete!"
Remove-Item $ARCHIVE
