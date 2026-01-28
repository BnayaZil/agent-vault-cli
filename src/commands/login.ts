import { connectToBrowser, fillField, clickElement } from '../core/browser.js';
import { extractOrigin } from '../core/origin.js';
import { getRP } from '../core/keychain.js';

interface LoginOptions {
  cdp: string;
  submit?: boolean;
}

export async function login(options: LoginOptions): Promise<void> {
  const { browser, page } = await connectToBrowser(options.cdp);

  try {
    const currentUrl = page.url();
    const origin = extractOrigin(currentUrl);

    // Lookup stored config for this origin
    const config = await getRP(origin);

    if (!config) {
      throw new Error(`Unknown RP: No credentials stored for ${origin}`);
    }

    // Fill username and password using STORED selectors
    await fillField(page, config.selectors.username, config.credentials.username);
    await fillField(page, config.selectors.password, config.credentials.password);

    // Optionally click submit
    if (options.submit && config.selectors.submit) {
      await clickElement(page, config.selectors.submit);
    }

    console.log(`✓ Login filled for ${origin}`);
  } finally {
    await browser.close();
  }
}
