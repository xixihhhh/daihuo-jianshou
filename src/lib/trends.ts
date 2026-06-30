/**
 * Trending topics — fetches daily trending searches for a region, suggests "what to make a video about",
 * and feeds the result into one-shot video generation.
 *
 * Solves the creator's "I don't know what to make" problem: fetches Google Trends daily trending RSS
 * without an API key (includes traffic estimates + related news headlines as context), and returns a
 * list of ready-to-use topic candidates. Parsing is pure/unit-testable; network calls have timeout guards.
 * Note: Google Trends is an unofficial endpoint with regional coverage (English-speaking countries are
 * most complete; China data is limited — content aimed at overseas/global audiences works best).
 */

export interface TrendTopic {
  /** Trending keyword, can be used directly as a one-sentence topic */
  title: string;
  /** Approximate traffic (e.g. "2000+"), optional */
  traffic?: string;
  /** A related news headline providing context for why this term is trending, optional */
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

/** Get the first text content of a tag in an XML fragment (handles CDATA + entities). Tag may contain a colon (e.g. ht:approx_traffic). */
function firstTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? decodeXml(stripCdata(m[1])).trim() : null;
}

/** Parse Google Trends daily trending RSS → topic candidates (skip channel header, only process <item> entries). Pure function. */
export function parseTrendsRss(xml: string): TrendTopic[] {
  const blocks = xml.split(/<item>/i).slice(1); // first segment is the channel header, discard it
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

/** Fetch trending topic candidates for a region; falls back to US for invalid regions, returns [] on network failure (non-blocking). */
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

/** Normalize a region code (falls back to US for invalid values). */
export function normalizeGeo(geo: string | null | undefined): string {
  return geo && /^[a-z]{2}$/i.test(geo) ? geo.toUpperCase() : "US";
}
