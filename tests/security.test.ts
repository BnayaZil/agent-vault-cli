import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecureString, withSecureStrings } from '../src/core/secure-memory.js';
import {
  isSecureProtocol,
  isHttpProtocol,
} from '../src/core/origin.js';

describe('SecureString', () => {
  it('stores and retrieves value', () => {
    const secure = new SecureString('secret123');
    expect(secure.getValue()).toBe('secret123');
  });

  it('reports correct length', () => {
    const secure = new SecureString('secret123');
    expect(secure.length).toBe(9);
  });

  it('can be cleared', () => {
    const secure = new SecureString('secret123');
    expect(secure.isCleared()).toBe(false);
    secure.clear();
    expect(secure.isCleared()).toBe(true);
  });

  it('throws when accessing cleared value', () => {
    const secure = new SecureString('secret123');
    secure.clear();
    expect(() => secure.getValue()).toThrow('SecureString has been cleared');
  });

  it('length is 0 after clearing', () => {
    const secure = new SecureString('secret123');
    secure.clear();
    expect(secure.length).toBe(0);
  });

  it('can be cleared multiple times safely', () => {
    const secure = new SecureString('secret123');
    secure.clear();
    secure.clear();
    expect(secure.isCleared()).toBe(true);
  });
});

describe('withSecureStrings', () => {
  it('provides secure values to callback', async () => {
    const result = await withSecureStrings(
      { username: 'user', password: 'pass' },
      async (secure) => {
        expect(secure.username.getValue()).toBe('user');
        expect(secure.password.getValue()).toBe('pass');
        return 'done';
      }
    );
    expect(result).toBe('done');
  });

  it('clears values after callback completes', async () => {
    let capturedSecure: { username: SecureString; password: SecureString } | null = null;

    await withSecureStrings({ username: 'user', password: 'pass' }, async (secure) => {
      capturedSecure = secure;
      return 'done';
    });

    expect(capturedSecure!.username.isCleared()).toBe(true);
    expect(capturedSecure!.password.isCleared()).toBe(true);
  });

  it('clears values even if callback throws', async () => {
    let capturedSecure: { username: SecureString } | null = null;

    await expect(
      withSecureStrings({ username: 'user' }, async (secure) => {
        capturedSecure = secure;
        throw new Error('test error');
      })
    ).rejects.toThrow('test error');

    expect(capturedSecure!.username.isCleared()).toBe(true);
  });
});

describe('Origin Security', () => {
  describe('isSecureProtocol', () => {
    it('returns true for HTTPS', () => {
      expect(isSecureProtocol('https://example.com')).toBe(true);
    });

    it('returns false for HTTP', () => {
      expect(isSecureProtocol('http://example.com')).toBe(false);
    });

    it('returns false for invalid URLs', () => {
      expect(isSecureProtocol('not-a-url')).toBe(false);
    });
  });

  describe('isHttpProtocol', () => {
    it('returns true for HTTP', () => {
      expect(isHttpProtocol('http://example.com')).toBe(true);
    });

    it('returns false for HTTPS', () => {
      expect(isHttpProtocol('https://example.com')).toBe(false);
    });

    it('returns false for invalid URLs', () => {
      expect(isHttpProtocol('not-a-url')).toBe(false);
    });
  });
});
