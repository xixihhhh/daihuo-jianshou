import { describe, it, expect } from "vitest";
import { wrapCaption, chunkCaption } from "@/lib/video-composer/composer";

// width estimation consistent with component: CJK≈fontSize, Latin≈fontSize×0.55; max frameWidth×0.86
const fits = (line: string, fontSize: number, frameWidth: number) => {
  const w = Array.from(line).reduce(
    (s, c) => s + (/[⺀-鿿豈-﫿＀-￯　-〿]/.test(c) ? fontSize : fontSize * 0.55),
    0
  );
  return w <= frameWidth * 0.86 + 0.01;
};

describe("wrapCaption（字幕自动换行）", () => {
  it("长英文折成多行，且每行都不超宽", () => {
    const text = "Still using tissues that tear at one wipe in your living room today";
    const out = wrapCaption(text, 36, 720);
    expect(out).toContain("\n"); // actually wrapped
    for (const line of out.split("\n")) expect(fits(line, 36, 720)).toBe(true);
    // no characters lost (word order unchanged after removing newlines)
    expect(out.replace(/\n/g, " ")).toBe(text);
  });

  it("拉丁按单词断行，不拆开单词", () => {
    const out = wrapCaption("hello wonderful beautiful morning sunshine coffee", 40, 480);
    for (const line of out.split("\n")) {
      // each line is a complete word combination (no split words)
      expect(line.trim().split(" ").every((w) => w.length > 0)).toBe(true);
    }
  });

  it("短文案不换行", () => {
    expect(wrapCaption("你好世界", 36, 720)).toBe("你好世界");
    expect(wrapCaption("Hi there", 36, 720)).toBe("Hi there");
  });

  it("长中文（无空格）按字断行且不超宽", () => {
    const text = "这是一句非常非常非常非常非常非常非常非常长的中文字幕用来测试自动换行是否生效";
    const out = wrapCaption(text, 48, 720);
    expect(out).toContain("\n");
    for (const line of out.split("\n")) expect(fits(line, 48, 720)).toBe(true);
    expect(out.replace(/\n/g, "")).toBe(text); // Chinese has no spaces, removing newlines should restore original
  });

  it("空串返回空串", () => {
    expect(wrapCaption("", 36, 720)).toBe("");
    expect(wrapCaption("   ", 36, 720)).toBe("");
  });
});

describe("chunkCaption（rapid 短句卡切分）", () => {
  it("短文案/短时长 → 单块（整句一镜到底）", () => {
    expect(chunkCaption("你好", 0, 1)).toEqual([{ text: "你好", startTime: 0, endTime: 1 }]);
    expect(chunkCaption("Hi there", 0, 1).length).toBe(1);
  });

  it("空串 → 空数组", () => {
    expect(chunkCaption("", 0, 3)).toEqual([]);
    expect(chunkCaption("   ", 0, 3)).toEqual([]);
  });

  it("长中文按字切多块：顺序不重叠、首块起于 start、末块止于 end、合起来还原原文", () => {
    const txt = "清晨的海浪轻轻拍打着柔软的沙滩";
    const out = chunkCaption(txt, 0, 6);
    expect(out.length).toBeGreaterThan(1);
    expect(out[0].startTime).toBe(0);
    expect(out[out.length - 1].endTime).toBe(6);
    // ordered, non-overlapping
    for (let i = 1; i < out.length; i++) expect(out[i].startTime).toBeCloseTo(out[i - 1].endTime, 3);
    // rejoined text equals original (Chinese has no spaces)
    expect(out.map((c) => c.text).join("")).toBe(txt);
  });

  it("英文按词切块（不拆词）", () => {
    const out = chunkCaption("the quick brown fox jumps over the lazy dog now", 0, 6);
    expect(out.length).toBeGreaterThan(1);
    expect(out.map((c) => c.text).join(" ")).toBe("the quick brown fox jumps over the lazy dog now");
  });

  it("块数随时长增加（更长的镜头切更多块），且封顶 8", () => {
    const txt = "一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十";
    expect(chunkCaption(txt, 0, 2).length).toBeLessThan(chunkCaption(txt, 0, 10).length);
    expect(chunkCaption(txt, 0, 60).length).toBeLessThanOrEqual(8);
  });
});
