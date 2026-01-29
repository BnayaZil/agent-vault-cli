#!/usr/bin/env zsh
# Simple manual demo script
# Run this and act naturally while recording your screen

echo "🎬 Agent Vault CLI - Manual Demo Script"
echo ""
echo "This script will guide you through a live demo."
echo "Record your screen (Cmd+Shift+5) before starting!"
echo ""
read "?Press Enter when ready to start recording..."

# Colors
autoload -U colors && colors

# Build
echo ""
echo "${fg[blue]}Building CLI...${reset_color}"
npm run build
echo ""

# Start test server in background
echo "${fg[blue]}Starting test server...${reset_color}"
node -e "
import { startTestServer } from './tests/fixtures/server.js';
const server = await startTestServer(9501);
console.log('✅ Test server running on http://127.0.0.1:9501');
process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});
// Keep alive
await new Promise(() => {});
" &
SERVER_PID=$!
sleep 2

# Launch browser
echo "${fg[blue]}Launching browser...${reset_color}"
CHROMIUM_PATH=$(node -p "require('playwright').chromium.executablePath()")
"$CHROMIUM_PATH" \
  --remote-debugging-port=9333 \
  --window-size=1280,800 \
  http://127.0.0.1:9501 &
BROWSER_PID=$!
sleep 3

# Get CDP endpoint
echo "${fg[blue]}Getting CDP endpoint...${reset_color}"
CDP=$(curl -s http://127.0.0.1:9333/json/version | node -p "JSON.parse(require('fs').readFileSync(0, 'utf-8')).webSocketDebuggerUrl")

echo ""
echo "${fg[green]}✅ Setup complete!${reset_color}"
echo ""
echo "════════════════════════════════════════════════════════"
echo "${fg[yellow]}Follow these steps (speak naturally):${reset_color}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "${fg[cyan]}STEP 1: Register credentials${reset_color}"
echo "Say: 'First, I'll register my credentials with the vault'"
echo ""
echo "vault register \\"
echo "  --cdp \"$CDP\" \\"
echo "  --username-selector \"#email\" \\"
echo "  --password-selector \"#password\" \\"
echo "  --username \"demo@agent-vault.dev\" \\"
echo "  --password \"SecurePass123!\" \\"
echo "  --allow-http --force"
echo ""
read "?Press Enter to run this command..."

node dist/index.js register \
  --cdp "$CDP" \
  --username-selector "#email" \
  --password-selector "#password" \
  --username "demo@agent-vault.dev" \
  --password "SecurePass123!" \
  --allow-http --force

echo ""
echo "${fg[green]}✅ Credentials registered!${reset_color}"
echo ""
echo "${fg[cyan]}STEP 2: Reload the browser${reset_color}"
echo "Say: 'Notice the credentials were filled. Now I'll reload the page.'"
echo "Manually reload the page in the browser (Cmd+R)"
echo ""
read "?Press Enter when you've reloaded..."

echo ""
echo "${fg[cyan]}STEP 3: Auto-fill credentials${reset_color}"
echo "Say: 'Now watch as the vault auto-fills my credentials securely'"
echo ""
echo "vault login --cdp \"$CDP\""
echo ""
read "?Press Enter to run this command..."

# Reset rate limit first
node -e "import { resetRateLimit } from './dist/core/ratelimit.js'; await resetRateLimit();"

node dist/index.js login --cdp "$CDP"

echo ""
echo "${fg[green]}✅ Credentials auto-filled from vault!${reset_color}"
echo ""
echo "════════════════════════════════════════════════════════"
echo "${fg[green]}🎉 Demo complete!${reset_color}"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Say: 'And that's how Agent Vault keeps your credentials secure'"
echo ""
read "?Press Enter to cleanup..."

# Cleanup
echo ""
echo "${fg[blue]}Cleaning up...${reset_color}"
kill $BROWSER_PID 2>/dev/null || true
kill $SERVER_PID 2>/dev/null || true

node -e "
import { deleteRP } from './dist/core/keychain.js';
await deleteRP('http://127.0.0.1:9501');
console.log('✅ Cleaned up test credentials');
" || true

echo ""
echo "${fg[green]}Done! Don't forget to save your screen recording to demo/recordings/${reset_color}"
echo ""
