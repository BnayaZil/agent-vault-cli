#!/usr/bin/env node
/**
 * Simple interactive demo script for Agent Vault CLI
 * This script helps you record a professional demo by guiding you through each step
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { spawn, ChildProcess, execSync } from 'child_process';
import { startTestServer, TestServer } from '../tests/fixtures/server.js';
import { deleteRP } from '../src/core/keychain.js';
import { resetRateLimit } from '../src/core/ratelimit.js';
import http from 'http';
import * as readline from 'readline';

const CLI_PATH = './dist/index.js';
const TEST_PORT = 9501;
const CDP_PORT = 9333;
const TEST_ORIGIN = `http://127.0.0.1:${TEST_PORT}`;

// Colors
const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<void> {
  return new Promise((resolve) => {
    rl.question(question, () => resolve());
  });
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function getCdpEndpoint(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.webSocketDebuggerUrl);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout getting CDP endpoint'));
    });
  });
}

async function waitForCdp(port: number, maxRetries = 30): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await getCdpEndpoint(port);
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`Could not connect to CDP on port ${port}`);
}

async function main() {
  console.clear();
  log('🎬 Agent Vault CLI - Interactive Demo', 'blue');
  log('═══════════════════════════════════════════════════════\n', 'blue');

  log('This script will guide you through recording a demo.', 'yellow');
  log('Tips for a great recording:', 'yellow');
  log('  • Start screen recording NOW (Cmd+Shift+5 on macOS)', 'yellow');
  log('  • Speak naturally as you go through each step', 'yellow');
  log('  • Take your time between steps', 'yellow');
  log('  • Keep both terminal and browser in frame\n', 'yellow');

  await ask('Press Enter when you\'re ready to begin...');

  let server: TestServer | null = null;
  let browserProcess: ChildProcess | null = null;
  let browser: Browser | null = null;
  let wsEndpoint: string = '';

  try {
    // Setup
    console.log('');
    log('🔧 Setting up demo environment...', 'blue');

    // Clean up any existing credentials
    await resetRateLimit();
    try {
      await deleteRP(TEST_ORIGIN);
    } catch {
      // Ignore
    }

    // Build CLI
    log('  Building CLI...', 'cyan');
    execSync('npm run build', { stdio: 'ignore' });
    log('  ✅ CLI built', 'green');

    // Start server
    log('  Starting test server...', 'cyan');
    server = await startTestServer(TEST_PORT);
    log(`  ✅ Server running on ${TEST_ORIGIN}`, 'green');

    // Launch browser
    log('  Launching Chromium...', 'cyan');
    const chromiumPath = chromium.executablePath();
    const browserArgs = [
      `--remote-debugging-port=${CDP_PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1280,800',
      '--window-position=100,100',
      TEST_ORIGIN,
    ];

    browserProcess = spawn(chromiumPath, browserArgs, {
      stdio: 'ignore',
      detached: false,
    });

    wsEndpoint = await waitForCdp(CDP_PORT);
    log('  ✅ Browser ready with CDP', 'green');

    browser = await chromium.connectOverCDP(wsEndpoint);
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    console.log('');
    log('✅ Setup complete!\n', 'green');

    // Step 1: Register
    log('═══════════════════════════════════════════════════════', 'blue');
    log('STEP 1: Register Credentials', 'magenta');
    log('═══════════════════════════════════════════════════════', 'blue');
    console.log('');
    log('💬 Suggested narration:', 'yellow');
    log('   "First, I\'ll register my credentials with Agent Vault."', 'yellow');
    log('   "Notice how I provide the selectors for the form fields."\n', 'yellow');

    console.log('Command to run:');
    console.log('');
    log(`vault register \\`, 'cyan');
    log(`  --cdp "${wsEndpoint}" \\`, 'cyan');
    log(`  --username-selector "#email" \\`, 'cyan');
    log(`  --password-selector "#password" \\`, 'cyan');
    log(`  --username "demo@agent-vault.dev" \\`, 'cyan');
    log(`  --password "SecurePass123!" \\`, 'cyan');
    log(`  --allow-http --force`, 'cyan');
    console.log('');

    await ask('Press Enter to run this command...');
    console.log('');

    execSync(
      `node ${CLI_PATH} register ` +
        `--cdp "${wsEndpoint}" ` +
        `--username-selector "#email" ` +
        `--password-selector "#password" ` +
        `--username "demo@agent-vault.dev" ` +
        `--password "SecurePass123!" ` +
        `--allow-http ` +
        `--force`,
      { stdio: 'inherit' }
    );

    console.log('');
    log('✅ Credentials registered!', 'green');
    log('💬 "The credentials are now stored securely in my OS keychain."', 'yellow');
    console.log('');

    await ask('Press Enter to continue...');

    // Step 2: Reload
    console.log('');
    log('═══════════════════════════════════════════════════════', 'blue');
    log('STEP 2: Reload Browser', 'magenta');
    log('═══════════════════════════════════════════════════════', 'blue');
    console.log('');
    log('💬 Suggested narration:', 'yellow');
    log('   "The form is now filled. Let me reload the page to clear it."', 'yellow');
    console.log('');
    log('Action: Manually reload the page in the browser (Cmd+R)', 'cyan');
    console.log('');

    await ask('Press Enter after you\'ve reloaded the page...');

    // Give time for manual reload
    await page.goto(TEST_ORIGIN);
    await new Promise((r) => setTimeout(r, 1000));

    // Step 3: Login
    console.log('');
    log('═══════════════════════════════════════════════════════', 'blue');
    log('STEP 3: Auto-fill Credentials', 'magenta');
    log('═══════════════════════════════════════════════════════', 'blue');
    console.log('');
    log('💬 Suggested narration:', 'yellow');
    log('   "Now I\'ll use the vault to auto-fill my credentials."', 'yellow');
    log('   "Watch as the form fills automatically and securely."\n', 'yellow');

    console.log('Command to run:');
    console.log('');
    log(`vault login --cdp "${wsEndpoint}"`, 'cyan');
    console.log('');

    await ask('Press Enter to run this command...');
    console.log('');

    await resetRateLimit();
    execSync(`node ${CLI_PATH} login --cdp "${wsEndpoint}"`, {
      stdio: 'inherit',
    });

    console.log('');
    log('✅ Credentials auto-filled from vault!', 'green');
    log('💬 "My credentials never touched the AI agent or LLM."', 'yellow');
    console.log('');

    await ask('Press Enter to finish...');

    // Finale
    console.log('');
    log('═══════════════════════════════════════════════════════', 'blue');
    log('🎉 Demo Complete!', 'green');
    log('═══════════════════════════════════════════════════════', 'blue');
    console.log('');
    log('💬 Final narration:', 'yellow');
    log('   "And that\'s Agent Vault - keeping your credentials secure"', 'yellow');
    log('   "while enabling AI agents to log in safely."\n', 'yellow');

    await ask('Press Enter to cleanup and exit...');

  } catch (error) {
    console.error('');
    log(`❌ Error: ${error}`, 'reset');
    throw error;
  } finally {
    // Cleanup
    console.log('');
    log('🧹 Cleaning up...', 'blue');

    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore
      }
    }

    if (browserProcess) {
      browserProcess.kill('SIGTERM');
    }

    if (server) {
      await server.close();
    }

    try {
      await deleteRP(TEST_ORIGIN);
      log('✅ Test credentials removed', 'green');
    } catch {
      // Ignore
    }

    rl.close();

    console.log('');
    log('✅ Cleanup complete!', 'green');
    console.log('');
    log('Next steps:', 'yellow');
    log('  1. Save your screen recording to: demo/recordings/demo.mov', 'cyan');
    log('  2. Run: npm run demo:video', 'cyan');
    log('  3. Find your video in: demo/out/video.mp4', 'cyan');
    console.log('');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
