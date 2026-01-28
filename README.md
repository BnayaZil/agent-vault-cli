# Agent Vault CLI

Secure credential vault CLI for AI agents. Fills login forms via CDP (Chrome DevTools Protocol) without exposing credentials to the agent.

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
