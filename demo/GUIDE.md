# 🎬 Complete Guide: Creating Your Agent Vault CLI Demo Video

## Overview

This guide provides **three different approaches** to create a professional demo video for Agent Vault CLI. Choose the one that fits your style!

---

## 🎯 Quick Comparison

| Approach | Best For | Difficulty | Naturalness |
|----------|----------|------------|-------------|
| **Interactive** | Guided recording with prompts | ⭐️ Easy | ⭐️⭐️⭐️⭐️⭐️ Most natural |
| **Automated** | Quick demo, no manual work | ⭐️⭐️ Medium | ⭐️⭐️ Scripted |
| **Manual** | Full control, act it yourself | ⭐️⭐️⭐️ Hard | ⭐️⭐️⭐️⭐️⭐️ Most natural |

---

## 🌟 Approach 1: Interactive Demo (RECOMMENDED)

**Best for**: First-time recording, natural narration with guidance

### Steps:

1. **Start screen recording** (Cmd+Shift+5 on macOS)
   - Select the area or window
   - Include both terminal and space for browser
   - Click "Record"

2. **Run the interactive script:**
   ```bash
   npm run demo:interactive
   ```

3. **Follow the prompts:**
   - The script will guide you through each step
   - It shows suggested narration for each action
   - Press Enter to execute commands when ready
   - Speak naturally while performing actions

4. **Save your recording:**
   - Stop screen recording (Cmd+Shift+5 → Stop)
   - Save to: `demo/recordings/demo.mov`

5. **Create the video:**
   ```bash
   npm run demo:video
   ```

### Example Narration:

```
[Title appears]
"Hi! Today I'll show you Agent Vault CLI - a secure way to let AI agents 
log into websites without exposing your credentials."

[Step 1 - Register]
"First, I'll register my credentials with the vault. Notice how I provide 
the CSS selectors for the form fields."

[Shows command + execution]
"The credentials are now stored securely in my macOS keychain."

[Step 2 - Reload]
"The form is filled. Let me reload the page to clear it."

[Browser reload]

[Step 3 - Login]
"Now I'll use the vault to auto-fill my credentials. Watch as the form 
fills automatically."

[Shows command + execution]
"And there we go! My credentials never touched the AI agent or LLM. 
They went straight from the keychain to the browser."

[Outro]
"That's Agent Vault - keeping your credentials secure while enabling 
safe automation."
```

---

## ⚡ Approach 2: Automated Demo

**Best for**: Quick demo generation, consistent results

### Steps:

1. **Start screen recording**
   ```bash
   # On macOS: Cmd+Shift+5, then click Record
   ```

2. **Run automated script:**
   ```bash
   npm run demo:auto
   ```

3. **Watch it run:**
   - Script performs all actions automatically
   - Commands are printed to console
   - Browser actions happen automatically
   - Takes ~30 seconds total

4. **Save and render:**
   ```bash
   # Save recording to demo/recordings/demo.mov
   npm run demo:video
   ```

### Pros & Cons:

✅ Quick and easy  
✅ Consistent results  
✅ No manual intervention needed  

❌ Less natural feeling  
❌ No narration  
❌ Harder to time recording perfectly  

---

## 🎭 Approach 3: Manual/Acting (Most Natural)

**Best for**: Maximum control, professional narration, acting skills

### Steps:

1. **Setup environment:**
   ```bash
   npm run build
   
   # Terminal 1 - Start test server
   node -e "import('./tests/fixtures/server.js').then(m => m.startTestServer(9501).then(() => new Promise(() => {})))"
   
   # Terminal 2 - Launch browser
   CHROMIUM_PATH=$(node -p "require('playwright').chromium.executablePath()")
   "$CHROMIUM_PATH" --remote-debugging-port=9333 --window-size=1280,800 http://127.0.0.1:9501
   
   # Get CDP endpoint
   CDP=$(curl -s http://127.0.0.1:9333/json/version | node -p "JSON.parse(require('fs').readFileSync(0, 'utf-8')).webSocketDebuggerUrl")
   ```

2. **Start recording and act naturally:**

   ```bash
   # Say: "Let me register my credentials..."
   vault register \
     --cdp "$CDP" \
     --username-selector "#email" \
     --password-selector "#password" \
     --username "demo@agent-vault.dev" \
     --password "SecurePass123!" \
     --allow-http --force
   
   # Say: "Great! Now let me reload the page..."
   # Manually reload browser (Cmd+R)
   
   # Say: "And now I'll auto-fill using the vault..."
   vault login --cdp "$CDP"
   
   # Say: "Perfect! Credentials filled securely."
   ```

