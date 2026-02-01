import { chromium } from 'playwright-chromium';
import type { BrowserConnection } from '../types/index.js';
import { getConfigValue } from './config.js';

const CDP_TIMEOUT_MS = 10000;

// Default allowed CDP hosts for security
const DEFAULT_CDP_ALLOWLIST = ['127.0.0.1', 'localhost', '::1'];

/**
 * Parse CDP allowlist from config
 */
async function getCdpAllowlist(): Promise<string[]> {
  const configValue = await getConfigValue('cdpAllowlist');
  if (configValue) {
    return configValue.split(',').map((h) => h.trim().toLowerCase());
  }
  return DEFAULT_CDP_ALLOWLIST;
}

/**
 * Check if a CDP endpoint host is in the allowlist
 */
async function isAllowedCdpHost(hostname: string): Promise<boolean> {
  const allowlist = await getCdpAllowlist();
  return allowlist.includes(hostname.toLowerCase());
}

export async function validateCDPEndpoint(endpoint: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error('Invalid CDP endpoint format');
  }

  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    throw new Error('CDP endpoint must use WebSocket protocol');
  }

  if (!url.hostname) {
    throw new Error('CDP endpoint must have a valid hostname');
  }

  // Check against allowlist
  const isAllowed = await isAllowedCdpHost(url.hostname);
  if (!isAllowed) {
    throw new Error(
      'CDP endpoint host is not in the allowlist. ' +
        'Add it with: vault config set cdpAllowlist "host1,host2"'
    );
  }
}

export async function connectToBrowser(cdpEndpoint: string): Promise<BrowserConnection> {
  await validateCDPEndpoint(cdpEndpoint);

  let browser;
  try {
    browser = await Promise.race([
      chromium.connectOverCDP(cdpEndpoint),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('CDP connection timeout')), CDP_TIMEOUT_MS)
      ),
    ]);
  } catch (error) {
    // Sanitize connection errors - don't expose internal details
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error('CDP connection timeout - ensure browser is running with remote debugging');
      }
      if (error.message.includes('ECONNREFUSED')) {
        throw new Error('Cannot connect to CDP endpoint - ensure browser is running');
      }
    }
    throw new Error('Failed to connect to browser');
  }

  const contexts = browser.contexts();

  if (contexts.length === 0) {
    await browser.close();
    throw new Error('No browser context available');
  }

  const pages = contexts[0].pages();

  if (pages.length === 0) {
    await browser.close();
    throw new Error('No browser page available');
  }

  return { browser, page: pages[0] };
}

export async function fillField(
  page: BrowserConnection['page'],
  selector: string,
  value: string
): Promise<void> {
  try {
    await page.fill(selector, value);
  } catch {
    // Sanitize selector errors - don't expose selector in error message
    throw new Error('Failed to fill form field - selector may be invalid');
  }
}

export async function clickElement(
  page: BrowserConnection['page'],
  selector: string
): Promise<void> {
  try {
    await page.click(selector);
  } catch {
    // Sanitize selector errors
    throw new Error('Failed to click element - selector may be invalid');
  }
}

export async function validateSelector(
  page: BrowserConnection['page'],
  selector: string
): Promise<boolean> {
  try {
    const element = await page.$(selector);
    return element !== null;
  } catch {
    return false;
  }
}
