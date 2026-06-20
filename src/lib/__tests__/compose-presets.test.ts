import { describe, it, expect } from "vitest";
import {
  RENDER_PRESETS,
  DEFAULT_RENDER_PRESET,
  resolveRenderProfile,
  safeEncodeParams,
} from "@/lib/compose-presets";

describe("resolveRenderProfile（渲染质量预设）", () => {
  it("快速=720p/veryfast、标准=1080p/medium、高清=1080p/slow", () => {
    expect(resolveRenderProfile("fast")).toEqual({ resolution: "720p", videoPreset: "veryfast", crf: 26 });
    expect(resolveRenderProfile("standard").resolution).toBe("1080p");
    expect(resolveRenderProfile("hd")).toEqual({ resolution: "1080p", videoPreset: "slow", crf: 17 });
  });
  it("非法/缺省预设回退到默认（标准）", () => {
    expect(resolveRenderProfile("bogus")).toEqual(RENDER_PRESETS[DEFAULT_RENDER_PRESET]);
    expect(resolveRenderProfile(undefined)).toEqual(RENDER_PRESETS.standard);
  });
  it("画质单调：高清 crf < 标准 crf < 快速 crf（越小越清晰）", () => {
    expect(RENDER_PRESETS.hd.crf).toBeLessThan(RENDER_PRESETS.standard.crf);
    expect(RENDER_PRESETS.standard.crf).toBeLessThan(RENDER_PRESETS.fast.crf);
  });
});

describe("safeEncodeParams（防 FFmpeg 参数注入兜底）", () => {
  it("合法 x264 preset 透传", () => {
    expect(safeEncodeParams("veryfast", 26)).toEqual({ videoPreset: "veryfast", crf: 26 });
  });
  it("非法 preset 回退 medium", () => {
    expect(safeEncodeParams("evil; rm -rf", 20).videoPreset).toBe("medium");
    expect(safeEncodeParams(undefined, 20).videoPreset).toBe("medium");
  });
  it("crf 夹取到 0-51 整数，非法回退 18", () => {
    expect(safeEncodeParams("medium", 999).crf).toBe(51);
    expect(safeEncodeParams("medium", -5).crf).toBe(0);
    expect(safeEncodeParams("medium", 20.7).crf).toBe(21);
    expect(safeEncodeParams("medium", NaN).crf).toBe(18);
    expect(safeEncodeParams("medium", undefined).crf).toBe(18);
  });
});