3. **Cleanup:**
   ```bash
   # Kill browser and server
   # Delete test credentials
   node -e "import('./dist/core/keychain.js').then(m => m.deleteRP('http://127.0.0.1:9501'))"
   ```

4. **Create video:**
   ```bash
   npm run demo:video
   ```

### Tips for Acting:

- **Speak slowly and clearly**
- **Pause between actions** (1-2 seconds)
- **Show, don't rush** - let viewers see what's happening
- **Emphasize security** - "credentials never touch the LLM"
- **Be enthusiastic** but natural
- **Practice once** before recording

---

## 🎨 Remotion Video Customization

The Remotion project creates a polished video with:

- **Title scene** with animated intro
- **Your screen recording** embedded with annotations
- **Success scene** with checkmark
- **Outro** with installation instructions

### Customize the video:

```bash
# Preview in Remotion Studio (live editing)
npm run demo:preview
```

Then edit `demo/remotion/src/Video.tsx`:

- Change colors and branding
- Adjust timing of scenes
- Modify annotations and text
- Add music or sound effects
- Change transitions

### Key customization points:

```tsx
// Colors (line ~87)
background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"

// Annotation timing (line ~130)
<Sequence from={2 * fps} durationInFrames={4 * fps}>

// Annotation text (line ~143)
text="🔒 Credentials never exposed to LLM"
```

---

## 📤 Exporting & Sharing

### Create GIF from video:

```bash
npm run demo:gif
```

Or manually:

```bash
ffmpeg -i demo/out/video.mp4 \
  -vf "fps=15,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  demo/out/demo.gif
```

### Optimization tips:

**For Twitter/X:**
- Resolution: 1280x720
- FPS: 30
- Duration: < 2:20
- Format: MP4

**For GitHub README:**
- GIF: 800px wide, 15fps
- Or host MP4 on GitHub and link

**For YouTube:**
- Resolution: 1920x1080
- FPS: 30 or 60
- Format: MP4
- Add captions!

---

## 🎬 Final Output

After running `npm run demo:video`, you'll have:

```
demo/out/
  ├── video.mp4        # Full HD video (1920x1080)
  └── demo.gif         # Optimized GIF (after running npm run demo:gif)
```

### Typical sizes:

- **MP4**: ~5-10 MB for 30 seconds
- **GIF**: ~3-8 MB (optimized)

---

## 🐛 Troubleshooting

### Browser won't launch:
```bash
# Check CDP port
lsof -i :9333
# Kill if needed
kill -9 $(lsof -t -i :9333)
```

### Test server won't start:
```bash
# Check test port
lsof -i :9501
# Kill if needed
kill -9 $(lsof -t -i :9501)
```

### Recording is choppy:
- Close other applications
- Record at lower resolution (1280x720)
- Use native screen recorder (Cmd+Shift+5)

### Remotion won't render:
```bash
cd demo/remotion
rm -rf node_modules
npm install
npm run render
```

### Video quality is poor:
- Record at higher resolution
- Ensure good lighting/contrast
- Use 30fps or higher
- Check if screen recording settings are optimized

---

## 💡 Pro Tips

1. **Practice first** - Do a dry run without recording
2. **Use two monitors** - Terminal on one, browser on other
3. **Slow down** - Type slower than normal
4. **Pause between steps** - Give viewers time to process
5. **Check audio** - If narrating, test microphone first
6. **Good lighting** - Ensure terminal text is readable
7. **Clean terminal** - Use `clear` before starting
8. **Hide sensitive info** - No real credentials in view

---

## 📚 Next Steps

After creating your video:

1. **Upload to YouTube** with good title/description
2. **Add to README** as animated GIF or video link
3. **Share on Twitter/X** with thread explaining features
4. **Post on Product Hunt** when launching
5. **Share on Reddit** (r/programming, r/commandline)
6. **Write blog post** with embedded video

---

## 🆘 Need Help?

If you run into issues:

1. Check the troubleshooting section above
2. Review the demo scripts for debugging
3. Open an issue on GitHub
4. Check Remotion docs: https://remotion.dev

---

**Ready to create your demo?** Start with the **Interactive approach** - it's the easiest and most natural!

```bash
npm run demo:interactive
```

Good luck! 🎬✨
