# Agent Vault CLI - Roadmap & Future Enhancements

## Overview

This document outlines the expansion of Agent Vault CLI from browser credential management to a comprehensive secure credential system for AI agents across multiple domains (HTTP APIs, Git, databases, cloud providers, etc.).

---

## Critical Refinements for `vault curl`

### 1. Scope-Based Credential Management

**Problem:** Domain-based matching is too simplistic. Multiple credentials may exist for the same domain with different purposes and permission levels.

**Solution:** Implement named scopes with explicit domain and permission mappings.

```bash
# Register API credentials with scope
vault register-api \
  --name "github-personal" \
  --domain "api.github.com" \
  --scope "repos,user" \
  --auth-type "bearer"

# Use scope when making requests
vault curl --scope "github-personal" https://api.github.com/user/repos
```

**Requirements:**
- [ ] Scope naming and description
- [ ] Domain allowlist per scope
- [ ] Permission/capability metadata per scope
- [ ] Scope validation before credential injection

---

### 2. Multiple Authentication Schemes Support

**Problem:** APIs use various authentication methods, not just `Authorization` headers.

**Authentication Types to Support:**
- [ ] Bearer tokens (`Authorization: Bearer <token>`)
- [ ] Basic auth (`Authorization: Basic <base64>`)
- [ ] API keys in query params (`?api_key=<token>`)
- [ ] Custom headers (`X-API-Key`, `X-Auth-Token`, etc.)
- [ ] OAuth 2.0 with token refresh
- [ ] mTLS (client certificates)
- [ ] AWS Signature v4
- [ ] HMAC-based signatures

**Implementation:**
```bash
# Example: Bearer token
vault register-api \
  --name "stripe-prod" \
  --auth-type "bearer" \
  --header-name "Authorization" \
  --header-prefix "Bearer"

# Example: Custom header
vault register-api \
  --name "sendgrid" \
  --auth-type "header" \
  --header-name "X-API-Key"

# Example: Query parameter
vault register-api \
  --name "weather-api" \
  --auth-type "query" \
  --param-name "api_key"
```

---

### 3. Credential Discovery Without Exposure

**Problem:** Agents need to know what credentials are available without seeing the actual secrets.

**Solution:** Provide metadata listing without revealing credentials.

```bash
# List all registered scopes
vault list-scopes

# List scopes for specific domain
vault list-scopes --domain "api.github.com"

# Show scope details (no credentials)
vault describe-scope github-personal
```

**Output Example:**
```
Scope: github-personal
Domain: api.github.com
Auth Type: bearer
Permissions: repos, user
Registered: 2026-01-15
Last Used: 2026-01-30
```

**Requirements:**
- [ ] Scope listing command
- [ ] Domain filtering
- [ ] Metadata display (no secrets)
- [ ] Usage statistics per scope

---

### 4. Strict Domain Validation & Attack Prevention

**Problem:** Agent could attempt to send credentials to unintended domains.

**Solution:** Strict domain matching with explicit override mechanism.

```bash
# This should fail:
vault curl --scope "github-personal" https://evil.com
# Error: Scope 'github-personal' is registered for 'api.github.com', not 'evil.com'

# Explicit override (logged as high-risk):
vault curl --scope "github-personal" https://evil.com --force
# Warning: Forcing credential use outside registered domain. This action is logged.
```

**Requirements:**
- [ ] Strict domain matching (exact match or subdomain rules)
- [ ] Explicit `--force` flag for overrides
- [ ] High-priority logging for forced operations
- [ ] Option to disable `--force` entirely per scope
- [ ] Wildcard subdomain support (`*.api.github.com`)

---

### 5. Audit Logging & Activity Monitoring

**Problem:** Need visibility into what agents are doing with credentials without exposing the credentials themselves.

**Solution:** Comprehensive audit log of all credential usage.

```bash
# View audit log
vault audit-log

# Filter by scope
vault audit-log --scope "github-personal"

# Filter by date
vault audit-log --since "2026-01-01"

# Filter by status code
vault audit-log --status "4xx,5xx"
```

**Log Entry Format:**
```
2026-01-30 10:23:45 | vault curl | github-personal | api.github.com/user | 200 OK | 245ms
2026-01-30 10:24:12 | vault curl | stripe-prod | api.stripe.com/v1/charges | 403 Forbidden | 182ms
2026-01-30 10:25:33 | vault git push | github-personal | github.com/user/repo | success | 3.2s
```

