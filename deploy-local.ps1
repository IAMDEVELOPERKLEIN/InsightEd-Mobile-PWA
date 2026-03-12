# Deployment Script (Local to Remote) - PowerShell Version
# This script pushes code directly from your Windows machine to the Azure VM.

$SERVER_IP = "20.24.58.49"
$SERVER_DIR = "/var/www/html/InsightEd-Mobile-PWA"
$USER = "Administrator1"
$PASS = "7v52E69TYgTE"

Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "🚀 Local-to-Remote Deployment" -ForegroundColor Cyan
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host "Host: $SERVER_IP"
Write-Host "User: $USER"
Write-Host "Pass: $PASS" -ForegroundColor Yellow
Write-Host "------------------------------------------------"

Write-Host "📤 1. Syncing local files to VM..." -ForegroundColor Yellow
rsync -avz --delete `
    --exclude 'node_modules/' `
    --exclude 'dist/' `
    --exclude '.git/' `
    --exclude '.env' `
    ./ "$($USER)@$($SERVER_IP):$($SERVER_DIR)/"

Write-Host "🏗️  2. Running remote build and restart..." -ForegroundColor Yellow
ssh "$($USER)@$($SERVER_IP)" "cd $($SERVER_DIR) && npm install && npm run build && pm2 restart insighted-backend"

Write-Host "✅ Local Deployment Complete!" -ForegroundColor Green
Write-Host "------------------------------------------------" -ForegroundColor Green
