#!/bin/bash

# Deployment Script for STRIDE-PROD-VM-01

echo "------------------------------------------------"
echo "🚀 Starting Deployment..."
echo "------------------------------------------------"

echo "📥 1. Pulling latest code from GitHub..."
git pull origin main

echo "📦 2. Installing dependencies (Backend & Frontend)..."
npm install

echo "🏗️  3. Building frontend PWA..."
npm run build

echo "🔄 4. Restarting Backend Service..."
# Using the name instead of ID since the ID might change
pm2 restart insighted-backend --update-env

echo "✅ Deployment Complete!"
echo "------------------------------------------------"
