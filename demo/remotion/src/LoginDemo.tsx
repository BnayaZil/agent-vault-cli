import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { LoginForm } from "./components/LoginForm";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

export type LoginDemoProps = {
  credentials: {
    email: string;
    password: string;
  };
};

// Timeline (12 seconds):
// 0-2: Title intro
// 2-4: Show empty form (page just loaded)
// 4-7: Type login command
// 7-9: Form auto-fills
// 9-10: Click submit
// 10-12: Success + end

export const LoginDemo: React.FC<LoginDemoProps> = ({ credentials }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #004d40 0%, #00695c 50%, #00796b 100%)",
    fontFamily,
  };

  return (
    <AbsoluteFill style={bgStyle}>
      {/* Title: 0-2s */}
      <Sequence from={0} durationInFrames={2.5 * fps} premountFor={fps}>
        <LoginTitle />
      </Sequence>

      {/* Main Demo: 2-12s */}
      <Sequence from={2 * fps} durationInFrames={10 * fps} premountFor={fps}>
        <LoginMainDemo credentials={credentials} />
      </Sequence>
    </AbsoluteFill>
  );
};

const LoginTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const iconSpring = spring({ frame, fps, config: { damping: 12 } });
  const titleSpring = spring({ frame: frame - 8, fps, config: { damping: 200 } });
  const subtitleSpring = spring({ frame: frame - 16, fps, config: { damping: 200 } });

  const exitOpacity = interpolate(
    frame,
    [durationInFrames - fps * 0.3, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: exitOpacity,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            fontSize: 80,
            marginBottom: 20,
            transform: `scale(${iconSpring})`,
          }}
        >
          🔐
        </div>
        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "white",
            margin: 0,
            marginBottom: 16,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
            opacity: titleSpring,
          }}
        >
          vault login
        </h1>
        <p
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.8)",
            margin: 0,
            transform: `translateY(${interpolate(subtitleSpring, [0, 1], [20, 0])}px)`,
            opacity: subtitleSpring,
          }}
        >
          Auto-fill credentials without exposing them
        </p>
      </div>
    </AbsoluteFill>
  );
};

