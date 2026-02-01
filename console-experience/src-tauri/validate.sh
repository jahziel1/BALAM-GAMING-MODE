#!/bin/bash
# Rust Code Quality Validation Script (Linux/macOS)
# Run this before pushing to ensure code quality

set -e

echo "🔍 Running Rust code quality checks..."

# Check 1: Format
echo ""
echo "📝 Checking code formatting..."
if cargo fmt -- --check; then
    echo "✅ Formatting OK"
else
    echo "❌ Code formatting issues found. Run: cargo fmt"
    exit 1
fi

# Check 2: Clippy (critical warnings only)
echo ""
echo "🔎 Running Clippy linter..."
if cargo clippy -- \
    -W clippy::unwrap_used \
    -W clippy::expect_used \
    -W clippy::panic \
    -W clippy::todo \
    -A clippy::too_many_lines \
    -A clippy::must_use_candidate \
    -A clippy::unused_self \
    -A dead_code; then
    echo "✅ Clippy OK"
else
    echo "❌ Clippy found issues"
    exit 1
fi

# Check 3: Build
echo ""
echo "🔨 Building project..."
if cargo check; then
    echo "✅ Build OK"
else
    echo "❌ Build failed"
    exit 1
fi

# Check 4: Tests
echo ""
echo "🧪 Running tests..."
if cargo test --lib; then
    echo "✅ Tests OK"
else
    echo "❌ Tests failed"
    exit 1
fi

echo ""
echo "✅ All quality checks passed!"
echo "📦 Project is ready for commit/push"
