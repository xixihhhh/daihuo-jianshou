import { describe, it, expect } from "vitest";
import { checkAdCompliance, checkScriptCompliance } from "@/lib/ad-compliance";

describe("checkAdCompliance（广告法风险词扫描）", () => {
  it("命中绝对化用语", () => {
    const terms = checkAdCompliance("这是全网第一的最佳好物，100%好评").map((x) => x.term);
    expect(terms).toContain("全网第一");
    expect(terms).toContain("最佳");
    expect(terms).toContain("100%");
  });

  it("命中医疗/虚假功效", () => {
    const terms = checkAdCompliance("三天见效，根治痘痘，疗效显著").map((x) => x.term);
    expect(terms).toContain("三天见效");
    expect(terms).toContain("根治");
    expect(terms).toContain("疗效");
  });

  it("命中需认证宣称（med 级）", () => {
    const v = checkAdCompliance("纯天然无添加配方");
    expect(v.map((x) => x.term)).toEqual(expect.arrayContaining(["纯天然", "无添加"]));
    expect(v.find((x) => x.term === "纯天然")?.severity).toBe("med");
  });

  it("去重 + high 在前", () => {
    const v = checkAdCompliance("最佳最佳，纯天然，全网第一");
    expect(v.filter((x) => x.term === "最佳").length).toBe(1); // 去重
    expect(v[0].severity).toBe("high"); // high 排前
  });

  it("合规文案无命中（无误报）", () => {
    expect(checkAdCompliance("这款抽纸柔软亲肤，囤货很划算，回购率高")).toEqual([]);
  });

  it("空 / null 文本", () => {
    expect(checkAdCompliance("")).toEqual([]);
    expect(checkAdCompliance(null as unknown as string)).toEqual([]);
  });

  it("每条都带修改建议", () => {
    for (const v of checkAdCompliance("最佳 根治 纯天然")) expect(v.suggestion.length).toBeGreaterThan(0);
  });
});

describe("checkScriptCompliance（整条脚本扫描）", () => {
  it("扫描旁白 + 贴片并汇总去重", () => {
    const shots = [
      { voiceover: "全网第一好物", textOverlay: { text: "100%好评" } },
      { voiceover: "根治痘痘", textOverlay: null },
    ];
    const terms = checkScriptCompliance(shots).map((x) => x.term);
    expect(terms).toContain("全网第一");
    expect(terms).toContain("100%");
    expect(terms).toContain("根治");
  });

  it("空脚本无命中", () => {
    expect(checkScriptCompliance([])).toEqual([]);
  });
});