**Requirements:**
- [ ] Timestamp
- [ ] Command type
- [ ] Scope used
- [ ] Endpoint/resource accessed
- [ ] Response status/result
- [ ] Duration
- [ ] Request size
- [ ] Response size
- [ ] Error details (if any)

---

### 6. Rate Limiting & Anomaly Detection

**Problem:** Malicious or buggy agents could abuse credentials (e.g., 1000 API calls in 1 minute).

**Solution:** Configurable rate limits and anomaly detection per scope.

```bash
# Set rate limits
vault set-rate-limit --scope "github-personal" --limit "100/minute"
vault set-rate-limit --scope "stripe-prod" --limit "50/hour"

# When limit exceeded:
vault curl --scope "github-personal" https://api.github.com/...
# Error: Rate limit exceeded. 101 calls in 60s (threshold: 100/min)
# Review audit log: vault audit-log --scope github-personal --last 1h
# Approve burst: vault approve-burst <request-id>
```

**Anomaly Detection:**
- [ ] Sudden spike in request volume
- [ ] Unusual time-of-day access
- [ ] Multiple failed authentication attempts
- [ ] Access to new endpoints not previously used
- [ ] Geographic anomalies (if applicable)

**Requirements:**
- [ ] Per-scope rate limiting
- [ ] Configurable time windows (per second/minute/hour/day)
- [ ] Burst approval mechanism
- [ ] Alert on anomaly detection
- [ ] Automatic temporary suspension on severe anomalies

---

### 7. Command Allowlists & Restrictions

**Problem:** Some credentials should only be used with specific commands.

**Solution:** Per-scope command restrictions.

```bash
# Register with restrictions
vault register-api \
  --name "github-readonly" \
  --allowed-commands "vault curl,vault git clone,vault git pull" \
  --blocked-commands "vault git push"

# This works:
vault curl --scope "github-readonly" https://api.github.com/repos

# This fails:
vault git push --scope "github-readonly"
# Error: Command 'vault git push' not allowed for scope 'github-readonly'
```

**Requirements:**
- [ ] Allowlist of permitted commands per scope
- [ ] Denylist of forbidden commands per scope
- [ ] Command pattern matching (e.g., `vault git *` allows all git commands)
- [ ] Override mechanism with approval

---

## New Use Cases & Commands

### Priority 1: High-Value Features

#### 1. Git Operations (`vault git`)

**Purpose:** Enable agents to perform Git operations without exposing tokens or SSH keys.

```bash
# Clone private repositories
vault git clone https://github.com/private/repo.git --scope "github-personal"

# Push with credentials
vault git push origin main --scope "github-work"

# Pull with credentials
vault git pull --scope "gitlab-ci"

# Set remote with credentials
vault git remote add origin https://github.com/org/repo.git --scope "github-org"
```

**Implementation Tasks:**
- [ ] HTTPS token authentication
- [ ] SSH key authentication
- [ ] Git credential helper integration
- [ ] Multiple identity support (work vs personal)
- [ ] Automatic scope detection from remote URL
- [ ] Support for GitHub, GitLab, Bitbucket, Azure DevOps

**Authentication Methods:**
- [ ] Personal Access Tokens (HTTPS)
- [ ] SSH keys (ED25519, RSA)
- [ ] Deploy keys
- [ ] OAuth tokens

---

#### 2. AWS CLI Operations (`vault aws`)

**Purpose:** Wrap AWS CLI to prevent credential exposure.

```bash
# S3 operations
vault aws s3 ls s3://my-bucket/ --scope "aws-prod"
vault aws s3 cp ./file.txt s3://my-bucket/ --scope "aws-prod"

# EC2 operations
vault aws ec2 describe-instances --scope "aws-prod"

# Lambda operations
vault aws lambda invoke --function-name my-func --scope "aws-prod"

# Any AWS CLI command
vault aws <any-aws-cli-command> --scope "aws-prod"
```

**Implementation Tasks:**
- [ ] AWS credential file management
- [ ] Temporary session token support
- [ ] AssumeRole support
- [ ] MFA integration
- [ ] Region configuration
- [ ] Profile management
- [ ] Cross-account access

