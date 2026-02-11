# Quick update script - stops service first, then updates
Write-Host "Updating Balam FPS Service..." -ForegroundColor Cyan

Write-Host "[1/4] Stopping service..."
sc.exe stop BalamFpsService | Out-Null
Start-Sleep -Seconds 3

Write-Host "[2/4] Copying new binary..."
Copy-Item -Path "target\release\balam-fps-service.exe" -Destination "C:\Program Files\Balam\balam-fps-service.exe" -Force

Write-Host "[3/4] Starting service..."
sc.exe start BalamFpsService | Out-Null
Start-Sleep -Seconds 2

Write-Host "[4/4] Verifying..."
sc.exe query BalamFpsService

Write-Host ""
Write-Host "Done! Service updated with process filtering." -ForegroundColor Green
Write-Host ""
pause
