import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadMonoFont } from "@remotion/google-fonts/JetBrainsMono";
import { LoginForm } from "./components/LoginForm";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

const { fontFamily: monoFont } = loadMonoFont("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

export type RegisterDemoProps = {
  credentials: {
    email: string;
    password: string;
  };
};

// Timeline (12 seconds):
// 0-2: Title intro
// 2-4: Show empty form
// 4-8: Type register command
// 8-10: Form fills, show success
// 10-12: End message

export const RegisterDemo: React.FC<RegisterDemoProps> = ({ credentials }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%)",
    fontFamily,
  };

  return (
    <AbsoluteFill style={bgStyle}>
      {/* Title: 0-2s */}
      <Sequence from={0} durationInFrames={2.5 * fps} premountFor={fps}>
        <RegisterTitle />
      </Sequence>

      {/* Main Demo: 2-12s */}
      <Sequence from={2 * fps} durationInFrames={10 * fps} premountFor={fps}>
        <RegisterMainDemo credentials={credentials} />
      </Sequence>
    </AbsoluteFill>
  );
};

const RegisterTitle: React.FC = () => {
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
          📝
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
          vault register
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
          Store credentials securely in macOS Keychain
        </p>
      </div>
    </AbsoluteFill>
  );
};

const RegisterMainDemo: React.FC<{ credentials: RegisterDemoProps["credentials"] }> = ({
  credentials,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 200 } });
  const containerOpacity = interpolate(entrance, [0, 1], [0, 1]);
  const containerY = interpolate(entrance, [0, 1], [30, 0]);

  // Timeline (relative to this sequence)
  const typeStart = 2 * fps;
  const typeEnd = 5 * fps;
  const fillStart = 5.5 * fps;
  const fillEnd = 7 * fps;
  const successStart = 7.5 * fps;

  // Command typing
  const command = 'vault register --username "demo@agent-vault.dev" --password "***"';
  const CHAR_DELAY = 1.5;
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
  const showOutput = frame >= fillEnd;
  const outputOpacity = showOutput
    ? interpolate(frame - fillEnd, [0, 10], [0, 1], { extrapolateRight: "clamp" })
    : 0;

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
          <TerminalBox>
            <div style={{ display: "flex", marginBottom: 16 }}>
              <span style={{ color: "#00ff00" }}>$ </span>
              <span style={{ color: "#fff" }}>{typedCommand}</span>
              {isTyping && <Cursor frame={frame} />}
            </div>

            {showOutput && (
              <>
                <div style={{ color: "#4caf50", opacity: outputOpacity, marginLeft: 16 }}>
                  ✓ Selectors validated
                </div>
                <div style={{ color: "#4caf50", opacity: outputOpacity, marginLeft: 16, marginTop: 4 }}>
                  ✓ Credentials encrypted
                </div>
                <div style={{ color: "#4caf50", opacity: outputOpacity, marginLeft: 16, marginTop: 4 }}>
                  ✓ Stored in macOS Keychain
                </div>
                <div
                  style={{
                    color: "#fff",
                    opacity: outputOpacity,
                    marginTop: 12,
                    fontWeight: 700,
                  }}
                >
                  Credentials registered successfully!
                </div>
              </>
            )}

            {!isTyping && frame >= typeEnd && !showOutput && (
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
      <StepIndicator
        step={frame >= successStart ? 3 : frame >= fillStart ? 2 : 1}
        text={
          frame >= successStart
            ? "Credentials registered!"
            : frame >= fillStart
            ? "Filling & storing..."
            : "Typing register command..."
        }
      />
    </AbsoluteFill>
  );
};

const TerminalBox: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
          Terminal — vault register
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
          background: "#1a237e",
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
