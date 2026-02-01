import { getAPICredentials, listAPIOrigins } from '../core/keychain.js';
import { logAuditEvent } from '../core/audit.js';

export interface ListCredentialsOptions {
  origin?: string;
  json?: boolean;
}

interface CredentialInfo {
  name: string;
  description?: string;
  createdAt: string;
  lastUsedAt?: string;
  isDefault: boolean;
}

export async function listCredentials(options: ListCredentialsOptions): Promise<void> {
  const results: Record<string, CredentialInfo[]> = {};

  if (options.origin) {
    // List for specific origin
    const credentials = await getAPICredentials(options.origin);
    if (!credentials || credentials.credentials.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({}));
      } else {
        console.log(`No credentials found for ${options.origin}`);
      }
      await logAuditEvent('api_credential_listed', {
        origin: options.origin,
        success: false,
      });
      return;
    }

    results[options.origin] = credentials.credentials.map((c) => ({
      name: c.name,
      description: c.description,
      createdAt: c.createdAt,
      lastUsedAt: c.lastUsedAt,
      isDefault: c.name === credentials.defaultCredential,
    }));

    await logAuditEvent('api_credential_listed', {
      origin: options.origin,
      success: true,
    });
  } else {
    // List all origins
    const origins = await listAPIOrigins();
    if (origins.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({}));
      } else {
        console.log('No API credentials registered');
      }
      await logAuditEvent('api_credential_listed', { success: false });
      return;
    }

    for (const origin of origins) {
      const credentials = await getAPICredentials(origin);
      if (credentials && credentials.credentials.length > 0) {
        results[origin] = credentials.credentials.map((c) => ({
          name: c.name,
          description: c.description,
          createdAt: c.createdAt,
          lastUsedAt: c.lastUsedAt,
          isDefault: c.name === credentials.defaultCredential,
        }));
      }
    }

    await logAuditEvent('api_credential_listed', { success: true });
  }

  // Output
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    // Human-readable format
    for (const [origin, credentials] of Object.entries(results)) {
      console.log(`\nOrigin: ${origin}`);
      for (const cred of credentials) {
        const marker = cred.isDefault ? '✓' : '•';
        const defaultLabel = cred.isDefault ? ' (default)' : '';
        console.log(`  ${marker} ${cred.name}${defaultLabel}`);
        if (cred.description) {
          console.log(`    Description: ${cred.description}`);
        }
        console.log(`    Created: ${new Date(cred.createdAt).toLocaleString()}`);
        if (cred.lastUsedAt) {
          console.log(`    Last Used: ${new Date(cred.lastUsedAt).toLocaleString()}`);
        } else {
          console.log(`    Last Used: never`);
        }
      }
    }
  }
}
