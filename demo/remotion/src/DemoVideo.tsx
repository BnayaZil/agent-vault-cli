import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { Terminal } from "./components/Terminal";
import { LoginForm } from "./components/LoginForm";
import { TitleCard } from "./components/TitleCard";
import { EndCard } from "./components/EndCard";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export type DemoVideoProps = {
  credentials: {
    email: string;
    password: string;
  };
};

// Timeline (in seconds):
// 0-3: Title card
// 3-5: Transition to split screen
// 5-8: Type register command
// 8-9: Show "registered" output, form fills
// 9-10: Pause
// 10-11: Type login command
// 11-13: Form fills with credentials
// 13-14: Click submit
// 14-17: Success message
// 17-20: End card

export const DemoVideo: React.FC<DemoVideoProps> = ({ credentials }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background gradient
  const bgStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0d1b2a 100%)",
    fontFamily,
  };

  return (
    <AbsoluteFill style={bgStyle}>
      {/* Title Card: 0-3 seconds */}
      <Sequence from={0} durationInFrames={3.5 * fps} premountFor={fps}>
        <TitleCard />
      </Sequence>

      {/* Main Demo: 3-17 seconds */}
      <Sequence from={3 * fps} durationInFrames={14 * fps} premountFor={fps}>
        <MainDemo credentials={credentials} />
      </Sequence>

      {/* End Card: 17-20 seconds */}
      <Sequence from={17 * fps} durationInFrames={3 * fps} premountFor={fps}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};

const MainDemo: React.FC<{ credentials: DemoVideoProps["credentials"] }> = ({
  credentials,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animation
  const entrance = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const containerY = interpolate(entrance, [0, 1], [50, 0]);
  const containerOpacity = interpolate(entrance, [0, 1], [0, 1]);

  // Timeline markers (relative to this sequence)
  const registerStart = 2 * fps;
  const registerComplete = 5 * fps;
  const formClearStart = 6 * fps;
  const loginStart = 7 * fps;
  const loginComplete = 9 * fps;
  const submitClick = 10 * fps;

  // Determine form state
  let formState: "empty" | "filling-register" | "filled" | "clearing" | "filling-login" | "submitted" = "empty";
  let emailValue = "";
  let passwordValue = "";

  if (frame >= submitClick) {
    formState = "submitted";
    emailValue = credentials.email;
    passwordValue = credentials.password;
  } else if (frame >= loginComplete) {
    formState = "filled";
    emailValue = credentials.email;
    passwordValue = credentials.password;
  } else if (frame >= loginStart) {
    formState = "filling-login";
    const progress = (frame - loginStart) / (loginComplete - loginStart);
    const emailChars = Math.floor(progress * credentials.email.length);
    const passwordChars = Math.floor(progress * credentials.password.length);
    emailValue = credentials.email.slice(0, emailChars);
    passwordValue = credentials.password.slice(0, passwordChars);
  } else if (frame >= formClearStart) {
    formState = "clearing";
    emailValue = "";
    passwordValue = "";
  } else if (frame >= registerComplete) {
    formState = "filled";
    emailValue = credentials.email;
    passwordValue = credentials.password;
  } else if (frame >= registerStart) {
    formState = "filling-register";
    const progress = (frame - registerStart) / (registerComplete - registerStart);
    const emailChars = Math.floor(progress * credentials.email.length * 0.7);
    const passwordChars = Math.floor(progress * credentials.password.length * 0.7);
    emailValue = credentials.email.slice(0, emailChars);
    passwordValue = credentials.password.slice(0, passwordChars);
  }

  return (
    <AbsoluteFill
      style={{
        opacity: containerOpacity,
        transform: `translateY(${containerY}px)`,
      }}
    >
      {/* Split screen layout */}
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 40,
          gap: 40,
        }}
      >
        {/* Terminal Side */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Terminal frame={frame} fps={fps} credentials={credentials} />
        </div>

        {/* Login Form Side */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <LoginForm
            email={emailValue}
            password={passwordValue}
            showSuccess={formState === "submitted"}
            isClearing={formState === "clearing"}
          />
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

const StepIndicator: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  let step = 1;
  let text = "Setting up demo...";

  if (frame >= 10 * fps) {
    step = 4;
    text = "Login complete!";
  } else if (frame >= 7 * fps) {
    step = 3;
    text = "Auto-filling credentials...";
  } else if (frame >= 6 * fps) {
    step = 2;
    text = "Page reloaded (form cleared)";
  } else if (frame >= 2 * fps) {
    step = 1;
    text = "Registering credentials...";
  }

  const entrance = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: "50%",
        transform: `translateX(-50%) scale(${interpolate(entrance, [0, 1], [0.8, 1])})`,
        opacity: interpolate(entrance, [0, 1], [0, 1]),
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
          background: "#4a90d9",
          color: "white",
          padding: "4px 12px",
          borderRadius: 15,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Step {step}
      </span>
      <span style={{ color: "#333", fontWeight: 500, fontSize: 16 }}>
        {text}
      </span>
    </div>
  );
};
