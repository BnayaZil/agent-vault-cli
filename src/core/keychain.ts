import keytar from '@aspect-build/keytar';
import { z } from 'zod';
import type { RPConfig } from '../types/index.js';
import { logAuditEvent } from './audit.js';
import { checkRateLimit } from './ratelimit.js';

const SERVICE_NAME = 'agent-vault';

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
