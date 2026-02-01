import { Composition, Folder } from "remotion";
import { DemoVideo, DemoVideoProps } from "./DemoVideo";
import { RegisterDemo, RegisterDemoProps } from "./RegisterDemo";
import { LoginDemo, LoginDemoProps } from "./LoginDemo";

const FPS = 30;

const DEFAULT_CREDENTIALS = {
  email: "demo@agent-vault.dev",
  password: "SecureDemo123!",
};

export const RemotionRoot = () => {
  return (
    <>
      {/* Full demo video (20 seconds) */}
      <Composition
        id="DemoVideo"
        component={DemoVideo}
        durationInFrames={20 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={
          {
            credentials: DEFAULT_CREDENTIALS,
          } satisfies DemoVideoProps
        }
      />

      {/* Individual command demos */}
      <Folder name="Commands">
        {/* Register command demo (12 seconds) */}
        <Composition
          id="RegisterDemo"
          component={RegisterDemo}
          durationInFrames={12 * FPS}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={
            {
              credentials: DEFAULT_CREDENTIALS,
            } satisfies RegisterDemoProps
          }
        />

        {/* Login command demo (12 seconds) */}
        <Composition
          id="LoginDemo"
          component={LoginDemo}
          durationInFrames={12 * FPS}
          fps={FPS}
          width={1920}
          height={1080}
          defaultProps={
            {
              credentials: DEFAULT_CREDENTIALS,
            } satisfies LoginDemoProps
          }
        />
      </Folder>
    </>
  );
};