const LoginMainDemo: React.FC<{ credentials: LoginDemoProps["credentials"] }> = ({
  credentials,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 200 } });
  const containerOpacity = interpolate(entrance, [0, 1], [0, 1]);
  const containerY = interpolate(entrance, [0, 1], [30, 0]);

  // Timeline (relative to this sequence)
  const typeStart = 2 * fps;
  const typeEnd = 4 * fps;
  const fillStart = 4.5 * fps;
  const fillEnd = 6 * fps;
  const submitStart = 6.5 * fps;
  const successStart = 7 * fps;

  // Command typing
  const command = 'vault login --cdp "ws://localhost:9222"';
  const CHAR_DELAY = 1.8;
  const charsToShow = frame >= typeStart
    ? Math.min(command.length, Math.floor((frame - typeStart) / CHAR_DELAY))
    : 0;
  const typedCommand = command.slice(0, charsToShow);
  const isTyping = frame >= typeStart && charsToShow < command.length;

  // Form state
  let emailValue = "";
  let passwordValue = "";
  let showSuccess = false;

  if (frame >= successStart) {
    emailValue = credentials.email;
    passwordValue = credentials.password;
    showSuccess = true;
  } else if (frame >= fillStart) {
    const progress = Math.min(1, (frame - fillStart) / (fillEnd - fillStart));
    emailValue = credentials.email.slice(0, Math.floor(progress * credentials.email.length));
    passwordValue = credentials.password.slice(0, Math.floor(progress * credentials.password.length));
  }

  // Output visibility
  const showFillOutput = frame >= fillStart;
  const fillOutputOpacity = showFillOutput
    ? interpolate(frame - fillStart, [0, 10], [0, 1], { extrapolateRight: "clamp" })
    : 0;

  const showSubmitOutput = frame >= submitStart;
  const submitOutputOpacity = showSubmitOutput
    ? interpolate(frame - submitStart, [0, 10], [0, 1], { extrapolateRight: "clamp" })
    : 0;

  // Step calculation
  let step = 1;
  let stepText = "Form is empty...";
  if (frame >= successStart) {
    step = 4;
    stepText = "Login complete!";
  } else if (frame >= submitStart) {
    step = 3;
    stepText = "Clicking submit...";
  } else if (frame >= fillStart) {
    step = 2;
    stepText = "Auto-filling credentials...";
  } else if (frame >= typeStart) {
    step = 1;
    stepText = "Running vault login...";
  }

  return (
    <AbsoluteFill
      style={{
        opacity: containerOpacity,
        transform: `translateY(${containerY}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 40,
          gap: 40,
        }}
      >
        {/* Terminal */}
        <div style={{ flex: 1 }}>
          <TerminalBox title="vault login">
            {/* Initial message */}
            {frame < typeStart && (
              <div style={{ color: "#888", marginBottom: 16 }}>
                # Credentials already registered for this site
              </div>
            )}

            {/* Command */}
            {frame >= typeStart && (
              <div style={{ display: "flex", marginBottom: 16 }}>
                <span style={{ color: "#00ff00" }}>$ </span>
                <span style={{ color: "#fff" }}>{typedCommand}</span>
                {isTyping && <Cursor frame={frame} />}
              </div>
            )}

            {/* Fill output */}
            {showFillOutput && (
              <>
                <div style={{ color: "#888", opacity: fillOutputOpacity, marginLeft: 16 }}>
                  Looking up credentials for origin...
                </div>
                <div style={{ color: "#4caf50", opacity: fillOutputOpacity, marginLeft: 16, marginTop: 4 }}>
                  ✓ Found credentials in Keychain
                </div>
                <div style={{ color: "#4caf50", opacity: fillOutputOpacity, marginLeft: 16, marginTop: 4 }}>
                  ✓ Filling via CDP (password never exposed)
                </div>
              </>
            )}

            {/* Submit output */}
            {showSubmitOutput && (
              <>
                <div style={{ color: "#4caf50", opacity: submitOutputOpacity, marginLeft: 16, marginTop: 4 }}>
                  ✓ Submit button clicked
                </div>
                <div
                  style={{
                    color: "#fff",
                    opacity: submitOutputOpacity,
                    marginTop: 12,
                    fontWeight: 700,
                  }}
                >
                  Login filled successfully!
                </div>
              </>
            )}

            {!isTyping && frame >= typeEnd && !showFillOutput && (
              <div style={{ display: "flex" }}>
                <span style={{ color: "#00ff00" }}>$ </span>
                <Cursor frame={frame} />
              </div>
            )}
          </TerminalBox>
        </div>

        {/* Form */}
        <div style={{ flex: 1 }}>
          <LoginForm
            email={emailValue}
            password={passwordValue}
            showSuccess={showSuccess}
            isClearing={false}
          />
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator step={step} text={stepText} />

      {/* Security badge */}
      <SecurityBadge visible={frame >= fillStart} />
    </AbsoluteFill>
  );
};

const TerminalBox: React.FC<{ children: React.ReactNode; title: string }> = ({
  children,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        background: "#1e1e1e",
        borderRadius: 12,
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transform: `scale(${interpolate(entrance, [0, 1], [0.95, 1])})`,
        opacity: entrance,
      }}
    >
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
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f56" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ffbd2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#27c93f" }} />
        </div>
        <div style={{ marginLeft: "auto", color: "#888", fontSize: 13, fontFamily: "monospace" }}>
          Terminal — {title}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          padding: 20,
          fontFamily: "monospace",
          fontSize: 15,
          lineHeight: 1.7,
          color: "#e0e0e0",
        }}
      >
        {children}
      </div>
    </div>
  );
};

const Cursor: React.FC<{ frame: number }> = ({ frame }) => {
  const opacity = interpolate(frame % 16, [0, 8, 16], [1, 0, 1]);
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 18,
        background: "#00ff00",
        opacity,
        marginLeft: 2,
      }}
    />
  );
};

const StepIndicator: React.FC<{ step: number; text: string }> = ({ step, text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: "50%",
        transform: `translateX(-50%) scale(${interpolate(entrance, [0, 1], [0.8, 1])})`,
        opacity: entrance,
        background: "rgba(255, 255, 255, 0.95)",
        padding: "12px 28px",
        borderRadius: 30,
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span
        style={{
          background: "#00695c",
          color: "white",
          padding: "4px 12px",
          borderRadius: 15,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Step {step}
      </span>
      <span style={{ color: "#333", fontWeight: 500, fontSize: 16 }}>{text}</span>
    </div>
  );
};

const SecurityBadge: React.FC<{ visible: boolean }> = ({ visible }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeSpring = spring({
    frame: visible ? frame : 0,
    fps,
    config: { damping: 15 },
  });

  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 30,
        left: "50%",
        transform: `translateX(-50%) scale(${interpolate(badgeSpring, [0, 1], [0.8, 1])})`,
        opacity: badgeSpring,
        background: "rgba(76, 175, 80, 0.15)",
        border: "2px solid rgba(76, 175, 80, 0.5)",
        padding: "12px 24px",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span style={{ fontSize: 24 }}>🔒</span>
      <span style={{ color: "#4caf50", fontWeight: 600, fontSize: 16 }}>
        Password transmitted securely via CDP — never visible in logs
      </span>
    </div>
  );
};
