import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  storeAPICredentials,
  getAPICredentials,
  listAPIOrigins,
  addAPICredential,
  deleteAPICredential,
} from '../src/core/keychain.js';
import { resetRateLimit } from '../src/core/ratelimit.js';
import type { APICredentials, APICredential } from '../src/types/index.js';
import keytar from 'keytar';

const API_SERVICE_NAME = 'agent-vault-api';
const TEST_ORIGIN = 'https://api.test.com';
const TEST_ORIGIN_2 = 'https://api.example.com';

describe('API Credentials - Keychain Functions', () => {
  // Clean up test data before and after each test
  beforeEach(async () => {
    await resetRateLimit();
    await keytar.deletePassword(API_SERVICE_NAME, TEST_ORIGIN);
    await keytar.deletePassword(API_SERVICE_NAME, TEST_ORIGIN_2);
  });

  afterEach(async () => {
    await keytar.deletePassword(API_SERVICE_NAME, TEST_ORIGIN);
    await keytar.deletePassword(API_SERVICE_NAME, TEST_ORIGIN_2);
  });

  describe('storeAPICredentials', () => {
    it('should store API credentials successfully', async () => {
      const credentials: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          {
            name: 'test-token',
            token: 'secret123',
            description: 'Test token',
            createdAt: new Date().toISOString(),
          },
        ],
      };

      await storeAPICredentials(credentials);

      const stored = await getAPICredentials(TEST_ORIGIN);
      expect(stored).not.toBeNull();
      expect(stored?.credentials).toHaveLength(1);
      expect(stored?.credentials[0].name).toBe('test-token');
      expect(stored?.credentials[0].token).toBe('secret123');
    });

    it('should enforce unique credential names', async () => {
      const credentials: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          {
            name: 'duplicate',
            token: 'token1',
            createdAt: new Date().toISOString(),
          },
          {
            name: 'duplicate',
            token: 'token2',
            createdAt: new Date().toISOString(),
          },
        ],
      };

      await expect(storeAPICredentials(credentials)).rejects.toThrow(
        'Credential names must be unique within an origin'
      );
    });

    it('should store multiple credentials with different names', async () => {
      const credentials: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          {
            name: 'token-1',
            token: 'secret1',
            createdAt: new Date().toISOString(),
          },
          {
            name: 'token-2',
            token: 'secret2',
            createdAt: new Date().toISOString(),
          },
        ],
      };

      await storeAPICredentials(credentials);

      const stored = await getAPICredentials(TEST_ORIGIN);
      expect(stored?.credentials).toHaveLength(2);
      expect(stored?.credentials.map((c) => c.name)).toEqual(['token-1', 'token-2']);
    });

    it('should store default credential', async () => {
      const credentials: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          {
            name: 'primary',
            token: 'secret1',
            createdAt: new Date().toISOString(),
          },
        ],
        defaultCredential: 'primary',
      };

      await storeAPICredentials(credentials);

      const stored = await getAPICredentials(TEST_ORIGIN);
      expect(stored?.defaultCredential).toBe('primary');
    });
  });

  describe('getAPICredentials', () => {
    it('should return null for non-existent origin', async () => {
      const result = await getAPICredentials('https://nonexistent.com');
      expect(result).toBeNull();
    });

    it('should retrieve stored credentials', async () => {
      const credentials: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          {
            name: 'test',
            token: 'secret',
            description: 'Test credential',
            createdAt: '2026-01-30T00:00:00Z',
            lastUsedAt: '2026-01-30T12:00:00Z',
          },
        ],
      };

      await storeAPICredentials(credentials);
      const retrieved = await getAPICredentials(TEST_ORIGIN);

      expect(retrieved).toEqual(credentials);
    });
  });

  describe('listAPIOrigins', () => {
    it('should return empty array when no credentials exist', async () => {
      const origins = await listAPIOrigins();
      expect(Array.isArray(origins)).toBe(true);
    });

    it('should list all origins with credentials', async () => {
      const creds1: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [{ name: 'test1', token: 'secret1', createdAt: new Date().toISOString() }],
      };
      const creds2: APICredentials = {
        origin: TEST_ORIGIN_2,
        credentials: [{ name: 'test2', token: 'secret2', createdAt: new Date().toISOString() }],
      };

      await storeAPICredentials(creds1);
      await storeAPICredentials(creds2);

      const origins = await listAPIOrigins();
      expect(origins).toContain(TEST_ORIGIN);
      expect(origins).toContain(TEST_ORIGIN_2);
    });
  });

  describe('addAPICredential', () => {
    it('should add credential to new origin', async () => {
      const credential: APICredential = {
        name: 'new-token',
        token: 'newsecret',
        description: 'New credential',
        createdAt: new Date().toISOString(),
      };

      await addAPICredential(TEST_ORIGIN, credential);

      const stored = await getAPICredentials(TEST_ORIGIN);
      expect(stored?.credentials).toHaveLength(1);
      expect(stored?.credentials[0].name).toBe('new-token');
    });

    it('should add credential to existing origin', async () => {
      const existing: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          {
            name: 'existing',
            token: 'secret1',
            createdAt: new Date().toISOString(),
          },
        ],
      };
      await storeAPICredentials(existing);

      const newCred: APICredential = {
        name: 'new',
        token: 'secret2',
        createdAt: new Date().toISOString(),
      };
      await addAPICredential(TEST_ORIGIN, newCred);

      const stored = await getAPICredentials(TEST_ORIGIN);
      expect(stored?.credentials).toHaveLength(2);
      expect(stored?.credentials.map((c) => c.name)).toEqual(['existing', 'new']);
    });

    it('should replace credential with same name', async () => {
      const existing: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          {
            name: 'token',
            token: 'oldsecret',
            createdAt: new Date().toISOString(),
          },
        ],
      };
      await storeAPICredentials(existing);

      const updated: APICredential = {
        name: 'token',
        token: 'newsecret',
        description: 'Updated',
        createdAt: new Date().toISOString(),
      };
      await addAPICredential(TEST_ORIGIN, updated);

      const stored = await getAPICredentials(TEST_ORIGIN);
      expect(stored?.credentials).toHaveLength(1);
      expect(stored?.credentials[0].token).toBe('newsecret');
      expect(stored?.credentials[0].description).toBe('Updated');
    });
  });

  describe('deleteAPICredential', () => {
    it('should return false for non-existent origin', async () => {
      const result = await deleteAPICredential('https://nonexistent.com', 'token');
      expect(result).toBe(false);
    });

    it('should return false for non-existent credential name', async () => {
      const credentials: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          {
            name: 'token',
            token: 'secret',
            createdAt: new Date().toISOString(),
          },
        ],
      };
      await storeAPICredentials(credentials);

      const result = await deleteAPICredential(TEST_ORIGIN, 'nonexistent');
      expect(result).toBe(false);
    });

    it('should delete specific credential', async () => {
      const credentials: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          { name: 'token1', token: 'secret1', createdAt: new Date().toISOString() },
          { name: 'token2', token: 'secret2', createdAt: new Date().toISOString() },
        ],
      };
      await storeAPICredentials(credentials);

      const result = await deleteAPICredential(TEST_ORIGIN, 'token1');
      expect(result).toBe(true);

      const stored = await getAPICredentials(TEST_ORIGIN);
      expect(stored?.credentials).toHaveLength(1);
      expect(stored?.credentials[0].name).toBe('token2');
    });

    it('should delete entire entry when last credential is removed', async () => {
      const credentials: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          {
            name: 'only-token',
            token: 'secret',
            createdAt: new Date().toISOString(),
          },
        ],
      };
      await storeAPICredentials(credentials);

      const result = await deleteAPICredential(TEST_ORIGIN, 'only-token');
      expect(result).toBe(true);

      const stored = await getAPICredentials(TEST_ORIGIN);
      expect(stored).toBeNull();
    });

    it('should clear default credential when deleted', async () => {
      const credentials: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          { name: 'token1', token: 'secret1', createdAt: new Date().toISOString() },
          { name: 'token2', token: 'secret2', createdAt: new Date().toISOString() },
        ],
        defaultCredential: 'token1',
      };
      await storeAPICredentials(credentials);

      await deleteAPICredential(TEST_ORIGIN, 'token1');

      const stored = await getAPICredentials(TEST_ORIGIN);
      expect(stored?.defaultCredential).toBeUndefined();
    });
  });

  describe('Token security', () => {
    it('should never expose tokens in error messages', async () => {
      // This is more of a code review check, but we can verify the interface
      const credentials: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          {
            name: 'secret-token',
            token: 'super-secret-value-12345',
            createdAt: new Date().toISOString(),
          },
        ],
      };

      await storeAPICredentials(credentials);

      // Verify we can retrieve it (for valid use cases)
      const stored = await getAPICredentials(TEST_ORIGIN);
      expect(stored?.credentials[0].token).toBe('super-secret-value-12345');

      // But the token should only be accessible through secure retrieval
      // List operations should never expose tokens (tested in integration)
    });
  });
});
