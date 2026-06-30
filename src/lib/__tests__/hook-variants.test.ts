import { describe, it, expect } from "vitest";
import { buildHookVariants } from "@/lib/script-engine/hook-variants";
import type { Shot } from "@/lib/db/schema";

const mk = (o: Partial<Shot>): Shot => ({
  shotId: 1,
  type: "demo",
  duration: 4,
  description: "",
  camera: "",
  visualSource: "ai_generate",
  transition: "direct_concat",
  voiceover: "",
  ...o,
});

const base = {
  styleType: "pain_point",
  totalDuration: 20,
  shots: [
    mk({ shotId: 1, type: "hook", voiceover: "原钩子文案", description: "原画面" }),
    mk({ shotId: 2, type: "demo", voiceover: "演示" }),
    mk({ shotId: 3, type: "cta", voiceover: "下单" }),
  ],
};

describe("buildHookVariants", () => {
  it("生成 N 条变体，每条带 hookId、机制互不相同，且只有第 1 镜不同", () => {
    const vs = buildHookVariants(base, "beauty", 3);
    expect(vs.length).toBe(3);
    expect(new Set(vs.map((v) => v.hookId)).size).toBe(3); // no duplicate mechanisms
    for (const v of vs) {
      expect(v.hookId).toBeTruthy();
      expect(v.script.shots.length).toBe(3);
      expect(v.script.shots[0].type).toBe("hook");
      expect(v.script.shots[0].voiceover).not.toBe("原钩子文案"); // shot 1 voiceover was replaced
      expect(v.script.shots[1].voiceover).toBe("演示"); // remaining shots unchanged
      expect(v.script.shots[2].voiceover).toBe("下单");
    }
  });

  it("第 1 镜画面描述保留原意图", () => {
    const vs = buildHookVariants(base, "beauty", 1);
    expect(vs[0].script.shots[0].description).toContain("原画面");
  });

  it("不污染原脚本（base.shots[0] 不被改）", () => {
    buildHookVariants(base, "beauty", 2);
    expect(base.shots[0].voiceover).toBe("原钩子文案");
  });

  it("空 shots → 空数组", () => {
    expect(buildHookVariants({ shots: [] }, "beauty")).toEqual([]);
  });
});
