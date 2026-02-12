# Balam Console Experience - Test Suite

## Overview

Comprehensive testing strategy with unit tests, E2E tests, and visual regression testing.

## Test Structure

```
tests/
├── e2e/                      # End-to-end tests
│   ├── components.visual.spec.ts  # Component visual regression
│   └── overlays.visual.spec.ts    # Overlay panel visual regression
├── visual/
│   ├── baseline/             # Baseline screenshots (git tracked)
│   ├── screenshots/          # Current test screenshots
│   └── diff/                 # Diff images (test failures)
└── README.md                 # This file
```

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- src/components/core/Button/Button.test.tsx
```

### E2E Tests (WebdriverIO + Tauri)

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug
```

### Visual Regression Tests

```bash
# Run visual regression tests
npm run test:visual

# First run will create baseline screenshots
# Subsequent runs will compare against baseline
```

## Visual Regression Testing

### First-Time Setup

1. **Install tauri-driver**:

   ```bash
   cargo install tauri-driver
   ```

2. **Create baseline screenshots**:

   ```bash
   npm run test:visual
   ```

3. **Commit baselines to git**:
   ```bash
   git add tests/visual/baseline/
   git commit -m "test: add visual regression baselines"
   ```

### Updating Baselines

When design changes are intentional and you want to update baselines:

1. **Delete old baselines**:

   ```bash
   rm -rf tests/visual/baseline/*
   ```

2. **Re-run tests to generate new baselines**:

   ```bash
   npm run test:visual
   ```

3. **Review and commit**:
   ```bash
   git add tests/visual/baseline/
   git commit -m "test: update visual regression baselines for [reason]"
   ```

### Debugging Visual Failures

When tests fail due to visual differences:

1. **Check diff images**:
   - Located in `tests/visual/diff/`
   - Red areas = pixels that changed

2. **Compare images**:
   - Baseline: `tests/visual/baseline/`
   - Current: `tests/visual/screenshots/`
   - Diff: `tests/visual/diff/`

3. **Common causes**:
   - Anti-aliasing differences (tolerance: 0.5%)
   - Font rendering variations
   - Animation timing issues
   - Browser/OS rendering differences

## Test Coverage Targets

- **Unit Tests**: ≥80% coverage for core/ components
- **E2E Tests**: All critical user flows
- **Visual Regression**: All component states, all overlays

## Pre-commit Hooks

The following tests run automatically before commits:

```bash
✓ TypeScript type checking
✓ ESLint (errors only)
✓ Prettier formatting
✓ Clippy (Rust)
✓ Rustfmt (Rust)
✓ Unit tests (fast tests only)
```

E2E and visual tests run manually or in CI due to longer execution time.

## CI/CD Integration (Future)

```yaml
# Example GitHub Actions workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: dtolnay/rust-toolchain@stable
      - run: npm install
      - run: npm run test:coverage
      - run: npm run test:visual
      - uses: codecov/codecov-action@v3
```

## Troubleshooting

### tauri-driver not found

```bash
cargo install tauri-driver
# Add to PATH: C:\Users\<username>\.cargo\bin
```

### Visual tests failing locally

- Ensure consistent display scaling (100%)
- Use same resolution as CI (1920×1080)
- Disable dark mode/theme variations

### E2E tests hang

- Check if Tauri app built correctly (`npm run tauri build -- --debug --no-bundle`)
- Verify msedgedriver installed (`npm list @crabnebula/tauri-driver`)
- Check Windows firewall settings

### Port 4444 already in use

```bash
# Kill existing tauri-driver
taskkill /F /IM tauri-driver.exe

# Or change port in wdio.conf.ts
port: 4445
```

## Test Scenarios

### Component Tests

- **Button**: 4 variants × 5 states (normal, hover, focus, active, disabled)
- **Badge**: 6 variants
- **SectionHeader**: 3 levels × 3 variants
- **StatusIndicator**: 5 states × 2 modes (pulse on/off)

### Overlay Tests

- **InGameMenu**: Open/close, blur effect
- **SettingsPanel**: All 7 tabs, navigation
- **QuickSettings**: Sliders, toggles, service cards
- **PerformancePip**: 5 detail levels (0-4)
- **PowerModal**: Power options, confirmation dialogs

### Gamepad Tests (Manual)

- **Controllers**: Xbox, PlayStation, Switch, Generic
- **Navigation**: D-Pad, analog stick, button mappings
- **Focus States**: Visual feedback, translateX animation
- **10-Foot UI**: Readability from couch distance

## Performance Benchmarks

Target metrics:

- Bundle size: ≤2.0MB (ideally ≤1.7MB)
- Lighthouse Performance: ≥90
- Lighthouse Accessibility: ≥95
- FPS (Steam Deck): 60fps constant
- Input latency: <50ms button press to UI response
