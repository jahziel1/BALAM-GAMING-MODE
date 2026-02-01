# Rust Code Quality Validation Script
# Run this before pushing to ensure code quality

Write-Host "🔍 Running Rust code quality checks..." -ForegroundColor Cyan

# Check 1: Format
Write-Host "`n📝 Checking code formatting..." -ForegroundColor Yellow
$formatResult = cargo fmt -- --check
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Code formatting issues found. Run: cargo fmt" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Formatting OK" -ForegroundColor Green

# Check 2: Clippy (critical warnings only)
Write-Host "`n🔎 Running Clippy linter..." -ForegroundColor Yellow
cargo clippy -- `
    -W clippy::unwrap_used `
    -W clippy::expect_used `
    -W clippy::panic `
    -W clippy::todo `
    -A clippy::too_many_lines `
    -A clippy::must_use_candidate `
    -A clippy::unused_self `
    -A dead_code

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Clippy found issues" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Clippy OK" -ForegroundColor Green

# Check 3: Build
Write-Host "`n🔨 Building project..." -ForegroundColor Yellow
cargo check
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build OK" -ForegroundColor Green

# Check 4: Tests
Write-Host "`n🧪 Running tests..." -ForegroundColor Yellow
cargo test --lib
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Tests OK" -ForegroundColor Green

Write-Host "`n✅ All quality checks passed!" -ForegroundColor Green
Write-Host "📦 Project is ready for commit/push" -ForegroundColor Cyan
