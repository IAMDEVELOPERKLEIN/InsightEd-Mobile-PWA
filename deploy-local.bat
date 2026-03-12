@echo off
setlocal

:: Deployment Script (Local to Remote) - Batch Version
:: This script pushes code directly from your Windows CMD to the Azure VM.

set SERVER_IP=20.24.58.49
set SERVER_DIR=/var/www/html/InsightEd-Mobile-PWA
set SSH_USER=Administrator1
set SSH_PASS=7v52E69TYgTE

echo ------------------------------------------------
echo 🚀 Local-to-Remote Deployment
echo ------------------------------------------------
echo Host: %SERVER_IP%
echo User: %SSH_USER%
echo Pass: %SSH_PASS%
echo (Please copy the password if prompted for SSH)
echo ------------------------------------------------

echo 1. Syncing local files to VM...
:: Using rsync (requires Git Bash or a similar tool in PATH)
rsync -avz --delete ^
    --exclude "node_modules/" ^
    --exclude "dist/" ^
    --exclude ".git/" ^
    --exclude ".env" ^
    ./ %SSH_USER%@%SERVER_IP%:%SERVER_DIR%/

echo 2. Running remote build and restart...
:: SSH into the server to perform installation and service restart
ssh %SSH_USER%@%SERVER_IP% "cd %SERVER_DIR% && npm install && npm run build && pm2 restart insighted-backend"

echo.
echo ✅ Deployment Complete!
echo ------------------------------------------------
pause
