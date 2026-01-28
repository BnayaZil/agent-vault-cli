import { chromium } from 'playwright';
import type { BrowserConnection } from '../types/index.js';

export async function connectToBrowser(cdpEndpoint: string): Promise<BrowserConnection> {
  const browser = await chromium.connectOverCDP(cdpEndpoint);
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
