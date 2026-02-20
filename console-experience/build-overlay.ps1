# Build Overlay DLL - Build script for overlay.dll
#
# Compiles overlay-dll project and copies to src-tauri for bundling.
# Run this before building Tauri app to ensure overlay.dll is included.
#
# Usage:
#   .\build-overlay.ps1           # Build release DLL
#   .\build-overlay.ps1 -Debug    # Build debug DLL

param(
    [switch]$Debug
)

Write-Host "Building Overlay DLL..." -ForegroundColor Cyan

# Determine build profile
$Profile = if ($Debug) { "debug" } else { "release" }
$ProfileFlag = if ($Debug) { "" } else { "--release" }

# Save current directory
$OriginalDir = Get-Location

# Change to overlay-dll directory
Set-Location "overlay-dll"

# Build overlay-dll
Write-Host "Building overlay-dll ($Profile)..." -ForegroundColor Yellow
cargo build $ProfileFlag

if ($LASTEXITCODE -ne 0) {
    Write-Error "Cargo build failed with exit code $LASTEXITCODE"
    Set-Location $OriginalDir
    exit $LASTEXITCODE
}

# Copy DLL to src-tauri
$SourceDll = "target\$Profile\overlay.dll"
$DestDll = "..\src-tauri\overlay.dll"

if (Test-Path $SourceDll) {
    Write-Host "Copying overlay.dll to src-tauri..." -ForegroundColor Green
    Copy-Item $SourceDll $DestDll -Force

    # Show DLL info
    $DllInfo = Get-Item $DestDll
    $SizeKB = [math]::Round($DllInfo.Length / 1KB, 2)
    Write-Host "Overlay DLL built successfully!" -ForegroundColor Green
    Write-Host "  Size: $SizeKB KB" -ForegroundColor Gray
    Write-Host "  Path: $DestDll" -ForegroundColor Gray
} else {
    Write-Error "DLL not found at $SourceDll"
    Set-Location $OriginalDir
    exit 1
}

# Return to original directory
Set-Location $OriginalDir

Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