**Credential Types:**
- [ ] Access key ID + Secret access key
- [ ] Session tokens
- [ ] IAM role assumption
- [ ] SSO integration

---

#### 3. Database Queries

**Purpose:** Allow agents to query databases without seeing connection strings.

```bash
# PostgreSQL
vault pg-query --db "production" "SELECT count(*) FROM users"
vault pg-query --db "production" --file "./query.sql"

# MySQL
vault mysql-query --db "analytics" "SELECT SUM(revenue) FROM sales"

# MongoDB
vault mongo-query --db "app-prod" "db.users.find({active: true}).count()"

# Redis
vault redis-cli --db "cache" "GET user:1234"
```

**Implementation Tasks:**
- [ ] PostgreSQL support
- [ ] MySQL/MariaDB support
- [ ] MongoDB support
- [ ] Redis support
- [ ] SQLite support
- [ ] Connection pooling
- [ ] Read-only vs read-write mode enforcement
- [ ] Query result streaming for large datasets
- [ ] Query timeout configuration
- [ ] SQL injection protection (parameterized queries)

**Security Features:**
- [ ] Enforce read-only connections
- [ ] Query allowlist/denylist
- [ ] Table-level access control
- [ ] Query result size limits
- [ ] Sensitive data masking in results

---

#### 4. Google Cloud CLI (`vault gcp`)

**Purpose:** Wrap gcloud CLI for secure GCP operations.

```bash
# Compute operations
vault gcp compute instances list --scope "gcp-prod"

# Storage operations
vault gcp storage buckets list --scope "gcp-prod"
vault gcp storage cp gs://bucket/file ./local --scope "gcp-prod"

# Cloud Functions
vault gcp functions call my-function --scope "gcp-prod"
```

**Implementation Tasks:**
- [ ] Service account JSON key support
- [ ] OAuth 2.0 authentication
- [ ] Project switching
- [ ] Region configuration
- [ ] gcloud CLI wrapper
- [ ] GKE authentication

---

#### 5. Azure CLI (`vault azure`)

**Purpose:** Wrap Azure CLI for secure Azure operations.

```bash
# VM operations
vault azure vm list --scope "azure-prod"

# Storage operations
vault azure storage blob list --scope "azure-prod"

# App Service
vault azure webapp list --scope "azure-prod"
```

**Implementation Tasks:**
- [ ] Service principal authentication
- [ ] Managed identity support
- [ ] Subscription switching
- [ ] Resource group scoping
- [ ] az CLI wrapper

---

### Priority 2: Medium-Value Features

#### 6. Docker Registry Operations (`vault docker`)

```bash
vault docker pull private-registry.com/my-app:latest --scope "docker-prod"
vault docker push private-registry.com/my-app:v2 --scope "docker-prod"
vault docker login private-registry.com --scope "docker-prod"
```

**Implementation Tasks:**
- [ ] Docker Hub authentication
- [ ] Private registry support (Harbor, ECR, GCR, ACR)
- [ ] Registry credentials management
- [ ] Multi-registry support

---

#### 7. SSH/SFTP Operations (`vault ssh`)

```bash
vault ssh user@server.com "ls -la /var/log" --scope "prod-servers"
vault sftp get server.com:/path/to/file ./local --scope "backup-server"
vault scp ./local-file server.com:/remote/path --scope "deploy-server"
```

**Implementation Tasks:**
- [ ] SSH key management (multiple keys)
- [ ] SSH agent forwarding
- [ ] Known hosts management
- [ ] Port forwarding support
- [ ] Jump host / bastion support
- [ ] SFTP protocol support
- [ ] SCP protocol support

---

#### 8. Email/SMTP (`vault email`)

```bash
vault send-email \
  --scope "smtp-company" \
  --to "customer@example.com" \
  --subject "Order Confirmation" \
  --body "Your order has been shipped" \
  --from "noreply@company.com"

vault send-email \
  --scope "sendgrid-marketing" \
  --template "order-confirmation" \
  --to "customer@example.com" \
  --vars '{"order_id": "12345"}'
```

**Implementation Tasks:**
- [ ] SMTP authentication
- [ ] SendGrid API integration
- [ ] Mailgun API integration
- [ ] AWS SES integration
- [ ] Template support
- [ ] Attachment support
- [ ] HTML email support

---

