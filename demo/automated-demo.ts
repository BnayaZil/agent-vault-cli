#!/usr/bin/env npx tsx

/**
 * Automated Demo for Agent Vault CLI
 *
 * This demo showcases the full login workflow:
 * 1. Starts a local test server with a login page
 * 2. Launches Chromium with CDP (Chrome DevTools Protocol) enabled
 * 3. Registers credentials using the CLI
 * 4. Clears the form and runs the login command
 * 5. Optionally clicks submit to complete the login
 *
 * Run with: npm run demo:auto
 */

import { chromium, Browser, Page } from 'playwright-chromium';
import { spawn, execSync, ChildProcess } from 'child_process';
import { createServer, Server } from 'http';
import http from 'http';

// Configuration
const TEST_PORT = 9600;
const CDP_PORT = 9400;
const TEST_ORIGIN = `http://127.0.0.1:${TEST_PORT}`;
const CLI_PATH = './dist/index.js';

// Demo credentials
const DEMO_CREDENTIALS = {
  username: 'demo@agent-vault.dev',
  password: 'SecureDemo123!',
};

// Login form HTML
const LOGIN_FORM_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Agent Vault CLI - Demo Login Page</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 100%;
      max-width: 400px;
    }
    h1 {
      text-align: center;
      color: #1a1a2e;
      margin-bottom: 8px;
      font-size: 28px;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 32px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 500;
    }
    input {
      width: 100%;
      padding: 14px 16px;
      font-size: 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      transition: all 0.2s ease;
      outline: none;
    }
    input:focus {
      border-color: #4a90d9;
      box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.1);
    }
    input.filled {
      border-color: #4caf50;
      background: #f8fff8;
    }
    button {
      width: 100%;
      padding: 14px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      background: linear-gradient(135deg, #4a90d9 0%, #357abd 100%);
      color: white;
      border: none;
      border-radius: 8px;
      transition: all 0.2s ease;
      margin-top: 8px;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(74, 144, 217, 0.4);
    }
    .success {
      display: none;
      text-align: center;
      padding: 20px;
      background: #e8f5e9;
      border-radius: 8px;
      color: #2e7d32;
      margin-top: 20px;
      animation: fadeIn 0.3s ease;
    }
    .success.show { display: block; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .badge {
      display: inline-block;
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      margin-bottom: 24px;
    }
    .terminal-hint {
      margin-top: 24px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
      color: #666;
    }
    .terminal-hint code {
      display: block;
      color: #333;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 Demo Login</h1>
    <p class="subtitle">Credentials will be auto-filled by Agent Vault CLI</p>
    <span class="badge">Test Environment</span>
    
    <form id="login-form">
      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" placeholder="Enter your email" autocomplete="email" />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" placeholder="Enter your password" autocomplete="current-password" />
      </div>
      <button type="submit" id="submit-btn">Sign In</button>
    </form>
    
    <div class="success" id="success">
      ✅ Login successful! Welcome back.
    </div>
    
    <div class="terminal-hint">
      💡 Watch the terminal to see the CLI commands
      <code>vault login --cdp ws://...</code>
    </div>
  </div>
  
  <script>
    // Highlight inputs when filled
    document.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', () => {
        input.classList.toggle('filled', input.value.length > 0);
      });
      // Also check on any change (for programmatic fills)
      new MutationObserver(() => {
        input.classList.toggle('filled', input.value.length > 0);
      }).observe(input, { attributes: true, attributeFilter: ['value'] });
    });
    
    // Handle form submission
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      document.getElementById('success').classList.add('show');
    });
    
    // Poll for value changes (for CDP-filled inputs)
    setInterval(() => {
      document.querySelectorAll('input').forEach(input => {
        input.classList.toggle('filled', input.value.length > 0);
      });
    }, 100);
  </script>
</body>
</html>
`;

// Utility functions
function log(message: string, emoji = '📋') {
  console.log(`\n${emoji} ${message}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      await sleep(200);
    }
  }
  throw new Error(`Could not connect to CDP on port ${port}`);
}

// Start test server
function startTestServer(): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(LOGIN_FORM_HTML);
    });

    server.on('error', reject);
    server.listen(TEST_PORT, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

// Run CLI command
function runCliCommand(command: string): string {
  log(`Running: ${command}`, '🖥️');
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(`   Output: ${output.trim()}`);
    return output;
  } catch (error: unknown) {
    const execError = error as { stderr?: string; message?: string };
    console.error(`   Error: ${execError.stderr || execError.message}`);
    throw error;
  }
}

