import React from "react";
import { Composition } from "remotion";
import { TitleCard } from "./TitleCard";
import { KineticCaption } from "./KineticCaption";

// Element composition dimensions/duration can be overridden via props (render-element.mjs passes --aspect / --duration), defaulting to 9:16.
type ElementProps = {
  text: string;
  subtitle?: string;
  width?: number;
  height?: number;
  durationInFrames?: number;
};

const calc = ({ props }: { props: ElementProps }) => ({
  width: props.width ?? 1080,
  height: props.height ?? 1920,
  durationInFrames: props.durationInFrames ?? 75,
});

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="TitleCard"
      component={TitleCard}
      durationInFrames={75}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ text: "标题", subtitle: "" } as ElementProps}
      calculateMetadata={calc}
    />
    <Composition
      id="KineticCaption"
      component={KineticCaption}
      durationInFrames={75}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ text: "逐字 动态 字幕" } as ElementProps}
      calculateMetadata={calc}
    />
  </>
);
