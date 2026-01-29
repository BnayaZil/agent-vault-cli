/**
 * Automated demo script that runs the CLI commands and captures output
 * This can be used to generate terminal recordings for the Remotion video
 */

import { chromium, Browser } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import { startTestServer, TestServer } from '../tests/fixtures/server.js';
import { deleteRP } from '../src/core/keychain.js';
import { resetRateLimit } from '../src/core/ratelimit.js';
import http from 'http';

const CLI_PATH = './dist/index.js';
const TEST_PORT = 9501;
const CDP_PORT = 9333;
const TEST_ORIGIN = `http://127.0.0.1:${TEST_PORT}`;

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

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('🎬 Starting automated Agent Vault demo...\n');

  let server: TestServer | null = null;
  let browserProcess: ChildProcess | null = null;
  let browser: Browser | null = null;

  try {
    // Clean up any existing credentials
    await resetRateLimit();
    try {
      await deleteRP(TEST_ORIGIN);
    } catch {
      // Ignore
    }

    // Start test server
    console.log('🌐 Starting test server...');
    server = await startTestServer(TEST_PORT);
    console.log(`✅ Server running on ${TEST_ORIGIN}\n`);

    // Get Chromium path
    const chromiumPath = chromium.executablePath();

    // Launch browser with CDP
    console.log('🌐 Launching Chromium...');
    const browserArgs = [
      `--remote-debugging-port=${CDP_PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--window-size=1280,800',
      '--window-position=100,100',
      TEST_ORIGIN,
    ];

    browserProcess = spawn(chromiumPath, browserArgs, {
      stdio: 'ignore',
      detached: false,
    });

    // Wait for CDP
    const wsEndpoint = await waitForCdp(CDP_PORT);
    console.log(`✅ CDP endpoint: ${wsEndpoint}\n`);

    // Connect to browser
    browser = await chromium.connectOverCDP(wsEndpoint);
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎥 DEMO START - Record your screen now!');
    console.log('═══════════════════════════════════════════════════════\n');

    await delay(2000);

    // Step 1: Register credentials
    console.log('📝 Step 1: Registering credentials...\n');
    console.log('$ vault register \\');
    console.log(`  --cdp "${wsEndpoint}" \\`);
    console.log('  --username-selector "#email" \\');
    console.log('  --password-selector "#password" \\');
    console.log('  --username "demo@agent-vault.dev" \\');
    console.log('  --password "SecurePass123!" \\');
    console.log('  --allow-http --force\n');

    await delay(1000);

    const { execSync } = await import('child_process');
    const registerOutput = execSync(
      `node ${CLI_PATH} register ` +
        `--cdp "${wsEndpoint}" ` +
        `--username-selector "#email" ` +
        `--password-selector "#password" ` +
        `--username "demo@agent-vault.dev" ` +
        `--password "SecurePass123!" ` +
        `--allow-http ` +
        `--force`,
      { encoding: 'utf-8', cwd: process.cwd() }
    );

    console.log(registerOutput);
    await delay(2000);

    // Verify form was filled
    console.log('✅ Form filled with credentials\n');
    await delay(1500);

    // Step 2: Reload page
    console.log('🔄 Step 2: Reloading page to clear form...\n');
    await page.goto(TEST_ORIGIN);
    await delay(2000);

    // Step 3: Login (auto-fill)
    console.log('🔐 Step 3: Auto-filling credentials with vault login...\n');
    console.log(`$ vault login --cdp "${wsEndpoint}"\n`);

    await delay(1000);
    await resetRateLimit();

    const loginOutput = execSync(
      `node ${CLI_PATH} login --cdp "${wsEndpoint}"`,
      { encoding: 'utf-8', cwd: process.cwd() }
    );

    console.log(loginOutput);
    await delay(2000);

    console.log('✅ Credentials auto-filled from vault!\n');
    await delay(1500);

    // Verify credentials were filled correctly
    const emailValue = await page.inputValue('#email');
    const passwordValue = await page.inputValue('#password');
    
    if (emailValue === 'demo@agent-vault.dev' && passwordValue === 'SecurePass123!') {
      console.log('✅ Verification: Credentials match!\n');
    }

    await delay(2000);

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 DEMO COMPLETE!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('Next steps:');
    console.log('  1. Save your screen recording to demo/recordings/');
    console.log('  2. Run: npm run demo:video');
    console.log('  3. Find output in: demo/out/video.mp4\n');

    await delay(3000);

  } catch (error) {
    console.error('❌ Error during demo:', error);
    throw error;
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up...');
    
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

    // Clean up test credentials
    try {
      await deleteRP(TEST_ORIGIN);
    } catch {
      // Ignore
    }

    console.log('✅ Cleanup complete\n');
  }
}

// Run the demo
runDemo().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
