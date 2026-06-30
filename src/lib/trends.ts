/**
 * 热点选题 —— 拉某地区的每日热搜，建议「该做什么主题」，再喂给一句话成片。
 *
 * 解决创作者的「不知道做什么」：免 Key 取 Google Trends 每日热搜 RSS（含热度 + 相关新闻标题做背景），
 * 列成可直接当 topic 的候选。纯解析可单测，网络部分超时兜底。
 * 注：Google Trends 为非官方端点、按地区覆盖（en 系国家最全；中国数据有限，出海/全球题材更合适）。
 */

export interface TrendTopic {
  /** 热搜词，可直接当一句话主题 */
  title: string;
  /** 大致热度（如 "2000+"），可空 */
  traffic?: string;
  /** 一条相关新闻标题做背景，帮助理解这个词为什么热，可空 */
  context?: string;
}

function stripCdata(s: string): string {
  const c = s.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return c ? c[1] : s;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

/** 取一个 XML 片段里某标签的首个文本（处理 CDATA + 实体）。tag 可含冒号（如 ht:approx_traffic）。 */
function firstTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? decodeXml(stripCdata(m[1])).trim() : null;
}

/** 解析 Google Trends 每日热搜 RSS → 候选主题（跳过 channel 头部标题，只取 <item>）。纯函数。 */
export function parseTrendsRss(xml: string): TrendTopic[] {
  const blocks = xml.split(/<item>/i).slice(1); // 第一段是 channel 头，丢弃
  const out: TrendTopic[] = [];
  for (const block of blocks) {
    const body = block.split(/<\/item>/i)[0];
    const title = firstTag(body, "title");
    if (!title) continue;
    out.push({
      title,
      traffic: firstTag(body, "ht:approx_traffic") || undefined,
      context: firstTag(body, "ht:news_item_title") || undefined,
    });
  }
  return out;
}

/** 拉某地区热搜候选主题；地区非法回退 US，网络失败返回 []（不阻断调用方）。 */
export async function fetchTrendingTopics(geo = "US", opts: { limit?: number } = {}): Promise<TrendTopic[]> {
  const g = /^[a-z]{2}$/i.test(geo) ? geo.toUpperCase() : "US";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`https://trends.google.com/trending/rss?geo=${g}`, { signal: ctrl.signal });
    if (!res.ok) return [];
    const topics = parseTrendsRss(await res.text());
    return opts.limit ? topics.slice(0, opts.limit) : topics;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** 归一化地区码（非法回退 US）。 */
export function normalizeGeo(geo: string | null | undefined): string {
  return geo && /^[a-z]{2}$/i.test(geo) ? geo.toUpperCase() : "US";
}
