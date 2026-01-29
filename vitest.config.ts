import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Skip browser tests in CI as they require Chrome with CDP and native dependencies
    exclude: process.env.CI ? ['**/browser-password-manager.test.ts', 'node_modules/**'] : ['node_modules/**'],
    testTimeout: 60000,
    hookTimeout: 60000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
