# Balam FPS Service - Installation Script
# Run as Administrator

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Balam FPS Service - Installation" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create directory
Write-Host "[1/5] Creating service directory..." -ForegroundColor Yellow
$servicePath = "C:\Program Files\Balam"
if (-not (Test-Path $servicePath)) {
    New-Item -ItemType Directory -Path $servicePath -Force | Out-Null
    Write-Host "  Created: $servicePath" -ForegroundColor Green
} else {
    Write-Host "  Directory already exists" -ForegroundColor Green
}

# Step 2: Build service
Write-Host ""
Write-Host "[2/5] Building service..." -ForegroundColor Yellow
$buildOutput = cargo build --release 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Build failed!" -ForegroundColor Red
    Write-Host $buildOutput
    pause
    exit 1
}
Write-Host "  Build successful" -ForegroundColor Green

# Step 3: Copy binary
Write-Host ""
Write-Host "[3/5] Copying binary..." -ForegroundColor Yellow
$sourceBinary = "target\release\balam-fps-service.exe"
$destBinary = "$servicePath\balam-fps-service.exe"

if (Test-Path $sourceBinary) {
    Copy-Item -Path $sourceBinary -Destination $destBinary -Force
    Write-Host "  Copied to: $destBinary" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Binary not found at $sourceBinary" -ForegroundColor Red
    pause
    exit 1
}

# Step 4: Install service
Write-Host ""
Write-Host "[4/5] Installing Windows Service..." -ForegroundColor Yellow

# Check if service exists
$serviceExists = Get-Service -Name "BalamFpsService" -ErrorAction SilentlyContinue

if ($serviceExists) {
    Write-Host "  Service already exists, stopping and removing..." -ForegroundColor Yellow
    Stop-Service -Name "BalamFpsService" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    sc.exe delete BalamFpsService | Out-Null
    Start-Sleep -Seconds 1
}

# Create service
$createResult = sc.exe create BalamFpsService binPath= "$destBinary" start= auto DisplayName= "Balam FPS Service"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Failed to create service!" -ForegroundColor Red
    Write-Host $createResult
    pause
    exit 1
}
Write-Host "  Service created successfully" -ForegroundColor Green

# Set description
sc.exe description BalamFpsService "ETW-based FPS monitoring for Balam Console Experience" | Out-Null

# Step 5: Start service
Write-Host ""
Write-Host "[5/5] Starting service..." -ForegroundColor Yellow
$startResult = sc.exe start BalamFpsService
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Failed to start service!" -ForegroundColor Red
    Write-Host $startResult
    Write-Host ""
    Write-Host "  Check Windows Event Viewer for details" -ForegroundColor Yellow
    pause
    exit 1
}

Start-Sleep -Seconds 2

# Verify service is running
$service = Get-Service -Name "BalamFpsService" -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
    Write-Host "  Service is RUNNING" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Service may not be running properly" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service Status:" -ForegroundColor White
sc.exe query BalamFpsService
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Launch your Balam app (npm run tauri dev)" -ForegroundColor White
Write-Host "2. Launch a DirectX game (Elden Ring, etc.)" -ForegroundColor White
Write-Host "3. Check the PiP overlay for ACCURATE FPS" -ForegroundColor White
Write-Host ""
Write-Host "What's New in This Version:" -ForegroundColor Cyan
Write-Host "- Filters out DWM (Desktop Window Manager)" -ForegroundColor White
Write-Host "- Ignores system processes (explorer.exe, etc.)" -ForegroundColor White
Write-Host "- Only shows game FPS (10-240 FPS range)" -ForegroundColor White
Write-Host "- More accurate FPS matching monitor refresh" -ForegroundColor White
Write-Host ""
pause
