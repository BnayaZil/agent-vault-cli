#!/usr/bin/env node
/**
 * Verification script to check demo setup
 */

import { existsSync } from 'fs';
import { execSync } from 'child_process';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(condition: boolean, label: string): boolean {
  if (condition) {
    log(`✅ ${label}`, 'green');
    return true;
  } else {
    log(`❌ ${label}`, 'red');
    return false;
  }
}

console.clear();
log('🔍 Agent Vault CLI Demo Setup Verification\n', 'blue');

let allGood = true;

// Check files exist
log('📁 Checking files...', 'yellow');
allGood = check(existsSync('demo/README.md'), 'demo/README.md exists') && allGood;
allGood = check(existsSync('demo/QUICKSTART.md'), 'demo/QUICKSTART.md exists') && allGood;
allGood = check(existsSync('demo/GUIDE.md'), 'demo/GUIDE.md exists') && allGood;
allGood = check(existsSync('demo/interactive-demo.ts'), 'demo/interactive-demo.ts exists') && allGood;
allGood = check(existsSync('demo/automated-demo.ts'), 'demo/automated-demo.ts exists') && allGood;
allGood = check(existsSync('demo/remotion/package.json'), 'demo/remotion/package.json exists') && allGood;
allGood = check(existsSync('demo/remotion/src/Video.tsx'), 'demo/remotion/src/Video.tsx exists') && allGood;
allGood = check(existsSync('demo/recordings'), 'demo/recordings/ directory exists') && allGood;
console.log('');

// Check scripts are executable
log('🔧 Checking scripts...', 'yellow');
try {
  const pkg = JSON.parse(execSync('cat package.json', { encoding: 'utf-8' }));
  allGood = check(!!pkg.scripts['demo:interactive'], 'demo:interactive script defined') && allGood;
  allGood = check(!!pkg.scripts['demo:auto'], 'demo:auto script defined') && allGood;
  allGood = check(!!pkg.scripts['demo:manual'], 'demo:manual script defined') && allGood;
  allGood = check(!!pkg.scripts['demo:video'], 'demo:video script defined') && allGood;
  allGood = check(!!pkg.scripts['demo:preview'], 'demo:preview script defined') && allGood;
} catch {
  log('❌ Could not read package.json', 'red');
  allGood = false;
}
console.log('');

// Check dependencies
log('📦 Checking dependencies...', 'yellow');
try {
  const pkg = JSON.parse(execSync('cat package.json', { encoding: 'utf-8' }));
  allGood = check(!!pkg.devDependencies?.tsx, 'tsx dependency installed') && allGood;
} catch {
  log('❌ Could not check dependencies', 'red');
  allGood = false;
}
console.log('');

// Check Node version
log('🔢 Checking system...', 'yellow');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  allGood = check(majorVersion >= 18, `Node.js version ${nodeVersion} (>= 18 required)`) && allGood;
} catch {
  log('❌ Could not check Node version', 'red');
  allGood = false;
}

try {
  execSync('which npx', { stdio: 'ignore' });
  allGood = check(true, 'npx is available') && allGood;
} catch {
  log('❌ npx not found', 'red');
  allGood = false;
}
console.log('');

// Check CLI is built
log('🏗️  Checking build...', 'yellow');
allGood = check(existsSync('dist/index.js'), 'CLI is built (dist/index.js exists)') && allGood;
if (!existsSync('dist/index.js')) {
  log('   Run: npm run build', 'yellow');
}
console.log('');

// Summary
log('═══════════════════════════════════════════════', 'blue');
if (allGood) {
  log('✅ All checks passed! Ready to create demos.', 'green');
  console.log('');
  log('Next steps:', 'yellow');
  log('  1. Read: cat demo/QUICKSTART.md', 'reset');
  log('  2. Run:  npm run demo:interactive', 'reset');
  log('  3. Record your screen and follow prompts', 'reset');
} else {
  log('❌ Some checks failed. Please fix the issues above.', 'red');
  console.log('');
  log('Common fixes:', 'yellow');
  log('  • Run: npm install', 'reset');
  log('  • Run: npm run build', 'reset');
  log('  • Check Node.js version: node --version', 'reset');
}
log('═══════════════════════════════════════════════', 'blue');
console.log('');

process.exit(allGood ? 0 : 1);
