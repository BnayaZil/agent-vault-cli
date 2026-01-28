import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { chromium, Browser } from 'playwright';
import { execSync, spawn, ChildProcess } from 'child_process';
import { startTestServer, TestServer } from './fixtures/server.js';
import { deleteRP, getRP } from '../src/core/keychain.js';
import { loadConfig, saveConfig } from '../src/core/config.js';
import http from 'http';

const CLI_PATH = './dist/index.js';

// Ports for different "origins"
const TEST_PORTS = [9501, 9502, 9503];
const CDP_PORT = 9333;

// Run with HEADFUL=1 npm test to see the browser
const HEADFUL = process.env.HEADFUL === '1' || process.env.HEADFUL === 'true';
const SLOW_MO = HEADFUL ? 500 : 0; // Slow down actions in headful mode

// Helper to add delay in headful mode so you can see what's happening
async function visualDelay(ms: number = 300): Promise<void> {
  if (HEADFUL) {
    await new Promise((r) => setTimeout(r, ms));
  }
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

describe('E2E: Vault CLI', () => {
  let servers: TestServer[] = [];
  let browser: Browser;
  let browserProcess: ChildProcess;
  let wsEndpoint: string;

  beforeAll(async () => {
    // Start test servers on multiple ports
    for (const port of TEST_PORTS) {
      const server = await startTestServer(port);
      servers.push(server);
    }

    // Get the Chromium executable path from Playwright
    const chromiumPath = chromium.executablePath();

    // Build browser args
    const browserArgs = [
      `--remote-debugging-port=${CDP_PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-dev-shm-usage',
    ];

    // Add headless flag only if not in headful mode
    if (!HEADFUL) {
      browserArgs.push('--headless=new', '--disable-gpu');
    } else {
      // In headful mode, set a reasonable window size
      browserArgs.push('--window-size=1280,800', '--window-position=100,100');
      console.log('\n🖥️  Running in HEADFUL mode - watch the browser!\n');
    }

    browserArgs.push('about:blank');

    // Launch Chromium with remote debugging enabled
    browserProcess = spawn(chromiumPath, browserArgs, {
      stdio: HEADFUL ? 'inherit' : 'pipe',
      detached: false,
    });

    // Wait for CDP to be available and get the endpoint
    wsEndpoint = await waitForCdp(CDP_PORT);

    // Connect to the browser using CDP (same as CLI does)
    browser = await chromium.connectOverCDP(wsEndpoint);
  }, 60000);

  afterAll(async () => {
    // Close browser
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore
      }
    }

    // Kill browser process
    if (browserProcess) {
      browserProcess.kill('SIGTERM');
    }

    // Stop all test servers
    for (const server of servers) {
      await server.close();
    }

    // Clean up any test credentials
    for (const port of TEST_PORTS) {
      try {
        await deleteRP(`http://127.0.0.1:${port}`);
      } catch {
        // Ignore errors during cleanup
      }
    }
  });

  describe('register command', () => {
    const testPort = TEST_PORTS[0];
    const testOrigin = `http://127.0.0.1:${testPort}`;

    afterEach(async () => {
      // Clean up credentials after each test
      try {
        await deleteRP(testOrigin);
      } catch {
        // Ignore
      }
    });

    it('registers credentials for a site', async () => {
      const context = browser.contexts()[0];
      const page = context.pages()[0] || await context.newPage();
      await page.goto(testOrigin);
      await visualDelay(500);

      // Run the CLI register command
      const output = execSync(
        `node ${CLI_PATH} register ` +
        `--cdp "${wsEndpoint}" ` +
        `--username-selector "#email" ` +
        `--password-selector "#password" ` +
        `--username "test@example.com" ` +
        `--password "TestPassword123!" ` +
        `--force`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );

      await visualDelay(800); // Show the filled form

      expect(output).toContain('Registered credentials for');

      // Verify credentials were stored
      const stored = await getRP(testOrigin);
      expect(stored).not.toBeNull();
      expect(stored?.credentials.username).toBe('test@example.com');
      expect(stored?.credentials.password).toBe('TestPassword123!');
      expect(stored?.selectors.username).toBe('#email');
      expect(stored?.selectors.password).toBe('#password');

      // Verify form was filled
      const emailValue = await page.inputValue('#email');
      const passwordValue = await page.inputValue('#password');
      expect(emailValue).toBe('test@example.com');
      expect(passwordValue).toBe('TestPassword123!');
    });

    it('generates a secure password when --generate-password is used', async () => {
      const context = browser.contexts()[0];
      const page = context.pages()[0] || await context.newPage();
      await page.goto(testOrigin);
      await visualDelay(500);

      const output = execSync(
        `node ${CLI_PATH} register ` +
        `--cdp "${wsEndpoint}" ` +
        `--username-selector "#email" ` +
        `--password-selector "#password" ` +
        `--username "generated@example.com" ` +
        `--generate-password ` +
        `--force`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );

      await visualDelay(800);

      expect(output).toContain('Generated password:');
      expect(output).toContain('Registered credentials for');

      // Verify credentials were stored with a generated password
      const stored = await getRP(testOrigin);
      expect(stored).not.toBeNull();
      expect(stored?.credentials.username).toBe('generated@example.com');
      expect(stored?.credentials.password.length).toBeGreaterThanOrEqual(16);
    });

    it('fails with invalid selector', async () => {
      const context = browser.contexts()[0];
      const page = context.pages()[0] || await context.newPage();
      await page.goto(testOrigin);

      expect(() => {
        execSync(
          `node ${CLI_PATH} register ` +
          `--cdp "${wsEndpoint}" ` +
          `--username-selector "#nonexistent" ` +
          `--password-selector "#password" ` +
          `--username "test@example.com" ` +
          `--password "TestPassword123!" ` +
          `--force`,
          { encoding: 'utf-8', cwd: process.cwd() }
        );
      }).toThrow(/Username selector not found/);
    });
  });

  describe('login command', () => {
    const testPort = TEST_PORTS[1];
    const testOrigin = `http://127.0.0.1:${testPort}`;

    afterEach(async () => {
      try {
        await deleteRP(testOrigin);
      } catch {
        // Ignore
      }
    });

    it('fills credentials for a registered site', async () => {
      // First, register credentials
      const context = browser.contexts()[0];
      const page = context.pages()[0] || await context.newPage();
      await page.goto(testOrigin);
      await visualDelay(500);

      execSync(
        `node ${CLI_PATH} register ` +
        `--cdp "${wsEndpoint}" ` +
        `--username-selector "#email" ` +
        `--password-selector "#password" ` +
        `--submit-selector "#submit-btn" ` +
        `--username "login@example.com" ` +
        `--password "LoginPass456!" ` +
        `--force`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );

      await visualDelay(600);

      // Navigate to the page again to clear the form
      await page.goto(testOrigin);
      await visualDelay(500);

      // Verify form is empty
      expect(await page.inputValue('#email')).toBe('');
      expect(await page.inputValue('#password')).toBe('');

      // Run login command
      const output = execSync(
        `node ${CLI_PATH} login --cdp "${wsEndpoint}"`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );

      await visualDelay(800); // Show the auto-filled form

      expect(output).toContain('Login filled for');

      // Verify form was filled with stored credentials
      const emailValue = await page.inputValue('#email');
      const passwordValue = await page.inputValue('#password');
      expect(emailValue).toBe('login@example.com');
      expect(passwordValue).toBe('LoginPass456!');
    });

    it('fails for unknown origin', async () => {
      // Use a different port that has no registered credentials
      const unknownPort = TEST_PORTS[2];
      const context = browser.contexts()[0];
      const page = context.pages()[0] || await context.newPage();
      await page.goto(`http://127.0.0.1:${unknownPort}`);

      // Clean up any existing credentials for this origin
      try {
        await deleteRP(`http://127.0.0.1:${unknownPort}`);
      } catch {
        // Ignore
      }

      expect(() => {
        execSync(
          `node ${CLI_PATH} login --cdp "${wsEndpoint}"`,
          { encoding: 'utf-8', cwd: process.cwd() }
        );
      }).toThrow(/Unknown RP/);
    });
  });

  describe('delete command', () => {
    const testPort = TEST_PORTS[2];
    const testOrigin = `http://127.0.0.1:${testPort}`;

    it('deletes credentials for a site', async () => {
      // First, register credentials
      const context = browser.contexts()[0];
      const page = context.pages()[0] || await context.newPage();
      await page.goto(testOrigin);

      execSync(
        `node ${CLI_PATH} register ` +
        `--cdp "${wsEndpoint}" ` +
        `--username-selector "#email" ` +
        `--password-selector "#password" ` +
        `--username "delete@example.com" ` +
        `--password "DeletePass789!" ` +
        `--force`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );

      // Verify credentials exist
      let stored = await getRP(testOrigin);
      expect(stored).not.toBeNull();

      // Run delete command
      const output = execSync(
        `node ${CLI_PATH} delete --origin "${testOrigin}" --force`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );

      expect(output).toContain('Deleted credentials for');

      // Verify credentials were deleted
      stored = await getRP(testOrigin);
      expect(stored).toBeNull();
    });

    it('fails for non-existent origin', async () => {
      expect(() => {
        execSync(
          `node ${CLI_PATH} delete --origin "http://nonexistent.example.com" --force`,
          { encoding: 'utf-8', cwd: process.cwd() }
        );
      }).toThrow(/No credentials found/);
    });
  });

  describe('multiple origins', () => {
    afterEach(async () => {
      // Clean up all test credentials
      for (const port of TEST_PORTS) {
        try {
          await deleteRP(`http://127.0.0.1:${port}`);
        } catch {
          // Ignore
        }
      }
    });

    it('handles credentials for different origins independently', async () => {
      const credentials = [
        { port: TEST_PORTS[0], username: 'user1@site1.com', password: 'Pass1!' },
        { port: TEST_PORTS[1], username: 'user2@site2.com', password: 'Pass2!' },
      ];

      const context = browser.contexts()[0];
      const page = context.pages()[0] || await context.newPage();

      // Register credentials for multiple sites
      for (const cred of credentials) {
        await page.goto(`http://127.0.0.1:${cred.port}`);
        await visualDelay(400);

        execSync(
          `node ${CLI_PATH} register ` +
          `--cdp "${wsEndpoint}" ` +
          `--username-selector "#email" ` +
          `--password-selector "#password" ` +
          `--username "${cred.username}" ` +
          `--password "${cred.password}" ` +
          `--force`,
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        await visualDelay(600);
      }

      // Verify each origin has correct credentials
      for (const cred of credentials) {
        const origin = `http://127.0.0.1:${cred.port}`;
        const stored = await getRP(origin);
        expect(stored).not.toBeNull();
        expect(stored?.credentials.username).toBe(cred.username);
        expect(stored?.credentials.password).toBe(cred.password);
      }

      // Test that login fills the correct credentials for each origin
      for (const cred of credentials) {
        await page.goto(`http://127.0.0.1:${cred.port}`);
        await visualDelay(400);

        // Verify form is empty
        expect(await page.inputValue('#email')).toBe('');

        execSync(
          `node ${CLI_PATH} login --cdp "${wsEndpoint}"`,
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        await visualDelay(800); // Watch the credentials get filled

        // Verify correct credentials were filled
        expect(await page.inputValue('#email')).toBe(cred.username);
        expect(await page.inputValue('#password')).toBe(cred.password);
      }
    });
  });

  describe('config command', () => {
    let originalConfig: Awaited<ReturnType<typeof loadConfig>>;

    beforeAll(async () => {
      // Save original config to restore after tests
      originalConfig = await loadConfig();
    });

    afterAll(async () => {
      // Restore original config
      await saveConfig(originalConfig);
    });

    afterEach(async () => {
      // Reset config between tests
      await saveConfig({});
    });

    it('sets and gets a config value', () => {
      // Set a value
      const setOutput = execSync(
        `node ${CLI_PATH} config set defaultUsername config-test@example.com`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );
      expect(setOutput).toContain('Set defaultUsername=config-test@example.com');

      // Get the value
      const getOutput = execSync(
        `node ${CLI_PATH} config get defaultUsername`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );
      expect(getOutput.trim()).toBe('config-test@example.com');
    });

    it('lists config values', async () => {
      // Set a value first
      execSync(
        `node ${CLI_PATH} config set defaultUsername list-test@example.com`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );

      // List config
      const output = execSync(
        `node ${CLI_PATH} config list`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );
      expect(output).toContain('defaultUsername=list-test@example.com');
    });

    it('shows empty message when no config is set', async () => {
      // Ensure config is empty
      await saveConfig({});

      const output = execSync(
        `node ${CLI_PATH} config list`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );
      expect(output).toContain('No configuration values set');
      expect(output).toContain('Available keys: defaultUsername');
    });

    it('unsets a config value', () => {
      // Set a value first
      execSync(
        `node ${CLI_PATH} config set defaultUsername unset-test@example.com`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );

      // Unset it
      const unsetOutput = execSync(
        `node ${CLI_PATH} config unset defaultUsername`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );
      expect(unsetOutput).toContain('Unset defaultUsername');

      // Verify it's gone
      const getOutput = execSync(
        `node ${CLI_PATH} config get defaultUsername`,
        { encoding: 'utf-8', cwd: process.cwd() }
      );
      expect(getOutput.trim()).toBe('(not set)');
    });

    it('rejects invalid config keys', () => {
      expect(() => {
        execSync(
          `node ${CLI_PATH} config set invalidKey someValue`,
          { encoding: 'utf-8', cwd: process.cwd() }
        );
      }).toThrow(/Invalid config key/);

      expect(() => {
        execSync(
          `node ${CLI_PATH} config get invalidKey`,
          { encoding: 'utf-8', cwd: process.cwd() }
        );
      }).toThrow(/Invalid config key/);
    });
  });
});
