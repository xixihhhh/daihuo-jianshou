/**
 * Render quality presets (fast / standard / hd) — one-click trade-off between render speed and
 * clarity/file size, so beginners don't need to understand resolution or encoding parameters.
 * Maps to actual FFmpeg encoding parameters (resolution + x264 -preset + -crf).
 *
 * Security: videoPreset / crf are interpolated into the FFmpeg command and MUST come from the
 * whitelist defined here; passing arbitrary user-supplied strings is forbidden.
 */

export type RenderPreset = "fast" | "standard" | "hd";

export interface RenderProfile {
  resolution: "720p" | "1080p";
  /** x264 -preset: encoding speed (faster = lower compression ratio = slightly larger file) */
  videoPreset: "veryfast" | "medium" | "slow";
  /** x264 -crf: quality (lower = sharper = larger file; 18 is near visually lossless) */
  crf: number;
}

export const RENDER_PRESETS: Record<RenderPreset, RenderProfile> = {
  // Fast: 720p + fastest encoding — quickest render, smallest file, good for previewing or batch drafts
  fast: { resolution: "720p", videoPreset: "veryfast", crf: 26 },
  // Standard: 1080p + balanced — recommended for everyday publishing
  standard: { resolution: "1080p", videoPreset: "medium", crf: 20 },
  // HD: 1080p + slow high-quality encoding — best visual quality, slowest render
  hd: { resolution: "1080p", videoPreset: "slow", crf: 17 },
};

export const DEFAULT_RENDER_PRESET: RenderPreset = "standard";

/** Allowlist of valid x264 presets (injection-prevention safety net) */
const VALID_X264_PRESETS = new Set([
  "ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow",
]);

/** Returns the render profile for a preset name (falls back to default for invalid values); result is always a safe, whitelisted parameter set. */
export function resolveRenderProfile(preset: string | undefined): RenderProfile {
  return RENDER_PRESETS[preset as RenderPreset] ?? RENDER_PRESETS[DEFAULT_RENDER_PRESET];
}

/** Returns whether a value is a valid render preset — used to distinguish "a preset was genuinely selected" from "an invalid string was passed" (the latter must not override the user's explicit resolution). */
export function isRenderPreset(v: unknown): v is RenderPreset {
  return typeof v === "string" && v in RENDER_PRESETS;
}

export interface ContentSignals {
  shotCount: number;
  /** Number of shots using image-to-video (i2v) — i2v shots are already real video segments and benefit more from high quality */
  i2vCount?: number;
  totalDuration: number;
}

/**
 * Recommends a render tier based on content complexity, along with a one-line reason:
 * short & simple → fast (preview first); long / many shots / many i2v shots → hd (worth the quality);
 * otherwise → standard. The UI labels this as "Recommended: X (reason)" and the user can still change it;
 * the whitelist safety mechanism remains unchanged.
 */
export function recommendPreset(s: ContentSignals): { preset: RenderPreset; reason: string } {
  const i2v = s.i2vCount ?? 0;
  if (s.totalDuration >= 40 || s.shotCount >= 6 || i2v >= 3) {
    return { preset: "hd", reason: "内容较复杂（长片/多分镜/多 AI 视频），建议高清出片" };
  }
  if (s.totalDuration <= 15 && s.shotCount <= 2 && i2v === 0) {
    return { preset: "fast", reason: "短而简单，先快速出片看效果" };
  }
  return { preset: "standard", reason: "常规长度，标准档均衡画质与速度" };
}

/** Validates and clamps encoding parameters to legal ranges — a final safety net in the composer (safe even if called with externally supplied values). */
export function safeEncodeParams(videoPreset: string | undefined, crf: number | undefined): {
  videoPreset: string;
  crf: number;
} {
  const p = videoPreset && VALID_X264_PRESETS.has(videoPreset) ? videoPreset : "medium";
  const c = typeof crf === "number" && Number.isFinite(crf) ? Math.min(Math.max(Math.round(crf), 0), 51) : 18;
  return { videoPreset: p, crf: c };
}
