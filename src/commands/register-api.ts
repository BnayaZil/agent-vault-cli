import { extractAndValidateOriginSecure, type OriginValidationOptions } from '../core/origin.js';
import { getAPICredentials, addAPICredential } from '../core/keychain.js';
import type { APICredential } from '../types/index.js';

export interface RegisterAPIOptions {
  origin: string;
  name: string;
  description?: string;
  token: string;
  setDefault?: boolean;
  force?: boolean;
  allowHttp?: boolean;
}

export async function registerAPI(options: RegisterAPIOptions): Promise<void> {
  // Validate origin
  const originOptions: OriginValidationOptions = {
    allowHttp: options.allowHttp,
  };
  const origin = await extractAndValidateOriginSecure(options.origin, originOptions);

  // Check if credential name already exists
  const existing = await getAPICredentials(origin);
  if (existing) {
    const existingCred = existing.credentials.find((c) => c.name === options.name);
    if (existingCred && !options.force) {
      throw new Error(
        `Credential '${options.name}' already exists for ${origin}. Use --force to overwrite.`
      );
    }
  }

  // Create credential
  const credential: APICredential = {
    name: options.name,
    description: options.description,
    token: options.token,
    createdAt: new Date().toISOString(),
  };

  // Add credential
  await addAPICredential(origin, credential);

  // Set as default if requested
  if (options.setDefault) {
    const updated = await getAPICredentials(origin);
    if (updated) {
      updated.defaultCredential = options.name;
      const { storeAPICredentials } = await import('../core/keychain.js');
      await storeAPICredentials(updated);
    }
  }

  console.log(`API credential '${options.name}' registered for ${origin}`);
  if (options.setDefault) {
    console.log(`Set as default credential for ${origin}`);
  }
}
