#!/bin/bash

# Simplified Deployment Script for STRIDE-PROD-VM-01

echo "📥 Pulling latest code..."
git pull origin main

echo "🏗️  Building frontend..."
npm run build

echo "🔄 Restarting InsightEd Backend (ID: 3)..."
pm2 restart 3

echo "✅ Done!"
