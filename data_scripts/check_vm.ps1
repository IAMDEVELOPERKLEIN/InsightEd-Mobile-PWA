# VM Check Wrapper Tool
# Usage: ./data_scripts/check_vm.ps1

Write-Host "`n🚀 STRIDE INFRASTRUCTURE: VM DIAGNOSTIC SYSTEM OVERRIDE" -ForegroundColor Cyan
Write-Host "Connecting to remote production server..." -ForegroundColor Yellow

# Execute the Node.js diagnostics script
node "$PSScriptRoot/vm_status.cjs"

Write-Host "`n✅ Diagnostic Session Ready For Analysis" -ForegroundColor Green
