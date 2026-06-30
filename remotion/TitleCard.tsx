import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

/**
 * 动效片头标题卡：标题 spring 缩放+上浮入场、副标题随后淡入，渐变底 + 辉光。
 * FFmpeg drawtext 做不出的平滑动效——作可选片头元素，渲成透明/独立片段后合进现有管线。
 */
export const TitleCard: React.FC<{ text: string; subtitle?: string }> = ({ text, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 14, stiffness: 110 } });
  const titleY = interpolate(titleIn, [0, 1], [80, 0]);
  const titleScale = interpolate(titleIn, [0, 1], [0.7, 1]);

  const subIn = spring({ frame: frame - 12, fps, config: { damping: 16 } });
  const subY = interpolate(subIn, [0, 1], [40, 0]);

  const fontSize = Math.round(width * 0.1);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg,#0b0b12 0%,#1a1030 60%,#2a1248 100%)",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: Math.round(width * 0.03),
        padding: Math.round(width * 0.08),
      }}
    >
      <div
        style={{
          color: "#fff",
          fontSize,
          fontWeight: 900,
          letterSpacing: 2,
          textAlign: "center",
          lineHeight: 1.15,
          opacity: titleIn,
          transform: `translateY(${titleY}px) scale(${titleScale})`,
          textShadow: "0 10px 50px rgba(140,90,255,.55)",
        }}
      >
        {text}
      </div>
      {subtitle ? (
        <div
          style={{
            color: "#c9b8ff",
            fontSize: Math.round(fontSize * 0.42),
            fontWeight: 600,
            letterSpacing: 4,
            opacity: subIn,
            transform: `translateY(${subY}px)`,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