#### 9. Infrastructure as Code (`vault terraform`, `vault pulumi`)

```bash
vault terraform init --scope "aws-prod"
vault terraform plan --scope "aws-prod"
vault terraform apply --scope "aws-prod"

vault pulumi up --scope "aws-prod"
```

**Implementation Tasks:**
- [ ] Terraform backend credential injection
- [ ] Pulumi backend credential injection
- [ ] Provider credential management
- [ ] State file security
- [ ] Plan approval workflow

---

#### 10. CI/CD Platform Integration

```bash
# GitHub Actions
vault github-actions trigger-workflow \
  --scope "github-ci" \
  --repo "myorg/myrepo" \
  --workflow "deploy.yml"

# GitLab CI
vault gitlab-ci trigger-pipeline \
  --scope "gitlab-ci" \
  --project-id 12345

# Jenkins
vault jenkins trigger-job \
  --scope "jenkins-prod" \
  --job "deploy-production"

# CircleCI
vault circleci trigger-pipeline \
  --scope "circleci" \
  --project "github/myorg/myrepo"
```

**Implementation Tasks:**
- [ ] GitHub Actions API integration
- [ ] GitLab CI API integration
- [ ] Jenkins API integration
- [ ] CircleCI API integration
- [ ] Build status polling
- [ ] Artifact download

---

### Priority 3: Nice-to-Have Features

#### 11. Package Registry Publishing

```bash
# npm
vault npm publish --scope "npm-publish"

# PyPI
vault pypi publish --scope "pypi-publish"

# RubyGems
vault gem push --scope "rubygems-publish"

# Docker Hub
vault dockerhub push myimage:v1 --scope "dockerhub"
```

**Implementation Tasks:**
- [ ] npm registry authentication
- [ ] PyPI authentication
- [ ] RubyGems authentication
- [ ] Maven Central authentication
- [ ] NuGet authentication

---

#### 12. Kubernetes Operations (`vault kubectl`)

```bash
vault kubectl get pods --scope "k8s-prod"
vault kubectl apply -f deployment.yaml --scope "k8s-prod"
vault kubectl exec -it pod-name -- /bin/bash --scope "k8s-prod"
```

**Implementation Tasks:**
- [ ] kubeconfig management
- [ ] Multiple cluster support
- [ ] Context switching
- [ ] Service account token management
- [ ] RBAC integration

---

#### 13. Slack/Discord Integration

```bash
vault slack send-message \
  --scope "slack-bot" \
  --channel "#deployments" \
  --text "Deployment completed successfully"

vault discord send-message \
  --scope "discord-bot" \
  --channel "alerts" \
  --text "System alert: High CPU usage"
```

**Implementation Tasks:**
- [ ] Slack API integration
- [ ] Discord API integration
- [ ] Webhook support
- [ ] Bot token management

---

## Architecture Enhancements

### 1. Plugin System

**Purpose:** Allow third-party commands without modifying core codebase.

```javascript
// ~/.agent-vault/plugins/vault-custom-api/index.js
export default {
  name: 'custom-api',
  commands: {
    'custom-api': {
      description: 'Call custom API',
      handler: async (args, credentials) => {
        // Plugin implementation
      }
    }
  }
}
```

**Requirements:**
- [ ] Plugin discovery mechanism
- [ ] Plugin registration API
- [ ] Sandboxed plugin execution
- [ ] Plugin dependency management
- [ ] Plugin versioning
- [ ] Security review process for official plugins

---

### 2. Scope Inheritance & Hierarchies

**Purpose:** Organize scopes hierarchically for better management.

```bash
# Create scope hierarchy
vault register-api --name "aws-prod" --parent "aws"
vault register-api --name "aws-staging" --parent "aws"

# Use child scope (inherits parent settings)
vault aws s3 ls --scope "aws-prod"
```

**Requirements:**
- [ ] Parent-child scope relationships
- [ ] Setting inheritance
- [ ] Override mechanism
- [ ] Scope groups/tags

---

### 3. Multi-User Support & Teams

**Purpose:** Support team environments with shared credentials.

```bash
# Team-level credentials
vault register-api \
  --name "github-team" \
  --team "engineering" \
  --shared

# Personal credentials
vault register-api \
  --name "github-personal" \
  --private
```

