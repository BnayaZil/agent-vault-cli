import { connectToBrowser, fillField, clickElement } from '../core/browser.js';
import { extractOrigin, extractAndValidateOrigin } from '../core/origin.js';
import { getRP } from '../core/keychain.js';

interface LoginOptions {
  cdp: string;
  submit?: boolean;
}

export async function login(options: LoginOptions): Promise<void> {
  const { browser, page } = await connectToBrowser(options.cdp);

  try {
    const currentUrl = page.url();
    const origin = extractAndValidateOrigin(currentUrl);

    // Lookup stored config for this origin
    const config = await getRP(origin);

    if (!config) {
      throw new Error('No credentials found for this site');
    }

    // Verify origin hasn't changed before filling
    const verifyOrigin = extractOrigin(page.url());
    if (verifyOrigin !== origin) {
      throw new Error('Page navigation detected - aborting for security');
    }

    // Fill username and password using STORED selectors
    await fillField(page, config.selectors.username, config.credentials.username);
    await fillField(page, config.selectors.password, config.credentials.password);

    // Verify again after filling
    const postFillOrigin = extractOrigin(page.url());
    if (postFillOrigin !== origin) {
      throw new Error('Page changed during credential fill - possible attack');
    }

    // Optionally click submit
    if (options.submit && config.selectors.submit) {
      await clickElement(page, config.selectors.submit);
    }

    console.log('Login filled successfully');
  } finally {
    await browser.close();
  }
}
