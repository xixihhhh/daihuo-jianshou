/**
 * Key-free publish copy pack — works on the export page as "copy and post" even without an LLM configured.
 * Maps category + platform to trending hashtags and assembles titles and promo copy using pain-point / number / emotion hook templates.
 * Pure function, deterministic (same input → same output), unit-testable; users with an LLM still go through /api/llm/publish for higher-quality copy.
 */

export interface PublishPack {
  titles: string[];
  hashtags: string[]; // already prefixed with # and deduplicated
  caption: string;
}

export interface PublishPackInput {
  productName?: string;
  category?: string; // beauty/food/home/fashion/digital/other
  sellingPoints?: string; // selling points / description, may be multiple sentences
  platform?: string; // douyin/kuaishou/xiaohongshu/tiktok
  locale?: "zh" | "en"; // copy language, defaults to zh; en uses English titles/hashtags/CTA for overseas markets (avoids delivering Chinese copy to English-speaking users)
}

// Category trending hashtags (tuned for Douyin/Kuaishou/Xiaohongshu commerce context)
const CATEGORY_TAGS: Record<string, string[]> = {
  beauty: ["好物分享", "美妆", "护肤", "变美", "平价好物", "种草"],
  food: ["美食", "好吃推荐", "零食", "吃货日常", "干饭人", "种草"],
  home: ["家居好物", "居家生活", "生活好物", "收纳", "好物推荐", "种草"],
  fashion: ["穿搭", "时尚", "OOTD", "穿搭分享", "好物分享", "种草"],
  digital: ["数码", "数码好物", "科技", "实用好物", "好物推荐", "种草"],
  other: ["好物推荐", "种草", "好物分享", "值得买", "宝藏好物", "日常分享"],
};

// Category trending hashtags (English TikTok/Reels commerce context)
const CATEGORY_TAGS_EN: Record<string, string[]> = {
  beauty: ["BeautyTok", "SkincareRoutine", "MakeupHacks", "BeautyFinds", "GlowUp", "TikTokMadeMeBuyIt"],
  food: ["FoodTok", "FoodieFinds", "SnackHaul", "TikTokFood", "MustTry", "TikTokMadeMeBuyIt"],
  home: ["HomeFinds", "HomeHacks", "CleanTok", "OrganizationTips", "CozyHome", "TikTokMadeMeBuyIt"],
  fashion: ["OOTD", "FashionTok", "StyleInspo", "OutfitIdeas", "FashionFinds", "TikTokMadeMeBuyIt"],
  digital: ["TechTok", "GadgetFinds", "TechReview", "CoolGadgets", "Innovation", "TikTokMadeMeBuyIt"],
  other: ["TikTokMadeMeBuyIt", "MustHave", "ProductReview", "WorthIt", "TikTokFinds", "DailyFinds"],
};

// Platform trending hashtags
const PLATFORM_TAGS: Record<string, string[]> = {
  douyin: ["抖音好物", "抖音电商"],
  kuaishou: ["快手好物", "快手电商"],
  xiaohongshu: ["小红书", "好物推荐"],
  tiktok: ["TikTokMadeMeBuyIt", "TikTokShop"],
};

/** Extract the first selling point: split on CJK/ASCII punctuation and newlines, trim whitespace, clip to max length (English points are longer, so max is tunable) */
function firstSellingPoint(sp: string | undefined, max: number): string {
  if (!sp) return "";
  const first = sp.split(/[。.,，;；\n、]/).map((s) => s.trim()).find((s) => s.length > 0) || "";
  return clip(first, max);
}

/** Clip by approximate display width (CJK counts as 1 character, prevents titles from being too long) */
function clip(s: string, max: number): string {
  const arr = Array.from(s.trim());
  return arr.length <= max ? s.trim() : arr.slice(0, max).join("").trim();
}

/**
 * Build the LLM prompt for publish copy (used by users who have an LLM configured for higher-quality results).
 * Follows locale: zh produces Chinese commerce copy, en produces English TikTok copy — avoids the LLM returning Chinese to English-speaking users.
 * Pure function; prompt content is deterministically unit-testable (LLM output itself requires a key and is not tested here).
 */
