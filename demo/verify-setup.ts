#!/usr/bin/env npx tsx

/**
 * Verify Demo Setup
 *
 * Checks that all prerequisites are met for running the demos.
 *
 * Run with: npm run demo:verify
 */

import { chromium } from 'playwright-chromium';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

async function runChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // Check 1: Node.js version
  try {
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
    results.push({
      name: 'Node.js version',
      passed: major >= 18,
      message: major >= 18 ? `${nodeVersion} (OK)` : `${nodeVersion} (requires >= 18)`,
    });
  } catch (e) {
    results.push({
      name: 'Node.js version',
      passed: false,
      message: `Error: ${e}`,
    });
  }

  // Check 2: CLI is built
  const distPath = resolve(process.cwd(), 'dist/index.js');
  results.push({
    name: 'CLI built',
    passed: existsSync(distPath),
    message: existsSync(distPath) ? 'dist/index.js exists' : 'Run "npm run build" first',
  });

  // Check 3: Playwright Chromium installed
  try {
    const chromiumPath = chromium.executablePath();
    const exists = existsSync(chromiumPath);
    results.push({
      name: 'Playwright Chromium',
      passed: exists,
      message: exists ? 'Installed' : 'Run "npx playwright install chromium"',
    });
  } catch (e) {
    results.push({
      name: 'Playwright Chromium',
      passed: false,
      message: 'Not installed. Run "npx playwright install chromium"',
    });
  }

  // Check 4: Keychain access (macOS only)
  if (process.platform === 'darwin') {
    try {
      // Just check if keytar loads
      await import('keytar');
      results.push({
        name: 'Keychain access',
        passed: true,
        message: 'keytar module loaded',
      });
    } catch (e) {
      results.push({
        name: 'Keychain access',
        passed: false,
        message: 'keytar module failed to load',
      });
    }
  } else {
    results.push({
      name: 'Keychain access',
      passed: true,
      message: `Platform: ${process.platform} (skipped keychain check)`,
    });
  }

  // Check 5: Required npm packages (check in node_modules)
  const requiredPackages = ['playwright-chromium', 'commander', 'inquirer'];
  for (const pkg of requiredPackages) {
    const pkgPath = resolve(process.cwd(), 'node_modules', pkg);
    const installed = existsSync(pkgPath);
    results.push({
      name: `Package: ${pkg}`,
      passed: installed,
      message: installed ? 'Installed' : 'Not installed. Run "npm install"',
    });
  }

  // Check 6: Ports available
  const portsToCheck = [9400, 9401, 9402, 9600, 9601, 9602];
  for (const port of portsToCheck) {
    try {
      const result = execSync(`lsof -i :${port} 2>/dev/null || true`, {
        encoding: 'utf-8',
      });
      const inUse = result.trim().length > 0;
      results.push({
        name: `Port ${port}`,
        passed: !inUse,
        message: inUse ? 'In use (may conflict with demo)' : 'Available',
      });
    } catch {
      results.push({
        name: `Port ${port}`,
        passed: true,
        message: 'Available (check skipped)',
      });
    }
  }

  return results;
}

async function main() {
  console.log('\n' + '═'.repeat(50));
  console.log('   🔍 Agent Vault CLI - Setup Verification');
  console.log('═'.repeat(50) + '\n');

  const results = await runChecks();

  let allPassed = true;

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}`);
    console.log(`   ${result.message}\n`);
    if (!result.passed) allPassed = false;
  }

  console.log('═'.repeat(50));

  if (allPassed) {
    console.log('   ✅ All checks passed! Ready to run demos.');
    console.log('═'.repeat(50));
    console.log('\nAvailable demo commands:');
    console.log('  npm run demo:auto        - Fully automated demo');
    console.log('  npm run demo:interactive - Step-by-step interactive demo');
    console.log('  npm run demo:manual      - Manual walkthrough with instructions\n');
  } else {
    console.log('   ❌ Some checks failed. Please fix the issues above.');
    console.log('═'.repeat(50) + '\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
