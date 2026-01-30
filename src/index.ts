#!/usr/bin/env node

import { Command } from 'commander';
import { register } from './commands/register.js';
import { login } from './commands/login.js';
import { deleteCommand } from './commands/delete.js';
import { config } from './commands/config.js';
import { registerAPI } from './commands/register-api.js';
import { listCredentials } from './commands/list-credentials.js';
import { curl } from './commands/curl.js';

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
  .option('--username <username>', 'Username/email (non-interactive)')
  .option('--password <password>', 'Password (non-interactive)')
  .option('--generate-password', 'Generate a secure password (non-interactive)')
  .option('-f, --force', 'Skip confirmation prompts')
  .option('--allow-http', 'Allow HTTP origins (insecure - not recommended)')
  .action(async (options) => {
    try {
      await register({
        cdp: options.cdp,
        usernameSelector: options.usernameSelector,
        passwordSelector: options.passwordSelector,
        submitSelector: options.submitSelector,
        username: options.username,
        password: options.password,
        generatePassword: options.generatePassword,
        force: options.force,
        allowHttp: options.allowHttp,
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

const configCmd = program
  .command('config')
  .description('Manage vault configuration');

configCmd
  .command('list')
  .description('List all configuration values')
  .action(async () => {
    try {
      await config({ action: 'list' });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

configCmd
  .command('get <key>')
  .description('Get a configuration value')
  .action(async (key) => {
    try {
      await config({ action: 'get', key });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

configCmd
  .command('set <key> <value>')
  .description('Set a configuration value')
  .action(async (key, value) => {
    try {
      await config({ action: 'set', key, value });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

configCmd
  .command('unset <key>')
  .description('Remove a configuration value')
  .action(async (key) => {
    try {
      await config({ action: 'unset', key });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('register-api')
  .description('Register API credentials for an origin')
  .requiredOption('--origin <url>', 'Origin URL (e.g., https://api.github.com)')
  .requiredOption('--name <name>', 'Credential name (must be unique per origin)')
  .option('--description <desc>', 'Human-readable description')
  .requiredOption('--token <token>', 'Token/secret value')
  .option('--set-default', 'Set as default credential for origin')
  .option('-f, --force', 'Overwrite if credential name exists')
  .option('--allow-http', 'Allow HTTP origins (insecure - not recommended)')
  .action(async (options) => {
    try {
      await registerAPI({
        origin: options.origin,
        name: options.name,
        description: options.description,
        token: options.token,
        setDefault: options.setDefault,
        force: options.force,
        allowHttp: options.allowHttp,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('list-credentials')
  .description('List registered API credentials')
  .option('--origin <url>', 'Filter by origin')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      await listCredentials({
        origin: options.origin,
        json: options.json,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('curl')
  .description('Execute curl with credential injection (use {token} placeholder)')
  .option('--credential <name>', 'Credential name to use')
  .allowUnknownOption()
  .action(async (options, command) => {
    try {
      // Get all arguments after 'curl' and our known options
      const curlArgs = command.args;
      await curl({
        credential: options.credential,
        curlArgs,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
