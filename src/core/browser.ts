import { chromium } from 'playwright';
import type { BrowserConnection } from '../types/index.js';

const CDP_TIMEOUT_MS = 10000;

export function validateCDPEndpoint(endpoint: string): void {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
      throw new Error('CDP endpoint must use ws:// or wss:// protocol');
    }
    if (!url.hostname) {
      throw new Error('CDP endpoint must have a valid hostname');
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Invalid CDP endpoint URL');
    }
    throw error;
  }
}

export async function connectToBrowser(cdpEndpoint: string): Promise<BrowserConnection> {
  validateCDPEndpoint(cdpEndpoint);

  const browser = await Promise.race([
    chromium.connectOverCDP(cdpEndpoint),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('CDP connection timeout')), CDP_TIMEOUT_MS)
    ),
  ]);
  const contexts = browser.contexts();

  if (contexts.length === 0) {
    throw new Error('No browser context found');
  }

  const pages = contexts[0].pages();

  if (pages.length === 0) {
    throw new Error('No page found');
  }

  return { browser, page: pages[0] };
}

export async function fillField(page: BrowserConnection['page'], selector: string, value: string): Promise<void> {
  await page.fill(selector, value);
}

export async function clickElement(page: BrowserConnection['page'], selector: string): Promise<void> {
  await page.click(selector);
}

export async function validateSelector(page: BrowserConnection['page'], selector: string): Promise<boolean> {
  try {
    const element = await page.$(selector);
    return element !== null;
  } catch {
    return false;
  }
}
