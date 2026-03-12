# Deployment Script (Local to Remote) - PowerShell Version
# This script pushes code directly from your Windows machine to the Azure VM.

$SERVER_IP = "20.24.58.49"
$SERVER_DIR = "/var/www/html/InsightEd-Mobile-PWA"
$USER = "root" # Change this if your SSH user is different

Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "🚀 Starting Local-to-Remote Deployment..." -ForegroundColor Cyan
Write-Host "------------------------------------------------" -ForegroundColor Cyan

Write-Host "📤 1. Syncing local files to VM..." -ForegroundColor Yellow
# Using rsync (requires Git Bash or WSL rsync to be in PATH)
# If you don't have rsync, you can use scp -r, but rsync is better for updates.
rsync -avz --delete `
    --exclude 'node_modules/' `
    --exclude 'dist/' `
    --exclude '.git/' `
    --exclude '.env' `
    ./ "$($USER)@$($SERVER_IP):$($SERVER_DIR)/"

Write-Host "🏗️  2. Running remote build and restart..." -ForegroundColor Yellow
# SSH into the server to perform installation and service restart
ssh "$($USER)@$($SERVER_IP)" "cd $($SERVER_DIR) && npm install && npm run build && pm2 restart insighted-backend"

Write-Host "✅ Local Deployment Complete!" -ForegroundColor Green
Write-Host "------------------------------------------------" -ForegroundColor Green
