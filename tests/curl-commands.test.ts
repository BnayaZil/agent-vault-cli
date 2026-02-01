import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execSync, spawn } from 'child_process';
import { startTestServer, TestServer } from './fixtures/server.js';
import {
  storeAPICredentials,
  getAPICredentials,
  deleteAPICredential,
  listAPIOrigins,
} from '../src/core/keychain.js';
import { resetRateLimit } from '../src/core/ratelimit.js';
import type { APICredentials } from '../src/types/index.js';

const CLI_PATH = './dist/index.js';
const API_SERVICE_NAME = 'agent-vault-api';

// Test server for API requests
const TEST_API_PORT = 9600;
const TEST_ORIGIN = `http://localhost:${TEST_API_PORT}`;

describe('E2E: API Credentials Commands', () => {
  let server: TestServer;

  beforeAll(async () => {
    await resetRateLimit();
    // Start test API server
    server = await startTestServer(TEST_API_PORT);
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  beforeEach(async () => {
    await resetRateLimit();
    // Clean up test credentials
    await deleteAPICredential(TEST_ORIGIN, 'test-token');
    await deleteAPICredential(TEST_ORIGIN, 'another-token');
    await deleteAPICredential('https://api.github.com', 'test-token');
  });

  afterEach(async () => {
    await deleteAPICredential(TEST_ORIGIN, 'test-token');
    await deleteAPICredential(TEST_ORIGIN, 'another-token');
    await deleteAPICredential('https://api.github.com', 'test-token');
  });

  describe('register-api command', () => {
    it('should register API credentials', () => {
      const result = execSync(
        `node ${CLI_PATH} register-api --origin "${TEST_ORIGIN}" --name "test-token" --token "secret123" --allow-http`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('API credential');
      expect(result).toContain('test-token');
      expect(result).toContain('registered');
    });

    it('should set default credential with --set-default flag', async () => {
      execSync(
        `node ${CLI_PATH} register-api --origin "${TEST_ORIGIN}" --name "test-token" --token "secret123" --set-default --allow-http`,
        { encoding: 'utf-8' }
      );

      const stored = await getAPICredentials(TEST_ORIGIN);
      expect(stored?.defaultCredential).toBe('test-token');
    });

    it('should fail without --force when credential exists', async () => {
      // Register first time
      execSync(
        `node ${CLI_PATH} register-api --origin "${TEST_ORIGIN}" --name "test-token" --token "secret123" --allow-http`,
        { encoding: 'utf-8' }
      );

      // Try to register again without --force
      try {
        execSync(
          `node ${CLI_PATH} register-api --origin "${TEST_ORIGIN}" --name "test-token" --token "newsecret" --allow-http`,
          { encoding: 'utf-8' }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('already exists');
      }
    });

    it('should overwrite with --force flag', async () => {
      // Register first time
      execSync(
        `node ${CLI_PATH} register-api --origin "${TEST_ORIGIN}" --name "test-token" --token "secret123" --allow-http`,
        { encoding: 'utf-8' }
      );

      // Overwrite with --force
      execSync(
        `node ${CLI_PATH} register-api --origin "${TEST_ORIGIN}" --name "test-token" --token "newsecret" --force --allow-http`,
        { encoding: 'utf-8' }
      );

      const stored = await getAPICredentials(TEST_ORIGIN);
      expect(stored?.credentials[0].token).toBe('newsecret');
    });

    it('should require HTTPS by default', () => {
      try {
        execSync(
          `node ${CLI_PATH} register-api --origin "http://api.example.com" --name "test-token" --token "secret123"`,
          { encoding: 'utf-8' }
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('HTTP');
      }
    });

    it('should allow HTTP with --allow-http flag', async () => {
      const origin = 'http://api.example.com';
      
      // Clean up first in case it exists
      try {
        await deleteAPICredential(origin, 'test-token');
      } catch {}
      
      const result = execSync(
        `node ${CLI_PATH} register-api --origin "${origin}" --name "test-token" --token "secret123" --allow-http`,
        { encoding: 'utf-8' }
      );

      expect(result).toContain('registered');
      
      // Clean up
      await deleteAPICredential(origin, 'test-token');
    });

    it('should store description', async () => {
      execSync(
        `node ${CLI_PATH} register-api --origin "${TEST_ORIGIN}" --name "test-token" --token "secret123" --description "My test token" --allow-http`,
        { encoding: 'utf-8' }
      );

      const stored = await getAPICredentials(TEST_ORIGIN);
      expect(stored?.credentials[0].description).toBe('My test token');
    });
  });

  describe('list-credentials command', () => {
    beforeEach(async () => {
      // Set up test credentials
      const credentials: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          {
            name: 'test-token',
            token: 'secret123',
            description: 'Test token',
            createdAt: '2026-01-30T10:00:00Z',
            lastUsedAt: '2026-01-30T12:00:00Z',
          },
          {
            name: 'another-token',
            token: 'secret456',
            createdAt: '2026-01-30T11:00:00Z',
          },
        ],
        defaultCredential: 'test-token',
      };
      await storeAPICredentials(credentials);
    });

    it('should list all credentials', () => {
      const result = execSync(`node ${CLI_PATH} list-credentials`, { encoding: 'utf-8' });

      expect(result).toContain(TEST_ORIGIN);
      expect(result).toContain('test-token');
      expect(result).toContain('another-token');
      expect(result).toContain('(default)');
      expect(result).toContain('Test token');
    });

    it('should filter by origin', () => {
      const result = execSync(`node ${CLI_PATH} list-credentials --origin "${TEST_ORIGIN}"`, {
        encoding: 'utf-8',
      });

      expect(result).toContain('test-token');
      expect(result).toContain('another-token');
    });

    it('should output JSON format', () => {
      const result = execSync(`node ${CLI_PATH} list-credentials --json`, { encoding: 'utf-8' });

      const json = JSON.parse(result);
      expect(json[TEST_ORIGIN]).toBeDefined();
      expect(json[TEST_ORIGIN]).toHaveLength(2);
      expect(json[TEST_ORIGIN][0].name).toBe('test-token');
      expect(json[TEST_ORIGIN][0].isDefault).toBe(true);
      expect(json[TEST_ORIGIN][1].name).toBe('another-token');
    });

    it('should never expose tokens', () => {
      const result = execSync(`node ${CLI_PATH} list-credentials`, { encoding: 'utf-8' });

      // Tokens should not appear in output
      expect(result).not.toContain('secret123');
      expect(result).not.toContain('secret456');
    });

    it('should handle no credentials gracefully', async () => {
      // Clean all credentials first
      const origins = await listAPIOrigins();
      for (const origin of origins) {
        const creds = await getAPICredentials(origin);
        if (creds) {
          for (const cred of creds.credentials) {
            await deleteAPICredential(origin, cred.name);
          }
        }
      }

      const result = execSync(`node ${CLI_PATH} list-credentials`, { encoding: 'utf-8' });

      expect(result).toContain('No API credentials registered');
    });
  });

  describe('curl command', () => {
    beforeEach(async () => {
      const credentials: APICredentials = {
        origin: TEST_ORIGIN,
        credentials: [
          {
            name: 'test-token',
            token: 'test-secret-123',
            description: 'Test token',
            createdAt: new Date().toISOString(),
          },
          {
            name: 'another-token',
            token: 'another-secret-456',
            createdAt: new Date().toISOString(),
          },
        ],
        defaultCredential: 'test-token',
      };
      await storeAPICredentials(credentials);
    });

    it('should execute curl with default credential', async () => {
      return new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [
          CLI_PATH,
          'curl',
          '-H',
          'Authorization: Bearer {token}',
          `${TEST_ORIGIN}/`,
        ]);

        let stdout = '';
        proc.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        proc.on('close', (code) => {
          try {
            expect(code).toBe(0);
            expect(stdout).toContain('Login');
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        proc.on('error', reject);
      });
    });

    it('should execute curl with explicit credential', async () => {
      return new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [
          CLI_PATH,
          'curl',
          '--credential',
          'another-token',
          '-H',
          'X-API-Key: {token}',
          `${TEST_ORIGIN}/`,
        ]);

        let stdout = '';
        proc.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        proc.on('close', (code) => {
          try {
            expect(code).toBe(0);
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        proc.on('error', reject);
      });
    });

    it('should replace {token} placeholder in headers', async () => {
      return new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [
          CLI_PATH,
          'curl',
          '-H',
          'Authorization: Bearer {token}',
          `${TEST_ORIGIN}/`,
        ]);

        proc.on('close', (code) => {
          try {
            expect(code).toBe(0);
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        proc.on('error', reject);
      });
    });

    it('should replace {token} placeholder in URL', async () => {
      return new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [CLI_PATH, 'curl', `${TEST_ORIGIN}/?api_key={token}`]);

        proc.on('close', (code) => {
          try {
            expect(code).toBe(0);
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        proc.on('error', reject);
      });
    });

    it('should fail when no default credential is set', async () => {
      // Remove default
      const creds = await getAPICredentials(TEST_ORIGIN);
      if (creds) {
        creds.defaultCredential = undefined;
        await storeAPICredentials(creds);
      }

      try {
        execSync(`node ${CLI_PATH} curl ${TEST_ORIGIN}/`, { encoding: 'utf-8' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('No default credential');
      }
    });

    it('should fail when credential does not exist', () => {
      try {
        execSync(`node ${CLI_PATH} curl --credential "nonexistent" ${TEST_ORIGIN}/`, {
          encoding: 'utf-8',
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });

    it('should fail when no credentials for origin', async () => {
      await deleteAPICredential(TEST_ORIGIN, 'test-token');
      await deleteAPICredential(TEST_ORIGIN, 'another-token');

      try {
        execSync(`node ${CLI_PATH} curl ${TEST_ORIGIN}/`, { encoding: 'utf-8' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('No credentials registered');
      }
    });

    it('should update lastUsedAt timestamp', async () => {
      const beforeTime = new Date().toISOString();

      await new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [CLI_PATH, 'curl', `${TEST_ORIGIN}/`]);
        proc.on('close', () => resolve());
        proc.on('error', reject);
      });

      const stored = await getAPICredentials(TEST_ORIGIN);
      const credential = stored?.credentials.find((c) => c.name === 'test-token');

      expect(credential?.lastUsedAt).toBeDefined();
      expect(credential?.lastUsedAt).not.toBe(beforeTime);
    });

    it('should handle multiple {token} replacements', async () => {
      return new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [
          CLI_PATH,
          'curl',
          '-H',
          'Authorization: Bearer {token}',
          '-H',
          'X-Custom-Token: {token}',
          `${TEST_ORIGIN}/`,
        ]);

        proc.on('close', (code) => {
          try {
            expect(code).toBe(0);
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        proc.on('error', reject);
      });
    });
  });

  describe('Integration: Full workflow', () => {
    it('should register, list, use, and delete credentials', async () => {
      // 1. Register credential
      const registerResult = execSync(
        `node ${CLI_PATH} register-api --origin "${TEST_ORIGIN}" --name "workflow-test" --token "workflow-secret" --set-default --allow-http`,
        { encoding: 'utf-8' }
      );
      expect(registerResult).toContain('registered');

      // 2. List credentials
      const listResult = execSync(`node ${CLI_PATH} list-credentials --json`, {
        encoding: 'utf-8',
      });
      const json = JSON.parse(listResult);
      expect(json[TEST_ORIGIN]).toBeDefined();
      expect(json[TEST_ORIGIN][0].name).toBe('workflow-test');

      // 3. Use with curl
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('node', [CLI_PATH, 'curl', `${TEST_ORIGIN}/`]);
        proc.on('close', (code) => {
          try {
            expect(code).toBe(0);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        proc.on('error', reject);
      });

      // 4. Verify lastUsedAt was updated
      const stored = await getAPICredentials(TEST_ORIGIN);
      const cred = stored?.credentials.find((c) => c.name === 'workflow-test');
      expect(cred?.lastUsedAt).toBeDefined();

      // 5. Delete credential
      await deleteAPICredential(TEST_ORIGIN, 'workflow-test');
      const afterDelete = await getAPICredentials(TEST_ORIGIN);
      expect(afterDelete).toBeNull();
    });
  });
});
