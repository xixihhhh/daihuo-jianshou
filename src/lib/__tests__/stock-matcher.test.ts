import { describe, it, expect } from "vitest";
import { broadenQuery, shotQuery, scoreCandidate, pickBestCandidate } from "@/lib/stock-matcher";

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
    expect(r).not.toContain("nature"); // original word is excluded
    // remaining fallbacks are still present
    expect(r).toContain("lifestyle");
    expect(new Set(r).size).toBe(r.length); // no duplicates
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

describe("scoreCandidate / pickBestCandidate（候选择优）", () => {
  const shot = { stockKeywords: ["tissue", "home", "living room"] };

  it("关键词重合 + 竖屏 比 不相关+横屏 分高", () => {
    const good = { id: "a", tags: ["tissue", "home"], orientation: "portrait" as const };
    const bad = { id: "b", tags: ["car", "city"], orientation: "landscape" as const };
    expect(scoreCandidate(shot, good)).toBeGreaterThan(scoreCandidate(shot, bad));
  });

  it("pickBestCandidate 选最高分", () => {
    const cands = [
      { id: "a", tags: ["car"], orientation: "landscape" as const },
      { id: "b", tags: ["tissue", "home", "living"], orientation: "portrait" as const },
    ];
    expect(pickBestCandidate(shot, cands)?.id).toBe("b");
  });

  it("已用过的候选被去重惩罚", () => {
    const cand = { id: "a", tags: ["tissue"], orientation: "portrait" as const };
    expect(scoreCandidate(shot, cand, { usedIds: new Set(["a"]) })).toBeLessThan(scoreCandidate(shot, cand));
  });

  it("preferVideo 时视频加分", () => {
    const img = { id: "a", tags: ["tissue"], type: "image" as const };
    const vid = { id: "b", tags: ["tissue"], type: "video" as const };
    expect(scoreCandidate(shot, vid, { preferVideo: true })).toBeGreaterThan(scoreCandidate(shot, img, { preferVideo: true }));
  });

  it("空候选 → undefined", () => {
    expect(pickBestCandidate(shot, [])).toBeUndefined();
  });
});
