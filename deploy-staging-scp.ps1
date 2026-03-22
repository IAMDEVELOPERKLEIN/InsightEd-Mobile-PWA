# --- CONFIGURATION ---
$SERVER_IP = "20.24.58.49"
$SERVER_DIR = "/var/www/html/InsightEd-Staging"
$USER = "Administrator1"
$PASS = "7v52E69TYgTE"
$ARCHIVE = "staging-deploy.tar.gz"
$INCLUDE = "api", "src", "public", "index.html", "package.json", "vite.config.js", "postcss.config.js", "tailwind.config.js"

echo "------------------------------------------------"
echo "🚀 SCP-Based Deployment (Staging)"
echo "------------------------------------------------"

# 1. Create Archive
echo "📦 1. Creating local archive..."
tar -czf $ARCHIVE $INCLUDE
if ($LASTEXITCODE -ne 0) { echo "❌ Failed to create archive."; exit }

# 2. Upload via SCP
echo "📤 2. Uploading to VM via SCP..."
# Using scp (ensure SSH agent is running or just enter pass if prompted, though usually automated)
scp $ARCHIVE "${USER}@${SERVER_IP}:${SERVER_DIR}/"
if ($LASTEXITCODE -ne 0) { echo "❌ SCP Upload failed."; exit }

# 3. Remote Build
echo "🏗️  3. Remote Build and Restart..."
ssh "${USER}@${SERVER_IP}" "cd ${SERVER_DIR} && tar -xzf ${ARCHIVE} && npm install --legacy-peer-deps && npm run build -- --base=/insighted-staging/ && pm2 restart insighted-staging || PORT=5001 pm2 start api/index.js --name insighted-staging"

echo "✅ Deployment Complete!"
rm $ARCHIVE
