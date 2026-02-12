#!/usr/bin/env node
/**
 * CSS Token Migration Script
 *
 * Automatically replaces hardcoded color/spacing values with design tokens.
 * Targets: 442 hardcoded colors → var(--token)
 *
 * Usage:
 *   node scripts/migrate-to-tokens.js [--dry-run] [--file=path/to/file.css]
 *
 * Examples:
 *   node scripts/migrate-to-tokens.js --dry-run
 *   node scripts/migrate-to-tokens.js --file=src/components/ui/Card.css
 *   node scripts/migrate-to-tokens.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Color mappings: hardcoded value → token
const COLOR_MAPPINGS = {
  // Primary blue system
  '#2d73ff': 'var(--color-primary)',
  '#4a90ff': 'var(--color-primary-light)',
  '#1a5fe5': 'var(--color-primary-dark)',
  'rgb(45, 115, 255)': 'var(--color-primary)',
  'rgba(45, 115, 255, 0.12)': 'var(--focus-bg)',
  'rgba(45, 115, 255, 0.4)': 'rgba(var(--color-primary-rgb), 0.4)',
  'rgba(45, 115, 255, 0.3)': 'rgba(var(--color-primary-rgb), 0.3)',

  // Accent colors (hardcoded cyan → should be primary or accent)
  '#00d9ff': 'var(--color-primary)', // ServiceStatusCard uses this
  '#5eead4': 'var(--color-info)',
  '#14b8a6': 'var(--color-info)',

  // Background elevations
  'rgba(255, 255, 255, 0.05)': 'var(--color-background-elevated-1)',
  'rgba(255, 255, 255, 0.08)': 'var(--color-background-elevated-2)',
  'rgba(255, 255, 255, 0.15)': 'var(--color-background-elevated-3)',
  'rgba(255, 255, 255, 0.1)': 'rgba(255, 255, 255, 0.1)', // Keep for borders
  '#0f0f0f': 'var(--color-background-base)',
  '#1b2838': 'var(--color-background-base)',
  '#16202d': 'var(--color-background-elevated-1)',

  // Text colors
  '#ffffff': 'var(--color-text-primary)',
  'rgba(255, 255, 255, 0.98)': 'var(--color-text-primary)',
  'rgba(255, 255, 255, 0.9)': 'var(--color-text-primary)',
  'rgba(255, 255, 255, 0.8)': 'var(--color-text-secondary)',
  'rgba(255, 255, 255, 0.7)': 'var(--color-text-secondary)',
  'rgba(255, 255, 255, 0.6)': 'var(--color-text-tertiary)',
  'rgba(255, 255, 255, 0.5)': 'var(--color-text-tertiary)',
  'rgba(255, 255, 255, 0.3)': 'var(--color-text-muted)',
  '#b8bcbf': 'var(--color-text-secondary)',

  // State colors
  '#4ade80': 'var(--color-success)',
  '#22c55e': 'var(--color-success)',
  '#28a745': 'var(--color-success)',
  'rgb(74, 222, 128)': 'var(--color-success)',

  '#fbbf24': 'var(--color-warning)',
  '#ffc107': 'var(--color-warning)',
  'rgb(251, 191, 36)': 'var(--color-warning)',

  '#ef4444': 'var(--color-error)',
  '#dc3545': 'var(--color-error)',
  '#dc2626': 'var(--color-error)',
  'rgb(239, 68, 68)': 'var(--color-error)',

  // Black
  '#000000': '#000000', // Keep pure black for overlays
  'rgb(0, 0, 0)': 'rgb(0, 0, 0)',
};

// Spacing mappings: hardcoded px → token
const SPACING_MAPPINGS = {
  '4px': 'var(--space-1)',
  '8px': 'var(--space-2)',
  '12px': 'var(--space-3)',
  '16px': 'var(--space-4)',
  '20px': 'var(--space-5)',
  '24px': 'var(--space-6)',
  '32px': 'var(--space-8)',
  '40px': 'var(--space-10)',
  '48px': 'var(--space-12)',
};

// Border radius mappings
const RADIUS_MAPPINGS = {
  '4px': 'var(--radius-sm)',
  '8px': 'var(--radius-md)',
  '12px': 'var(--radius-lg)',
  '16px': 'var(--radius-xl)',
};

/**
 * Migrate a single CSS file
 */
