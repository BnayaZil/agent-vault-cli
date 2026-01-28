import keytar from 'keytar';
import type { RPConfig } from '../types/index.js';

const SERVICE_NAME = 'agent-vault';

export async function storeRP(config: RPConfig): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, config.origin, JSON.stringify(config));
}

export async function getRP(origin: string): Promise<RPConfig | null> {
  const data = await keytar.getPassword(SERVICE_NAME, origin);
  return data ? JSON.parse(data) : null;
}

export async function deleteRP(origin: string): Promise<boolean> {
  return await keytar.deletePassword(SERVICE_NAME, origin);
}
