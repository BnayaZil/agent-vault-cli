import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecureString, withSecureStrings } from '../src/core/secure-memory.js';
import {
  isBlockedOrigin,
  hasSuspiciousTld,
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
  describe('isBlockedOrigin', () => {
    it('blocks localhost', () => {
      expect(isBlockedOrigin('http://localhost')).toBe(true);
      expect(isBlockedOrigin('http://localhost:3000')).toBe(true);
      expect(isBlockedOrigin('https://localhost')).toBe(true);
    });

    it('blocks 127.0.0.1', () => {
      expect(isBlockedOrigin('http://127.0.0.1')).toBe(true);
      expect(isBlockedOrigin('http://127.0.0.1:8080')).toBe(true);
    });

    it('blocks 0.0.0.0', () => {
      expect(isBlockedOrigin('http://0.0.0.0')).toBe(true);
    });

    it('blocks IPv6 localhost', () => {
      expect(isBlockedOrigin('http://[::1]')).toBe(true);
    });

    it('blocks file:// protocol', () => {
      expect(isBlockedOrigin('file:///etc/passwd')).toBe(true);
    });

    it('allows normal origins', () => {
      expect(isBlockedOrigin('https://github.com')).toBe(false);
      expect(isBlockedOrigin('https://example.com')).toBe(false);
    });
  });

  describe('hasSuspiciousTld', () => {
    it('detects suspicious TLDs', () => {
      expect(hasSuspiciousTld('https://example.tk')).toBe(true);
      expect(hasSuspiciousTld('https://example.ml')).toBe(true);
      expect(hasSuspiciousTld('https://example.ga')).toBe(true);
      expect(hasSuspiciousTld('https://example.cf')).toBe(true);
      expect(hasSuspiciousTld('https://example.gq')).toBe(true);
    });

    it('handles TLDs with ports', () => {
      expect(hasSuspiciousTld('https://example.tk:443')).toBe(true);
    });

    it('allows normal TLDs', () => {
      expect(hasSuspiciousTld('https://github.com')).toBe(false);
      expect(hasSuspiciousTld('https://example.org')).toBe(false);
      expect(hasSuspiciousTld('https://example.io')).toBe(false);
    });
  });

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
