# Demo Video Scripts - Summary

## What Was Created

A complete video production toolkit for Agent Vault CLI with 3 recording approaches and Remotion video generation.

## File Structure

```
demo/
├── README.md                 # Overview of all approaches
├── GUIDE.md                  # Comprehensive guide (3000+ words)
├── QUICKSTART.md            # Quick reference card
├── interactive-demo.ts      # 🌟 RECOMMENDED: Guided TypeScript demo
├── automated-demo.ts        # Fully automated demo
├── manual-demo.sh           # Manual shell script
├── record-demo.sh           # Alternative recording helper
├── recordings/              # Place your recordings here
│   └── .gitkeep
├── out/                     # Video output directory
└── remotion/                # Remotion video project
    ├── package.json
    ├── tsconfig.json
    ├── remotion.config.ts
    └── src/
        ├── index.ts
        ├── Root.tsx
        └── Video.tsx        # Main video composition
```

## NPM Scripts Added

```json
{
  "demo:interactive": "tsx demo/interactive-demo.ts",  // ⭐ Best
  "demo:auto": "tsx demo/automated-demo.ts",
  "demo:manual": "chmod +x demo/manual-demo.sh && ./demo/manual-demo.sh",
  "demo:video": "cd demo/remotion && npm install && npm run render",
  "demo:preview": "cd demo/remotion && npm install && npm start"
}
```

## Three Approaches

### 1. Interactive Demo (RECOMMENDED) ⭐
**File**: `demo/interactive-demo.ts`
**Run**: `npm run demo:interactive`

**Features**:
- Step-by-step guidance
- Suggested narration for each step
- Pauses for you to speak naturally
- Full control over timing
- Color-coded console output
- Automatic cleanup

**Best for**: First-time recording, natural presentation

### 2. Automated Demo
**File**: `demo/automated-demo.ts`
**Run**: `npm run demo:auto`

**Features**:
- Runs completely automatically
- Consistent output every time
- ~30 second duration
- Prints commands as it runs
- No manual intervention

**Best for**: Quick generation, consistency

### 3. Manual Demo
**File**: `demo/manual-demo.sh`
**Run**: `npm run demo:manual`

**Features**:
- Zsh shell script
- Step-by-step prompts
- You control everything
- Maximum flexibility
- Color-coded instructions

**Best for**: Experienced users, full control

## Remotion Video

### Structure
The Remotion project creates a 30-second video with:

1. **Title Scene** (3s) - Animated intro with gradient text
2. **Demo Scene** (22s) - Your screen recording with annotations
3. **Success Scene** (3s) - Checkmark and security message
4. **Outro Scene** (2s) - Installation instructions

### Customization
Edit `demo/remotion/src/Video.tsx` to:
- Change colors/branding
- Adjust scene timing
- Modify annotations
- Add music/sound
- Change transitions

### Preview
```bash
npm run demo:preview  # Opens Remotion Studio
```

## Recording Tips

### Essential
1. ✅ Record at 1920x1080 or 1280x720
2. ✅ Include terminal + browser in frame
3. ✅ Speak slowly and clearly
4. ✅ Pause 1-2 seconds between actions

### Pro Tips
- Use two monitors (terminal + browser)
- Clean terminal before starting (`clear`)
- Test your microphone first
- Do a practice run
- Ensure good contrast/lighting

## Workflow

### Standard Workflow
```bash
# 1. Start screen recording (Cmd+Shift+5 on macOS)

# 2. Run interactive demo
npm run demo:interactive

# 3. Follow prompts, narrate naturally

# 4. Stop recording

# 5. Save to demo/recordings/demo.mov

# 6. Generate final video
npm run demo:video

# 7. Output at: demo/out/video.mp4
```

### Create GIF
```bash
# After video is created
cd demo/remotion
npm run gif

# Output: demo/out/demo.gif
```

## What Gets Demonstrated

The demo shows:

1. **Register credentials**
   - Command: `vault register`
   - Shows form being filled
   - Credentials stored in keychain

2. **Reload browser**
   - Manual page reload
   - Form is now empty

3. **Auto-fill with vault**
   - Command: `vault login`
   - Form auto-fills securely
   - Success message

**Key message**: Credentials never touch the LLM

## Troubleshooting

### Port conflicts
```bash
# Check/kill CDP port
lsof -i :9333
kill -9 $(lsof -t -i :9333)

# Check/kill test server
lsof -i :9501
kill -9 $(lsof -t -i :9501)
```

### Remotion issues
```bash
cd demo/remotion
rm -rf node_modules
npm install
```

### Recording quality
- Use native screen recorder (better quality)
- Close unnecessary apps
- Record at standard resolution (1920x1080)

## Next Steps After Recording

1. **Upload to YouTube**
   - Add good title/description
   - Use tags: cli, security, ai, agents
   - Create thumbnail

2. **Add to README**
   - Embed video or GIF
   - Add link to demo guide

3. **Share on social media**
   - Twitter/X with thread
   - LinkedIn
   - Reddit (r/programming)

4. **Product Hunt launch**
   - Use as hero video

## Technical Details

### Dependencies
- **tsx**: TypeScript execution
- **Remotion**: Video generation
- **Playwright**: Browser automation
- **FFmpeg**: (for GIF conversion)

### Video Specs
- **Resolution**: 1920x1080
- **FPS**: 30
- **Duration**: ~30 seconds
- **Format**: MP4 (H.264)

### Recording Requirements
- **macOS**: Built-in screen recorder (Cmd+Shift+5)
- **Windows**: Xbox Game Bar or OBS
- **Linux**: OBS Studio or SimpleScreenRecorder

## Files You Need to Record

Just one: `demo/recordings/demo.mov`

The Remotion project will:
- Add title/outro scenes
- Add annotations
- Apply branding/colors
- Create professional output

## Cost

Everything is free and open source:
- ✅ No cloud rendering costs
- ✅ Renders locally on your machine
- ✅ No external dependencies
- ✅ No API keys needed

## Estimated Time

- **First time setup**: 5 minutes
- **Recording**: 5 minutes (including practice)
- **Video generation**: 2-3 minutes
- **Total**: ~15 minutes

## Support

Questions? Check:
1. [GUIDE.md](./GUIDE.md) - Comprehensive guide
2. [QUICKSTART.md](./QUICKSTART.md) - Quick reference
3. [Remotion docs](https://remotion.dev) - Video customization
4. GitHub Issues - Report problems

---

**Ready to start?** Run:

```bash
npm run demo:interactive
```

Then follow the prompts! 🎬✨
