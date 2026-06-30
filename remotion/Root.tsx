import React from "react";
import { Composition } from "remotion";
import { TitleCard } from "./TitleCard";
import { KineticCaption } from "./KineticCaption";

// 元素合成的尺寸/时长可由 props 覆盖（render-element.mjs 按 --aspect / --duration 传入），默认 9:16。
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
