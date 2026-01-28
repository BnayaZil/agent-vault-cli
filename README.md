# Agent Vault CLI

Secure credential vault CLI for AI agents. Fills login forms via CDP (Chrome DevTools Protocol) without exposing credentials to the agent.

## Why This Exists

### The Problem

Current AI agents handle browser authentication by either:
1. **Persistent browser profiles** - User logs in manually once, session cookies persist
2. **Credentials in prompts** - User provides username/password directly to the agent

The first approach works but requires manual intervention. The second is a **security disaster**:

```
User → "login with alice@example.com / MySecret123" → Agent → LLM API → Provider logs
                                                              ↓
                                               Credentials everywhere:
                                               - API request logs
                                               - Conversation history
                                               - Potentially training data
```

**No one wants credentials to slip into a prompt, and no one trusts LLMs with secrets.**

### The Solution

Agent Vault takes a different approach: **the agent never sees the credentials**.

```
Agent → "here's browser, log in" → Vault → Fills directly into browser
                                     ↓
                    Agent only sees success/failure
                    Credentials stay local (OS keychain)
```

The agent provides only a browser instance (CDP endpoint). The vault:
1. Connects directly to the browser
2. Extracts the current origin (independently, not from agent)
3. Looks up stored credentials for that origin
4. Fills the form directly

### What About Malicious Agents?

A determined attacker controlling the agent could still intercept credentials via DOM inspection or network tools. **This tool doesn't prevent that.** What it prevents:

| Threat | Likelihood | Prevented? |
|--------|------------|------------|
| Credentials slip into prompt/context | Very high | ✅ Yes |
| Credentials in LLM API request logs | Very high | ✅ Yes |
| Credentials in conversation history | High | ✅ Yes |
| Credentials in error messages/stack traces | High | ✅ Yes |
| LLM actively intercepts via network/DOM | Very low | ❌ No |

**You're not solving "malicious AI" - you're solving "credentials shouldn't be in prompts, logs, or API calls by default."** That's the 95% case.

The remaining 5% (active interception) requires intentional malice and leaves traces. That's a different threat model with different mitigations.

### Why Not Use Existing Tools?

Existing credential tools (1Password MCP, authenticator_mcp, mcp-secrets-plugin) all follow this pattern:

```
Vault/Keychain → MCP Server → Returns credential → Agent has credential
                                                   ↓
                                          Credential in LLM context
```

They protect against "don't commit secrets to git" - not "don't expose secrets to LLM."

Agent Vault is the first tool to combine:
- Secure credential storage (OS keychain)
- Browser automation (CDP)
- Origin-based isolation
- **Agent-opaque credential filling**

## Features

- **Secure Storage**: Credentials stored in OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Zero Exposure**: Agent never sees username or password - vault fills forms directly
- **CDP Integration**: Connects to browser via Chrome DevTools Protocol
- **Origin-Based**: Credentials are tied to specific origins for security

## Installation

```bash
npm install -g @agent-vault/cli
```

Or use via npx:

```bash
npx @agent-vault/cli login --cdp "ws://localhost:9222"
```

## Commands

### Register Credentials

Interactive command to register credentials for a new site:

```bash
vault register --cdp "ws://localhost:9222" \
  --username-selector "#email" \
  --password-selector "#password" \
  [--submit-selector "button[type=submit]"]
```

### Login

Automatically fill credentials for a known site:

```bash
vault login --cdp "ws://localhost:9222"
```

### List Registered Sites

```bash
vault list
```

### Delete Credentials

```bash
vault delete --origin "https://github.com"
```

### Configuration

Set default values for interactive prompts:

```bash
# Set default username for registration flows
vault config set defaultUsername alice@example.com

# View current configuration
vault config list

# Get a specific value
vault config get defaultUsername

# Remove a setting
vault config unset defaultUsername
```

Configuration is stored in `~/.agent-vault/config.json`.

## Agent Integration

The agent workflow becomes:

1. Agent navigates to login page: `browser_navigate("https://github.com/login")`
2. Agent calls vault: `shell("vault login --cdp ws://localhost:9222")`
3. Vault fills credentials and returns success/failure
4. Agent continues with authenticated session

## Security Model

| Action   | Agent Input              | Agent Access to Credentials |
|----------|--------------------------|----------------------------|
| Register | CDP endpoint + selectors | Never (user enters credentials) |
| Login    | CDP endpoint only        | Never (vault reads from keychain) |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test
```

## License

MIT
