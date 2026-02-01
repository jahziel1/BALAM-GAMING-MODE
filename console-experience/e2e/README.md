# E2E Tests - Console Experience

End-to-End tests for the Console Experience application using WebdriverIO and Tauri Driver.

## 📋 Test Structure

```
e2e/
├── fixtures/           # Test data and mock files
├── helpers/            # Reusable test helpers
│   ├── tauri.ts       # Tauri-specific helpers
│   ├── navigation.ts  # Navigation helpers
│   └── gamepad.ts     # Gamepad simulation
├── screenshots/        # Visual regression screenshots
│   ├── baseline/      # Reference screenshots (committed)
│   ├── actual/        # Current test screenshots (ignored)
│   └── diff/          # Difference images (ignored)
├── reports/           # Test reports (ignored)
└── *.spec.ts          # Test specifications
```

## 🚀 Running Tests

### Run all E2E tests

```bash
npm run test:e2e
```

### Run with UI mode

```bash
npm run test:e2e:ui
```

### Run in debug mode

```bash
npm run test:e2e:debug
```

### Run specific test file

```bash
npx wdio run wdio.conf.ts --spec e2e/navigation.spec.ts
```

### Run all tests (unit + E2E)

```bash
npm run test:all
```

## 📊 Test Coverage

### Basic Tests (12 tests)

- **app-launch.spec.ts** (3 tests) - Application startup
- **navigation.spec.ts** (5 tests) - Keyboard navigation
- **game-library.spec.ts** (4 tests) - Game cards and library

### Advanced Tests (10 tests)

- **overlays.spec.ts** (6 tests) - Overlays and menus
- **quick-settings.spec.ts** (4 tests) - Quick settings panel

### Integration Tests (6 tests)

- **game-launch.spec.ts** (3 tests) - Game launching
- **error-handling.spec.ts** (3 tests) - Error scenarios

**Total: 28 E2E tests**

## 🔧 Configuration

Configuration is in `wdio.conf.ts` at the project root.

### Environment Variables

- `TAURI_APP_PATH`: Path to the Tauri executable (optional)

Example:

```bash
TAURI_APP_PATH=./src-tauri/target/release/console-experience.exe npm run test:e2e
```

## 📸 Visual Regression Testing

Visual regression is configured with `@wdio/visual-service`.

Baseline screenshots are stored in `screenshots/baseline/` and are committed to git.

To update baselines:

1. Delete old baselines: `rm -rf e2e/screenshots/baseline/*`
2. Run tests: `npm run test:e2e`
3. New baselines will be created automatically

## 🐛 Debugging

### View HTML Reports

After running tests, open:

```
e2e/reports/index.html
```

### Enable verbose logging

Edit `wdio.conf.ts`:

```typescript
logLevel: 'debug';
```

### Take manual screenshots

In any test:

```typescript
await browser.saveScreenshot('./debug-screenshot.png');
```

## ⚠️ Prerequisites

1. **Build the app first:**

   ```bash
   npm run tauri build
   ```

2. **Or use dev build:**
   ```bash
   TAURI_APP_PATH=./src-tauri/target/debug/console-experience.exe npm run test:e2e
   ```

## 📝 Writing New Tests

See existing tests for examples. Use the helpers:

```typescript
import { waitForTauri, invokeCommand } from './helpers/tauri';
import { simulateKeyPress, navigateToGame } from './helpers/navigation';

describe('My Feature', () => {
  before(async () => {
    await waitForTauri();
  });

  it('should do something', async () => {
    await simulateKeyPress('ArrowDown');
    // ... assertions
  });
});
```

## 🔗 Resources

- [WebdriverIO Docs](https://webdriver.io/docs/gettingstarted)
- [Tauri Testing Guide](https://v2.tauri.app/develop/tests/webdriver/)
- [Mocha Docs](https://mochajs.org/)
