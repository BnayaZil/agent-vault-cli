import { readFile, writeFile, mkdir, chmod, access, constants } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { lock, unlock } from 'proper-lockfile';
import type { VaultConfig, ConfigKey } from '../types/index.js';
import { logAuditEvent } from './audit.js';

const CONFIG_DIR = join(homedir(), '.agent-vault');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

// Secure file permissions: owner read/write only
const SECURE_DIR_MODE = 0o700;
const SECURE_FILE_MODE = 0o600;

async function ensureConfigDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true, mode: SECURE_DIR_MODE });
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
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

  const exists = await fileExists(CONFIG_FILE);

  // Create empty file if it doesn't exist (for locking)
  if (!exists) {
    await writeFile(CONFIG_FILE, '{}', { mode: SECURE_FILE_MODE });
  }

  // Use file locking to prevent race conditions
  let release: (() => Promise<void>) | null = null;
  try {
    release = await lock(CONFIG_FILE, { retries: 3 });
    await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: SECURE_FILE_MODE });
    // Ensure permissions are set correctly
    await chmod(CONFIG_FILE, SECURE_FILE_MODE);
  } finally {
    if (release) {
      await release();
    }
  }
}

export async function getConfigValue(key: ConfigKey): Promise<string | undefined> {
  const config = await loadConfig();
  return config[key];
}

export async function setConfigValue(key: ConfigKey, value: string): Promise<void> {
  const config = await loadConfig();
  config[key] = value;
  await saveConfig(config);
  await logAuditEvent('config_changed', { details: `Key: ${key}` });
}

export async function unsetConfigValue(key: ConfigKey): Promise<boolean> {
  const config = await loadConfig();
  if (key in config) {
    delete config[key];
    await saveConfig(config);
    await logAuditEvent('config_changed', { details: `Key removed: ${key}` });
    return true;
  }
  return false;
}

export function isValidConfigKey(key: string): key is ConfigKey {
  const validKeys: ConfigKey[] = ['defaultUsername', 'allowHttp', 'cdpAllowlist'];
  return validKeys.includes(key as ConfigKey);
}

export function getValidConfigKeys(): ConfigKey[] {
  return ['defaultUsername', 'allowHttp', 'cdpAllowlist'];
}
