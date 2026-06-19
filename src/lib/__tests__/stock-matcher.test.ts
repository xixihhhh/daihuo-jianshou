import { describe, it, expect } from "vitest";
import { broadenQuery, shotQuery } from "@/lib/stock-matcher";

describe("broadenQuery（永远有素材兜底）", () => {
  it("多词：由具体到宽泛，含末两词/末词 + 万能兜底", () => {
    const r = broadenQuery("quantum entanglement physics");
    expect(r[0]).toBe("entanglement physics");
    expect(r[1]).toBe("physics");
    expect(r).toContain("abstract background");
    expect(r).toContain("lifestyle");
    expect(r).toContain("nature");
  });

  it("单词：只剩万能兜底（不含原词）", () => {
    const r = broadenQuery("coffee");
    expect(r).not.toContain("coffee");
    expect(r).toEqual(["abstract background", "lifestyle", "nature", "light"]);
  });

  it("去重且排除与原词相同", () => {
    const r = broadenQuery("nature");
    expect(r).not.toContain("nature"); // 原词被排除
    // 其余兜底仍在
    expect(r).toContain("lifestyle");
    expect(new Set(r).size).toBe(r.length); // 无重复
  });

  it("空串：返回万能兜底", () => {
    expect(broadenQuery("")).toEqual(["abstract background", "lifestyle", "nature", "light"]);
    expect(broadenQuery("   ")).toEqual(["abstract background", "lifestyle", "nature", "light"]);
  });
});

describe("shotQuery（拼分镜检索词）", () => {
  it("优先 stockKeywords（空格连接）", () => {
    expect(shotQuery({ stockKeywords: ["coffee morning", "cafe"], description: "中文描述" })).toBe("coffee morning cafe");
  });
  it("无 stockKeywords 时回退到描述，再回退到配音", () => {
    expect(shotQuery({ description: "客厅茶几" })).toBe("客厅茶几");
    expect(shotQuery({ voiceover: "你还在用" })).toBe("你还在用");
    expect(shotQuery({})).toBe("");
  });
});