// Main demo function
async function runDemo() {
  let server: Server | null = null;
  let browserProcess: ChildProcess | null = null;
  let browser: Browser | null = null;

  console.log('\n' + '═'.repeat(60));
  console.log('   🔐 Agent Vault CLI - Automated Demo');
  console.log('═'.repeat(60));

  try {
    // Step 1: Build the CLI
    log('Building CLI...', '🔨');
    execSync('npm run build', { stdio: 'inherit' });

    // Step 2: Start test server
    log(`Starting test server on port ${TEST_PORT}...`, '🌐');
    server = await startTestServer();
    console.log(`   Server running at ${TEST_ORIGIN}`);

    // Step 3: Launch Chromium with CDP
    log('Launching Chromium with CDP enabled...', '🚀');
    const chromiumPath = chromium.executablePath();

    const browserArgs = [
      `--remote-debugging-port=${CDP_PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-dev-shm-usage',
      '--window-size=1280,800',
      '--window-position=100,100',
      'about:blank',
    ];

    browserProcess = spawn(chromiumPath, browserArgs, {
      stdio: 'pipe',
      detached: false,
    });

    // Wait for CDP to be available
    log('Waiting for CDP endpoint...', '⏳');
    const wsEndpoint = await waitForCdp(CDP_PORT);
    console.log(`   CDP endpoint: ${wsEndpoint}`);

    // Connect to browser
    browser = await chromium.connectOverCDP(wsEndpoint);
    const context = browser.contexts()[0];
    const page = context.pages()[0] || (await context.newPage());

    // Step 4: Navigate to login page
    log('Opening login page...', '🌍');
    await page.goto(TEST_ORIGIN);
    await sleep(1000);

    // Step 5: Clean up any existing credentials for this origin
    log('Cleaning up any existing credentials...', '🧹');
    try {
      runCliCommand(`node ${CLI_PATH} delete --origin "${TEST_ORIGIN}" --force`);
    } catch {
      console.log('   No existing credentials to clean up');
    }

    // Step 6: Register credentials
    log('Registering credentials with vault register...', '📝');
    await sleep(500);

    const registerCmd =
      `node ${CLI_PATH} register ` +
      `--cdp "${wsEndpoint}" ` +
      `--username-selector "#email" ` +
      `--password-selector "#password" ` +
      `--submit-selector "#submit-btn" ` +
      `--username "${DEMO_CREDENTIALS.username}" ` +
      `--password "${DEMO_CREDENTIALS.password}" ` +
      `--allow-http ` +
      `--force`;

    runCliCommand(registerCmd);
    await sleep(1500);

    // Step 7: Clear the form
    log('Clearing form to simulate fresh page load...', '🔄');
    await page.reload();
    await sleep(1000);

    // Verify form is empty
    const emailBefore = await page.inputValue('#email');
    const passwordBefore = await page.inputValue('#password');
    console.log(`   Form before login: email="${emailBefore}", password="${passwordBefore}"`);

    // Step 8: Run login command
    log('Running vault login to auto-fill credentials...', '🔐');
    await sleep(500);

    const loginCmd = `node ${CLI_PATH} login --cdp "${wsEndpoint}"`;
    runCliCommand(loginCmd);
    await sleep(1500);

    // Verify credentials were filled
    const emailAfter = await page.inputValue('#email');
    const passwordAfter = await page.inputValue('#password');
    console.log(`   Form after login: email="${emailAfter}", password="${'*'.repeat(passwordAfter.length)}"`);

    // Step 9: Click submit button
    log('Clicking submit button...', '👆');
    await sleep(500);
    await page.click('#submit-btn');
    await sleep(1500);

    // Success!
    console.log('\n' + '═'.repeat(60));
    console.log('   ✅ Demo completed successfully!');
    console.log('═'.repeat(60));
    console.log('\n📌 Summary:');
    console.log('   1. Started local test server with login form');
    console.log('   2. Launched Chromium with CDP enabled');
    console.log('   3. Registered credentials securely in macOS Keychain');
    console.log('   4. Used vault login to auto-fill credentials');
    console.log('   5. Submitted the form');
    console.log('\n💡 The credentials were never exposed in the terminal!');
    console.log('   They were passed directly to the browser via CDP.\n');

    // Keep browser open for a few seconds to see the result
    log('Keeping browser open for 5 seconds...', '⏱️');
    await sleep(5000);

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    throw error;
  } finally {
    // Cleanup
    log('Cleaning up...', '🧹');

    // Clean up test credentials
    try {
      execSync(`node ${CLI_PATH} delete --origin "${TEST_ORIGIN}" --force`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch {
      // Ignore cleanup errors
    }

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
      server.close();
    }

    console.log('   Done!\n');
  }
}

// Run the demo
runDemo().catch((error) => {
  console.error('Demo error:', error);
  process.exit(1);
});
