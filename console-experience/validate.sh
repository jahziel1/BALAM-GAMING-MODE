#!/bin/bash
# Frontend Code Quality Validation Script (Linux/macOS)
# Run this before pushing to ensure code quality

set -e

echo "🔍 Running Frontend code quality checks..."

# Check 1: Format
echo ""
echo "📝 Checking code formatting (Prettier)..."
if npm run format:check; then
    echo "✅ Formatting OK"
else
    echo "❌ Code formatting issues found. Run: npm run format"
    exit 1
fi

# Check 2: ESLint
echo ""
echo "🔎 Running ESLint..."
if npm run lint; then
    echo "✅ ESLint OK"
else
    echo "❌ ESLint found issues. Run: npm run lint:fix"
    exit 1
fi

# Check 3: TypeScript
echo ""
echo "🔷 Type checking (TypeScript)..."
if npm run type-check; then
    echo "✅ Type check OK"
else
    echo "❌ TypeScript errors found"
    exit 1
fi

# Check 4: Tests
echo ""
echo "🧪 Running tests..."
if npm run test run; then
    echo "✅ Tests OK"
else
    echo "❌ Tests failed"
    exit 1
fi

echo ""
echo "✅ All quality checks passed!"
echo "📦 Frontend is ready for commit/push"
