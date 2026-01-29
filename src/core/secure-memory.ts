/**
 * Secure memory utilities for handling sensitive data.
 * Uses Buffer to allow explicit zeroing of memory.
 */

/**
 * A secure string container that can be explicitly cleared from memory.
 * Uses Buffer internally for memory that can be overwritten.
 */
export class SecureString {
  private buffer: Buffer;
  private cleared = false;

  constructor(value: string) {
    this.buffer = Buffer.from(value, 'utf-8');
  }

  /**
   * Get the string value. Throws if already cleared.
   */
  getValue(): string {
    if (this.cleared) {
      throw new Error('SecureString has been cleared');
    }
    return this.buffer.toString('utf-8');
  }

  /**
   * Securely clear the buffer by overwriting with zeros.
   */
  clear(): void {
    if (!this.cleared) {
      this.buffer.fill(0);
      this.cleared = true;
    }
  }

  /**
   * Check if the string has been cleared.
   */
  isCleared(): boolean {
    return this.cleared;
  }

  /**
   * Get the length of the stored string.
   */
  get length(): number {
    return this.cleared ? 0 : this.buffer.length;
  }
}

/**
 * Execute a function with secure strings, ensuring cleanup on completion.
 * @param values - Object with string values to protect
 * @param fn - Function to execute with SecureString versions
 * @returns Result of the function
 */
export async function withSecureStrings<T extends Record<string, string>, R>(
  values: T,
  fn: (secure: { [K in keyof T]: SecureString }) => Promise<R>
): Promise<R> {
  const secureValues = {} as { [K in keyof T]: SecureString };

  // Create secure versions
  for (const key of Object.keys(values) as (keyof T)[]) {
    secureValues[key] = new SecureString(values[key]);
  }

  try {
    return await fn(secureValues);
  } finally {
    // Always clear secure strings
    for (const key of Object.keys(secureValues) as (keyof T)[]) {
      secureValues[key].clear();
    }
  }
}
