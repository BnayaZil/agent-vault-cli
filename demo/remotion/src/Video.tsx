import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
} from "remotion";
import { Video as VideoComponent } from "@remotion/media";

interface VideoProps {
  recordingPath?: string;
}

export const Video: React.FC<VideoProps> = ({
  recordingPath = "demo.mov",
}) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Title Scene */}
      <Sequence from={0} durationInFrames={3 * fps} premountFor={fps}>
        <TitleScene />
      </Sequence>

      {/* Main Demo - Screen Recording */}
      <Sequence from={3 * fps} durationInFrames={22 * fps} premountFor={fps}>
        <DemoScene recordingPath={recordingPath} />
      </Sequence>

      {/* Success Scene */}
      <Sequence from={25 * fps} durationInFrames={3 * fps} premountFor={fps}>
        <SuccessScene />
      </Sequence>

      {/* Outro Scene */}
      <Sequence from={28 * fps} durationInFrames={2 * fps} premountFor={fps}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};

const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const opacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 120,
            fontWeight: 800,
            color: "#fff",
            margin: 0,
            marginBottom: 20,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Agent Vault CLI
        </h1>
        <p
          style={{
            fontSize: 36,
            color: "#888",
            margin: 0,
            fontWeight: 400,
          }}
        >
          Secure credentials for AI agents
        </p>
      </div>
    </AbsoluteFill>
  );
};

const DemoScene: React.FC<{ recordingPath: string }> = ({ recordingPath }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          width: "90%",
          height: "90%",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          opacity: fadeIn,
          transform: `scale(${fadeIn})`,
        }}
      >
        {/* Screen Recording */}
        <VideoComponent
          src={staticFile(recordingPath)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
          startFrom={163}      // 5 seconds, 13 frames (5s * 30fps + 13 = 163)
          endAt={388}          // 12 seconds, 28 frames (12s * 30fps + 28 = 388)
          // Example: startFrom={5 * fps}, endAt={20 * fps} uses seconds 5-20
        />
      </div>

      {/* Annotations that appear at key moments */}
      <Annotations />
    </AbsoluteFill>
  );
};

const Annotations: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      {/* "Register" annotation at 2 seconds in */}
      <Sequence from={2 * fps} durationInFrames={4 * fps}>
        <Annotation text="Registering credentials" position="top" />
      </Sequence>

      {/* "Never exposed" annotation at 6 seconds in */}
      <Sequence from={6 * fps} durationInFrames={4 * fps}>
        <Annotation
          text="🔒 Credentials never exposed to LLM"
          position="bottom"
        />
      </Sequence>

      {/* "Auto-fill" annotation at 12 seconds in */}
      <Sequence from={12 * fps} durationInFrames={4 * fps}>
        <Annotation text="Auto-filling from secure vault" position="top" />
      </Sequence>
    </>
  );
};

const Annotation: React.FC<{
  text: string;
  position: "top" | "bottom";
}> = ({ text, position }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const y = position === "top" ? 80 : undefined;
  const bottom = position === "bottom" ? 80 : undefined;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        bottom,
        display: "flex",
        justifyContent: "center",
        opacity: fadeIn,
        transform: `translateY(${interpolate(fadeIn, [0, 1], [position === "top" ? -20 : 20, 0])}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(102, 126, 234, 0.95)",
          color: "#fff",
          padding: "16px 32px",
          borderRadius: 12,
          fontSize: 28,
          fontWeight: 600,
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
        }}
      >
        {text}
      </div>
    </div>
  );
};

const SuccessScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 140,
            marginBottom: 20,
          }}
        >
          ✅
        </div>
        <h2
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#fff",
            margin: 0,
          }}
        >
          Secure & Simple
        </h2>
        <p
          style={{
            fontSize: 32,
            color: "#888",
            marginTop: 20,
          }}
        >
          Your credentials stay in your keychain
        </p>
      </div>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
        opacity: fadeIn,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: 48,
            color: "#667eea",
            margin: 0,
            fontWeight: 600,
          }}
        >
          npm install -g @agent-vault/cli
        </p>
        <p
          style={{
            fontSize: 32,
            color: "#666",
            marginTop: 30,
          }}
        >
          github.com/yourusername/agent-vault-cli
        </p>
      </div>
    </AbsoluteFill>
  );
};
