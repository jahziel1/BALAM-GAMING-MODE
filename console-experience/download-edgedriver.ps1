$ProgressPreference = 'SilentlyContinue'
$version = '144.0.3719.92'
$url = "https://msedgedriver.azureedge.net/$version/edgedriver_win64.zip"
$zipPath = "$env:TEMP\edgedriver.zip"
$extractPath = ".\node_modules\.bin"

Write-Host "Downloading Edge WebDriver v$version..."
try {
    Invoke-WebRequest -Uri $url -OutFile $zipPath -ErrorAction Stop
    Write-Host "Download complete. Extracting..."

    # Create directory if it doesn't exist
    if (-not (Test-Path $extractPath)) {
        New-Item -ItemType Directory -Path $extractPath -Force | Out-Null
    }

    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
    Write-Host "✅ Edge WebDriver installed successfully at: $extractPath\msedgedriver.exe"

    # Cleanup
    Remove-Item $zipPath -ErrorAction SilentlyContinue

} catch {
    Write-Host "❌ Error downloading/extracting: $_"
    exit 1
}
