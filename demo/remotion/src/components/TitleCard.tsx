import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin"],
});

export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Entrance animations
  const iconSpring = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  const titleSpring = spring({
    frame: frame - 8,
    fps,
    config: { damping: 15 },
  });

  const subtitleSpring = spring({
    frame: frame - 16,
    fps,
    config: { damping: 200 },
  });

  const taglineSpring = spring({
    frame: frame - 24,
    fps,
    config: { damping: 200 },
  });

  // Exit animation (fade out at the end)
  const exitStart = durationInFrames - fps * 0.5;
  const exitOpacity = interpolate(
    frame,
    [exitStart, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        opacity: exitOpacity,
      }}
    >
      {/* Animated background particles */}
      <BackgroundParticles frame={frame} />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1,
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: 100,
            marginBottom: 24,
            transform: `scale(${interpolate(iconSpring, [0, 1], [0, 1])}) rotate(${interpolate(iconSpring, [0, 1], [-180, 0])}deg)`,
            opacity: iconSpring,
          }}
        >
          🔐
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            margin: 0,
            marginBottom: 16,
            textShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
            transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
            opacity: titleSpring,
          }}
        >
          Agent Vault CLI
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 28,
            color: "rgba(255, 255, 255, 0.8)",
            margin: 0,
            marginBottom: 32,
            transform: `translateY(${interpolate(subtitleSpring, [0, 1], [20, 0])}px)`,
            opacity: subtitleSpring,
          }}
        >
          Secure credential vault for AI agents
        </p>

        {/* Tagline badges */}
        <div
          style={{
            display: "flex",
            gap: 16,
            transform: `translateY(${interpolate(taglineSpring, [0, 1], [20, 0])}px)`,
            opacity: taglineSpring,
          }}
        >
          <Badge>🔒 macOS Keychain</Badge>
          <Badge>🌐 CDP Protocol</Badge>
          <Badge>🤖 AI-Ready</Badge>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      background: "rgba(255, 255, 255, 0.15)",
      color: "white",
      padding: "10px 20px",
      borderRadius: 30,
      fontSize: 16,
      fontWeight: 600,
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
    }}
  >
    {children}
  </span>
);

const BackgroundParticles: React.FC<{ frame: number }> = ({ frame }) => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: (i * 137.5) % 100,
    y: (i * 73.3) % 100,
    size: 4 + (i % 3) * 2,
    speed: 0.5 + (i % 5) * 0.2,
  }));

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${(p.y + frame * p.speed * 0.1) % 120 - 10}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: `rgba(255, 255, 255, ${0.1 + (i % 3) * 0.05})`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
