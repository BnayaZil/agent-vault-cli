import keytar from 'keytar';
import { z } from 'zod';
import type { RPConfig, APICredential, APICredentials } from '../types/index.js';
import { logAuditEvent } from './audit.js';
import { checkRateLimit } from './ratelimit.js';

const SERVICE_NAME = 'agent-vault';
const API_SERVICE_NAME = 'agent-vault-api';

// Zod schema for strict validation of stored credentials
const SelectorsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  submit: z.string().optional(),
});

const CredentialsSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const RPConfigSchema = z.object({
  origin: z.string().url(),
  selectors: SelectorsSchema,
  credentials: CredentialsSchema,
});

/**
 * Validate RPConfig data against schema
 */
function validateRPConfig(data: unknown): RPConfig | null {
  const result = RPConfigSchema.safeParse(data);
  if (!result.success) {
    return null;
  }
  return result.data;
}

export async function storeRP(config: RPConfig): Promise<void> {
  // Rate limit credential storage
  await checkRateLimit('store_credentials');

  // Validate config before storing
  const validated = validateRPConfig(config);
  if (!validated) {
    throw new Error('Invalid credential configuration');
  }

  await keytar.setPassword(SERVICE_NAME, config.origin, JSON.stringify(validated));
  await logAuditEvent('credential_stored', { origin: config.origin });
}

export async function getRP(origin: string): Promise<RPConfig | null> {
  try {
    // Rate limit credential retrieval
    await checkRateLimit('get_credentials');

    const data = await keytar.getPassword(SERVICE_NAME, origin);
    if (!data) {
      await logAuditEvent('credential_retrieved', { origin, success: false });
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      // Corrupted JSON data
      await logAuditEvent('credential_retrieved', {
        origin,
        details: 'Corrupted data',
        success: false,
      });
      return null;
    }

    // Validate with zod schema
    const validated = validateRPConfig(parsed);
    if (!validated) {
      await logAuditEvent('credential_retrieved', {
        origin,
        details: 'Schema validation failed',
        success: false,
      });
      return null;
    }

    await logAuditEvent('credential_retrieved', { origin, success: true });
    return validated;
  } catch (error) {
    // Don't expose internal errors - use generic message
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error; // Re-throw rate limit errors
    }
    await logAuditEvent('credential_retrieved', {
      origin,
      details: 'Internal error',
      success: false,
    });
    return null;
  }
}

export async function deleteRP(origin: string): Promise<boolean> {
  // Rate limit credential deletion
  await checkRateLimit('delete_credentials');

  const result = await keytar.deletePassword(SERVICE_NAME, origin);
  await logAuditEvent('credential_deleted', { origin, success: result });
  return result;
}

// API Credentials (for vault curl)

const APICredentialSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  token: z.string().min(1),
  createdAt: z.string(),
  lastUsedAt: z.string().optional(),
});

const APICredentialsSchema = z.object({
  origin: z.string().url(),
  credentials: z.array(APICredentialSchema),
  defaultCredential: z.string().optional(),
});

/**
 * Validate APICredentials data against schema
 */
function validateAPICredentials(data: unknown): APICredentials | null {
  const result = APICredentialsSchema.safeParse(data);
  if (!result.success) {
    return null;
  }
  return result.data;
}

/**
 * Store API credentials for an origin
 */
export async function storeAPICredentials(credentials: APICredentials): Promise<void> {
  await checkRateLimit('store_credentials');

  // Validate before storing
  const validated = validateAPICredentials(credentials);
  if (!validated) {
    throw new Error('Invalid API credential configuration');
  }

  // Check for duplicate names
  const names = validated.credentials.map((c) => c.name);
  const uniqueNames = new Set(names);
  if (names.length !== uniqueNames.size) {
    throw new Error('Credential names must be unique within an origin');
  }

  await keytar.setPassword(API_SERVICE_NAME, credentials.origin, JSON.stringify(validated));
  await logAuditEvent('api_credential_stored', { origin: credentials.origin });
}

/**
 * Get all API credentials for an origin
 */
export async function getAPICredentials(origin: string): Promise<APICredentials | null> {
  try {
    await checkRateLimit('get_credentials');

    const data = await keytar.getPassword(API_SERVICE_NAME, origin);
    if (!data) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return null;
    }

    const validated = validateAPICredentials(parsed);
    if (!validated) {
      return null;
    }

    return validated;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error;
    }
    return null;
  }
}

/**
 * List all origins that have API credentials
 */
export async function listAPIOrigins(): Promise<string[]> {
  try {
    await checkRateLimit('get_credentials');

    const credentials = await keytar.findCredentials(API_SERVICE_NAME);
    return credentials.map((c) => c.account);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error;
    }
    return [];
  }
}

/**
 * Add a single credential to an origin (or update if exists)
 */
export async function addAPICredential(origin: string, credential: APICredential): Promise<void> {
  await checkRateLimit('store_credentials');

  // Get existing credentials
  let existing = await getAPICredentials(origin);

  if (!existing) {
    // Create new entry
    existing = {
      origin,
      credentials: [],
    };
  }

  // Check if credential name already exists
  const existingIndex = existing.credentials.findIndex((c) => c.name === credential.name);
  if (existingIndex >= 0) {
    // Replace existing
    existing.credentials[existingIndex] = credential;
  } else {
    // Add new
    existing.credentials.push(credential);
  }

  await storeAPICredentials(existing);
}

/**
 * Delete a specific credential from an origin
 */
export async function deleteAPICredential(origin: string, credentialName: string): Promise<boolean> {
  await checkRateLimit('delete_credentials');

  const existing = await getAPICredentials(origin);
  if (!existing) {
    return false;
  }

  const filtered = existing.credentials.filter((c) => c.name !== credentialName);
  if (filtered.length === existing.credentials.length) {
    // Credential not found
    return false;
  }

  // Update default if needed
  if (existing.defaultCredential === credentialName) {
    existing.defaultCredential = undefined;
  }

  if (filtered.length === 0) {
    // No more credentials, delete the entire entry
    const result = await keytar.deletePassword(API_SERVICE_NAME, origin);
    await logAuditEvent('api_credential_deleted', {
      origin,
      credentialName,
      success: result,
    });
    return result;
  } else {
    // Update with remaining credentials
    existing.credentials = filtered;
    await storeAPICredentials(existing);
    await logAuditEvent('api_credential_deleted', {
      origin,
      credentialName,
      success: true,
    });
    return true;
  }
}
