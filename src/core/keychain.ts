import keytar from 'keytar';
import type { RPConfig } from '../types/index.js';

const SERVICE_NAME = 'agent-vault';

export async function storeRP(config: RPConfig): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, config.origin, JSON.stringify(config));
}

export async function getRP(origin: string): Promise<RPConfig | null> {
  try {
    const data = await keytar.getPassword(SERVICE_NAME, origin);
    if (!data) return null;

    const parsed = JSON.parse(data);
    // Validate structure
    if (!parsed.origin || !parsed.selectors || !parsed.credentials) {
      console.error('Corrupted credential data detected');
      return null;
    }
    return parsed as RPConfig;
  } catch {
    // Don't expose internal errors
    console.error('Failed to retrieve credentials');
    return null;
  }
}

export async function deleteRP(origin: string): Promise<boolean> {
  return await keytar.deletePassword(SERVICE_NAME, origin);
}
