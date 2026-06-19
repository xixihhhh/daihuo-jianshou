/**
 * 素材匹配辅助 —— 服务"无商品也能成片，且永远有画面"的目标
 *
 * broadenQuery：当某个英文检索词在素材库一无所获时，产出由具体到宽泛的回退检索词，
 * 直到能命中素材（避免新手输入的生僻主题导致某个分镜没有任何画面可用）。
 */

/** 万能兜底检索词：任何免费素材库都有大量结果 */
const UNIVERSAL_FALLBACKS = ["abstract background", "lifestyle", "nature", "light"];

/**
 * 给一个英文检索词，产出由具体到宽泛的回退检索词序列（不含原词、已去重）。
 * 例：broadenQuery("quantum entanglement physics")
 *   → ["entanglement physics", "physics", "abstract background", "lifestyle", "nature", "light"]
 * 纯函数，便于单测。
 */
export function broadenQuery(query: string): string[] {
  const q = (query || "").trim();
  const words = q.split(/\s+/).filter(Boolean);
  const out: string[] = [];

  if (words.length > 2) out.push(words.slice(-2).join(" ")); // 末两词
  if (words.length > 1) out.push(words[words.length - 1]); // 末词（通常是主体名词）
  out.push(...UNIVERSAL_FALLBACKS);

  const seen = new Set<string>([q.toLowerCase()]);
  return out.filter((t) => {
    const k = t.toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
