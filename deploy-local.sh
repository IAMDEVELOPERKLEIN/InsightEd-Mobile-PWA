#!/bin/bash

# Deployment Script (Local to Remote)
# This script pushes code directly from your LOCAL machine to the Azure VM.
# Bypasses GitHub for faster iteration.

SERVER_IP="20.24.58.49"
SERVER_DIR="/var/www/html/InsightEd-Mobile-PWA"
USER="root" # Change this if your SSH user is different

echo "------------------------------------------------"
echo "🚀 Starting Local-to-Remote Deployment..."
echo "------------------------------------------------"

echo "📤 1. Syncing local files to VM..."
# Syncs current directory to server, excluding node_modules, dist, and git history
rsync -avz --delete \
    --exclude 'node_modules/' \
    --exclude 'dist/' \
    --exclude '.git/' \
    --exclude '.env' \
    ./ $USER@$SERVER_IP:$SERVER_DIR/

echo "🏗️  2. Running remote build and restart..."
# SSH into the server to perform installation and service restart
ssh $USER@$SERVER_IP "cd $SERVER_DIR && npm install && npm run build && pm2 restart insighted-backend"

echo "✅ Local Deployment Complete!"
echo "------------------------------------------------"
