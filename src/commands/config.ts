import {
  loadConfig,
  getConfigValue,
  setConfigValue,
  unsetConfigValue,
  isValidConfigKey,
  getValidConfigKeys,
} from '../core/config.js';
import type { ConfigKey } from '../types/index.js';

export type ConfigAction = 'get' | 'set' | 'unset' | 'list';

export interface ConfigOptions {
  action: ConfigAction;
  key?: string;
  value?: string;
}

export async function config(options: ConfigOptions): Promise<void> {
  const { action, key, value } = options;

  switch (action) {
    case 'list': {
      const cfg = await loadConfig();
      const entries = Object.entries(cfg);
      if (entries.length === 0) {
        console.log('No configuration values set.');
        console.log(`Available keys: ${getValidConfigKeys().join(', ')}`);
      } else {
        for (const [k, v] of entries) {
          console.log(`${k}=${v}`);
        }
      }
      break;
    }

    case 'get': {
      if (!key) {
        throw new Error('Key is required for get operation');
      }
      if (!isValidConfigKey(key)) {
        throw new Error(`Invalid config key: ${key}. Valid keys: ${getValidConfigKeys().join(', ')}`);
      }
      const val = await getConfigValue(key as ConfigKey);
      if (val !== undefined) {
        console.log(val);
      } else {
        console.log(`(not set)`);
      }
      break;
    }

    case 'set': {
      if (!key) {
        throw new Error('Key is required for set operation');
      }
      if (!isValidConfigKey(key)) {
        throw new Error(`Invalid config key: ${key}. Valid keys: ${getValidConfigKeys().join(', ')}`);
      }
      if (!value) {
        throw new Error('Value is required for set operation');
      }
      await setConfigValue(key as ConfigKey, value);
      console.log(`✓ Set ${key}=${value}`);
      break;
    }

    case 'unset': {
      if (!key) {
        throw new Error('Key is required for unset operation');
      }
      if (!isValidConfigKey(key)) {
        throw new Error(`Invalid config key: ${key}. Valid keys: ${getValidConfigKeys().join(', ')}`);
      }
      const deleted = await unsetConfigValue(key as ConfigKey);
      if (deleted) {
        console.log(`✓ Unset ${key}`);
      } else {
        console.log(`${key} was not set`);
      }
      break;
    }
  }
}
