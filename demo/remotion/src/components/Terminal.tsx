import React from "react";
import { interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: monoFont } = loadFont("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

type TerminalProps = {
  frame: number;
  fps: number;
  credentials: {
    email: string;
    password: string;
  };
};

// Terminal commands and their timings
const COMMANDS = [
  {
    startFrame: 2, // seconds
    command: 'vault register --cdp "ws://..." --username "demo@agent-vault.dev" --password "***"',
    output: ["✓ Credentials registered successfully", "  Stored in macOS Keychain"],
    outputDelay: 3,
  },
  {
    startFrame: 6, // seconds (after page reload)
    command: "# Page reloaded - form is now empty",
    output: [],
    outputDelay: 0,
  },
  {
    startFrame: 7, // seconds
    command: 'vault login --cdp "ws://..."',
    output: ["✓ Login filled successfully", "  Credentials passed via CDP (never exposed!)"],
    outputDelay: 2,
  },
  {
    startFrame: 10, // seconds
    command: "# Submit button clicked",
    output: ["✓ Form submitted successfully!", "", "🔐 Demo complete!"],
    outputDelay: 0.5,
  },
];

const CHAR_DELAY = 1.5; // frames per character

export const Terminal: React.FC<TerminalProps> = ({ frame, fps }) => {
  const entrance = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const scale = interpolate(entrance, [0, 1], [0.95, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        background: "#1e1e1e",
        borderRadius: 12,
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
        overflow: "hidden",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {/* Terminal Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 16px",
          background: "#2d2d2d",
          borderBottom: "1px solid #3d3d3d",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#ff5f56",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#ffbd2e",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#27c93f",
            }}
          />
        </div>
        <div
          style={{
            marginLeft: "auto",
            color: "#888",
            fontSize: 13,
            fontFamily: monoFont,
          }}
        >
          Terminal — vault-cli
        </div>
      </div>

      {/* Terminal Content */}
      <div
        style={{
          flex: 1,
          padding: 20,
          fontFamily: monoFont,
          fontSize: 15,
          lineHeight: 1.7,
          color: "#e0e0e0",
          overflow: "hidden",
        }}
      >
        {COMMANDS.map((cmd, cmdIndex) => {
          const cmdStartFrame = cmd.startFrame * fps;
          const cmdEndFrame = cmdStartFrame + cmd.command.length * CHAR_DELAY;
          const outputStartFrame = cmdEndFrame + cmd.outputDelay * fps;

          // Don't show command if we haven't reached its start
          if (frame < cmdStartFrame) return null;

          // Calculate how much of the command to show (typewriter effect)
          const charsToShow = Math.floor(
            Math.min(
              cmd.command.length,
              (frame - cmdStartFrame) / CHAR_DELAY
            )
          );
          const typedCommand = cmd.command.slice(0, charsToShow);
          const isTyping = charsToShow < cmd.command.length;

          // Calculate output visibility
          const showOutput = frame >= outputStartFrame;

          return (
            <div key={cmdIndex} style={{ marginBottom: 16 }}>
              {/* Command line */}
              <div style={{ display: "flex" }}>
                <span style={{ color: "#00ff00" }}>$ </span>
                <span style={{ color: cmd.command.startsWith("#") ? "#888" : "#fff" }}>
                  {typedCommand}
                </span>
                {isTyping && <Cursor frame={frame} />}
              </div>

              {/* Output lines */}
              {showOutput &&
                cmd.output.map((line, lineIndex) => {
                  const lineDelay = lineIndex * 0.2 * fps;
                  const lineFrame = frame - outputStartFrame - lineDelay;
                  
                  if (lineFrame < 0) return null;

                  const lineOpacity = interpolate(
                    lineFrame,
                    [0, 5],
                    [0, 1],
                    { extrapolateRight: "clamp" }
                  );

                  const isSuccess = line.startsWith("✓") || line.startsWith("🔐");

                  return (
                    <div
                      key={lineIndex}
                      style={{
                        color: isSuccess ? "#4caf50" : "#888",
                        opacity: lineOpacity,
                        marginLeft: 16,
                      }}
                    >
                      {line}
                    </div>
                  );
                })}
            </div>
          );
        })}

        {/* Show cursor at the end if no command is being typed */}
        {COMMANDS.every((cmd) => {
          const cmdStartFrame = cmd.startFrame * fps;
          const cmdEndFrame = cmdStartFrame + cmd.command.length * CHAR_DELAY;
          return frame < cmdStartFrame || frame >= cmdEndFrame;
        }) && frame >= 1 * fps && (
          <div style={{ display: "flex" }}>
            <span style={{ color: "#00ff00" }}>$ </span>
            <Cursor frame={frame} />
          </div>
        )}
      </div>
    </div>
  );
};

const Cursor: React.FC<{ frame: number }> = ({ frame }) => {
  const blinkFrames = 16;
  const opacity = interpolate(
    frame % blinkFrames,
    [0, blinkFrames / 2, blinkFrames],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 18,
        background: "#00ff00",
        opacity,
        marginLeft: 2,
        verticalAlign: "middle",
      }}
    />
  );
};
