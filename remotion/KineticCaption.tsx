import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

/**
 * 逐字动态字幕：每个词依次 spring 弹入 + 上浮 + 缩放，渐变底 + 辉光。
 * 比 libass 卡拉OK 更"动"，作可选动效字幕元素。
 */
export const KineticCaption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  const fontSize = Math.round(width * 0.1);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg,#0b0b12,#1a1030)",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: Math.round(width * 0.022),
        padding: Math.round(width * 0.07),
      }}
    >
      {words.map((w, i) => {
        const s = spring({ frame: frame - i * 7, fps, config: { damping: 13, stiffness: 120 } });
        const y = interpolate(s, [0, 1], [120, 0]);
        const scale = interpolate(s, [0, 1], [0.6, 1]);
        return (
          <span
            key={i}
            style={{
              color: "#fff",
              fontSize,
              fontWeight: 900,
              letterSpacing: 2,
              opacity: s,
              transform: `translateY(${y}px) scale(${scale})`,
              textShadow: "0 8px 40px rgba(120,80,255,.5)",
            }}
          >
            {w}
          </span>
        );
      })}
    </AbsoluteFill>
  );
};
