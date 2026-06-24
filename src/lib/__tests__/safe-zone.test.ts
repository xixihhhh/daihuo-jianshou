import { describe, it, expect } from "vitest";
import { CAPTION_SAFE_BOTTOM_RATIO, karaokeSafeMarginV } from "@/lib/video-composer/safe-zone";

describe("字幕安全区", () => {
  it("底部安全比例与商品卡 0.17 底距一致", () => {
    expect(CAPTION_SAFE_BOTTOM_RATIO).toBe(0.17);
  });

  it("karaokeSafeMarginV 按 PlayResY 等比（1920→326）", () => {
    expect(karaokeSafeMarginV(1920)).toBe(326); // round(1920*0.17)
    expect(karaokeSafeMarginV(1280)).toBe(218); // round(1280*0.17)
    expect(karaokeSafeMarginV(1080)).toBe(184); // round(1080*0.17)
  });

  it("MarginV 抬高后字幕基线落在底部 UI 死区(底部≈16.7%)之上", () => {
    const playResY = 1920;
    const baselineY = playResY - karaokeSafeMarginV(playResY); // 字幕距顶
    const deadZoneTop = playResY * (1 - 0.167); // 平台底部 UI 死区上沿
    expect(baselineY).toBeLessThanOrEqual(deadZoneTop); // 基线在死区上方
  });

  it("比旧的 marginV=240(死区内)更靠上", () => {
    expect(karaokeSafeMarginV(1920)).toBeGreaterThan(240);
  });
});
