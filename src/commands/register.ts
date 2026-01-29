import inquirer from 'inquirer';
import { connectToBrowser, fillField, validateSelector } from '../core/browser.js';
import {
  extractAndValidateOrigin,
  extractAndValidateOriginSecure,
  type OriginValidationOptions,
} from '../core/origin.js';
import { storeRP, getRP } from '../core/keychain.js';
import { generatePassword } from '../core/crypto.js';
import { getConfigValue } from '../core/config.js';
import { SecureString } from '../core/secure-memory.js';
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
  allowHttp?: boolean;
}

export async function register(options: RegisterOptions): Promise<void> {
  const { browser, page } = await connectToBrowser(options.cdp);

  // Use SecureString for sensitive credential handling
  let secureUsername: SecureString | null = null;
  let securePassword: SecureString | null = null;

  try {
    const currentUrl = page.url();

    // Use secure origin validation with HTTP blocking
    const originOptions: OriginValidationOptions = {
      allowHttp: options.allowHttp,
    };
    const origin = await extractAndValidateOriginSecure(currentUrl, originOptions);

    // Validate selectors exist on page (don't expose selector in error)
    const usernameValid = await validateSelector(page, options.usernameSelector);
    const passwordValid = await validateSelector(page, options.passwordSelector);

    if (!usernameValid) {
      throw new Error('Username field selector not found on page');
    }

    if (!passwordValid) {
      throw new Error('Password field selector not found on page');
    }

    if (options.submitSelector) {
      const submitValid = await validateSelector(page, options.submitSelector);
      if (!submitValid) {
        console.warn('Warning: Submit button selector not found on page');
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
            message: `Credentials already exist for this site. Overwrite?`,
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
          message: `Register credentials for this site?`,
          default: true,
        },
      ]);

      if (!confirm) {
        console.log('Registration cancelled.');
        return;
      }
    }

    // Get username
    let usernameValue: string;
    if (options.username) {
      usernameValue = options.username;
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
      usernameValue = response.username;
    }
    secureUsername = new SecureString(usernameValue);

    // Get password
    let passwordValue: string;
    if (options.password) {
      passwordValue = options.password;
    } else if (options.generatePassword) {
      passwordValue = generatePassword();
      // Security: Don't preview any part of the password
      console.log('Secure password generated (stored in keychain)');
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
        passwordValue = generatePassword();
        // Security: Don't preview any part of the password
        console.log('Secure password generated (stored in keychain)');
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
        passwordValue = enteredPassword;
      }
    }
    securePassword = new SecureString(passwordValue);

    const selectors: Selectors = {
      username: options.usernameSelector,
      password: options.passwordSelector,
      submit: options.submitSelector,
    };

    // Fill form fields using secure values
    await fillField(page, options.usernameSelector, secureUsername.getValue());
    await fillField(page, options.passwordSelector, securePassword.getValue());

    // Store in keychain
    await storeRP({
      origin,
      selectors,
      credentials: {
        username: secureUsername.getValue(),
        password: securePassword.getValue(),
      },
    });

    console.log('Credentials registered successfully');
    console.log('Complete signup/login in browser.');
  } finally {
    // Securely clear sensitive data from memory
    if (secureUsername) secureUsername.clear();
    if (securePassword) securePassword.clear();
    await browser.close();
  }
}
