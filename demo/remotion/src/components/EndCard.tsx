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

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animations
  const checkSpring = spring({
    frame,
    fps,
    config: { damping: 10 },
  });

  const titleSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 200 },
  });

  const featureSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 200 },
  });

  const ctaSpring = spring({
    frame: frame - 35,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
      }}
    >
      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: 900,
          textAlign: "center",
        }}
      >
        {/* Success Check */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 32,
            transform: `scale(${interpolate(checkSpring, [0, 1], [0, 1])})`,
            boxShadow: "0 10px 40px rgba(76, 175, 80, 0.4)",
          }}
        >
          <svg
            width="50"
            height="50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              opacity: checkSpring,
            }}
          >
            <path
              d="M20 6L9 17l-5-5"
              strokeDasharray={30}
              strokeDashoffset={interpolate(checkSpring, [0, 1], [30, 0])}
            />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "white",
            margin: 0,
            marginBottom: 24,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
            opacity: titleSpring,
          }}
        >
          Secure Login Complete!
        </h1>

        {/* Features */}
        <div
          style={{
            display: "flex",
            gap: 40,
            marginBottom: 48,
            transform: `translateY(${interpolate(featureSpring, [0, 1], [20, 0])}px)`,
            opacity: featureSpring,
          }}
        >
          <Feature
            icon="🔒"
            title="Secure Storage"
            description="Credentials stored in macOS Keychain"
          />
          <Feature
            icon="👁️"
            title="Never Exposed"
            description="Passwords never appear in terminal"
          />
          <Feature
            icon="🤖"
            title="AI-Ready"
            description="Perfect for agent automation"
          />
        </div>

        {/* CTA */}
        <div
          style={{
            transform: `translateY(${interpolate(ctaSpring, [0, 1], [20, 0])}px)`,
            opacity: ctaSpring,
          }}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: 12,
              padding: "20px 40px",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <code
              style={{
                fontSize: 20,
                color: "#4caf50",
                fontFamily: "monospace",
              }}
            >
              npm install -g agent-vault-cli
            </code>
          </div>
          <p
            style={{
              color: "rgba(255, 255, 255, 0.6)",
              fontSize: 16,
              marginTop: 16,
            }}
          >
            github.com/your-org/agent-vault-cli
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Feature: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
    }}
  >
    <span style={{ fontSize: 36 }}>{icon}</span>
    <span
      style={{
        color: "white",
        fontWeight: 600,
        fontSize: 18,
      }}
    >
      {title}
    </span>
    <span
      style={{
        color: "rgba(255, 255, 255, 0.6)",
        fontSize: 14,
      }}
    >
      {description}
    </span>
  </div>
);