export function buildPublishPrompt(
  input: { productName: string; category?: string; productDescription?: string; platform?: string },
  locale: "zh" | "en" = "zh"
): string {
  const { productName, category, productDescription, platform } = input;
  if (locale === "en") {
    const platformHint = platform ? `Target platform: ${platform}.` : "Target platform: TikTok / Reels / Shorts.";
    return `You are a seasoned e-commerce short-video marketer. Write publishing copy for the product below, entirely in ENGLISH. ${platformHint}
Product: ${productName}
${category ? `Category: ${category}\n` : ""}${productDescription ? `Selling points: ${productDescription}\n` : ""}
Output STRICT JSON only (no extra text):
{
  "titles": ["3 catchy short titles with emotion/pain-point/number hooks, each <= 60 chars"],
  "hashtags": ["6-10 hashtags with #, TikTok-style; the FIRST must be a product-specific/branded hashtag (the product name, no spaces) for keyword-search discovery, the rest matching category and platform trends"],
  "caption": "one-line caption, conversational, with a clear call to action, <= 150 chars; lead with the main product keyword in the first ~30 characters for search discoverability"
}`;
  }
  const platformHint = platform ? `目标平台：${platform}。` : "目标平台：抖音/快手/小红书。";
  return `你是资深电商带货短视频运营。请为以下商品生成发布文案。${platformHint}
商品名称：${productName}
${category ? `品类：${category}\n` : ""}${productDescription ? `卖点：${productDescription}\n` : ""}
要求严格输出 JSON（不要多余文字）：
{
  "titles": ["3 个吸睛短标题，含情绪/痛点/数字钩子，每个 ≤20 字"],
  "hashtags": ["6-10 个带 # 的话题标签；第 1 个必须是商品专属/品牌标签（商品名、不含空格），利于商品词搜索发现，其余贴合品类与平台热点"],
  "caption": "一句话种草文案，口语化，含行动号召，≤40 字；开头先点出商品核心关键词（利于平台搜索发现）"
}`;
}

export function buildPublishPack(input: PublishPackInput): PublishPack {
  const en = input.locale === "en";
  const name = clip((input.productName || "").trim() || (en ? "this find" : "这款好物"), en ? 40 : 16);
  const cat = (input.category || "other").toLowerCase();
  const point = firstSellingPoint(input.sellingPoints, en ? 40 : 12);

  // Titles: emotion + selling-point/number hook, three different angles (English not hard-clipped; CJK limited to 22 chars)
  const titles = en
    ? [
        `This ${name} is a total game-changer 🤯`,
        point ? `${name} — ${point}, you'll want one` : `${name} you won't regret buying`,
        `3 reasons to grab the ${name}`,
      ]
    : [
        clip(`${name}也太好用了吧！后悔没早买`, 22),
        clip(point ? `${name}｜${point}，谁用谁回购` : `${name}，闭眼入不踩雷`, 22),
        clip(`三个理由让你入手${name}`, 22),
      ];

  // Hashtags: product-specific tag + category + platform, deduplicated, prefixed with #, capped at ~10.
  // Product-specific tag goes first — in 2026, Douyin/TikTok discovery relies heavily on product keywords;
  // generic category tags give broad but unfocused exposure.
  // Adding a product-name tag lets people searching for that exact product find your video directly.
  const platform = (input.platform || "").toLowerCase();
  const catTags = en ? CATEGORY_TAGS_EN : CATEGORY_TAGS;
  const rawName = (input.productName || "").trim();
  // Strip spaces/punctuation from the product name (hashtags cannot contain spaces); keep only letters, digits, and CJK; clip to max length
  const productTag = rawName ? `#${clip(rawName.replace(/[^\p{L}\p{N}]/gu, ""), en ? 24 : 12)}` : "";
  const tagWords = [
    ...(catTags[cat] || catTags.other),
    ...(PLATFORM_TAGS[platform] || []),
  ];
  const seen = new Set<string>();
  const hashtags: string[] = [];
  for (const tag of [productTag, ...tagWords.map((w) => `#${w}`)]) {
    if (!tag || tag === "#" || seen.has(tag)) continue;
    seen.add(tag);
    hashtags.push(tag);
    if (hashtags.length >= 10) break;
  }

  // Promo caption: conversational + call to action. Clip the lead phrase first, then append the fixed CTA so the CTA tail is never truncated
  const cta = en ? " — tap the link below to grab it 🛒" : "，点下方小黄车带走它～";
  const lead = en
    ? `Obsessed with ${name}${point ? ", " + point : ""}`
    : `${name}真的绝了${point ? "，" + point : ""}`;
  const capMax = en ? 130 : 40;
  const caption = clip(lead, capMax - Array.from(cta).length) + cta;

  return { titles, hashtags, caption };
}
