import { describe, it, expect } from "vitest";
import { aggregateByStyle, topConvertingStyle, type MetricInput } from "@/lib/performance-insights";

const recs: MetricInput[] = [
  { style: "pain_point", views: 10000, likes: 500, comments: 100, shares: 50, orders: 80 },
  { style: "pain_point", views: 20000, likes: 1000, comments: 200, shares: 100, orders: 200 },
  { style: "comparison", views: 10000, likes: 200, comments: 20, shares: 10, orders: 30 },
];

describe("aggregateByStyle", () => {
  it("按风格分组、算 avg/rates，按转化率降序", () => {
    const agg = aggregateByStyle(recs);
    expect(agg.map((i) => i.style)).toEqual(["pain_point", "comparison"]); // 痛点转化更高排前
    const pp = agg[0];
    expect(pp.samples).toBe(2);
    expect(pp.avgViews).toBe(15000); // (10000+20000)/2
    expect(pp.totalOrders).toBe(280);
    expect(pp.conversionRate).toBeCloseTo(280 / 30000, 6); // 成交/播放
    expect(pp.engagementRate).toBeCloseTo(1950 / 30000, 6); // (赞+评+转)/播放
  });

  it("0 播放不除零（rate=0）", () => {
    const agg = aggregateByStyle([{ style: "x", views: 0, orders: 5 }]);
    expect(agg[0].conversionRate).toBe(0);
    expect(agg[0].engagementRate).toBe(0);
    expect(agg[0].avgViews).toBe(0);
  });

  it("空输入 → 空数组", () => {
    expect(aggregateByStyle([])).toEqual([]);
  });

  it("缺省字段按 0 处理，不抛错", () => {
    const agg = aggregateByStyle([{ style: "y", views: 100 }]);
    expect(agg[0].totalOrders).toBe(0);
    expect(agg[0].conversionRate).toBe(0);
  });
});

describe("topConvertingStyle", () => {
  it("达最小样本数才推荐（默认 2）", () => {
    const top = topConvertingStyle(recs); // pain_point 有 2 条
    expect(top?.style).toBe("pain_point");
  });

  it("样本不足 → null（不给误导建议）", () => {
    expect(topConvertingStyle(recs, 3)).toBeNull(); // 没有风格满 3 条
    expect(topConvertingStyle([{ style: "comparison", views: 10000, orders: 30 }], 2)).toBeNull(); // 只 1 条
  });

  it("全 0 转化 → null", () => {
    expect(topConvertingStyle([
      { style: "a", views: 100, orders: 0 },
      { style: "a", views: 200, orders: 0 },
    ])).toBeNull();
  });
});
