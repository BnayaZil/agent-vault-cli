import { spawn } from 'node:child_process';
import { extractOrigin } from '../core/origin.js';
import { getAPICredentials, storeAPICredentials } from '../core/keychain.js';
import { logAuditEvent } from '../core/audit.js';

export interface CurlOptions {
  credential?: string;
  curlArgs: string[];
}

/**
 * Extract URL from curl arguments
 */
function extractUrlFromArgs(args: string[]): string | null {
  // Look for URL in arguments (first non-option argument or after explicit URL options)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Skip options and their values
    if (arg.startsWith('-')) {
      // Options that take a value
      if (
        arg === '-H' ||
        arg === '--header' ||
        arg === '-d' ||
        arg === '--data' ||
        arg === '-X' ||
        arg === '--request' ||
        arg === '-o' ||
        arg === '--output' ||
        arg === '-u' ||
        arg === '--user'
      ) {
        i++; // Skip next argument (the value)
        continue;
      }
      continue;
    }
    
    // First non-option argument should be the URL
    if (arg.includes('://') || arg.startsWith('http')) {
      return arg;
    }
  }
  
  return null;
}

/**
 * Replace {token} placeholder in all arguments
 */
function replaceTokenPlaceholder(args: string[], token: string): string[] {
  return args.map((arg) => arg.replace(/{token}/g, token));
}

export async function curl(options: CurlOptions): Promise<void> {
  // Extract URL from curl arguments
  const url = extractUrlFromArgs(options.curlArgs);
  if (!url) {
    throw new Error('Could not extract URL from curl arguments');
  }

  // Extract origin from URL
  let origin: string;
  try {
    origin = extractOrigin(url);
  } catch (error) {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Get credentials for origin
  const credentials = await getAPICredentials(origin);
  if (!credentials || credentials.credentials.length === 0) {
    throw new Error(
      `No credentials registered for ${origin}. Use 'vault register-api' to add credentials.`
    );
  }

  // Select credential
  let selectedCredential;
  if (options.credential) {
    selectedCredential = credentials.credentials.find((c) => c.name === options.credential);
    if (!selectedCredential) {
      throw new Error(
        `Credential '${options.credential}' not found for ${origin}. Available: ${credentials.credentials.map((c) => c.name).join(', ')}`
      );
    }
  } else {
    // Use default credential
    if (!credentials.defaultCredential) {
      throw new Error(
        `No default credential set for ${origin}. Specify --credential or set a default with 'vault register-api --set-default'`
      );
    }
    selectedCredential = credentials.credentials.find(
      (c) => c.name === credentials.defaultCredential
    );
    if (!selectedCredential) {
      throw new Error(`Default credential '${credentials.defaultCredential}' not found`);
    }
  }

  // Replace {token} placeholder in curl arguments
  const curlArgsWithToken = replaceTokenPlaceholder(options.curlArgs, selectedCredential.token);

  // Execute curl
  const curlProcess = spawn('curl', curlArgsWithToken, {
    stdio: 'inherit',
  });

  // Wait for curl to complete
  const exitCode = await new Promise<number>((resolve) => {
    curlProcess.on('close', (code: number | null) => {
      resolve(code ?? 1);
    });
  });

  // Update lastUsedAt
  selectedCredential.lastUsedAt = new Date().toISOString();
  await storeAPICredentials(credentials);

  // Log audit event
  await logAuditEvent('api_request_executed', {
    origin,
    credentialName: selectedCredential.name,
    exitCode,
    success: exitCode === 0,
  });

  // Exit with same code as curl (but not in test environment)
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
    process.exit(exitCode);
  }
}
