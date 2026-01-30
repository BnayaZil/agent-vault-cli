# Agent Vault CLI

**Your AI agent can log into websites. Your credentials never touch the LLM.**

Whether you're using personal accounts or dedicated agent credentials, they go straight from your keychain to the browser — never through the agent, never to the API.

```
Without Agent Vault:
User → "login with alice@example.com / MySecret123" → Agent → LLM API
                                                               ↓
                                                      Credentials in:
                                                      • API logs
                                                      • Conversation history
                                                      • Training data (maybe)

With Agent Vault:
Agent → "log in" → Vault → Browser
                     ↓
        Agent sees: "success" or "failed"
        Credentials: never leave your keychain
```

> ⚠️ **Early development** — API may change. Feedback welcome.

## Quick Start

```bash
npm install -g @agent-vault/cli
```

**1. Register credentials** (you do this once, interactively):

```bash
vault register --cdp "ws://localhost:9222" \
  --username-selector "#email" \
  --password-selector "#password"
```

**2. Let your agent log in** (credentials never exposed):

```bash
vault login --cdp "ws://localhost:9222"
```

That's it. The agent calls `vault login`, gets back "success" or "failed", and continues with an authenticated session.

---

## How It Works

The agent provides a browser (CDP endpoint). The vault:

1. Connects directly to the browser
2. Reads the current origin from the page (not from the agent)
3. Looks up credentials for that origin in your OS keychain
4. Fills the form and submits

The agent never handles, sees, or transmits credentials.

---

## Why Not Use Existing Tools?

**MCP credential tools** (1Password MCP, authenticator_mcp, etc.) return credentials to the agent:

```
Vault → MCP Server → Returns credential → Agent has credential → LLM context
```

They solve "don't commit secrets to git." They don't solve "don't expose secrets to the LLM."

**Password manager extensions** keep credentials out of the LLM, but don't work in headless browsers — and that's where most production agents run.

Agent Vault works in headless. Credentials go directly from keychain to browser, no extension UI required.

---

## What This Does (and Doesn't) Prevent

| Threat | Prevented? |
|--------|------------|
| Credentials slip into prompt/context | ✅ Yes |
| Credentials in LLM API logs | ✅ Yes |
| Credentials in conversation history | ✅ Yes |
| Credentials in error messages | ✅ Yes |
| Malicious agent inspects DOM/network | ❌ No |

This solves the 95% case: **credentials shouldn't be in prompts, logs, or API calls by default.**

The 5% case (active interception by a malicious agent) requires intentional attack code and leaves traces. Different threat model, different mitigations.

---

## Commands

| Command | What it does |
|---------|--------------|
| `vault register` | Save credentials for a site (interactive) |
| `vault login` | Fill credentials for current page |
| `vault list` | Show registered sites |
| `vault delete --origin <url>` | Remove credentials |
| `vault config set/get/list/unset` | Manage defaults |

Config stored in `~/.agent-vault/config.json`.

---

## Agent Integration Example

```python
# Your agent code
browser_navigate("https://github.com/login")
shell("vault login --cdp ws://localhost:9222")  # Returns success/failure
# Continue with authenticated session
```

---

## Security Model

| Action | Agent provides | Agent sees credentials? |
|--------|----------------|------------------------|
| Register | CDP endpoint + selectors | Never (you enter them) |
| Login | CDP endpoint only | Never (vault reads keychain) |

---

## Development

```bash
npm install
npm run build
npm run dev    # watch mode
npm test
```

---

## License

MIT
