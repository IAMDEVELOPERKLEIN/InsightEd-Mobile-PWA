#!/bin/bash

# Deployment Script (Local to Remote)
# This script pushes code directly from your LOCAL machine to the Azure VM.

SERVER_IP="20.24.58.49"
SERVER_DIR="/var/www/html/InsightEd-Mobile-PWA"
USER="Administrator1"
PASS="7v52E69TYgTE"

echo "------------------------------------------------"
echo "🚀 Local-to-Remote Deployment"
echo "------------------------------------------------"
echo "Host: $SERVER_IP"
echo "User: $USER"
echo "Pass: $PASS"
echo "------------------------------------------------"

echo "------------------------------------------------"
echo "⚠️  IMPORTANT: .env is NOT synced automatically."
echo "   Verify the VM has the correct .env file at:"
echo "   $SERVER_DIR/.env"
echo "   Required: DATABASE_URL, JWT_SECRET, etc."
echo "------------------------------------------------"

echo "📤 1. Syncing local files to VM..."
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
    scp -r ./api ./src ./public ./index.html ./package.json $USER@$SERVER_IP:$SERVER_DIR/
fi

echo "🏗️  2. Running remote build and restart..."
ssh $USER@$SERVER_IP "cd $SERVER_DIR && npm install --legacy-peer-deps && npm run build && pm2 restart insighted-backend"

echo "✅ Local Deployment Complete!"
echo "------------------------------------------------"
