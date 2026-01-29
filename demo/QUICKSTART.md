# 🎬 Quick Start - Demo Recording

## Fastest Path: Interactive Demo

```bash
# 1. Start screen recording (Cmd+Shift+5 on macOS)
# 2. Run:
npm run demo:interactive

# 3. Follow prompts, speak naturally
# 4. Save recording to demo/recordings/demo.mov
# 5. Generate video:
npm run demo:video

# Done! Video at: demo/out/video.mp4
```

## Commands Reference

```bash
# Interactive (RECOMMENDED) - Guided recording
npm run demo:interactive

# Automated - Watch it run automatically
npm run demo:auto

# Manual - Shell script with prompts
npm run demo:manual

# Create video from recording
npm run demo:video

# Preview/edit in Remotion Studio
npm run demo:preview
```

## Quick Tips

✅ **Record at 1920x1080 or 1280x720**  
✅ **Speak slowly and clearly**  
✅ **Pause 1-2 seconds between steps**  
✅ **Show terminal + browser in frame**  

## What You'll Record

1. **Register** credentials with vault
2. **Reload** browser page
3. **Login** - auto-fill from vault

Total time: ~30 seconds

## Suggested Narration

> "I'll register my credentials with Agent Vault..."  
> [Run register command]  
> "Credentials stored securely in my keychain."  
> [Reload browser]  
> "Now I'll auto-fill using the vault..."  
> [Run login command]  
> "Perfect! Credentials filled without touching the LLM."

---

For detailed guide, see [GUIDE.md](./GUIDE.md)
