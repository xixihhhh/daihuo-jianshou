import { describe, it, expect } from "vitest";
import { selectHookPatterns, buildHookGuidance, HOOK_PATTERNS } from "@/lib/script-engine/hook-patterns";
import { buildUserPrompt } from "@/lib/script-engine/prompts";

describe("selectHookPatterns", () => {
  it("命中品类的卡片优先（美妆 → 第一张命中 beauty，且含 before_after）", () => {
    const sel = selectHookPatterns("beauty", 5);
    expect(sel.length).toBeLessThanOrEqual(5);
    expect(sel[0].categories?.includes("beauty")).toBe(true);
    expect(sel.map((p) => p.id)).toContain("before_after");
  });

  it("不足 n 时补通用卡、去重", () => {
    const sel = selectHookPatterns("tech", 8);
    expect(new Set(sel.map((p) => p.id)).size).toBe(sel.length); // no duplicates
    // generic cards (no categories) will be filled in
    expect(sel.some((p) => !p.categories)).toBe(true);
  });

  it("n 限制生效", () => {
    expect(selectHookPatterns("food", 3).length).toBe(3);
  });

  it("每张卡都有完整三拍 + 示例", () => {
    for (const p of HOOK_PATTERNS) {
      expect(p.stop && p.prove && p.bridge && p.example).toBeTruthy();
    }
  });
});

describe("buildHookGuidance", () => {
  it("含三拍结构 + 品类名 + 多脚本差异化提示", () => {
    const g = buildHookGuidance("beauty");
    expect(g).toContain("三拍结构");
    expect(g).toContain("截停拇指");
    expect(g).toContain("证明相关");
    expect(g).toContain("接到产品");
    expect(g).toContain("美妆护肤"); // category name injected
    expect(g).toContain("A/B"); // each script uses a different hook mechanism
  });
});

describe("buildUserPrompt 已接入钩子指引（集成锁）", () => {
  it("带货脚本提示词含三拍结构钩子指引", () => {
    const prompt = buildUserPrompt({ productName: "测试面膜", category: "beauty", styleType: "pain_point", targetDuration: 25 });
    expect(prompt).toContain("三拍结构");
    expect(prompt).toContain("截停拇指");
  });
});