function migrateCSSFile(filePath, dryRun = false) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  const changes = [];

  // Replace colors
  for (const [hardcoded, token] of Object.entries(COLOR_MAPPINGS)) {
    const regex = new RegExp(hardcoded.replace(/[()]/g, '\\$&'), 'gi');
    if (regex.test(content)) {
      content = content.replace(regex, token);
      changed = true;
      changes.push(`  ${hardcoded} → ${token}`);
    }
  }

  // Replace spacing (only in specific properties to avoid false positives)
  const spacingProperties = ['padding', 'margin', 'gap', 'width', 'height', 'top', 'left', 'right', 'bottom'];
  for (const [hardcoded, token] of Object.entries(SPACING_MAPPINGS)) {
    const escapedValue = hardcoded.replace(/[()]/g, '\\$&');
    for (const prop of spacingProperties) {
      const regex = new RegExp(`(${prop}[^:]*:\\s*[^;]*?)${escapedValue}`, 'gi');
      if (regex.test(content)) {
        content = content.replace(regex, `$1${token}`);
        changed = true;
        changes.push(`  ${prop}: ${hardcoded} → ${token}`);
      }
    }
  }

  // Replace border-radius
  for (const [hardcoded, token] of Object.entries(RADIUS_MAPPINGS)) {
    const regex = new RegExp(`border-radius:\\s*${hardcoded}`, 'gi');
    if (regex.test(content)) {
      content = content.replace(regex, `border-radius: ${token}`);
      changed = true;
      changes.push(`  border-radius: ${hardcoded} → ${token}`);
    }
  }

  if (changed) {
    const fileName = path.basename(filePath);
    console.log(`\n✓ ${fileName}:`);
    changes.forEach(change => console.log(change));

    if (!dryRun) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }

  return changed;
}

/**
 * Get all CSS files to migrate
 */
function getCSSFiles(specificFile = null) {
  if (specificFile) {
    return [specificFile];
  }

  // Exclude tokens.css, component-tokens.css, and node_modules
  const files = glob.sync('src/**/*.css', {
    ignore: [
      '**/node_modules/**',
      'src/styles/tokens.css',
      'src/styles/component-tokens.css',
      'src/styles/reset.css',
      'src/styles/utilities.css',
    ]
  });

  return files;
}

/**
 * Main migration function
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileArg = args.find(arg => arg.startsWith('--file='));
  const specificFile = fileArg ? fileArg.split('=')[1] : null;

  console.log('🔄 CSS Token Migration Script');
  console.log('================================\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  if (specificFile) {
    console.log(`📄 Target: ${specificFile}\n`);
  } else {
    console.log('📁 Scanning all CSS files (excluding tokens/reset/utilities)...\n');
  }

  const files = getCSSFiles(specificFile);
  let totalChanged = 0;

  files.forEach(file => {
    if (migrateCSSFile(file, dryRun)) {
      totalChanged++;
    }
  });

  console.log('\n================================');
  console.log(`\n📊 Summary:`);
  console.log(`  Total files scanned: ${files.length}`);
  console.log(`  Files modified: ${totalChanged}`);

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  } else {
    console.log('\n✅ Migration complete!');
    console.log('\n📝 Next steps:');
    console.log('  1. Review changes: git diff');
    console.log('  2. Test the app visually');
    console.log('  3. Run: npm run dev');
    console.log('  4. Commit: git add . && git commit -m "refactor: migrate to design tokens"');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { migrateCSSFile, COLOR_MAPPINGS, SPACING_MAPPINGS };
