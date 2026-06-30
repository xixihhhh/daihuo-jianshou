import { describe, it, expect } from "vitest";
import { parseTrendsRss, normalizeGeo } from "@/lib/trends";

const SAMPLE = `<?xml version="1.0"?><rss><channel>
<title>Daily Search Trends</title>
<item>
  <title>mstr</title>
  <ht:approx_traffic>2000+</ht:approx_traffic>
  <ht:news_item><ht:news_item_title>Strategy Announces &amp; Reserves Plan</ht:news_item_title></ht:news_item>
</item>
<item>
  <title><![CDATA[world cup results]]></title>
  <ht:approx_traffic>5000+</ht:approx_traffic>
</item>
</channel></rss>`;

describe("parseTrendsRss", () => {
  it("只取 <item>，跳过 channel 头部标题；含热度 + 新闻背景 + 实体/CDATA 解码", () => {
    const topics = parseTrendsRss(SAMPLE);
    expect(topics.length).toBe(2); // 不含 channel 的 "Daily Search Trends"
    expect(topics[0]).toEqual({ title: "mstr", traffic: "2000+", context: "Strategy Announces & Reserves Plan" });
    expect(topics[1]).toEqual({ title: "world cup results", traffic: "5000+", context: undefined });
  });
  it("空/无 item → 空数组", () => {
    expect(parseTrendsRss("<rss><channel><title>x</title></channel></rss>")).toEqual([]);
  });
});

describe("normalizeGeo", () => {
  it("合法两字母 → 大写；非法 → US", () => {
    expect(normalizeGeo("jp")).toBe("JP");
    expect(normalizeGeo("US")).toBe("US");
    expect(normalizeGeo("xyz")).toBe("US");
    expect(normalizeGeo(null)).toBe("US");
  });
});
