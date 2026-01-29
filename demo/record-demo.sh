#!/bin/bash
# Recording script for Agent Vault CLI demo
# This script captures both terminal output and browser automation

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎬 Agent Vault CLI Demo Recorder${NC}"
echo ""

# Check dependencies
command -v ffmpeg >/dev/null 2>&1 || { echo "❌ ffmpeg is required but not installed. Install with: brew install ffmpeg"; exit 1; }

# Configuration
OUTPUT_DIR="demo/recordings"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TERMINAL_RECORDING="${OUTPUT_DIR}/terminal_${TIMESTAMP}.mov"
BROWSER_RECORDING="${OUTPUT_DIR}/browser_${TIMESTAMP}.mov"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}📋 This script will:${NC}"
echo "  1. Start test server on port 9501"
echo "  2. Launch Chromium browser"
echo "  3. Record terminal commands (via asciinema or manual)"
echo "  4. Record browser automation"
echo "  5. Save recordings for Remotion video creation"
echo ""
echo -e "${GREEN}Press Enter to start, or Ctrl+C to cancel...${NC}"
read

# Build the CLI
echo -e "${BLUE}🔨 Building CLI...${NC}"
npm run build

# Start test server in background
echo -e "${BLUE}🌐 Starting test server...${NC}"
node -e "
import { startTestServer } from './tests/fixtures/server.js';
const server = await startTestServer(9501);
console.log('Test server running on http://127.0.0.1:9501');
process.on('SIGTERM', async () => {
  await server.close();
  process.exit(0);
});
" &
SERVER_PID=$!
sleep 2

# Launch browser with remote debugging
echo -e "${BLUE}🌐 Launching Chromium with CDP...${NC}"
CHROMIUM_PATH=$(node -e "import('playwright').then(p => console.log(p.chromium.executablePath()))")
"$CHROMIUM_PATH" \
  --remote-debugging-port=9333 \
  --no-first-run \
  --window-size=1280,800 \
  --window-position=100,100 \
  http://127.0.0.1:9501 &
BROWSER_PID=$!

# Wait for CDP to be ready
echo -e "${BLUE}⏳ Waiting for CDP...${NC}"
sleep 3

# Get CDP endpoint
CDP_ENDPOINT=$(curl -s http://127.0.0.1:9333/json/version | node -e "
const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  const json = JSON.parse(Buffer.concat(chunks).toString());
  console.log(json.webSocketDebuggerUrl);
});
")

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${YELLOW}CDP Endpoint: ${CDP_ENDPOINT}${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎥 Recording Instructions:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Now perform these commands while recording your screen:"
echo ""
echo -e "${YELLOW}# 1. Register credentials${NC}"
echo "vault register \\"
echo "  --cdp \"${CDP_ENDPOINT}\" \\"
echo "  --username-selector \"#email\" \\"
echo "  --password-selector \"#password\" \\"
echo "  --username \"demo@agent-vault.dev\" \\"
echo "  --password \"SecurePass123!\" \\"
echo "  --allow-http --force"
echo ""
echo -e "${YELLOW}# 2. Reload the page manually in the browser${NC}"
echo ""
echo -e "${YELLOW}# 3. Login (auto-fill)${NC}"
echo "vault login --cdp \"${CDP_ENDPOINT}\""
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Recording with macOS:${NC}"
echo "  1. Press Cmd+Shift+5 to open screen recording"
echo "  2. Select the terminal + browser windows"
echo "  3. Click 'Record'"
echo "  4. Run the commands above"
echo "  5. Save the recording to: ${OUTPUT_DIR}/manual_${TIMESTAMP}.mov"
echo ""
echo -e "${YELLOW}Press Enter when done recording...${NC}"
read

# Cleanup
echo -e "${BLUE}🧹 Cleaning up...${NC}"
kill $BROWSER_PID 2>/dev/null || true
kill $SERVER_PID 2>/dev/null || true

# Delete test credentials
node -e "
import { deleteRP } from './dist/core/keychain.js';
await deleteRP('http://127.0.0.1:9501');
console.log('Cleaned up test credentials');
" || true

echo ""
echo -e "${GREEN}✅ Demo recording complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Move your screen recording to: ${OUTPUT_DIR}/"
echo "  2. Run: npm run demo:video"
echo "  3. Find your video in: demo/out/video.mp4"
echo ""
