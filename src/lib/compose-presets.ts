/**
 * 渲染质量预设（快速 / 标准 / 高清）——一键在「出片速度」与「清晰度/体积」之间取舍，
 * 新手不用懂分辨率/编码参数也能选。映射到真实的 FFmpeg 编码参数（分辨率 + x264 -preset + -crf）。
 *
 * 安全：videoPreset / crf 会拼进 FFmpeg 命令，必须来自这里的白名单，禁止透传用户任意字符串。
 */

export type RenderPreset = "fast" | "standard" | "hd";

export interface RenderProfile {
  resolution: "720p" | "1080p";
  /** x264 -preset：编码速度（越快压缩率越低、文件略大） */
  videoPreset: "veryfast" | "medium" | "slow";
  /** x264 -crf：质量（越小越清晰、文件越大；18 视觉无损附近） */
  crf: number;
}

export const RENDER_PRESETS: Record<RenderPreset, RenderProfile> = {
  // 快速：720p + 最快编码，出片最快、文件最小，适合先看效果 / 批量草稿
  fast: { resolution: "720p", videoPreset: "veryfast", crf: 26 },
  // 标准：1080p + 均衡，日常发布推荐
  standard: { resolution: "1080p", videoPreset: "medium", crf: 20 },
  // 高清：1080p + 慢速高质量编码，画质最好、渲染最慢
  hd: { resolution: "1080p", videoPreset: "slow", crf: 17 },
};

export const DEFAULT_RENDER_PRESET: RenderPreset = "standard";

/** 合法的 x264 preset 白名单（防注入兜底） */
const VALID_X264_PRESETS = new Set([
  "ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow",
]);

/** 按预设名取渲染配置（非法值回退默认），结果一定是白名单内的安全参数 */
export function resolveRenderProfile(preset: string | undefined): RenderProfile {
  return RENDER_PRESETS[preset as RenderPreset] ?? RENDER_PRESETS[DEFAULT_RENDER_PRESET];
}

/** 校验并夹取编码参数为合法范围，供合成器最后一道兜底（即使外部直接传也安全） */
export function safeEncodeParams(videoPreset: string | undefined, crf: number | undefined): {
  videoPreset: string;
  crf: number;
} {
  const p = videoPreset && VALID_X264_PRESETS.has(videoPreset) ? videoPreset : "medium";
  const c = typeof crf === "number" && Number.isFinite(crf) ? Math.min(Math.max(Math.round(crf), 0), 51) : 18;
  return { videoPreset: p, crf: c };
}
