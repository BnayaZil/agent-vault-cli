# Demo Recording Troubleshooting

## Pre-Recording Checklist

Before you start recording, verify:

- [ ] CLI is built: `npm run build`
- [ ] Port 9333 is free: `lsof -i :9333` (should be empty)
- [ ] Port 9501 is free: `lsof -i :9501` (should be empty)
- [ ] Screen recorder is ready (Cmd+Shift+5)
- [ ] Terminal is clean and readable
- [ ] Browser area is clear
- [ ] Microphone is working (if narrating)

## Common Issues & Solutions

### ❌ "Port 9333 already in use"

**Problem**: Another browser is using the CDP port

**Solution**:
```bash
# Find and kill the process
lsof -i :9333
kill -9 $(lsof -t -i :9333)
```

---

### ❌ "Port 9501 already in use"

**Problem**: Test server port is occupied

**Solution**:
```bash
# Find and kill the process
lsof -i :9501
kill -9 $(lsof -t -i :9501)
```

---

### ❌ "Cannot find module 'tsx'"

**Problem**: Missing tsx dependency

**Solution**:
```bash
npm install --save-dev tsx
```

---

### ❌ "Browser won't launch"

**Problem**: Chromium path not found or browser won't start

**Solution**:
```bash
# Test Chromium path
node -p "require('playwright').chromium.executablePath()"

# If missing, reinstall Playwright
npm install playwright
npx playwright install chromium
```

---

### ❌ "CDP endpoint timeout"

**Problem**: Browser launched but CDP not responding

**Solution**:
```bash
# Kill all Chromium processes
pkill -9 -i chromium

# Wait a moment
sleep 2

# Try again
npm run demo:interactive
```

---

### ❌ "No credentials found"

**Problem**: Trying to login before registering

**Solution**:
You must register credentials first:
```bash
# Make sure you complete Step 1 (register) before Step 3 (login)
```

---

### ❌ "Rate limit exceeded"

**Problem**: Too many attempts in short time

**Solution**:
```bash
# Reset rate limiter
node -e "import('./dist/core/ratelimit.js').then(m => m.resetRateLimit())"
```

---

### ❌ "Test server won't stop"

**Problem**: Server process hanging after demo

**Solution**:
```bash
# Find and kill all node processes running the server
lsof -i :9501
kill -9 $(lsof -t -i :9501)

# Or more aggressively
pkill -9 -f "startTestServer"
```

---

### ❌ "Recording is choppy/laggy"

**Problem**: System performance issues

**Solutions**:
1. Close unnecessary applications
2. Record at lower resolution (1280x720)
3. Use native screen recorder (not third-party)
4. Restart your computer
5. Check Activity Monitor for CPU usage

---

### ❌ "Video won't render"

**Problem**: Remotion can't find recording or has issues

**Solution**:
```bash
# Check recording exists
ls -lh demo/recordings/demo.mov

# Check Remotion dependencies
cd demo/remotion
rm -rf node_modules
npm install

# Try rendering again
npm run render
```

---

### ❌ "Video quality is poor"

**Problem**: Low resolution or compression

**Solutions**:
1. Record at 1920x1080 minimum
2. Use native screen recorder (Cmd+Shift+5)
3. Ensure good lighting/contrast
4. Check display settings (not scaled)
5. Record in better lighting conditions

---

### ❌ "Cannot read recording file"

**Problem**: Wrong file path or format

**Solutions**:
```bash
# Check file exists and has content
ls -lh demo/recordings/demo.mov
file demo/recordings/demo.mov

# Ensure it's MOV or MP4 format
# If wrong format, convert:
ffmpeg -i input.webm demo/recordings/demo.mov
```

---

### ❌ "Interactive demo freezes"

**Problem**: Script waiting for input

**Solutions**:
- Press Enter at each prompt
- Check terminal for instructions
- If stuck, press Ctrl+C and restart

---

### ❌ "Browser shows 'localhost refused to connect'"

**Problem**: Test server not running

**Solution**:
```bash
# Start test server manually
node -e "import('./tests/fixtures/server.js').then(m => m.startTestServer(9501).then(s => console.log('Server started')))"

# In another terminal, verify
curl http://127.0.0.1:9501
```

---

### ❌ "Form fields not found"

**Problem**: Wrong selectors or page not loaded

**Solutions**:
1. Wait for page to fully load
2. Verify selectors: `#email` and `#password`
3. Check browser console for errors
4. Reload the page and try again

---

### ❌ "Audio not recording"

**Problem**: Screen recorder not capturing audio

**Solutions**:
1. macOS: System Settings → Privacy & Security → Microphone
2. Allow Terminal/iTerm to access microphone
3. Test microphone first before recording
4. Use QuickTime for screen+audio recording

---

### ❌ "GIF is too large"

**Problem**: GIF file > 10MB

**Solutions**:
```bash
# Optimize GIF with lower FPS and size
ffmpeg -i demo/out/video.mp4 \
  -vf "fps=12,scale=600:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  demo/out/demo-optimized.gif

# Or use gifsicle
gifsicle -O3 --lossy=80 demo/out/demo.gif -o demo/out/demo-optimized.gif
```

---

## Still Having Issues?

### Debug Mode

Run with debug output:
```bash
DEBUG=* npm run demo:interactive
```

### Check System Requirements

Verify:
```bash
# Node version (should be 18+)
node --version

# NPM version
npm --version

# Playwright installed
npx playwright --version

# FFmpeg installed (for GIF)
ffmpeg -version
```

### Clean Start

Nuclear option - clean everything:
```bash
# Kill all processes
pkill -9 -i chromium
lsof -i :9333 | awk 'NR!=1 {print $2}' | xargs kill -9
lsof -i :9501 | awk 'NR!=1 {print $2}' | xargs kill -9

# Remove dependencies
rm -rf node_modules demo/remotion/node_modules

# Reinstall
npm install
cd demo/remotion && npm install

# Rebuild CLI
npm run build

# Try again
npm run demo:interactive
```

---

## Get Help

If nothing works:

1. **Check the logs**: Save terminal output to a file
   ```bash
   npm run demo:interactive 2>&1 | tee demo-debug.log
   ```

2. **Open an issue**: https://github.com/yourusername/agent-vault-cli/issues
   - Include debug log
   - Describe what you tried
   - System info (OS, Node version)

3. **Ask in discussions**: Share your use case

---

## Success Indicators

You know it's working when:

✅ Test server starts on port 9501  
✅ Browser launches and shows login form  
✅ CDP endpoint is printed  
✅ Register command fills the form  
✅ Login command auto-fills credentials  
✅ No error messages in terminal  

---

**Most issues are port conflicts or missing dependencies. Check those first!**
