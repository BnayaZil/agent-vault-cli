import { Composition } from "remotion";
import { Video } from "./Video";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="Video"
        component={Video}
        durationInFrames={900} // 30 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          recordingPath: "demo.mov",
        }}
      />
    </>
  );
};
