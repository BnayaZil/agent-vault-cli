export function extractOrigin(url: string): string {
  const parsed = new URL(url);
  return parsed.origin;
}

export function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function extractAndValidateOrigin(url: string): string {
  const origin = extractOrigin(url);
  if (!isValidOrigin(origin)) {
    throw new Error('Invalid page origin');
  }
  return origin;
}
