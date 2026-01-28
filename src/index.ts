#!/usr/bin/env node

import { Command } from 'commander';
import { register } from './commands/register.js';
import { login } from './commands/login.js';
import { list } from './commands/list.js';
import { deleteCommand } from './commands/delete.js';

const program = new Command();

program
  .name('vault')
  .description('Secure credential vault CLI for AI agents')
  .version('0.1.0');

program
  .command('register')
  .description('Register credentials for a new site')
  .requiredOption('--cdp <endpoint>', 'CDP WebSocket endpoint (e.g., ws://localhost:9222)')
  .requiredOption('--username-selector <selector>', 'CSS selector for username/email field')
  .requiredOption('--password-selector <selector>', 'CSS selector for password field')
  .option('--submit-selector <selector>', 'CSS selector for submit button')
  .action(async (options) => {
    try {
      await register({
        cdp: options.cdp,
        usernameSelector: options.usernameSelector,
        passwordSelector: options.passwordSelector,
        submitSelector: options.submitSelector,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('login')
  .description('Fill credentials for a known site')
  .requiredOption('--cdp <endpoint>', 'CDP WebSocket endpoint (e.g., ws://localhost:9222)')
  .option('--submit', 'Click submit button after filling credentials')
  .action(async (options) => {
    try {
      await login({
        cdp: options.cdp,
        submit: options.submit,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all registered sites')
  .action(async () => {
    try {
      await list();
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('delete')
  .description('Delete credentials for a site')
  .requiredOption('--origin <url>', 'Origin to delete (e.g., https://github.com)')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      await deleteCommand({
        origin: options.origin,
        force: options.force,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
