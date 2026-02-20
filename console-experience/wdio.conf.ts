import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Options } from '@wdio/types';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

let tauriDriver: ChildProcess | undefined;
let exit = false;

// Path to the Tauri application
// Use DEBUG build for E2E tests (has Tauri API enabled)
const application =
  process.env.TAURI_APP_PATH ||
  path.join(__dirname, 'src-tauri', 'target', 'debug', 'console-experience.exe');

export const config: Options.Testrunner = {
  //
  // ====================
  // Runner Configuration
  // ====================
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
      project: 'tsconfig.json',
    },
  },

  //
  // ====================
  // WebDriver Settings
  // ====================
  host: '127.0.0.1',
  port: 4444,
  path: '/',

  //
  // ==================
  // Specify Test Files
  // ==================
  specs: ['./e2e/specs/**/*.spec.ts', './e2e/visual/**/*.spec.ts'],
  exclude: [],

  //
  // ============
  // Capabilities
  // ============
  maxInstances: 1, // Solo 1 ventana Tauri a la vez
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application,
      },
    } as WebdriverIO.Capabilities,
  ],

  //
  // ===================
  // Test Configurations
  // ===================
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  //
  // Framework
  //
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },

  //
  // =====
  // Hooks
  // =====
  /**
   * Gets executed once before all workers get launched.
   * Builds the Tauri app with debug symbols and bundled frontend (no dev server needed)
   */
  onPrepare: function () {
    console.log('Building Tauri application for E2E testing...');
    console.log('Using flags: --debug --no-bundle');

    // Build the app with debug symbols but bundled frontend
    // This creates a standalone executable that doesn't need the dev server
    const buildResult = spawnSync(
      'npm',
      ['run', 'tauri', 'build', '--', '--debug', '--no-bundle'],
      {
        cwd: path.join(__dirname),
        stdio: 'inherit',
        shell: true,
      }
    );

    if (buildResult.error) {
      console.error('❌ Failed to build Tauri application:', buildResult.error);
      process.exit(1);
    }

    if (buildResult.status !== 0) {
      console.error('❌ Build failed with exit code:', buildResult.status);
      process.exit(1);
    }

    console.log('✅ Tauri application built successfully');
    console.log('Application path:', application);
  },

  /**
   * Gets executed before a worker process is spawned and can be used to initialize specific service
   * for that worker as well as modify runtime environments in an async fashion.
   */
  beforeSession: function () {
    console.log('Starting tauri-driver...');

    // Path to tauri-driver executable
    const tauriDriverPath = path.resolve(
      os.homedir(),
      '.cargo',
      'bin',
      process.platform === 'win32' ? 'tauri-driver.exe' : 'tauri-driver'
    );

    console.log('tauri-driver path:', tauriDriverPath);

    // Path to msedgedriver
    const msedgedriverPath = path.join(__dirname, 'node_modules', '.bin', 'msedgedriver.exe');
    console.log('msedgedriver path:', msedgedriverPath);

    try {
      tauriDriver = spawn(tauriDriverPath, ['--native-driver', msedgedriverPath], {
        stdio: ['ignore', 'pipe', 'pipe'], // Suppress terminal popups
        windowsHide: true, // Hide console windows on Windows
      });

      tauriDriver.on('error', (error) => {
        console.error('❌ tauri-driver error:', error);
        console.error('\nMake sure tauri-driver is installed. Run: cargo install tauri-driver');
        process.exit(1);
      });

      tauriDriver.on('exit', (code) => {
        if (!exit) {
          console.error('❌ tauri-driver exited with code:', code);
          process.exit(1);
        }
      });

      // Give driver time to start
      return new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Failed to start tauri-driver:', error);
      throw error;
    }
  },

  /**
   * Gets executed after all workers have shut down and the process is about to exit.
   */
  afterSession: function () {
    closeTauriDriver();
  },

  //
  // Test reporters
  //
  reporters: ['spec'],

  //
  // Services
  //
  services: [
    [
      'visual',
      {
        baselineFolder: './tests/visual/baseline',
        formatImageName: '{tag}-{logName}-{width}x{height}',
        screenshotPath: './tests/visual/screenshots',
        diffFolder: './tests/visual/diff',
        savePerInstance: true,
        autoSaveBaseline: true,
        blockOutStatusBar: true,
        blockOutToolBar: true,
        viewportChangePause: 300,
        viewports: [{ width: 1920, height: 1080 }],
        orientations: ['landscape'],
        compare: {
          // Allow 0.5% difference for anti-aliasing tolerance
          misMatchPercentage: 0.5,
          // Don't fail on size difference (responsive)
          ignoreDimensions: false,
          // Ignore anti-aliasing differences
          ignoreAntialiasing: true,
          // Ignore colors (focus on structure)
          ignoreColors: false,
        },
      },
    ],
  ],
};

function closeTauriDriver(): void {
  exit = true;
  if (tauriDriver) {
    console.log('Stopping tauri-driver...');
    tauriDriver.kill();
  }
}

function onShutdown(fn: () => void): void {
  const cleanup = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGHUP', cleanup);
  process.on('SIGBREAK', cleanup);
}

onShutdown(() => {
  closeTauriDriver();
});
