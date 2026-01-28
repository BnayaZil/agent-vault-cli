import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { VaultConfig, ConfigKey } from '../types/index.js';

const CONFIG_DIR = join(homedir(), '.agent-vault');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

async function ensureConfigDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
}

export async function loadConfig(): Promise<VaultConfig> {
  try {
    const data = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export async function saveConfig(config: VaultConfig): Promise<void> {
  await ensureConfigDir();
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export async function getConfigValue(key: ConfigKey): Promise<string | undefined> {
  const config = await loadConfig();
  return config[key];
}

export async function setConfigValue(key: ConfigKey, value: string): Promise<void> {
  const config = await loadConfig();
  config[key] = value;
  await saveConfig(config);
}

export async function unsetConfigValue(key: ConfigKey): Promise<boolean> {
  const config = await loadConfig();
  if (key in config) {
    delete config[key];
    await saveConfig(config);
    return true;
  }
  return false;
}

export function isValidConfigKey(key: string): key is ConfigKey {
  const validKeys: ConfigKey[] = ['defaultUsername'];
  return validKeys.includes(key as ConfigKey);
}

export function getValidConfigKeys(): ConfigKey[] {
  return ['defaultUsername'];
}
