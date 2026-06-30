import { describe, it, expect } from "vitest";
import { splitNarration, estimateDurationSec, splitNarrationIntoShots } from "@/lib/script-import";

describe("splitNarration", () => {
  it("按句末标点切句、去空白", () => {
    expect(splitNarration("第一句。第二句！\n第三句？")).toEqual(["第一句", "第二句", "第三句"]);
  });
  it("超长句按次级标点再切成多段", () => {
    const long = Array.from({ length: 8 }, (_, i) => `这是第${i}个用于测试切分的较长子句内容`).join("，") + "。";
    const pieces = splitNarration(long);
    expect(pieces.length).toBeGreaterThan(1);
  });
  it("空白 → 空数组", () => {
    expect(splitNarration("  \n  ")).toEqual([]);
  });
});

describe("estimateDurationSec", () => {
  it("中文约 5 字/秒、英文约 14 字/秒，夹在 2–15s", () => {
    expect(estimateDurationSec("短")).toBe(2); // lower bound
    expect(estimateDurationSec("a".repeat(140))).toBe(10); // 140/14
    expect(estimateDurationSec("中".repeat(100))).toBe(15); // 100/5=20 → upper bound 15
  });
});

describe("splitNarrationIntoShots", () => {
  it("首=hook 末=cta 中=demo，含时长/配音/描述/visualSource", () => {
    const shots = splitNarrationIntoShots("开场白。中间内容。结尾号召。");
    expect(shots.map((s) => s.type)).toEqual(["hook", "demo", "cta"]);
    expect(shots[0].voiceover).toBe("开场白");
    expect(shots[0].description).toBe("开场白");
    expect(shots[0].visualSource).toBe("ai_generate");
    expect(shots.every((s) => s.duration >= 2)).toBe(true);
  });
  it("单句 → 单分镜（i===0 优先取 hook）", () => {
    const shots = splitNarrationIntoShots("只有一句话");
    expect(shots.length).toBe(1);
    expect(shots[0].type).toBe("hook");
  });
});
