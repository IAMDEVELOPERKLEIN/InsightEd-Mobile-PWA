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

echo "📤 1. Syncing local files to VM..."
rsync -avz --delete \
    --exclude 'node_modules/' \
    --exclude 'dist/' \
    --exclude '.git/' \
    --exclude '.env' \
    ./ $USER@$SERVER_IP:$SERVER_DIR/

echo "🏗️  2. Running remote build and restart..."
ssh $USER@$SERVER_IP "cd $SERVER_DIR && npm install && npm run build && pm2 restart insighted-backend"

echo "✅ Local Deployment Complete!"
echo "------------------------------------------------"
