---
name: npm-publish
description: Guide for bumping package versions and publishing to npm via CI/CD. Use when the user asks about publishing, releasing, version bumping, or deploying to npm.
---

# NPM Publish Workflow

This project uses GitHub Actions CI/CD to automatically publish to npm when a version tag is pushed.

## Quick Publish

```bash
# 1. Bump the version (updates package.json and creates a git tag)
npm version patch   # 0.1.0 -> 0.1.1
npm version minor   # 0.1.0 -> 0.2.0
npm version major   # 0.1.0 -> 1.0.0

# 2. Push to trigger CI/CD
git push && git push --tags
```

The CI pipeline will automatically:
- Run tests on multiple platforms (Ubuntu, macOS) and Node versions (18, 20)
- Build the project
- Publish to npm if all tests pass

## Version Types

| Command | Use When | Example |
|---------|----------|---------|
| `npm version patch` | Bug fixes, small updates | 0.1.0 → 0.1.1 |
| `npm version minor` | New features, backwards compatible | 0.1.0 → 0.2.0 |
| `npm version major` | Breaking changes | 0.1.0 → 1.0.0 |

## Pre-release Versions

```bash
npm version prerelease --preid=alpha  # 0.1.0 -> 0.1.1-alpha.0
npm version prerelease --preid=beta   # 0.1.0 -> 0.1.1-beta.0
npm version prerelease --preid=rc     # 0.1.0 -> 0.1.1-rc.0
```

## Setup (One-time)

Add `NPM_TOKEN` to GitHub repository secrets:
1. Generate token at https://www.npmjs.com/settings/[username]/tokens
2. Add to GitHub repo: Settings → Secrets and variables → Actions → New repository secret
3. Name: `NPM_TOKEN`, Value: [your token]

## Troubleshooting

**CI fails to publish?**
- Verify `NPM_TOKEN` is set in GitHub secrets
- Check if version already exists on npm
- Review GitHub Actions logs

**Need to skip CI tests?**
- Not recommended, but you can manually publish: `npm publish --access public`
