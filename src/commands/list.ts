import { listRPs } from '../core/keychain.js';

export async function list(): Promise<void> {
  const origins = await listRPs();

  if (origins.length === 0) {
    console.log('No registered sites.');
    return;
  }

  console.log('Registered sites:');
  for (const origin of origins) {
    console.log(`  • ${origin}`);
  }
}
