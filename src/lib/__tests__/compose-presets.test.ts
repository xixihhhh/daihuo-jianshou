import { describe, it, expect } from "vitest";
import {
  RENDER_PRESETS,
  DEFAULT_RENDER_PRESET,
  resolveRenderProfile,
  safeEncodeParams,
  isRenderPreset,
  recommendPreset,
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

describe("isRenderPreset（区分合法预设与非法字符串）", () => {
  it("合法预设为 true", () => {
    expect(isRenderPreset("fast")).toBe(true);
    expect(isRenderPreset("standard")).toBe(true);
    expect(isRenderPreset("hd")).toBe(true);
  });
  it("非法字符串/空/非字符串为 false（不应顶掉用户显式分辨率）", () => {
    expect(isRenderPreset("ultra")).toBe(false);
    expect(isRenderPreset("")).toBe(false);
    expect(isRenderPreset(undefined)).toBe(false);
    expect(isRenderPreset(null)).toBe(false);
    expect(isRenderPreset(123)).toBe(false);
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

describe("recommendPreset（内容自适应档位）", () => {
  it("短而简单 → fast", () => {
    expect(recommendPreset({ shotCount: 2, totalDuration: 12 }).preset).toBe("fast");
  });
  it("长片/多分镜/多 i2v → hd", () => {
    expect(recommendPreset({ shotCount: 3, totalDuration: 45 }).preset).toBe("hd"); // long duration
    expect(recommendPreset({ shotCount: 7, totalDuration: 20 }).preset).toBe("hd"); // many shots
    expect(recommendPreset({ shotCount: 3, totalDuration: 20, i2vCount: 3 }).preset).toBe("hd"); // many i2v
  });
  it("常规 → standard", () => {
    expect(recommendPreset({ shotCount: 4, totalDuration: 25 }).preset).toBe("standard");
  });
  it("有 i2v 就不算「简单」，不降到 fast", () => {
    expect(recommendPreset({ shotCount: 2, totalDuration: 12, i2vCount: 1 }).preset).toBe("standard");
  });
  it("附带可读理由", () => {
    expect(recommendPreset({ shotCount: 2, totalDuration: 12 }).reason).toBeTruthy();
  });
});
