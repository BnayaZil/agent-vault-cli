import inquirer from 'inquirer';
import { connectToBrowser, fillField, validateSelector } from '../core/browser.js';
import { extractAndValidateOrigin } from '../core/origin.js';
import { storeRP, getRP } from '../core/keychain.js';
import { generatePassword } from '../core/crypto.js';
import { getConfigValue } from '../core/config.js';
import type { Selectors } from '../types/index.js';

export interface RegisterOptions {
  cdp: string;
  usernameSelector: string;
  passwordSelector: string;
  submitSelector?: string;
  // Non-interactive options
  username?: string;
  password?: string;
  generatePassword?: boolean;
  force?: boolean;
}

export async function register(options: RegisterOptions): Promise<void> {
  const { browser, page } = await connectToBrowser(options.cdp);

  try {
    const currentUrl = page.url();
    const origin = extractAndValidateOrigin(currentUrl);

    // Validate selectors exist on page
    const usernameValid = await validateSelector(page, options.usernameSelector);
    const passwordValid = await validateSelector(page, options.passwordSelector);

    if (!usernameValid) {
      throw new Error(`Username selector not found: ${options.usernameSelector}`);
    }

    if (!passwordValid) {
      throw new Error(`Password selector not found: ${options.passwordSelector}`);
    }

    if (options.submitSelector) {
      const submitValid = await validateSelector(page, options.submitSelector);
      if (!submitValid) {
        console.warn(`Warning: Submit selector not found: ${options.submitSelector}`);
      }
    }

    // Check if already registered
    const existing = await getRP(origin);
    if (existing) {
      if (options.force) {
        // Non-interactive: overwrite without prompting
      } else {
        const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Credentials already exist for ${origin}. Overwrite?`,
            default: false,
          },
        ]);

        if (!overwrite) {
          console.log('Registration cancelled.');
          return;
        }
      }
    }

    // Confirm registration (skip if force or username provided non-interactively)
    if (!options.force && !options.username) {
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Register credentials for ${origin}?`,
          default: true,
        },
      ]);

      if (!confirm) {
        console.log('Registration cancelled.');
        return;
      }
    }

    // Get username
    let username: string;
    if (options.username) {
      username = options.username;
    } else {
      const defaultUsername = await getConfigValue('defaultUsername');
      const response = await inquirer.prompt<{ username: string }>([
        {
          type: 'input',
          name: 'username',
          message: 'Enter username/email:',
          default: defaultUsername,
          validate: (input) => input.length > 0 || 'Username is required',
        },
      ]);
      username = response.username;
    }

    // Get password
    let password: string;
    if (options.password) {
      password = options.password;
    } else if (options.generatePassword) {
      password = generatePassword();
      console.log(`Generated password: ${password.slice(0, 2)}${'*'.repeat(password.length - 4)}${password.slice(-2)}`);
      console.log('(Full password will be stored securely in keychain)');
    } else {
      const { passwordOption } = await inquirer.prompt<{ passwordOption: string }>([
        {
          type: 'list',
          name: 'passwordOption',
          message: 'Password:',
          choices: [
            { name: 'Generate secure password', value: 'generate' },
            { name: 'Enter existing password', value: 'enter' },
          ],
        },
      ]);

      if (passwordOption === 'generate') {
        password = generatePassword();
        console.log(`Generated password: ${password.slice(0, 2)}${'*'.repeat(password.length - 4)}${password.slice(-2)}`);
        console.log('(Full password will be stored securely in keychain)');
      } else {
        const { enteredPassword } = await inquirer.prompt<{ enteredPassword: string }>([
          {
            type: 'password',
            name: 'enteredPassword',
            message: 'Enter password:',
            mask: '*',
            validate: (input) => input.length > 0 || 'Password is required',
          },
        ]);
        password = enteredPassword;
      }
    }

    const selectors: Selectors = {
      username: options.usernameSelector,
      password: options.passwordSelector,
      submit: options.submitSelector,
    };

    // Fill form fields
    await fillField(page, options.usernameSelector, username);
    await fillField(page, options.passwordSelector, password);

    // Store in keychain
    await storeRP({
      origin,
      selectors,
      credentials: { username, password },
    });

    console.log('Credentials registered successfully');
    console.log('Complete signup/login in browser.');
  } finally {
    // Clear sensitive data from memory
    username = '';
    password = '';
    await browser.close();
  }
}
