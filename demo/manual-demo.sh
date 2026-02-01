#!/bin/bash

# Agent Vault CLI - Manual Demo
# This script guides you through a manual demo of the CLI

set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "   🔐 Agent Vault CLI - Manual Demo"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "This demo will guide you through using the vault CLI manually."
echo ""

# Configuration
TEST_PORT=9602
CDP_PORT=9402
ORIGIN="http://127.0.0.1:$TEST_PORT"

# Build first
echo "📦 Building CLI..."
npm run build
echo ""

# Function to cleanup
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    # Kill background processes
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    if [ ! -z "$BROWSER_PID" ]; then
        kill $BROWSER_PID 2>/dev/null || true
    fi
    # Delete test credentials
    node dist/index.js delete --origin "$ORIGIN" --force 2>/dev/null || true
    echo "Done!"
}

trap cleanup EXIT

# Create a simple test server using Node.js
echo "🌐 Starting test server on port $TEST_PORT..."
node -e "
const http = require('http');
const html = \`
<!DOCTYPE html>
<html>
<head>
  <title>Manual Demo - Login</title>
  <style>
    body { font-family: sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
    form { display: flex; flex-direction: column; gap: 15px; }
    input { padding: 12px; font-size: 16px; border: 2px solid #ddd; border-radius: 6px; }
    input:focus { border-color: #4a90d9; outline: none; }
    button { padding: 12px; font-size: 16px; cursor: pointer; background: #4a90d9; color: white; border: none; border-radius: 6px; }
    .success { color: green; display: none; margin-top: 15px; }
  </style>
</head>
<body>
  <h1>🔐 Login Demo</h1>
  <form id='form'>
    <input type='email' id='email' placeholder='Email' />
    <input type='password' id='password' placeholder='Password' />
    <button type='submit' id='submit-btn'>Sign In</button>
  </form>
  <p class='success' id='success'>✅ Login successful!</p>
  <script>
    document.getElementById('form').onsubmit = (e) => {
      e.preventDefault();
      document.getElementById('success').style.display = 'block';
    };
  </script>
</body>
</html>
\`;
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(html);
}).listen($TEST_PORT, '127.0.0.1', () => console.log('Server running at $ORIGIN'));
" &
SERVER_PID=$!
sleep 1

# Get Chromium path from Playwright
CHROMIUM_PATH=$(node -e "console.log(require('playwright-chromium').chromium.executablePath())")

echo ""
echo "🚀 Launching Chromium with CDP on port $CDP_PORT..."
"$CHROMIUM_PATH" \
    --remote-debugging-port=$CDP_PORT \
    --no-first-run \
    --no-default-browser-check \
    --window-size=800,600 \
    "$ORIGIN" &
BROWSER_PID=$!
sleep 2

# Get CDP endpoint
echo ""
echo "⏳ Getting CDP endpoint..."
CDP_URL=$(curl -s http://127.0.0.1:$CDP_PORT/json/version | node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  const data = JSON.parse(Buffer.concat(chunks).toString());
  console.log(data.webSocketDebuggerUrl);
});
")

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "   Setup complete! Now try these commands:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  Register credentials (copy and run this):"
echo ""
echo "   node dist/index.js register \\"
echo "     --cdp \"$CDP_URL\" \\"
echo "     --username-selector \"#email\" \\"
echo "     --password-selector \"#password\" \\"
echo "     --submit-selector \"#submit-btn\" \\"
echo "     --username \"demo@example.com\" \\"
echo "     --password \"DemoPass123!\" \\"
echo "     --allow-http \\"
echo "     --force"
echo ""
echo "2️⃣  Reload the page in the browser to clear the form"
echo ""
echo "3️⃣  Auto-fill credentials (copy and run this):"
echo ""
echo "   node dist/index.js login --cdp \"$CDP_URL\""
echo ""
echo "4️⃣  Use --submit flag to also click submit:"
echo ""
echo "   node dist/index.js login --cdp \"$CDP_URL\" --submit"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

read -p "Press Enter when you're done to cleanup..."
