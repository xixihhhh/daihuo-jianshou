/**
 * 商品链接一键 ingest —— 贴一个商品页 URL，自动抽取「标题 / 价格 / 描述 / 商品图」。
 *
 * 这是 2026 带货工作流的标准入口（Creatify/即创/Pippit 都以「贴商品链接」而非「写提示词」起步）。
 * 抽取优先级：JSON-LD(schema.org Product) > OpenGraph > Twitter Card > <title>/<meta description>。
 * 纯函数（解析与网络分离），可单测；下游交给现有 analyzeProduct + 脚本引擎提炼卖点。
 */

export interface ProductIngest {
  title: string;
  priceText?: string;
  description?: string;
  images: string[]; // 绝对 URL，已去重
  sourceUrl: string;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$", CNY: "¥", RMB: "¥", EUR: "€", GBP: "£", JPY: "¥", HKD: "HK$", TWD: "NT$", KRW: "₩", AUD: "A$", CAD: "C$",
};

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/**
 * 解码常见 HTML 实体（meta content 里常见 &amp; &#39; 等）。
 * 单趟扫描、每个实体只解一次：链式 replace 会把先还原出的 `&` 再当下一条规则的实体二次解码
 * （如 `&amp;#39;` 本应保留为字面 `&#39;`，链式会错解成 `'`），单趟回调可杜绝。
 */
export function decodeEntities(s: string): string {
  return s
    .replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
        return Number.isFinite(code) ? String.fromCharCode(code) : m;
      }
      return NAMED_ENTITIES[e] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 取某个 meta（property 或 name）的 content，兼容属性顺序两种写法。
 * content 用「开引号反向引用」匹配收尾（(["'])((?:(?!\1).)*)\1），而非 [^"']*——
 * 否则 content="Tom's Mug" 这类内部含另一种引号的会在撇号处被腰斩。content 落在捕获组 2。
 */
export function getMeta(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const k = escapeRe(key);
    const m =
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=(["'])((?:(?!\\1).)*)\\1`, "i")) ||
      html.match(new RegExp(`<meta[^>]+content=(["'])((?:(?!\\1).)*)\\1[^>]*(?:property|name)=["']${k}["']`, "i"));
    if (m && m[2].trim()) return decodeEntities(m[2]);
  }
  return undefined;
}

/** 把可能相对的 URL 解析为绝对 URL；失败返回原值 */
export function toAbsolute(url: string, base: string): string {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

// ==================== JSON-LD ====================

/* eslint-disable @typescript-eslint/no-explicit-any */
function findProductNode(data: any): any | undefined {
  if (!data || typeof data !== "object") return undefined;
  if (Array.isArray(data)) {
    for (const d of data) {
      const f = findProductNode(d);
      if (f) return f;
    }
    return undefined;
  }
  const type = data["@type"];
  if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) return data;
  if (data["@graph"]) return findProductNode(data["@graph"]);
  return undefined;
}

/** 从 JSON-LD script 块里找 schema.org Product 节点 */
export function extractJsonLdProduct(html: string): any | undefined {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const node = findProductNode(JSON.parse(m[1].trim()));
      if (node) return node;
    } catch {
      /* 单个块非法 JSON 则跳过 */
    }
  }
  return undefined;
}

/**
 * 价格格式化：拼货币符号前先判 price 是否已自带符号/字母币种（避免 $$19.99），
 * 并把 0 / 负数 / 非数视为无效（避免产出无意义的「$0」）。jsonLd 与 OG 两路共用。
 */
function formatPrice(price: unknown, currency: string | undefined): string | undefined {
  if (price == null) return undefined;
  const raw = String(price).trim();
  if (!raw) return undefined;
  // 纯数字的 0/负数直接判无效；带符号串（$0 等）再按提取的数值判
  const asNum = Number(raw);
  if (Number.isFinite(asNum) && asNum <= 0) return undefined;
  const numeric = parseFloat(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  // 已含货币符号或「USD 」类字母币种前缀 → 原样返回，不再重复加符号
  if (/[¥$€£₩]/.test(raw) || /^[A-Za-z]{2,3}[\s ]/.test(raw)) return raw;
  const cur = (currency || "").toUpperCase();
  const sym = CURRENCY_SYMBOL[cur] ?? (cur ? `${cur} ` : "");
  return `${sym}${raw}`;
}

function jsonLdPrice(node: any): string | undefined {
  const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
  const price = offers?.price ?? offers?.lowPrice ?? offers?.highPrice;
  return formatPrice(price, offers?.priceCurrency || node.priceCurrency);
}

function jsonLdImages(node: any): string[] {
  const img = node.image;
  if (!img) return [];
  const arr = Array.isArray(img) ? img : [img];
  return arr.map((x: any) => (typeof x === "string" ? x : x?.url)).filter((x: any): x is string => typeof x === "string" && x.length > 0);
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ==================== 主解析 ====================

/** 从商品页 HTML 解析出商品信息（JSON-LD 优先，OG/Twitter/title 兜底） */
export function parseProductFromHtml(html: string, baseUrl: string): ProductIngest {
  const ld = extractJsonLdProduct(html);

  // 标题
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title =
    (ld?.name && decodeEntities(String(ld.name))) ||
    getMeta(html, ["og:title", "twitter:title"]) ||
    (titleTag && decodeEntities(titleTag)) ||
    "";

  // 价格
  const ogPrice = getMeta(html, ["product:price:amount", "og:price:amount"]);
  const ogCur = getMeta(html, ["product:price:currency", "og:price:currency"]);
  const priceText = (ld && jsonLdPrice(ld)) || formatPrice(ogPrice, ogCur);

  // 描述
  const description =
    (ld?.description && decodeEntities(String(ld.description))) ||
    getMeta(html, ["og:description", "twitter:description", "description"]);

  // 图片：JSON-LD + OG + Twitter，全部转绝对、去重、取前若干
  const raw: string[] = [
    ...jsonLdImages(ld ?? {}),
    ...(getMeta(html, ["og:image", "og:image:secure_url"]) ? [getMeta(html, ["og:image", "og:image:secure_url"])!] : []),
    ...(getMeta(html, ["twitter:image", "twitter:image:src"]) ? [getMeta(html, ["twitter:image", "twitter:image:src"])!] : []),
  ];
  const seen = new Set<string>();
  const images: string[] = [];
  for (const u of raw) {
    if (!u) continue;
    const abs = toAbsolute(decodeEntities(u), baseUrl);
    if (!/^https?:\/\//i.test(abs)) continue;
    if (seen.has(abs)) continue;
    seen.add(abs);
    images.push(abs);
  }

  return { title: title.trim(), priceText, description, images, sourceUrl: baseUrl };
}
