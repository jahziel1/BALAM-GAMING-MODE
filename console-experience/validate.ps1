# Frontend Code Quality Validation Script
# Run this before pushing to ensure code quality

Write-Host "🔍 Running Frontend code quality checks..." -ForegroundColor Cyan

# Check 1: Format
Write-Host "`n📝 Checking code formatting (Prettier)..." -ForegroundColor Yellow
npm run format:check
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Code formatting issues found. Run: npm run format" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Formatting OK" -ForegroundColor Green

# Check 2: ESLint
Write-Host "`n🔎 Running ESLint..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ESLint found issues. Run: npm run lint:fix" -ForegroundColor Red
    exit 1
}
Write-Host "✅ ESLint OK" -ForegroundColor Green

# Check 3: TypeScript
Write-Host "`n🔷 Type checking (TypeScript)..." -ForegroundColor Yellow
npm run type-check
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ TypeScript errors found" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Type check OK" -ForegroundColor Green

# Check 4: Tests
Write-Host "`n🧪 Running tests..." -ForegroundColor Yellow
npm run test run
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Tests OK" -ForegroundColor Green

Write-Host "`n✅ All quality checks passed!" -ForegroundColor Green
Write-Host "📦 Frontend is ready for commit/push" -ForegroundColor Cyan
