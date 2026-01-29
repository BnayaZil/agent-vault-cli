import inquirer from 'inquirer';
import { getRP, rotatePassword } from '../core/keychain.js';
import { generatePassword } from '../core/crypto.js';
import { isValidOrigin } from '../core/origin.js';
import { SecureString } from '../core/secure-memory.js';

export interface RotateOptions {
  origin: string;
  generatePassword?: boolean;
  password?: string;
  force?: boolean;
}

export async function rotate(options: RotateOptions): Promise<void> {
  // Validate origin format
  if (!isValidOrigin(options.origin)) {
    throw new Error('Invalid origin format');
  }

  // Check if credentials exist
  const existing = await getRP(options.origin);
  if (!existing) {
    throw new Error('No credentials found for this origin');
  }

  // Confirm rotation
  if (!options.force) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Rotate password for this site? The old password will be replaced.',
        default: false,
      },
    ]);

    if (!confirm) {
      console.log('Rotation cancelled.');
      return;
    }
  }

  // Get new password
  let securePassword: SecureString | null = null;

  try {
    let newPassword: string;

    if (options.password) {
      newPassword = options.password;
    } else if (options.generatePassword) {
      newPassword = generatePassword();
      console.log('New secure password generated');
    } else {
      const { passwordOption } = await inquirer.prompt<{ passwordOption: string }>([
        {
          type: 'list',
          name: 'passwordOption',
          message: 'New password:',
          choices: [
            { name: 'Generate secure password', value: 'generate' },
            { name: 'Enter new password', value: 'enter' },
          ],
        },
      ]);

      if (passwordOption === 'generate') {
        newPassword = generatePassword();
        console.log('New secure password generated');
      } else {
        const { enteredPassword } = await inquirer.prompt<{ enteredPassword: string }>([
          {
            type: 'password',
            name: 'enteredPassword',
            message: 'Enter new password:',
            mask: '*',
            validate: (input) => input.length > 0 || 'Password is required',
          },
        ]);
        newPassword = enteredPassword;
      }
    }

    securePassword = new SecureString(newPassword);

    // Rotate the password
    const success = await rotatePassword(options.origin, securePassword.getValue());

    if (success) {
      console.log('Password rotated successfully');
      console.log('Remember to update your password on the website.');
    } else {
      throw new Error('Failed to rotate password');
    }
  } finally {
    // Securely clear password from memory
    if (securePassword) {
      securePassword.clear();
    }
  }
}
