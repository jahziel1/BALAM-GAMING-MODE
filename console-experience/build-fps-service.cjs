#!/usr/bin/env node
/**
 * Build script for FPS service
 * Compiles the balam-fps-service.exe before bundling with Tauri
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔨 Building FPS service...');

const fpsServiceDir = path.join(__dirname, 'fps-service');
const targetDir = path.join(fpsServiceDir, 'target', 'release');
const binaryPath = path.join(targetDir, 'balam-fps-service.exe');

// Check if fps-service directory exists
if (!fs.existsSync(fpsServiceDir)) {
    console.error('❌ fps-service directory not found');
    process.exit(1);
}

try {
    // Build in release mode
    console.log('   Compiling Rust service (release mode)...');
    execSync('cargo build --release', {
        cwd: fpsServiceDir,
        stdio: 'inherit'
    });

    // Verify binary was created
    if (!fs.existsSync(binaryPath)) {
        throw new Error('Binary not found after build');
    }

    const stats = fs.statSync(binaryPath);
    const sizeKB = (stats.size / 1024).toFixed(0);

    console.log(`✅ FPS service built successfully (${sizeKB} KB)`);
    console.log(`   Binary: ${binaryPath}`);
} catch (error) {
    console.error('❌ Failed to build FPS service:', error.message);
    process.exit(1);
}
