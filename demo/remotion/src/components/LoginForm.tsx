import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

type LoginFormProps = {
  email: string;
  password: string;
  showSuccess: boolean;
  isClearing: boolean;
};

export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  password,
  showSuccess,
  isClearing,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const scale = interpolate(entrance, [0, 1], [0.95, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  // Success animation
  const successSpring = spring({
    frame: showSuccess ? frame : 0,
    fps,
    config: { damping: 12 },
  });

  const successScale = showSuccess
    ? interpolate(successSpring, [0, 1], [0.8, 1])
    : 0;
  const successOpacity = showSuccess
    ? interpolate(successSpring, [0, 1], [0, 1])
    : 0;

  // Clearing animation
  const clearingOpacity = isClearing ? 0.6 : 1;

  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
        padding: 40,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        fontFamily,
        transform: `scale(${scale})`,
        opacity: opacity * clearingOpacity,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔐</div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#1a1a2e",
            margin: 0,
            marginBottom: 8,
          }}
        >
          Demo Login
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "#666",
            margin: 0,
          }}
        >
          Credentials auto-filled by Agent Vault CLI
        </p>
      </div>

      {/* Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 28,
        }}
      >
        <span
          style={{
            background: "#e3f2fd",
            color: "#1976d2",
            padding: "6px 16px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Test Environment
        </span>
      </div>

      {/* Form */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Email Field */}
        <div>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              color: "#333",
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            Email Address
          </label>
          <InputField
            value={email}
            placeholder="Enter your email"
            isFilled={email.length > 0}
          />
        </div>

        {/* Password Field */}
        <div>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              color: "#333",
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            Password
          </label>
          <InputField
            value={"•".repeat(password.length)}
            placeholder="Enter your password"
            isFilled={password.length > 0}
          />
        </div>

        {/* Submit Button */}
        <button
          style={{
            width: "100%",
            padding: 16,
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
            background: showSuccess
              ? "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)"
              : "linear-gradient(135deg, #4a90d9 0%, #357abd 100%)",
            color: "white",
            border: "none",
            borderRadius: 8,
            marginTop: 8,
            transition: "none",
            transform: showSuccess ? `scale(${0.98 + successSpring * 0.02})` : "none",
          }}
        >
          {showSuccess ? "✓ Signed In!" : "Sign In"}
        </button>
      </div>

      {/* Success Message */}
      <div
        style={{
          marginTop: 20,
          padding: 16,
          background: "#e8f5e9",
          borderRadius: 8,
          textAlign: "center",
          color: "#2e7d32",
          fontWeight: 500,
          opacity: successOpacity,
          transform: `scale(${successScale})`,
        }}
      >
        ✅ Login successful! Welcome back.
      </div>

      {/* Hint */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 24,
          textAlign: "center",
          color: "#888",
          fontSize: 13,
        }}
      >
        💡 Credentials passed via CDP - never exposed in terminal
      </div>
    </div>
  );
};

const InputField: React.FC<{
  value: string;
  placeholder: string;
  isFilled: boolean;
}> = ({ value, placeholder, isFilled }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fill animation
  const fillProgress = spring({
    frame: isFilled ? frame : 0,
    fps,
    config: { damping: 200 },
  });

  const borderColor = isFilled
    ? `rgb(${interpolate(fillProgress, [0, 1], [224, 76])}, ${interpolate(fillProgress, [0, 1], [224, 175])}, ${interpolate(fillProgress, [0, 1], [224, 80])})`
    : "#e0e0e0";

  const bgColor = isFilled
    ? `rgba(248, 255, 248, ${fillProgress})`
    : "#fff";

  return (
    <div
      style={{
        width: "100%",
        padding: "14px 16px",
        fontSize: 16,
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        background: bgColor,
        color: value ? "#333" : "#999",
        minHeight: 50,
        display: "flex",
        alignItems: "center",
      }}
    >
      {value || placeholder}
      {isFilled && value && (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: 20,
            background: "#4a90d9",
            marginLeft: 2,
            opacity: interpolate(frame % 30, [0, 15, 30], [1, 0, 1]),
          }}
        />
      )}
    </div>
  );
};
