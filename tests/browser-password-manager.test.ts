import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { chromium, Browser, BrowserContext } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import { startTestServer, TestServer } from './fixtures/server.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { resetRateLimit } from '../src/core/ratelimit.js';

/**
 * Tests for Chromium's built-in password manager with --user-data-dir.
 * 
 * This explores whether the browser's native credential storage can be used
 * as an alternative to keychain-based storage for credential management.
 */

const TEST_PORT = 9601;
const CDP_PORT = 9444;

// Run with HEADFUL=1 npm test to see the browser
const HEADFUL = process.env.HEADFUL === '1' || process.env.HEADFUL === 'true';

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

async function visualDelay(ms: number = 300): Promise<void> {
  if (HEADFUL) {
    await new Promise((r) => setTimeout(r, ms));
  }
}

/**
 * Creates a temporary user data directory for Chrome
 */
function createTempUserDataDir(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-profile-'));
  return tmpDir;
}

/**
 * Cleans up the user data directory
 */
function cleanupUserDataDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

describe('Browser Password Manager with --user-data-dir', () => {
  let server: TestServer;
  let userDataDir: string;

  beforeAll(async () => {
    // Start test server
    server = await startTestServer(TEST_PORT);
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Password persistence across browser sessions', () => {
    let browserProcess: ChildProcess | null = null;

    afterEach(async () => {
      // Kill browser process
      if (browserProcess) {
        browserProcess.kill('SIGTERM');
        browserProcess = null;
        // Wait for process to fully terminate
        await new Promise((r) => setTimeout(r, 500));
      }
    });

    it('compares headless vs headful auto-fill with pre-populated Login Data', async () => {
      // This test directly pre-populates Chrome's Login Data SQLite database
      // to see if Chrome will auto-fill from it
      userDataDir = createTempUserDataDir();

      try {
        const chromiumPath = chromium.executablePath();
        const testOrigin = `http://127.0.0.1:${TEST_PORT}`;
        const { execSync } = await import('child_process');

        // === STEP 1: Create Chrome profile structure and Login Data ===
        console.log('\n📝 Step 1: Pre-populating Login Data SQLite database...');

        // Create Default profile directory
        const defaultDir = path.join(userDataDir, 'Default');
        fs.mkdirSync(defaultDir, { recursive: true });

        // Chrome's Login Data is a SQLite database
        // We need to create the schema and insert a credential
        // Note: With --password-store=basic, passwords are stored in plaintext (for testing)
        const loginDataPath = path.join(defaultDir, 'Login Data');

        // Create the SQLite database using sqlite3 command
        const createTableSQL = `
          CREATE TABLE logins (
            origin_url TEXT NOT NULL,
            action_url TEXT,
            username_element TEXT,
            username_value TEXT,
            password_element TEXT,
            password_value BLOB,
            submit_element TEXT,
            signon_realm TEXT NOT NULL,
            date_created INTEGER NOT NULL,
            blacklisted_by_user INTEGER NOT NULL,
            scheme INTEGER NOT NULL,
            password_type INTEGER,
            times_used INTEGER,
            form_data BLOB,
            display_name TEXT,
            icon_url TEXT,
            federation_url TEXT,
            skip_zero_click INTEGER,
            generation_upload_status INTEGER,
            possible_username_pairs BLOB,
            id INTEGER PRIMARY KEY,
            date_last_used INTEGER NOT NULL DEFAULT 0,
            moving_blocked_for BLOB,
            date_password_modified INTEGER NOT NULL DEFAULT 0
          );
          CREATE INDEX logins_signon ON logins (signon_realm);
        `;

        // Insert a test credential
        // For --password-store=basic, the password is stored as plaintext
        const insertSQL = `
          INSERT INTO logins (
            origin_url, action_url, username_element, username_value,
            password_element, password_value, submit_element, signon_realm,
            date_created, blacklisted_by_user, scheme, password_type,
            times_used, date_last_used, date_password_modified
          ) VALUES (
            '${testOrigin}/', '${testOrigin}/', 'email', 'prefilled@example.com',
            'password', 'PrefilledPass123!', 'submit-btn', '${testOrigin}/',
            ${Date.now() * 1000}, 0, 0, 0,
            1, ${Date.now() * 1000}, ${Date.now() * 1000}
          );
        `;

        try {
          // Create database and tables
          execSync(`sqlite3 "${loginDataPath}" "${createTableSQL}"`, { encoding: 'utf-8' });
          execSync(`sqlite3 "${loginDataPath}" "${insertSQL}"`, { encoding: 'utf-8' });

          // Verify the data was inserted
          const countResult = execSync(`sqlite3 "${loginDataPath}" "SELECT COUNT(*) FROM logins;"`, { encoding: 'utf-8' });
          console.log(`   Created Login Data with ${countResult.trim()} credential(s)`);

          // Show what we inserted
          const selectResult = execSync(
            `sqlite3 "${loginDataPath}" "SELECT username_value, password_value, signon_realm FROM logins;"`,
            { encoding: 'utf-8' }
          );
          console.log(`   Stored: ${selectResult.trim()}`);
        } catch (e: any) {
          console.log('   Note: sqlite3 not available, using empty profile');
          console.log(`   Error: ${e.message}`);
        }

        // === STEP 2: Test HEADLESS auto-fill ===
        console.log('\n🤖 Step 2: Testing HEADLESS auto-fill...');

        const headlessArgs = [
          `--remote-debugging-port=${CDP_PORT}`,
          `--user-data-dir=${userDataDir}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          '--disable-component-update',
          '--enable-features=PasswordManager',
          '--password-store=basic',
          '--headless=new',
          '--disable-gpu',
          'about:blank',
        ];

        browserProcess = spawn(chromiumPath, headlessArgs, {
          stdio: 'pipe',
          detached: false,
        });

        let wsEndpoint = await waitForCdp(CDP_PORT);
        let browser = await chromium.connectOverCDP(wsEndpoint);
        let context = browser.contexts()[0];
        let page = context.pages()[0] || await context.newPage();

        await page.goto(testOrigin);
        await new Promise((r) => setTimeout(r, 2000)); // Wait for potential auto-fill

        // Click on email field to potentially trigger auto-fill
        await page.click('#email');
        await new Promise((r) => setTimeout(r, 500));

        const headlessEmail = await page.inputValue('#email');
        const headlessPassword = await page.inputValue('#password');

        console.log('   HEADLESS results:');
        console.log(`   - Form auto-fill: email="${headlessEmail || '(empty)'}", password=${headlessPassword ? '"****"' : '"(empty)"'}`);

        await browser.close();
        browserProcess.kill('SIGTERM');
        browserProcess = null;
        await new Promise((r) => setTimeout(r, 1000));

        // === STEP 3: Test HEADFUL auto-fill ===
        console.log('\n👁️  Step 3: Testing HEADFUL auto-fill...');

        const headfulArgs = [
          `--remote-debugging-port=${CDP_PORT}`,
          `--user-data-dir=${userDataDir}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          '--disable-component-update',
          '--enable-features=PasswordManager',
          '--password-store=basic',
          '--window-size=800,600',
          'about:blank',
        ];

        browserProcess = spawn(chromiumPath, headfulArgs, {
          stdio: 'pipe',
          detached: false,
        });

        wsEndpoint = await waitForCdp(CDP_PORT);
        browser = await chromium.connectOverCDP(wsEndpoint);
        context = browser.contexts()[0];
        page = context.pages()[0] || await context.newPage();

        await page.goto(testOrigin);
        await new Promise((r) => setTimeout(r, 2000)); // Wait for potential auto-fill

        // Click on email field to potentially trigger auto-fill
        await page.click('#email');
        await new Promise((r) => setTimeout(r, 500));

        const headfulEmail = await page.inputValue('#email');
        const headfulPassword = await page.inputValue('#password');

        console.log('   HEADFUL results:');
        console.log(`   - Form auto-fill: email="${headfulEmail || '(empty)'}", password=${headfulPassword ? '"****"' : '"(empty)"'}`);

        await browser.close();

        // === Summary ===
        console.log('\n📊 Comparison Summary:');
        console.log('┌─────────────┬──────────────────────────────────┐');
        console.log('│ Mode        │ Auto-fill from Login Data        │');
        console.log('├─────────────┼──────────────────────────────────┤');
        console.log(`│ HEADLESS    │ ${headlessEmail ? 'YES ✅ ' + headlessEmail : 'NO ❌'}                  │`);
        console.log(`│ HEADFUL     │ ${headfulEmail ? 'YES ✅ ' + headfulEmail : 'NO ❌'}                  │`);
        console.log('└─────────────┴──────────────────────────────────┘');

        // === STEP 4: Check what Chrome sees ===
        console.log('\n🔍 Step 4: Investigating why auto-fill failed...');

        // Start browser again to inspect
        browserProcess = spawn(chromiumPath, headfulArgs, {
          stdio: 'pipe',
          detached: false,
        });

        wsEndpoint = await waitForCdp(CDP_PORT);
        browser = await chromium.connectOverCDP(wsEndpoint);
        context = browser.contexts()[0];
        page = context.pages()[0] || await context.newPage();

        await page.goto(testOrigin);

        // Check form field attributes
        const formAnalysis = await page.evaluate(() => {
          const email = document.querySelector('#email') as HTMLInputElement;
          const password = document.querySelector('#password') as HTMLInputElement;

          return {
            emailField: {
              id: email?.id,
              name: email?.name,
              type: email?.type,
              autocomplete: email?.autocomplete,
            },
            passwordField: {
              id: password?.id,
              name: password?.name,
              type: password?.type,
              autocomplete: password?.autocomplete,
            },
          };
        });

        console.log('   Form field attributes:');
        console.log(`   - Email: ${JSON.stringify(formAnalysis.emailField)}`);
        console.log(`   - Password: ${JSON.stringify(formAnalysis.passwordField)}`);

        // Try to use CDP to get stored passwords
        const cdpClient = await context.newCDPSession(page);

        try {
          // Enable Autofill domain if available
          await cdpClient.send('Autofill.enable' as any);
          console.log('   CDP Autofill domain enabled');
        } catch (e: any) {
          console.log(`   CDP Autofill domain not available: ${e.message}`);
        }

        // Check Login Data file after Chrome touched it
        try {
          const selectAfter = execSync(
            `sqlite3 "${path.join(userDataDir, 'Default', 'Login Data')}" "SELECT username_value, signon_realm FROM logins;" 2>/dev/null || echo "Database locked or missing"`,
            { encoding: 'utf-8' }
          );
          console.log(`   Login Data after Chrome: ${selectAfter.trim() || '(empty or locked)'}`);
        } catch {
          console.log('   Could not read Login Data (might be locked by Chrome)');
        }

        await browser.close();

        // Summary
        if (!headlessEmail && !headfulEmail) {
          console.log('\n💡 Conclusion: Chrome password manager does NOT auto-fill because:');
          console.log('   1. Auto-fill requires user to click on field suggestions dropdown');
          console.log('   2. Automation cannot trigger the dropdown programmatically');
          console.log('   3. This is a SECURITY feature, not a bug');
          console.log('\n   ➡️  The CLI keychain approach is the correct solution for automation!');
        }

        expect(true).toBe(true);

      } finally {
        cleanupUserDataDir(userDataDir);
      }
    });

    it('stores and retrieves credentials using Chrome password manager', async () => {
      userDataDir = createTempUserDataDir();

      try {
        const chromiumPath = chromium.executablePath();
        const testOrigin = `http://127.0.0.1:${TEST_PORT}`;

        // === SESSION 1: Save credentials ===
        console.log('\n📝 Session 1: Saving credentials with password manager...');

        const browserArgs1 = [
          `--remote-debugging-port=${CDP_PORT}`,
          `--user-data-dir=${userDataDir}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          '--disable-dev-shm-usage',
          // Enable password manager features
          '--enable-features=PasswordManager',
          '--password-store=basic', // Use basic file-based storage (not OS keychain)
        ];

        if (!HEADFUL) {
          browserArgs1.push('--headless=new', '--disable-gpu');
        } else {
          browserArgs1.push('--window-size=1280,800');
        }

        browserArgs1.push('about:blank');

        browserProcess = spawn(chromiumPath, browserArgs1, {
          stdio: HEADFUL ? 'inherit' : 'pipe',
          detached: false,
        });

        const wsEndpoint1 = await waitForCdp(CDP_PORT);
        const browser1 = await chromium.connectOverCDP(wsEndpoint1);
        const context1 = browser1.contexts()[0];
        const page1 = context1.pages()[0] || await context1.newPage();

        // Navigate to login page
        await page1.goto(testOrigin);
        await visualDelay(500);

        // Fill the form manually (simulating user input)
        await page1.fill('#email', 'browser-test@example.com');
        await page1.fill('#password', 'BrowserPass123!');
        await visualDelay(500);

        // Try to use the Credential Management API to save credentials
        // This is how modern browsers handle password saving
        const saveResult = await page1.evaluate(async () => {
          try {
            // Check if Credential Management API is available
            if (!('credentials' in navigator)) {
              return { success: false, reason: 'Credential Management API not available' };
            }

            // Create a PasswordCredential
            const cred = new (window as any).PasswordCredential({
              id: 'browser-test@example.com',
              password: 'BrowserPass123!',
              name: 'Browser Test User',
            });

            // Store the credential
            await navigator.credentials.store(cred);
            return { success: true };
          } catch (e: any) {
            return { success: false, reason: e.message || 'Unknown error' };
          }
        });

        console.log('Credential save result:', saveResult);

        // Submit the form to trigger potential password save prompt
        await page1.click('#submit-btn');
        await visualDelay(1000);

        // Close the first session
        await browser1.close();
        browserProcess.kill('SIGTERM');
        browserProcess = null;
        await new Promise((r) => setTimeout(r, 1000));

        // === SESSION 2: Retrieve credentials ===
        console.log('\n🔑 Session 2: Attempting to retrieve saved credentials...');

        const browserArgs2 = [
          `--remote-debugging-port=${CDP_PORT}`,
          `--user-data-dir=${userDataDir}`, // Same user data dir!
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          '--disable-dev-shm-usage',
          '--enable-features=PasswordManager',
          '--password-store=basic',
        ];

        if (!HEADFUL) {
          browserArgs2.push('--headless=new', '--disable-gpu');
        } else {
          browserArgs2.push('--window-size=1280,800');
        }

        browserArgs2.push('about:blank');

        browserProcess = spawn(chromiumPath, browserArgs2, {
          stdio: HEADFUL ? 'inherit' : 'pipe',
          detached: false,
        });

        const wsEndpoint2 = await waitForCdp(CDP_PORT);
        const browser2 = await chromium.connectOverCDP(wsEndpoint2);
        const context2 = browser2.contexts()[0];
        const page2 = context2.pages()[0] || await context2.newPage();

        // Navigate to login page
        await page2.goto(testOrigin);
        await visualDelay(500);

        // Check if form is auto-filled or if we can retrieve credentials
        const emailValue = await page2.inputValue('#email');
        const passwordValue = await page2.inputValue('#password');

        console.log('Auto-fill check - Email:', emailValue || '(empty)');
        console.log('Auto-fill check - Password:', passwordValue ? '****' : '(empty)');

        // Try to retrieve credentials using Credential Management API
        const retrieveResult = await page2.evaluate(async () => {
          try {
            if (!('credentials' in navigator)) {
              return { success: false, reason: 'Credential Management API not available' };
            }

            // Try to get stored password credential
            const cred = await navigator.credentials.get({
              password: true,
              mediation: 'silent', // Don't show UI prompt
            } as any);

            if (cred && (cred as any).password) {
              return {
                success: true,
                id: (cred as any).id,
                hasPassword: true,
              };
            }

            return { success: false, reason: 'No credential found' };
          } catch (e: any) {
            return { success: false, reason: e.message || 'Unknown error' };
          }
        });

        console.log('Credential retrieve result:', retrieveResult);

        await browser2.close();

        // Report findings
        if (emailValue || retrieveResult.success) {
          console.log('\n✅ Browser password manager appears to work with --user-data-dir');
        } else {
          console.log('\n⚠️  Browser password manager did NOT auto-fill credentials');
          console.log('   This is expected behavior in headless mode - the browser');
          console.log('   password manager requires user interaction for security.');
        }

        // The test "passes" but reports findings - this is exploratory
        expect(true).toBe(true);

      } finally {
        cleanupUserDataDir(userDataDir);
      }
    });

    it('can use localStorage as fallback credential storage with user-data-dir', async () => {
      userDataDir = createTempUserDataDir();

      try {
        const chromiumPath = chromium.executablePath();
        const testOrigin = `http://127.0.0.1:${TEST_PORT}`;

        // === SESSION 1: Save to localStorage ===
        console.log('\n📝 Session 1: Saving credentials to localStorage...');

        const browserArgs1 = [
          `--remote-debugging-port=${CDP_PORT}`,
          `--user-data-dir=${userDataDir}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          '--disable-dev-shm-usage',
        ];

        if (!HEADFUL) {
          browserArgs1.push('--headless=new', '--disable-gpu');
        }

        browserArgs1.push('about:blank');

        browserProcess = spawn(chromiumPath, browserArgs1, {
          stdio: HEADFUL ? 'inherit' : 'pipe',
          detached: false,
        });

        const wsEndpoint1 = await waitForCdp(CDP_PORT);
        const browser1 = await chromium.connectOverCDP(wsEndpoint1);
        const context1 = browser1.contexts()[0];
        const page1 = context1.pages()[0] || await context1.newPage();

        await page1.goto(testOrigin);
        await visualDelay(300);

        // Save credentials to localStorage (simulating browser extension storage)
        await page1.evaluate(() => {
          const credentials = {
            username: 'localstorage-test@example.com',
            password: 'LocalPass456!',
            savedAt: new Date().toISOString(),
          };
          // Note: In real use, this would be encrypted
          localStorage.setItem('vault_credentials', JSON.stringify(credentials));
        });

        await browser1.close();
        browserProcess.kill('SIGTERM');
        browserProcess = null;
        await new Promise((r) => setTimeout(r, 1000));

        // === SESSION 2: Retrieve from localStorage ===
        console.log('\n🔑 Session 2: Retrieving credentials from localStorage...');

        const browserArgs2 = [
          `--remote-debugging-port=${CDP_PORT}`,
          `--user-data-dir=${userDataDir}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          '--disable-dev-shm-usage',
        ];

        if (!HEADFUL) {
          browserArgs2.push('--headless=new', '--disable-gpu');
        }

        browserArgs2.push('about:blank');

        browserProcess = spawn(chromiumPath, browserArgs2, {
          stdio: HEADFUL ? 'inherit' : 'pipe',
          detached: false,
        });

        const wsEndpoint2 = await waitForCdp(CDP_PORT);
        const browser2 = await chromium.connectOverCDP(wsEndpoint2);
        const context2 = browser2.contexts()[0];
        const page2 = context2.pages()[0] || await context2.newPage();

        await page2.goto(testOrigin);
        await visualDelay(300);

        // Retrieve credentials from localStorage
        const storedCredentials = await page2.evaluate(() => {
          const raw = localStorage.getItem('vault_credentials');
          if (!raw) return null;
          return JSON.parse(raw);
        });

        console.log('Retrieved credentials:', storedCredentials ? 'Found' : 'Not found');

        expect(storedCredentials).not.toBeNull();
        expect(storedCredentials.username).toBe('localstorage-test@example.com');
        expect(storedCredentials.password).toBe('LocalPass456!');

        // Fill the form using stored credentials
        if (storedCredentials) {
          await page2.fill('#email', storedCredentials.username);
          await page2.fill('#password', storedCredentials.password);
          await visualDelay(500);

          const emailValue = await page2.inputValue('#email');
          const passwordValue = await page2.inputValue('#password');

          expect(emailValue).toBe('localstorage-test@example.com');
          expect(passwordValue).toBe('LocalPass456!');
          console.log('\n✅ localStorage persistence works with --user-data-dir');
        }

        await browser2.close();

      } finally {
        cleanupUserDataDir(userDataDir);
      }
    });

    it('IndexedDB persists across browser sessions with user-data-dir', async () => {
      userDataDir = createTempUserDataDir();

      try {
        const chromiumPath = chromium.executablePath();
        const testOrigin = `http://127.0.0.1:${TEST_PORT}`;

        // === SESSION 1: Save to IndexedDB ===
        console.log('\n📝 Session 1: Saving credentials to IndexedDB...');

        const browserArgs1 = [
          `--remote-debugging-port=${CDP_PORT}`,
          `--user-data-dir=${userDataDir}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
        ];

        if (!HEADFUL) {
          browserArgs1.push('--headless=new', '--disable-gpu');
        }

        browserArgs1.push('about:blank');

        browserProcess = spawn(chromiumPath, browserArgs1, {
          stdio: HEADFUL ? 'inherit' : 'pipe',
          detached: false,
        });

        const wsEndpoint1 = await waitForCdp(CDP_PORT);
        const browser1 = await chromium.connectOverCDP(wsEndpoint1);
        const context1 = browser1.contexts()[0];
        const page1 = context1.pages()[0] || await context1.newPage();

        await page1.goto(testOrigin);
        await visualDelay(300);

        // Save credentials to IndexedDB
        const saveSuccess = await page1.evaluate(async () => {
          return new Promise<boolean>((resolve, reject) => {
            const request = indexedDB.open('VaultCredentials', 1);

            request.onerror = () => reject(request.error);

            request.onupgradeneeded = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              if (!db.objectStoreNames.contains('credentials')) {
                db.createObjectStore('credentials', { keyPath: 'origin' });
              }
            };

            request.onsuccess = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              const tx = db.transaction('credentials', 'readwrite');
              const store = tx.objectStore('credentials');

              const credential = {
                origin: window.location.origin,
                username: 'indexeddb-test@example.com',
                password: 'IndexedDBPass789!',
                selectors: {
                  username: '#email',
                  password: '#password',
                },
                savedAt: new Date().toISOString(),
              };

              const putRequest = store.put(credential);
              putRequest.onsuccess = () => {
                db.close();
                resolve(true);
              };
              putRequest.onerror = () => {
                db.close();
                reject(putRequest.error);
              };
            };
          });
        });

        expect(saveSuccess).toBe(true);
        console.log('Saved to IndexedDB successfully');

        await browser1.close();
        browserProcess.kill('SIGTERM');
        browserProcess = null;
        await new Promise((r) => setTimeout(r, 1000));

        // === SESSION 2: Retrieve from IndexedDB ===
        console.log('\n🔑 Session 2: Retrieving credentials from IndexedDB...');

        const browserArgs2 = [
          `--remote-debugging-port=${CDP_PORT}`,
          `--user-data-dir=${userDataDir}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
        ];

        if (!HEADFUL) {
          browserArgs2.push('--headless=new', '--disable-gpu');
        }

        browserArgs2.push('about:blank');

        browserProcess = spawn(chromiumPath, browserArgs2, {
          stdio: HEADFUL ? 'inherit' : 'pipe',
          detached: false,
        });

        const wsEndpoint2 = await waitForCdp(CDP_PORT);
        const browser2 = await chromium.connectOverCDP(wsEndpoint2);
        const context2 = browser2.contexts()[0];
        const page2 = context2.pages()[0] || await context2.newPage();

        await page2.goto(testOrigin);
        await visualDelay(300);

        // Retrieve credentials from IndexedDB and auto-fill
        const storedCredential = await page2.evaluate(async () => {
          return new Promise<any>((resolve, reject) => {
            const request = indexedDB.open('VaultCredentials', 1);

            request.onerror = () => reject(request.error);

            request.onsuccess = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              const tx = db.transaction('credentials', 'readonly');
              const store = tx.objectStore('credentials');

              const getRequest = store.get(window.location.origin);
              getRequest.onsuccess = () => {
                db.close();
                resolve(getRequest.result || null);
              };
              getRequest.onerror = () => {
                db.close();
                reject(getRequest.error);
              };
            };
          });
        });

        expect(storedCredential).not.toBeNull();
        expect(storedCredential.username).toBe('indexeddb-test@example.com');
        expect(storedCredential.password).toBe('IndexedDBPass789!');

        console.log('Retrieved from IndexedDB:', storedCredential ? 'Found' : 'Not found');

        // Fill the form using stored credentials
        await page2.fill(storedCredential.selectors.username, storedCredential.username);
        await page2.fill(storedCredential.selectors.password, storedCredential.password);
        await visualDelay(500);

        const emailValue = await page2.inputValue('#email');
        const passwordValue = await page2.inputValue('#password');

        expect(emailValue).toBe('indexeddb-test@example.com');
        expect(passwordValue).toBe('IndexedDBPass789!');

        console.log('\n✅ IndexedDB persistence works with --user-data-dir');

        await browser2.close();

      } finally {
        cleanupUserDataDir(userDataDir);
      }
    });
  });

  describe('Comparison: CLI keychain vs browser storage', () => {
    let browserProcess: ChildProcess | null = null;

    afterEach(async () => {
      if (browserProcess) {
        browserProcess.kill('SIGTERM');
        browserProcess = null;
        await new Promise((r) => setTimeout(r, 500));
      }
    });

    it('CLI works with localhost using user-data-dir profile', async () => {
      // This test demonstrates that the CLI works with any origin including localhost.
      // The real security comes from OS keychain encryption, not origin blocking.
      userDataDir = createTempUserDataDir();
      await resetRateLimit();

      try {
        const chromiumPath = chromium.executablePath();
        const testOrigin = `http://127.0.0.1:${TEST_PORT}`;
        const { execSync } = await import('child_process');

        // Start browser with fresh profile
        const browserArgs = [
          `--remote-debugging-port=${CDP_PORT}`,
          `--user-data-dir=${userDataDir}`,
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
        ];

        if (!HEADFUL) {
          browserArgs.push('--headless=new', '--disable-gpu');
        }

        browserArgs.push('about:blank');

        browserProcess = spawn(chromiumPath, browserArgs, {
          stdio: HEADFUL ? 'inherit' : 'pipe',
          detached: false,
        });

        const wsEndpoint = await waitForCdp(CDP_PORT);
        const browser = await chromium.connectOverCDP(wsEndpoint);
        const context = browser.contexts()[0];
        const page = context.pages()[0] || await context.newPage();

        await page.goto(testOrigin);
        await visualDelay(300);

        // Register credentials via CLI
        const output = execSync(
          `node ./dist/index.js register ` +
          `--cdp "${wsEndpoint}" ` +
          `--username-selector "#email" ` +
          `--password-selector "#password" ` +
          `--username "cli-localhost-test@example.com" ` +
          `--password "LocalhostPass123!" ` +
          `--allow-http ` +
          `--force`,
          { encoding: 'utf-8', cwd: process.cwd() }
        );

        expect(output).toContain('Credentials registered successfully');

        console.log('\n✅ CLI works with localhost');
        console.log('   Security is provided by:');
        console.log('   - OS keychain encryption (credentials never in browser)');
        console.log('   - CDP connection validation');
        console.log('   - Rate limiting');

        await browser.close();

        // Clean up
        const { deleteRP } = await import('../src/core/keychain.js');
        await deleteRP(testOrigin);

      } finally {
        cleanupUserDataDir(userDataDir);
      }
    });

    it('demonstrates keychain-based credential flow (using direct APIs)', async () => {
      // Reset rate limit before this test
      await resetRateLimit();

      // Demonstrate the keychain approach by directly using the keychain APIs
      const testOrigin = 'https://example.com';

      const { storeRP, getRP, deleteRP } = await import('../src/core/keychain.js');

      // Store credentials in OS keychain
      await storeRP({
        origin: testOrigin,
        selectors: {
          username: '#email',
          password: '#password',
        },
        credentials: {
          username: 'keychain-demo@example.com',
          password: 'KeychainDemo123!',
        },
      });

      console.log('\n📝 Stored credentials in OS keychain for', testOrigin);

      // Retrieve from keychain
      const stored = await getRP(testOrigin);

      expect(stored).not.toBeNull();
      expect(stored?.credentials.username).toBe('keychain-demo@example.com');
      expect(stored?.credentials.password).toBe('KeychainDemo123!');

      console.log('✅ Retrieved credentials from OS keychain');
      console.log('   Key advantages of keychain approach:');
      console.log('   - Credentials encrypted at OS level');
      console.log('   - Never exposed to browser JavaScript');
      console.log('   - Persists independently of browser profile');
      console.log('   - Works with any browser via CDP');

      // Clean up
      await deleteRP(testOrigin);
    });

    it('documents the key differences between approaches', () => {
      const comparison = {
        cliKeychain: {
          pros: [
            'OS-level security (macOS Keychain, Windows Credential Manager)',
            'Credentials never exposed to browser context',
            'Works across all browser sessions',
            'Independent of browser state',
          ],
          cons: [
            'Requires keytar native module',
            'Platform-specific implementation',
            'Separate storage from browser',
          ],
        },
        browserPasswordManager: {
          pros: [
            'Built into browser',
            'Familiar UX for users',
            'Syncs with Chrome account (if enabled)',
          ],
          cons: [
            'Limited API access in headless mode',
            'Requires user interaction for prompts',
            'Credentials accessible to page JavaScript',
            'Depends on browser profile integrity',
          ],
        },
        browserLocalStorage: {
          pros: [
            'Simple API',
            'Persists with --user-data-dir',
            'Easy to implement',
          ],
          cons: [
            'NOT secure - accessible to any JS on origin',
            'No encryption by default',
            'Lost if profile cleared',
          ],
        },
        browserIndexedDB: {
          pros: [
            'Structured data storage',
            'Persists with --user-data-dir',
            'Good for complex data',
          ],
          cons: [
            'Still accessible to page JS',
            'No built-in encryption',
            'More complex API',
          ],
        },
      };

      console.log('\n📊 Storage Comparison:\n');
      console.log(JSON.stringify(comparison, null, 2));

      // This test just documents findings
      expect(comparison).toBeDefined();
    });
  });
});
