#!/bin/bash

# Deployment Script (Local to Staging)
# This script pushes code directly from your LOCAL machine to the Azure VM Staging Area.

SERVER_IP="20.24.58.49"
SERVER_DIR="/var/www/html/InsightEd-Staging"
USER="Administrator1"
PASS="7v52E69TYgTE"

echo "------------------------------------------------"
echo "🚀 Local-to-Staging Deployment"
echo "------------------------------------------------"
echo "Host: $SERVER_IP"
echo "User: $USER"
echo "Pass: $PASS"
echo "Target Dir: $SERVER_DIR"
echo "------------------------------------------------"

echo "📤 1. Syncing local files to VM Staging..."
if command -v rsync >/dev/null 2>&1; then
    rsync -avz --delete \
        --exclude 'node_modules/' \
        --exclude 'dist/' \
        --exclude '.git/' \
        --exclude '.env' \
        ./ $USER@$SERVER_IP:$SERVER_DIR/
else
    echo "⚠️  rsync not found. Falling back to scp (built-in Windows tool)..."
    # Using scp to copy the main folders. Note: this won't delete files on the server like rsync does.
    scp -r ./api ./src ./public ./index.html ./package.json ./vite.config.js ./tailwind.config.js ./postcss.config.js $USER@$SERVER_IP:$SERVER_DIR/
fi

echo "🏗️  2. Running remote build and restart (Staging)..."
ssh $USER@$SERVER_IP "mkdir -p $SERVER_DIR && cd $SERVER_DIR && npm install --legacy-peer-deps && npm run build -- --base=/insighted-staging/ && pm2 restart insighted-staging || PORT=5001 pm2 start api/index.js --name insighted-staging"

echo "✅ Staging Deployment Complete!"
echo "------------------------------------------------"
