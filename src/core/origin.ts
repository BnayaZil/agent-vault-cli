import { getConfigValue } from './config.js';

// Origins that are always blocked for security reasons
const BLOCKED_ORIGINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  'file://',
  'about:',
  'chrome:',
  'chrome-extension:',
];

// Suspicious TLDs often used for phishing
const SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq'];

export function extractOrigin(url: string): string {
  const parsed = new URL(url);
  return parsed.origin;
}

/**
 * Check if an origin is in the blocklist
 */
export function isBlockedOrigin(origin: string): boolean {
  const lowerOrigin = origin.toLowerCase();
  return BLOCKED_ORIGINS.some(
    (blocked) => lowerOrigin.includes(blocked) || lowerOrigin.startsWith(blocked)
  );
}

/**
 * Check if an origin has a suspicious TLD
 */
export function hasSuspiciousTld(origin: string): boolean {
  const lowerOrigin = origin.toLowerCase();
  return SUSPICIOUS_TLDS.some((tld) => {
    // Check if the origin ends with the TLD followed by optional port
    const regex = new RegExp(`${tld.replace('.', '\\.')}(:\\d+)?$`);
    return regex.test(lowerOrigin);
  });
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
  allowSuspiciousTld?: boolean;
  allowBlockedOrigins?: boolean;
}

/**
 * Validate an origin with security checks.
 * By default, requires HTTPS and blocks suspicious origins.
 */
export async function validateOriginSecurity(
  origin: string,
  options: OriginValidationOptions = {}
): Promise<void> {
  // Check config for allowHttp setting
  const configAllowHttp = await getConfigValue('allowHttp');
  const allowHttp = options.allowHttp ?? configAllowHttp === 'true';

  // Check blocked origins
  if (!options.allowBlockedOrigins && isBlockedOrigin(origin)) {
    throw new Error(
      'This origin is blocked for security reasons. Local and internal origins are not allowed.'
    );
  }

  // Check suspicious TLDs
  if (!options.allowSuspiciousTld && hasSuspiciousTld(origin)) {
    throw new Error(
      'This origin uses a suspicious TLD commonly associated with phishing. Use with caution.'
    );
  }

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