**Requirements:**
- [ ] User authentication
- [ ] Team/group management
- [ ] Shared vs private scopes
- [ ] Access control lists
- [ ] Credential rotation notifications
- [ ] Centralized credential storage option

---

### 4. Credential Rotation Support

**Purpose:** Automated credential rotation for security.

```bash
# Set rotation policy
vault set-rotation-policy \
  --scope "aws-prod" \
  --interval "90d" \
  --warn "7d"

# Rotate credentials
vault rotate-credentials --scope "aws-prod"

# Check rotation status
vault rotation-status
```

**Requirements:**
- [ ] Rotation scheduling
- [ ] Rotation warnings
- [ ] Automated rotation for supported services
- [ ] Rotation history
- [ ] Rollback mechanism

---

### 5. Import/Export & Backup

**Purpose:** Facilitate credential migration and backup.

```bash
# Export scopes (encrypted)
vault export --output ./vault-backup.enc --password "strong-password"

# Import scopes
vault import --input ./vault-backup.enc --password "strong-password"

# Backup to remote (encrypted)
vault backup --destination "s3://backup-bucket/vault-backup"
```

**Requirements:**
- [ ] Encrypted export format
- [ ] Password-based encryption
- [ ] Remote backup support
- [ ] Selective export (specific scopes)
- [ ] Backup verification
- [ ] Restore dry-run mode

---

### 6. Temporary Credentials & Time-Limited Access

**Purpose:** Grant temporary access for specific tasks.

```bash
# Create temporary scope (expires in 1 hour)
vault create-temp-scope \
  --name "deploy-temp" \
  --parent "aws-prod" \
  --duration "1h"

# Check expiration
vault list-scopes --show-expiry
```

**Requirements:**
- [ ] Time-limited scope creation
- [ ] Automatic cleanup on expiry
- [ ] Expiry warnings
- [ ] Extension mechanism
- [ ] One-time use credentials

---

### 7. Approval Workflow for Sensitive Operations

**Purpose:** Require human approval for high-risk operations.

```bash
# Configure approval required
vault set-approval-required \
  --scope "prod-database" \
  --commands "vault pg-query" \
  --requires-approval

# Agent makes request
vault pg-query --db "production" "DELETE FROM users" --scope "prod-database"
# Output: Approval required. Request ID: req-abc123
# Notify administrator: approval-request sent

# Administrator approves
vault approve-request req-abc123

# Agent retries (now succeeds)
vault pg-query --db "production" "DELETE FROM users" --scope "prod-database" --request-id req-abc123
```

**Requirements:**
- [ ] Approval request system
- [ ] Multiple approver support
- [ ] Approval notifications (email, Slack, etc.)
- [ ] Approval timeout
- [ ] Approval audit trail
- [ ] Risk-based auto-approval for low-risk ops

---

### 8. Dry-Run Mode

**Purpose:** Test commands without executing them.

```bash
vault curl --scope "github-personal" https://api.github.com/user --dry-run
# Output: Would execute:
# Command: curl https://api.github.com/user
# Headers: Authorization: Bearer [REDACTED]
# Method: GET
# No actual request made.
```

**Requirements:**
- [ ] `--dry-run` flag for all commands
- [ ] Show what would be executed (redacted credentials)
- [ ] Validation without execution
- [ ] Useful for debugging and testing

---

### 9. Credential Health Monitoring

**Purpose:** Proactively detect credential issues.

```bash
# Check credential health
vault health-check

# Output:
# ✅ github-personal: Valid (last used: 2h ago)
# ⚠️  aws-staging: Expiring in 7 days
# ❌ stripe-prod: Invalid (401 Unauthorized)
# ⏰ gitlab-ci: Not used in 30 days (consider removing)
```

**Requirements:**
- [ ] Periodic credential validation
- [ ] Expiration tracking
- [ ] Usage monitoring
- [ ] Health dashboard
- [ ] Alerts for invalid credentials

---

### 10. Integration with Existing Secret Managers

**Purpose:** Support existing enterprise secret management solutions.

```bash
# Configure secret backend
vault config set-backend \
  --type "1password" \
  --vault "Engineering"

vault config set-backend \
  --type "hashicorp-vault" \
  --server "https://vault.company.com"

vault config set-backend \
  --type "aws-secrets-manager" \
  --region "us-east-1"
```

