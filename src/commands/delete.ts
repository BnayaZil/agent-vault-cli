import inquirer from 'inquirer';
import { deleteRP, getRP } from '../core/keychain.js';

interface DeleteOptions {
  origin: string;
  force?: boolean;
}

export async function deleteCommand(options: DeleteOptions): Promise<void> {
  const config = await getRP(options.origin);

  if (!config) {
    throw new Error(`No credentials found for ${options.origin}`);
  }

  if (!options.force) {
    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Delete credentials for ${options.origin}?`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log('Deletion cancelled.');
      return;
    }
  }

  const deleted = await deleteRP(options.origin);

  if (deleted) {
    console.log(`✓ Deleted credentials for ${options.origin}`);
  } else {
    throw new Error(`Failed to delete credentials for ${options.origin}`);
  }
}
