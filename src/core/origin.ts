import { getConfigValue } from './config.js';

export function extractOrigin(url: string): string {
  const parsed = new URL(url);
  return parsed.origin;
}

/**
 * Check if origin uses HTTPS (secure)
 */
export function isSecureProtocol(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if origin uses HTTP (insecure)
 */
export function isHttpProtocol(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export interface OriginValidationOptions {
  allowHttp?: boolean;
}

/**
 * Validate an origin with security checks.
 * By default, requires HTTPS to prevent credentials from being sent in plaintext.
 */
export async function validateOriginSecurity(
  origin: string,
  options: OriginValidationOptions = {}
): Promise<void> {
  // Check config for allowHttp setting
  const configAllowHttp = await getConfigValue('allowHttp');
  const allowHttp = options.allowHttp ?? configAllowHttp === 'true';

  // Check HTTPS requirement
  if (!allowHttp && isHttpProtocol(origin)) {
    throw new Error(
      'HTTP origins are not allowed by default. Credentials would be sent in plaintext. ' +
        'Use --allow-http flag or set config allowHttp=true to override.'
    );
  }

  // Validate basic origin format
  if (!isValidOrigin(origin)) {
    throw new Error('Invalid origin format');
  }
}

export function extractAndValidateOrigin(url: string): string {
  const origin = extractOrigin(url);
  if (!isValidOrigin(origin)) {
    throw new Error('Invalid page origin');
  }
  return origin;
}

/**
 * Extract and validate origin with full security checks.
 * Use this for operations that store or retrieve credentials.
 */
export async function extractAndValidateOriginSecure(
  url: string,
  options: OriginValidationOptions = {}
): Promise<string> {
  const origin = extractOrigin(url);
  await validateOriginSecurity(origin, options);
  return origin;
}
