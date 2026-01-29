# 🎬 Agent Vault CLI Demo Video Suite

Complete toolkit for creating professional demo videos showcasing your secure credential vault CLI.

---

## 📚 Documentation Index

| Document | Purpose | For |
|----------|---------|-----|
| **[QUICKSTART.md](QUICKSTART.md)** | Fast start guide | Everyone |
| **[GUIDE.md](GUIDE.md)** | Comprehensive guide | Detailed instructions |
| **[SUMMARY.md](SUMMARY.md)** | Technical overview | Understanding the system |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | Fix issues | When things go wrong |
| **[FLOW.txt](FLOW.txt)** | Visual flow diagram | Understanding the process |
| **This file** | Navigation | Finding what you need |

---

## ⚡ Quick Commands

```bash
# Recommended: Interactive guided demo
npm run demo:interactive

# Alternative: Fully automated
npm run demo:auto

# Alternative: Manual shell script  
npm run demo:manual

# Create video from recording
npm run demo:video

# Preview/edit video
npm run demo:preview
```

---

## 🎯 Choose Your Path

### 👉 New to Demo Recording?
Start here: **[QUICKSTART.md](QUICKSTART.md)**
- Quick reference card
- 5-minute overview
- Copy-paste commands

### 👉 Want Detailed Instructions?
Read: **[GUIDE.md](GUIDE.md)**
- 3 different approaches
- Step-by-step walkthrough
- Tips and best practices
- Example narration scripts

### 👉 Technical Details?
Check: **[SUMMARY.md](SUMMARY.md)**
- File structure
- Script comparison
- Video specifications
- Timeline breakdown

### 👉 Having Problems?
See: **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**
- Common issues & fixes
- Debug commands
- System requirements
- Clean slate instructions

### 👉 Understanding the Flow?
View: **[FLOW.txt](FLOW.txt)**
- Visual diagrams
- Process overview
- Timeline visualization

---

## 🌟 Recommended Workflow

```
1. Read QUICKSTART.md (2 min)
   ↓
2. Start screen recording
   ↓
3. Run: npm run demo:interactive
   ↓
4. Follow prompts naturally
   ↓
5. Save recording
   ↓
6. Run: npm run demo:video
   ↓
7. Done! Video ready to share
```

---

## 📦 What's Included

### Scripts
- `interactive-demo.ts` - 🌟 Guided TypeScript demo (recommended)
- `automated-demo.ts` - Fully automated demo
- `manual-demo.sh` - Manual shell script
- `record-demo.sh` - Alternative recording helper

### Documentation
- `README.md` - This overview
- `QUICKSTART.md` - Quick reference
- `GUIDE.md` - Comprehensive guide (3000+ words)
- `SUMMARY.md` - Technical summary
- `TROUBLESHOOTING.md` - Issue resolution
- `FLOW.txt` - Visual flow diagrams

### Video Project
- `remotion/` - Professional video generation
  - Title scene with animation
  - Annotation overlays
  - Success scene
  - Outro with CTA

### Directories
- `recordings/` - Place your screen recordings here
- `out/` - Generated videos appear here

---

## 🎬 What Gets Created

### Input
Your screen recording: `demo/recordings/demo.mov`

### Output
Professional video: `demo/out/video.mp4`

**Enhancements Added:**
- Animated title scene (3s)
- Timed annotations during demo
- Professional color grading
- Success confirmation scene (3s)
- Call-to-action outro (2s)

**Final Duration:** ~30 seconds

---

## 🎨 Customization

Want to customize the video?

```bash
# Open Remotion Studio for live editing
npm run demo:preview
```

Edit `remotion/src/Video.tsx` to change:
- Colors and branding
- Scene timing
- Annotation text and timing
- Transitions
- Typography

See [GUIDE.md](GUIDE.md) for customization examples.

---

## 📊 Comparison Table

| Feature | Interactive | Automated | Manual |
|---------|------------|-----------|--------|
| Guidance | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Control | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| Naturalness | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Speed | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Difficulty | ⭐ Easy | ⭐⭐ Medium | ⭐⭐⭐ Hard |
| Best for | First-timers | Quick demos | Experts |

---

## 💡 Pro Tips

1. **Practice first** - Do a dry run before recording
2. **Use two monitors** - Terminal on one, browser on other
3. **Slow down** - Type and speak slower than normal
4. **Good lighting** - Ensure terminal text is readable
5. **Test audio** - Check microphone before recording
6. **Clean terminal** - Run `clear` before starting
7. **Check settings** - Verify resolution and frame rate

---

## 🎓 What You'll Demonstrate

### Act 1: Register (10s)
- Show the `vault register` command
- Demonstrate form fields being filled
- Explain credentials go to keychain

### Act 2: Clear (3s)
- Reload the browser page
- Show form is now empty

### Act 3: Auto-fill (10s)
- Run `vault login`
- Watch credentials fill automatically
- Emphasize security: "Never touched the LLM"

**Key Message**: Credentials go from keychain → browser, never through the agent

---

## 📐 Technical Specs

### Recording
- **Resolution**: 1920x1080 (or 1280x720)
- **Format**: MOV or MP4
- **FPS**: 30 (or native)
- **Audio**: Optional narration

### Output Video
- **Resolution**: 1920x1080
- **FPS**: 30
- **Format**: MP4 (H.264)
- **Duration**: ~30 seconds
- **Size**: ~5-10 MB

### System Requirements
- macOS, Linux, or Windows
- Node.js 18+
- FFmpeg (for GIF conversion)
- Screen recorder

---

## 🚀 Distribution

After creating your video:

### Upload
- **YouTube**: With proper title/description/tags
- **Twitter/X**: Thread with key points
- **LinkedIn**: Professional audience
- **Product Hunt**: For launches

### Embed
- **GitHub README**: Use GIF or video embed
- **Website**: Hero section
- **Documentation**: Getting started guide
- **Blog posts**: Tutorial content

### Optimize
```bash
# Create optimized GIF
npm run demo:gif

# Or manually optimize
ffmpeg -i demo/out/video.mp4 \
  -vf "fps=15,scale=800:-1" \
  demo/out/demo-optimized.gif
```

---

## 📞 Getting Help

### First Steps
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review [GUIDE.md](GUIDE.md) for your scenario
3. Verify system requirements

### If Still Stuck
1. Run with debug output: `DEBUG=* npm run demo:interactive`
2. Check the [Issues page](https://github.com/yourusername/agent-vault-cli/issues)
3. Open a new issue with:
   - What you tried
   - Error messages
   - System info (OS, Node version)

---

## 🎉 Success Checklist

After completing your demo, you should have:

- [x] Recording saved to `demo/recordings/demo.mov`
- [x] Video generated at `demo/out/video.mp4`
- [x] Optional GIF at `demo/out/demo.gif`
- [x] Clean terminal (cleanup ran successfully)
- [x] No orphan processes (ports freed)

---

## 📝 License

All demo scripts and Remotion project: MIT License

Same as the main project.

---

## 🙏 Credits

Built with:
- [Remotion](https://remotion.dev) - Video generation
- [Playwright](https://playwright.dev) - Browser automation
- [Vitest](https://vitest.dev) - Testing framework

---

**Ready to create your demo video?**

Start with the interactive approach:

```bash
npm run demo:interactive
```

Then read [QUICKSTART.md](QUICKSTART.md) for details.

Good luck! 🎬✨
