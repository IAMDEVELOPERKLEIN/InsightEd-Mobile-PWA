#!/bin/bash
set -e # Exit on error

# Deployment Script (Local to Remote - Ultra Lean Edition)
# This script pushes a locally built production bundle and optimized assets
# to minimize server footprint and avoid ENOSPC errors.

SERVER_IP="20.24.58.49"
SERVER_DIR="/var/www/html/InsightEd-Mobile-PWA"
USER="Administrator1"
TAR_FILE="local-deploy.tmp.tar.gz"
PASS="7v52E69TYgTE"

echo "------------------------------------------------"
echo "🚀 Local-to-Remote Deployment (Incremental/Tarball)"
echo "------------------------------------------------"
echo "Host: $SERVER_IP"
echo "User: $USER"
echo "Target Dir: $SERVER_DIR"
echo "------------------------------------------------"

echo "🏗️  1. Building locally..."
MSYS_NO_PATHCONV=1 npm run build

echo "🧹 1.5 Cleaning remote destination to free up space..."
ssh -o StrictHostKeyChecking=no -o BatchMode=yes $USER@$SERVER_IP "rm -rf $SERVER_DIR/dist $SERVER_DIR/api" || { echo "❌ [SSH Error] Connection failed. Run setup-ssh-key.sh."; exit 1; }

echo "📦 2. Packing artifacts into archive ($TAR_FILE)..."
tar -czf $TAR_FILE dist api public package.json package-lock.json

echo "📤 3. Syncing to VM via SCP..."
scp -o StrictHostKeyChecking=no -o BatchMode=yes $TAR_FILE $USER@$SERVER_IP:$SERVER_DIR/

echo "🚀 4. Remote Production Setup & Restart..."
ssh -o StrictHostKeyChecking=no -o BatchMode=yes $USER@$SERVER_IP "mkdir -p $SERVER_DIR && cd $SERVER_DIR && tar -xzf $TAR_FILE && rm $TAR_FILE && pm2 flush && npm cache clean --force 2>/dev/null && npm install --omit=dev --legacy-peer-deps && npm prune --omit=dev --legacy-peer-deps && pm2 set pm2-logrotate:max_size 50M && pm2 set pm2-logrotate:retain 5 && (pm2 restart insighted-backend || PORT=3000 pm2 start api/index.js --name insighted-backend)"

echo "🧹 5. Cleaning up local archive..."
rm -f $TAR_FILE

echo "✅ Local Deployment Complete!"
echo "------------------------------------------------"
