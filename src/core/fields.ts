import type { Page } from 'playwright-chromium';

const USERNAME_SELECTORS = [
  'input[type="email"]',
  'input[name="email"]',
  'input[autocomplete="username"]',
  'input[autocomplete="email"]',
  'input[name="username"]',
  'input[id="username"]',
  'input[id="email"]',
];

const PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[autocomplete="current-password"]',
  'input[autocomplete="new-password"]',
];

const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'button:has-text("Log in")',
  'button:has-text("Sign in")',
  'button:has-text("Login")',
];

export async function detectUsernameField(page: Page): Promise<string | null> {
  for (const selector of USERNAME_SELECTORS) {
    const element = await page.$(selector);
    if (element && await element.isVisible()) {
      return selector;
    }
  }
  return null;
}

export async function detectPasswordField(page: Page): Promise<string | null> {
  for (const selector of PASSWORD_SELECTORS) {
    const element = await page.$(selector);
    if (element && await element.isVisible()) {
      return selector;
    }
  }
  return null;
}

export async function detectSubmitButton(page: Page): Promise<string | null> {
  for (const selector of SUBMIT_SELECTORS) {
    try {
      const element = await page.$(selector);
      if (element && await element.isVisible()) {
        return selector;
      }
    } catch {
      // Some selectors might not be valid, continue
    }
  }
  return null;
}
