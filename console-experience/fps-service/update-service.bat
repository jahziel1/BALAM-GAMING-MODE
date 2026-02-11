@echo off
echo ================================================
echo   Balam FPS Service - Update Script
echo ================================================
echo.

echo [1/4] Stopping service...
sc stop BalamFpsService
if errorlevel 1 (
    echo ERROR: Failed to stop service. Make sure you run this as Administrator!
    pause
    exit /b 1
)

timeout /t 3 /nobreak >nul

echo.
echo [2/4] Building new version...
cd %~dp0
cargo build --release
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

echo.
echo [3/4] Copying new binary...
copy /Y "target\release\balam-fps-service.exe" "C:\Program Files\Balam\balam-fps-service.exe"
if errorlevel 1 (
    echo ERROR: Failed to copy binary!
    pause
    exit /b 1
)

echo.
echo [4/4] Starting service...
sc start BalamFpsService
if errorlevel 1 (
    echo ERROR: Failed to start service!
    pause
    exit /b 1
)

echo.
echo ================================================
echo   SUCCESS! Service updated with REAL FPS tracking
echo ================================================
echo.
echo Next steps:
echo 1. Launch a DirectX game (e.g., Elden Ring, any DX game)
echo 2. Check the overlay - should show REAL FPS now
echo.
pause
