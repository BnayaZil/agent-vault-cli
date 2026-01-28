Agent Credential Vault CLI

Architecture

flowchart TB
    subgraph agent [AI Agent]
        A1[Browser Tool]
        A2[Shell Tool]
    end
    
    subgraph vault [Vault CLI]
        V1[CDP Connector]
        V2[Origin Verifier]
        V3[Field Detector]
        V4[Credential Manager]
        V5[Form Filler]
    end
    
    subgraph storage [OS Keychain]
        K1[macOS Keychain]
        K2[Windows Credential Manager]
        K3[Linux Secret Service]
    end
    
    subgraph browser [Browser Instance]
        B1[Page with Login Form]
    end
    
    A1 -->|Controls| browser
    A2 -->|"vault login --cdp ws://..."| vault
    V1 -->|Connect via CDP| browser
    V2 -->|Extract URL| browser
    V4 <-->|Read/Write| storage
    V5 -->|Fill credentials| browser
    vault -->|"Success/Failure only"| A2

Security Model







Flow



Agent Input



Agent Access to Credentials





Register



CDP endpoint + selectors



Never (user enters username, vault generates password)





Login



CDP endpoint only



Never (vault reads from keychain, fills directly)

Project Structure

packages/vault-cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # CLI entry point (commander)
│   ├── commands/
│   │   ├── register.ts       # vault register command
│   │   ├── login.ts          # vault login command
│   │   ├── list.ts           # vault list command
│   │   └── delete.ts         # vault delete command
│   ├── core/
│   │   ├── browser.ts        # CDP/Playwright connection
│   │   ├── origin.ts         # URL extraction & validation
│   │   ├── fields.ts         # Login field detection (heuristics)
│   │   ├── keychain.ts       # OS keychain wrapper (keytar)
│   │   └── crypto.ts         # Password generation
│   └── types/
│       └── index.ts          # TypeScript interfaces
└── tests/
    └── *.test.ts

Core Dependencies





playwright - Browser automation via CDP



keytar - Cross-platform OS keychain access



commander - CLI framework



inquirer - Interactive prompts for registration



nanoid - Secure password generation

CLI Commands

1. Register Command (Interactive)

vault register --cdp "ws://localhost:9222" \
  --username-selector "#email" \
  --password-selector "#password" \
  [--submit-selector "button[type=submit]"]

Flow:





Connect to browser via CDP



Extract current origin from page.url()



Validate selectors exist on page



Prompt user: "Register credentials for https://github.com? [y/N]"



Prompt for username/email



Generate strong password (or prompt for existing)



Fill form fields



Store in keychain: { origin, selectors, username, password }



Output: "Registered. Complete signup in browser."

2. Login Command (Automated)

vault login --cdp "ws://localhost:9222"

Flow:





Connect to browser via CDP



Extract current origin from page.url()



Lookup stored config for this origin in keychain



If not found: exit with error "Unknown RP"



If found: use STORED selectors (not agent-provided)



Fill username + password



Optionally click submit



Output: "Login filled for github.com" or error

3. List Command

vault list

Output: List of registered RPs (origins only, no credentials shown)

4. Delete Command

vault delete --origin "https://github.com"

Removes stored credentials for an RP (with confirmation prompt)

Key Implementation Details

Browser Connection (core/browser.ts)

import { chromium } from 'playwright';

export async function connectToBrowser(cdpEndpoint: string) {
  const browser = await chromium.connectOverCDP(cdpEndpoint);
  const contexts = browser.contexts();
  if (contexts.length === 0) {
    throw new Error('No browser context found');
  }
  const pages = contexts[0].pages();
  if (pages.length === 0) {
    throw new Error('No page found');
  }
  return { browser, page: pages[0] };
}

Origin Extraction (core/origin.ts)

export function extractOrigin(url: string): string {
  const parsed = new URL(url);
  return parsed.origin; // e.g., "https://github.com"
}

Keychain Storage (core/keychain.ts)

Uses keytar to store JSON config per RP:

import * as keytar from 'keytar';

const SERVICE_NAME = 'agent-vault';

interface RPConfig {
  origin: string;
  selectors: { username: string; password: string; submit?: string };
  credentials: { username: string; password: string };
}

export async function storeRP(config: RPConfig): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, config.origin, JSON.stringify(config));
}

export async function getRP(origin: string): Promise<RPConfig | null> {
  const data = await keytar.getPassword(SERVICE_NAME, origin);
  return data ? JSON.parse(data) : null;
}

Field Detection Heuristics (core/fields.ts)

For registration when agent doesn't provide selectors, or for validation:

const USERNAME_SELECTORS = [
  'input[type="email"]',
  'input[name="email"]',
  'input[autocomplete="username"]',
  'input[autocomplete="email"]',
];

const PASSWORD_SELECTORS = [
  'input[type="password"]',
  'input[autocomplete="current-password"]',
];

Installation & Usage

# Install globally
npm install -g @agent-vault/cli

# Or use via npx
npx @agent-vault/cli login --cdp "ws://localhost:9222"

Agent Integration Example

The agent's workflow becomes:

1. Agent: browser_navigate("https://github.com/login")
2. Agent: shell("vault login --cdp ws://localhost:9222")
   → Vault fills credentials, returns success/failure
3. Agent: browser_click("submit button") or vault auto-submits
4. Agent: continues with authenticated session

Out of Scope (Future)





MCP server wrapper (can be added later)



Multi-step login flows (username-first, then password)



CAPTCHA/MFA detection and user notification



Session token extraction prevention