**Supported Backends:**
- [ ] OS Keychain (default)
- [ ] 1Password
- [ ] HashiCorp Vault
- [ ] AWS Secrets Manager
- [ ] Azure Key Vault
- [ ] Google Secret Manager
- [ ] Bitwarden
- [ ] LastPass Enterprise

---

## Implementation Priority Matrix

### Phase 1: Foundation (MVP)
- [x] Browser credential management (existing)
- [ ] `vault curl` with basic auth schemes
- [ ] Scope-based credential management
- [ ] Basic audit logging
- [ ] Domain validation

### Phase 2: High-Value Commands
- [ ] `vault git` (clone, push, pull)
- [ ] `vault aws` (S3, EC2, Lambda)
- [ ] `vault gcp` (Compute, Storage)
- [ ] `vault azure` (VM, Storage)
- [ ] Enhanced audit logging with rate limiting

### Phase 3: Database & Infrastructure
- [ ] `vault pg-query` / `vault mysql-query`
- [ ] `vault terraform` / `vault pulumi`
- [ ] `vault docker`
- [ ] Anomaly detection

### Phase 4: Advanced Security
- [ ] Credential rotation
- [ ] Approval workflows
- [ ] Health monitoring
- [ ] Multi-user support

### Phase 5: Ecosystem
- [ ] Plugin system
- [ ] Secret manager integrations
- [ ] Import/export
- [ ] CI/CD integrations

---

## Success Metrics

### Security Metrics
- [ ] 0 credentials exposed in LLM context
- [ ] 100% of credential access logged
- [ ] < 5 second audit log query time
- [ ] > 99% credential validation success rate

### Usability Metrics
- [ ] < 30 seconds to register new credential
- [ ] < 1 second command execution overhead
- [ ] > 90% agent success rate with vault commands
- [ ] < 5 support tickets per 1000 users

### Adoption Metrics
- [ ] Track number of registered scopes per user
- [ ] Track command usage by type
- [ ] Track agent vs human usage patterns
- [ ] Track error rates and common failures

---

## Documentation Requirements

### User Documentation
- [ ] Quickstart guide for each command type
- [ ] Security model explanation
- [ ] Troubleshooting guide
- [ ] Best practices guide
- [ ] Migration guide from existing tools

### Developer Documentation
- [ ] Plugin development guide
- [ ] API reference
- [ ] Architecture overview
- [ ] Contributing guide
- [ ] Security audit guide

### Agent Integration Documentation
- [ ] MCP server integration
- [ ] Cursor/IDE integration
- [ ] CLI agent examples
- [ ] Python agent SDK
- [ ] TypeScript agent SDK

---

## Open Questions

1. **Credential Sharing:** Should agents be able to share credentials across sessions? How to handle credential lifetime?

2. **Network Security:** Should vault commands go through a proxy for additional monitoring/security?

3. **Offline Mode:** How to handle scenarios where agents operate offline but need cached credentials?

4. **Credential Portability:** Should there be a standard format for exporting credentials that works across different vault implementations?

5. **Agent Identity:** How to identify and authenticate agents themselves? Should agents have their own identity separate from the user?

6. **Cost Tracking:** Should vault track API usage and costs (especially for cloud providers)?

7. **Compliance:** How to ensure vault meets compliance requirements (SOC2, HIPAA, GDPR, etc.)?

8. **Performance:** What's the acceptable latency overhead for credential injection? Should there be a fast-path for high-frequency operations?

---

## Breaking Changes & Migration

### Breaking Changes from Current Version
- Introduce scopes (breaking: domain-only matching no longer sufficient)
- Change audit log format (breaking: log parsing tools need update)
- Require explicit scope specification (breaking: automatic domain detection removed)

### Migration Strategy
- [ ] Automatic migration tool for existing credentials
- [ ] Backward compatibility mode for 1-2 versions
- [ ] Migration guide with examples
- [ ] Deprecation warnings before breaking changes

---

## Community & Ecosystem

### Open Source Strategy
- [ ] Accept community plugins
- [ ] Community-maintained command wrappers
- [ ] Integration examples repository
- [ ] Community audit of security model

### Enterprise Features (Optional)
- [ ] Centralized credential management server
- [ ] SSO integration
- [ ] Advanced compliance reporting
- [ ] SLA and support contracts
- [ ] Custom plugin development services

---

*Last Updated: 2026-01-30*
