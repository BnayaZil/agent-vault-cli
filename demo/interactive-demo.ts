#!/usr/bin/env npx tsx

/**
 * Interactive Demo for Agent Vault CLI
 *
 * This demo provides a step-by-step interactive experience:
 * 1. Starts a local test server with a login page
 * 2. Launches Chromium with CDP enabled
 * 3. Waits for user input between steps
 * 4. Shows commands as they would be typed
 *
 * Run with: npm run demo:interactive
 */

import { chromium, Browser, Page } from 'playwright-chromium';
import { spawn, execSync, ChildProcess } from 'child_process';
import { createServer, Server } from 'http';
import http from 'http';
import * as readline from 'readline';

// Configuration
const TEST_PORT = 9601;
const CDP_PORT = 9401;
const TEST_ORIGIN = `http://127.0.0.1:${TEST_PORT}`;
const CLI_PATH = './dist/index.js';

// Demo credentials
const DEMO_CREDENTIALS = {
  username: 'demo@agent-vault.dev',
  password: 'SecureDemo123!',
};

// Login form HTML with terminal simulation
const LOGIN_FORM_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Agent Vault CLI - Interactive Demo</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
      gap: 40px;
    }
    .login-container {
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 100%;
      max-width: 380px;
    }
    .terminal-container {
      background: #1e1e1e;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 100%;
      max-width: 500px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }
    .terminal-header {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .terminal-btn {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .terminal-btn.red { background: #ff5f56; }
    .terminal-btn.yellow { background: #ffbd2e; }
    .terminal-btn.green { background: #27c93f; }
    .terminal-title {
      color: #888;
      font-size: 12px;
      margin-left: auto;
    }
    .terminal-content {
      color: #e0e0e0;
      font-size: 13px;
      line-height: 1.6;
      min-height: 200px;
    }
    .terminal-line {
      margin: 4px 0;
    }
    .terminal-prompt {
      color: #00ff00;
    }
    .terminal-command {
      color: #ffffff;
    }
    .terminal-output {
      color: #888;
    }
    .terminal-success {
      color: #4caf50;
    }
    .terminal-cursor {
      display: inline-block;
      width: 8px;
      height: 14px;
      background: #00ff00;
      animation: blink 1s infinite;
      vertical-align: middle;
    }
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }
    h1 {
      text-align: center;
      color: #1a1a2e;
      margin-bottom: 8px;
      font-size: 24px;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 28px;
      font-size: 14px;
    }
    .form-group {
      margin-bottom: 18px;
    }
    label {
      display: block;
      margin-bottom: 6px;
      color: #333;
      font-weight: 500;
      font-size: 14px;
    }
    input {
      width: 100%;
      padding: 12px 14px;
      font-size: 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      transition: all 0.3s ease;
      outline: none;
    }
    input:focus {
      border-color: #4a90d9;
      box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.1);
    }
    input.filled {
      border-color: #4caf50;
      background: linear-gradient(90deg, #f8fff8 0%, #e8f5e9 100%);
      animation: fillPulse 0.5s ease;
    }
    @keyframes fillPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
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
      padding: 16px;
      background: #e8f5e9;
      border-radius: 8px;
      color: #2e7d32;
      margin-top: 16px;
      animation: fadeIn 0.3s ease;
    }
    .success.show { display: block; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .step-indicator {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.95);
      padding: 12px 24px;
      border-radius: 30px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      font-weight: 500;
      color: #333;
      z-index: 1000;
    }
    .step-indicator .step-num {
      background: #4a90d9;
      color: white;
      padding: 4px 10px;
      border-radius: 15px;
      margin-right: 10px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="step-indicator">
    <span class="step-num" id="step-num">1</span>
    <span id="step-text">Waiting for credentials...</span>
  </div>

  <div class="terminal-container">
    <div class="terminal-header">
      <span class="terminal-btn red"></span>
      <span class="terminal-btn yellow"></span>
      <span class="terminal-btn green"></span>
      <span class="terminal-title">Terminal — vault-cli</span>
    </div>
    <div class="terminal-content" id="terminal">
      <div class="terminal-line">
        <span class="terminal-prompt">$ </span>
        <span class="terminal-cursor"></span>
      </div>
    </div>
  </div>

  <div class="login-container">
    <h1>🔐 Demo Login</h1>
    <p class="subtitle">Watch the terminal for CLI commands</p>
    
    <form id="login-form">
      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" placeholder="Enter your email" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" placeholder="Enter your password" autocomplete="off" />
      </div>
      <button type="submit" id="submit-btn">Sign In</button>
    </form>
    
    <div class="success" id="success">
      ✅ Login successful!
    </div>
  </div>
  
  <script>
    const terminal = document.getElementById('terminal');
    const stepNum = document.getElementById('step-num');
    const stepText = document.getElementById('step-text');
    
    // Listen for custom events from the demo script
    window.updateTerminal = function(lines, step, text) {
      terminal.innerHTML = lines.map(line => {
        if (line.type === 'prompt') {
          return '<div class="terminal-line"><span class="terminal-prompt">$ </span><span class="terminal-command">' + line.text + '</span></div>';
        } else if (line.type === 'output') {
          return '<div class="terminal-line"><span class="terminal-output">' + line.text + '</span></div>';
        } else if (line.type === 'success') {
          return '<div class="terminal-line"><span class="terminal-success">' + line.text + '</span></div>';
        } else if (line.type === 'cursor') {
          return '<div class="terminal-line"><span class="terminal-prompt">$ </span><span class="terminal-cursor"></span></div>';
        }
        return '';
      }).join('');
      
      if (step) stepNum.textContent = step;
      if (text) stepText.textContent = text;
    };
    
    // Poll for value changes
    setInterval(() => {
      document.querySelectorAll('input').forEach(input => {
        const wasFilled = input.classList.contains('filled');
        const isFilled = input.value.length > 0;
        if (!wasFilled && isFilled) {
          input.classList.add('filled');
        }
      });
    }, 50);
    
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      document.getElementById('success').classList.add('show');
    });
  </script>
</body>
</html>
`;

// Utility functions
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(message: string): Promise<void> {
  return new Promise((resolve) => {
    rl.question(`\n${message} (Press Enter to continue...)`, () => resolve());
  });
}

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

// Update terminal in browser
async function updateTerminal(
  page: Page,
  lines: Array<{ type: string; text: string }>,
  step: string,
  text: string
) {
  await page.evaluate(
    ({ lines, step, text }) => {
      (window as unknown as { updateTerminal: (l: unknown, s: string, t: string) => void }).updateTerminal(
        lines,
        step,
        text
      );
    },
    { lines, step, text }
  );
}

// Simulate typing in terminal
async function typeCommand(page: Page, command: string, step: string, text: string) {
  const lines: Array<{ type: string; text: string }> = [];

  // Type character by character
  for (let i = 0; i <= command.length; i++) {
    const partialCmd = command.substring(0, i);
    await updateTerminal(
      page,
      [...lines, { type: 'prompt', text: partialCmd + (i < command.length ? '▌' : '') }],
      step,
      text
    );
    await sleep(30 + Math.random() * 20);
  }

  return lines;
}

// Run CLI command
function runCliCommand(command: string): string {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (error: unknown) {
    const execError = error as { stderr?: string; message?: string };
    throw new Error(execError.stderr || execError.message);
  }
}

// Main demo function
async function runDemo() {
  let server: Server | null = null;
  let browserProcess: ChildProcess | null = null;
  let browser: Browser | null = null;

  console.log('\n' + '═'.repeat(60));
  console.log('   🔐 Agent Vault CLI - Interactive Demo');
  console.log('═'.repeat(60));
  console.log('\nThis demo will walk you through the login workflow step by step.');
  console.log('Watch the browser window and follow the prompts here.\n');

  try {
    // Build
    log('Building CLI...', '🔨');
    execSync('npm run build', { stdio: 'inherit' });

    // Start server
    log(`Starting test server on port ${TEST_PORT}...`, '🌐');
    server = await startTestServer();

    // Launch browser
    log('Launching Chromium...', '🚀');
    const chromiumPath = chromium.executablePath();

    browserProcess = spawn(
      chromiumPath,
      [
        `--remote-debugging-port=${CDP_PORT}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--window-size=1100,700',
        '--window-position=50,50',
        'about:blank',
      ],
      { stdio: 'pipe', detached: false }
    );

    const wsEndpoint = await waitForCdp(CDP_PORT);
    browser = await chromium.connectOverCDP(wsEndpoint);
    const context = browser.contexts()[0];
    const page = context.pages()[0] || (await context.newPage());

    await page.goto(TEST_ORIGIN);
    await sleep(500);

    // Clean up existing credentials
    try {
      execSync(`node ${CLI_PATH} delete --origin "${TEST_ORIGIN}" --force`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch {
      // Ignore
    }

    await prompt('Look at the browser - you should see a login form and terminal');

    // Step 1: Register command
    log('Step 1: Register credentials', '📝');
    console.log('   We first need to store credentials securely.\n');

    const registerCmd = `vault register --cdp "..." --username "${DEMO_CREDENTIALS.username}" --password "***"`;
    await typeCommand(page, registerCmd, '1', 'Registering credentials...');
    await sleep(500);

    // Actually run the register command
    const fullRegisterCmd =
      `node ${CLI_PATH} register ` +
      `--cdp "${wsEndpoint}" ` +
      `--username-selector "#email" ` +
      `--password-selector "#password" ` +
      `--submit-selector "#submit-btn" ` +
      `--username "${DEMO_CREDENTIALS.username}" ` +
      `--password "${DEMO_CREDENTIALS.password}" ` +
      `--allow-http --force`;

    runCliCommand(fullRegisterCmd);

    await updateTerminal(
      page,
      [
        { type: 'prompt', text: registerCmd },
        { type: 'success', text: '✓ Credentials registered successfully' },
        { type: 'output', text: '  Stored in macOS Keychain' },
        { type: 'cursor', text: '' },
      ],
      '1',
      'Credentials registered!'
    );

    await sleep(1000);
    await prompt('Credentials stored! Notice the form was filled during registration');

    // Step 2: Clear form
    log('Step 2: Clear the form', '🔄');
    await page.reload();
    await sleep(500);

    await updateTerminal(
      page,
      [
        { type: 'prompt', text: registerCmd },
        { type: 'success', text: '✓ Credentials registered successfully' },
        { type: 'output', text: '' },
        { type: 'output', text: '--- Page reloaded (form cleared) ---' },
        { type: 'cursor', text: '' },
      ],
      '2',
      'Form cleared, ready for login'
    );

    await prompt('Form is now empty. Ready to use vault login');

    // Step 3: Login command
    log('Step 3: Auto-fill with vault login', '🔐');
    console.log('   Now watch as credentials are auto-filled securely.\n');

    const loginCmd = `vault login --cdp "..."`;
    await typeCommand(page, loginCmd, '3', 'Running login command...');
    await sleep(300);

    // Run actual login
    runCliCommand(`node ${CLI_PATH} login --cdp "${wsEndpoint}"`);

    await sleep(500);

    await updateTerminal(
      page,
      [
        { type: 'prompt', text: registerCmd },
        { type: 'success', text: '✓ Credentials registered successfully' },
        { type: 'output', text: '' },
        { type: 'prompt', text: loginCmd },
        { type: 'success', text: '✓ Login filled successfully' },
        { type: 'output', text: '  Credentials passed via CDP (not exposed in terminal!)' },
        { type: 'cursor', text: '' },
      ],
      '3',
      'Credentials auto-filled!'
    );

    await prompt('Credentials filled! Notice the password was never shown in terminal');

    // Step 4: Submit
    log('Step 4: Click submit', '👆');
    await updateTerminal(
      page,
      [
        { type: 'prompt', text: registerCmd },
        { type: 'success', text: '✓ Credentials registered successfully' },
        { type: 'output', text: '' },
        { type: 'prompt', text: loginCmd },
        { type: 'success', text: '✓ Login filled successfully' },
        { type: 'output', text: '' },
        { type: 'output', text: '→ Clicking submit button...' },
      ],
      '4',
      'Submitting form...'
    );

    await sleep(500);
    await page.click('#submit-btn');

    await updateTerminal(
      page,
      [
        { type: 'prompt', text: registerCmd },
        { type: 'success', text: '✓ Credentials registered successfully' },
        { type: 'output', text: '' },
        { type: 'prompt', text: loginCmd },
        { type: 'success', text: '✓ Login filled successfully' },
        { type: 'output', text: '' },
        { type: 'success', text: '✓ Form submitted successfully!' },
        { type: 'output', text: '' },
        { type: 'output', text: '🔐 Demo complete!' },
      ],
      '✓',
      'Demo complete!'
    );

    console.log('\n' + '═'.repeat(60));
    console.log('   ✅ Interactive Demo Complete!');
    console.log('═'.repeat(60));
    console.log('\n🔑 Key Takeaways:');
    console.log('   • Credentials stored securely in macOS Keychain');
    console.log('   • Passwords never exposed in terminal or logs');
    console.log('   • CDP allows secure form filling without clipboard');
    console.log('   • Perfect for AI agents that need to authenticate\n');

    await prompt('Press Enter to close the demo');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    throw error;
  } finally {
    rl.close();

    // Cleanup
    try {
      execSync(`node ${CLI_PATH} delete --origin "${TEST_ORIGIN}" --force`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });
    } catch {
      // Ignore
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
  }
}

// Run
runDemo().catch((error) => {
  console.error('Demo error:', error);
  rl.close();
  process.exit(1);
});
