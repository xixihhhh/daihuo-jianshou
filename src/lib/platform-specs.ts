/**
 * Final video specs for each e-commerce platform — single source of truth for multi-platform export (re-encode to target aspect ratio).
 * Douyin / Kuaishou / TikTok Shop use 9:16 portrait; Xiaohongshu prefers 3:4. Pure data + accessor, unit-testable.
 */

export interface PlatformSpec {
  name: string;
  w: number;
  h: number;
  ratio: string;
}

export const PLATFORM_SPECS: Record<string, PlatformSpec> = {
  douyin: { name: "抖音", w: 1080, h: 1920, ratio: "9:16" },
  kuaishou: { name: "快手", w: 1080, h: 1920, ratio: "9:16" },
  xiaohongshu: { name: "小红书", w: 1080, h: 1440, ratio: "3:4" },
  tiktok: { name: "TikTok Shop", w: 1080, h: 1920, ratio: "9:16" },
};

/** Get the spec for a given platform; returns undefined for unknown platforms. */
export function getPlatformSpec(platform: string): PlatformSpec | undefined {
  return PLATFORM_SPECS[platform];
}
