// Onboarding example pack: sample products (one-click fill / import to product library), reference script structures, and homepage showcase.
// Note: these are "official examples", fully separated from user-created data and clearly labelled — they will never appear under "My Projects".
// Bilingual: copy is fetched by UI locale (getExampleProducts/Templates/Showcase(locale)).
import type { Shot } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";

// Example product categories (aligned with ProductItem.category in the product library)
export interface ExampleProduct {
  id: string;
  name: string;
  category: "beauty" | "food" | "home" | "fashion" | "tech" | "other";
  /** Selling-point description (also used as product library description / new-project form sellingPoints) */
  sellingPoints: string;
  price: string;
  /** Real product image bundled under public/examples */
  image: string;
}

const exampleProductsByLocale: Record<Locale, ExampleProduct[]> = {
  zh: [
    {
      id: "ex-juicer",
      name: "便携榨汁杯",
      category: "tech",
      sellingPoints: "USB 充电随身榨，30 秒一杯鲜榨果汁；六叶刀头碎冰碎果，办公室、健身房、出差都能用；杯体可水洗，清洗 0 负担。",
      price: "129",
      image: "/examples/juicer.png",
    },
    {
      id: "ex-coffee",
      name: "冷萃咖啡液",
      category: "food",
      sellingPoints: "0 糖 0 脂，3 秒冲一杯；冷热都好喝，兑水兑奶皆可；独立小包装随身带，上班族续命、健身控糖都适合。",
      price: "59",
      image: "/examples/coffee.png",
    },
    {
      id: "ex-tissue",
      name: "云柔加厚抽纸",
      category: "home",
      sellingPoints: "加厚 3 层，湿水不破不掉屑；原生木浆亲肤不刺激，宝宝孕妇可用；整箱囤更划算，家用车用办公都合适。",
      price: "39",
      image: "/examples/tissue.png",
    },
  ],
  en: [
    {
      id: "ex-juicer",
      name: "Portable Juicer Cup",
      category: "tech",
      sellingPoints: "USB-rechargeable, juice on the go — a fresh cup in 30 seconds; a 6-blade head crushes ice and fruit; great at the office, gym, or on trips; the cup is fully washable for zero-hassle cleanup.",
      price: "129",
      image: "/examples/juicer.png",
    },
    {
      id: "ex-coffee",
      name: "Cold Brew Coffee Concentrate",
      category: "food",
      sellingPoints: "Zero sugar, zero fat — a cup in 3 seconds; tastes great hot or iced, with water or milk; single-serve packs you can carry anywhere; perfect for office pick-me-ups and low-sugar fitness routines.",
      price: "59",
      image: "/examples/coffee.png",
    },
    {
      id: "ex-tissue",
      name: "Soft Thick Facial Tissue",
      category: "home",
      sellingPoints: "Extra-thick 3-ply — won't tear or shed even when wet; virgin wood pulp, gentle on skin and safe for babies and moms; buying by the case is the best value — great for home, car, and office.",
      price: "39",
      image: "/examples/tissue.png",
    },
  ],
};

// Reference script structures (high-conversion commerce shot templates, used for the "showcase" display and new-user reference)
export interface ExampleTemplate {
  id: string;
  name: string;
  styleType: "pain_point" | "comparison" | "story";
  styleLabel: string;
  description: string;
  totalDuration: number;
  shots: Shot[];
}

const exampleTemplatesByLocale: Record<Locale, ExampleTemplate[]> = {
  zh: [
    {
      id: "tpl-pain",
      name: "痛点种草·黄金3秒",
      styleType: "pain_point",
      styleLabel: "痛点种草",
      description: "开头 3 秒抛痛点抓眼球，放大场景共鸣，再用产品给出解法，最后限时促单。最通用的带货结构。",
      totalDuration: 28,
      shots: [
        { shotId: 1, type: "hook", duration: 3, description: "第一人称视角快速切入，抛出尖锐痛点提问", camera: "手持跟拍", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "你是不是也受够了___？", prompt: "" },
        { shotId: 2, type: "pain_point", duration: 5, description: "放大使用前的痛点场景，引起共鸣", camera: "特写", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "每次都___，真的太难受了", prompt: "" },
        { shotId: 3, type: "product_reveal", duration: 4, description: "产品登场，缓慢推进展示包装", camera: "缓慢推进", visualSource: "product_image", transition: "ai_start_end", voiceover: "直到我用上了它", prompt: "" },
        { shotId: 4, type: "demo", duration: 8, description: "真实演示核心卖点与使用效果", camera: "中景", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "你看，___，完全解决了", prompt: "" },
        { shotId: 5, type: "cta", duration: 3, description: "商品+价格+购物车，引导下单", camera: "固定", visualSource: "product_image", transition: "direct_concat", voiceover: "限时优惠，赶紧抢！", prompt: "" },
      ],
    },
    {
      id: "tpl-compare",
      name: "对比测评·横向种草",
      styleType: "comparison",
      styleLabel: "对比测评",
      description: "多款横向对比，用真实测试凸显本品优势，再用销量好评背书，适合理性决策品类。",
      totalDuration: 30,
      shots: [
        { shotId: 1, type: "hook", duration: 3, description: "多款产品并排，抛出测评悬念", camera: "俯拍全景", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "花了___块测了 5 款，告诉你哪款最值", prompt: "" },
        { shotId: 2, type: "demo", duration: 9, description: "逐一对比测试核心指标", camera: "特写对比", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "第一款不行…这款居然还可以？", prompt: "" },
        { shotId: 3, type: "product_reveal", duration: 4, description: "本品胜出，特写展示", camera: "推进", visualSource: "product_image", transition: "ai_start_end", voiceover: "最后赢家就是它", prompt: "" },
        { shotId: 4, type: "social_proof", duration: 6, description: "销量数据与好评背书", camera: "固定", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "月销 10 万+，好评率 99%", prompt: "" },
        { shotId: 5, type: "cta", duration: 3, description: "下单引导与赠品信息", camera: "固定", visualSource: "product_image", transition: "direct_concat", voiceover: "链接在小黄车，今天下单还送赠品", prompt: "" },
      ],
    },
    {
      id: "tpl-story",
      name: "剧情故事·情景代入",
      styleType: "story",
      styleLabel: "剧情故事",
      description: "用一个有代入感的小故事包装产品，情绪先行、卖点自然融入，适合美妆、食品等感性品类。",
      totalDuration: 26,
      shots: [
        { shotId: 1, type: "hook", duration: 3, description: "主角登场，制造悬念开头", camera: "正面中景", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "那天发生了一件超尴尬的事", prompt: "" },
        { shotId: 2, type: "pain_point", duration: 5, description: "故事中的尴尬/痛点情节", camera: "特写", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "我当时真的恨不得找个地缝钻进去", prompt: "" },
        { shotId: 3, type: "product_reveal", duration: 3, description: "产品作为转折点出现", camera: "特写", visualSource: "product_image", transition: "ai_start_end", voiceover: "还好包里有它", prompt: "" },
        { shotId: 4, type: "demo", duration: 7, description: "使用后情节反转，效果展示", camera: "中景", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "用完之后，整个人都自信了", prompt: "" },
        { shotId: 5, type: "cta", duration: 3, description: "结尾种草与下单引导", camera: "固定", visualSource: "product_image", transition: "direct_concat", voiceover: "姐妹们真的快冲！", prompt: "" },
      ],
    },
  ],
  en: [
    {
      id: "tpl-pain",
      name: "Pain-Point Hook · Golden 3 Seconds",
      styleType: "pain_point",
      styleLabel: "Pain-point",
      description: "Open with a sharp pain point in the first 3 seconds to grab attention, amplify the relatable scenario, present the product as the fix, then close with a limited-time offer. The most universal selling structure.",
      totalDuration: 28,
      shots: [
        { shotId: 1, type: "hook", duration: 3, description: "First-person quick cut-in, posing a sharp pain-point question", camera: "Handheld follow", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "Are you fed up with ___ too?", prompt: "" },
        { shotId: 2, type: "pain_point", duration: 5, description: "Amplify the before-use pain scenario for resonance", camera: "Close-up", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "Every time ___ — it's so frustrating", prompt: "" },
        { shotId: 3, type: "product_reveal", duration: 4, description: "Product enters, slow push-in on the packaging", camera: "Slow push-in", visualSource: "product_image", transition: "ai_start_end", voiceover: "Until I started using this", prompt: "" },
        { shotId: 4, type: "demo", duration: 8, description: "Real demo of the key selling point and results", camera: "Medium shot", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "Look — ___, totally solved", prompt: "" },
        { shotId: 5, type: "cta", duration: 3, description: "Product + price + cart, drive the order", camera: "Static", visualSource: "product_image", transition: "direct_concat", voiceover: "Limited-time deal — grab it now!", prompt: "" },
      ],
    },
    {
      id: "tpl-compare",
      name: "Comparison Review · Side-by-side",
      styleType: "comparison",
      styleLabel: "Comparison",
      description: "Compare several options side by side, use real tests to highlight this product's edge, then back it with sales and reviews. Ideal for rational, research-heavy categories.",
      totalDuration: 30,
      shots: [
        { shotId: 1, type: "hook", duration: 3, description: "Several products side by side, teasing the review", camera: "Top-down wide", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "Spent ___ testing 5 of them to tell you which is worth it", prompt: "" },
        { shotId: 2, type: "demo", duration: 9, description: "Compare the key metrics one by one", camera: "Close-up compare", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "The first one flops… this one's actually good?", prompt: "" },
        { shotId: 3, type: "product_reveal", duration: 4, description: "Our pick wins, close-up reveal", camera: "Push-in", visualSource: "product_image", transition: "ai_start_end", voiceover: "And the winner is this one", prompt: "" },
        { shotId: 4, type: "social_proof", duration: 6, description: "Sales data and review endorsement", camera: "Static", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "100k+ sold a month, 99% positive reviews", prompt: "" },
        { shotId: 5, type: "cta", duration: 3, description: "Order prompt and free-gift info", camera: "Static", visualSource: "product_image", transition: "direct_concat", voiceover: "Link's in the cart — order today and get a free gift", prompt: "" },
      ],
    },
    {
      id: "tpl-story",
      name: "Story · Immersive Scene",
      styleType: "story",
      styleLabel: "Story",
      description: "Wrap the product in a relatable little story — emotion first, selling points woven in naturally. Great for beauty, food, and other emotional categories.",
      totalDuration: 26,
      shots: [
        { shotId: 1, type: "hook", duration: 3, description: "Lead appears, a suspenseful opening", camera: "Front medium", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "Something super awkward happened that day", prompt: "" },
        { shotId: 2, type: "pain_point", duration: 5, description: "The awkward/pain moment in the story", camera: "Close-up", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "I just wanted the ground to swallow me up", prompt: "" },
        { shotId: 3, type: "product_reveal", duration: 3, description: "The product appears as the turning point", camera: "Close-up", visualSource: "product_image", transition: "ai_start_end", voiceover: "Good thing I had this in my bag", prompt: "" },
        { shotId: 4, type: "demo", duration: 7, description: "After use, the story turns and results show", camera: "Medium shot", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "After using it, I felt so confident", prompt: "" },
        { shotId: 5, type: "cta", duration: 3, description: "Closing recommendation and order prompt", camera: "Static", visualSource: "product_image", transition: "direct_concat", voiceover: "Go for it — you won't regret it!", prompt: "" },
      ],
    },
  ],
};

// Homepage "Example Showcase": a complete viewable sample (script structure + pre-composed demo clip)
export interface ExampleShowcase {
  id: string;
  title: string;
  productName: string;
  category: string;
  styleLabel: string;
  totalDuration: number;
  resolution: string;
  aspectRatio: string;
  cover: string; // Cover image
  videoUrl: string; // Bundled demo clip
  shots: Shot[];
}

const exampleShowcaseByLocale: Record<Locale, ExampleShowcase> = {
  zh: {
    id: "showcase-tissue",
    title: "云柔加厚抽纸·痛点种草",
    productName: "云柔加厚抽纸",
    category: "家居日用",
    styleLabel: "痛点种草",
    totalDuration: 17,
    resolution: "1080p",
    aspectRatio: "9:16",
    cover: "/examples/tissue.png",
    videoUrl: "/examples/sample-tissue.mp4",
    shots: [
      { shotId: 1, type: "hook", duration: 4, description: "客厅场景纸巾盒特写，缓慢推进", camera: "缓慢推进", visualSource: "product_image", transition: "ai_start_end", voiceover: "你还在用一擦就破的纸巾？", prompt: "" },
      { shotId: 2, type: "demo", duration: 5, description: "纸巾吸水演示，湿水不破", camera: "俯拍特写", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "加厚 3 层，湿水都不破", prompt: "" },
      { shotId: 3, type: "product_reveal", duration: 4, description: "纸巾质感微距特写", camera: "微距推进", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "原生木浆，亲肤不掉屑", prompt: "" },
      { shotId: 4, type: "cta", duration: 4, description: "温馨家庭使用场景", camera: "固定", visualSource: "product_image", transition: "direct_concat", voiceover: "整箱囤更划算，赶紧抢！", prompt: "" },
    ],
  },
  en: {
    id: "showcase-tissue",
    title: "Soft Thick Tissue · Pain-Point Hook",
    productName: "Soft Thick Facial Tissue",
    category: "Home",
    styleLabel: "Pain-point",
    totalDuration: 17,
    resolution: "1080p",
    aspectRatio: "9:16",
    cover: "/examples/tissue.png",
    videoUrl: "/examples/sample-tissue.mp4",
    shots: [
      { shotId: 1, type: "hook", duration: 4, description: "Living-room close-up of the tissue box, slow push-in", camera: "Slow push-in", visualSource: "product_image", transition: "ai_start_end", voiceover: "Still using tissues that tear at one wipe?", prompt: "" },
      { shotId: 2, type: "demo", duration: 5, description: "Water-absorption demo — won't tear when wet", camera: "Top-down close-up", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "Thick 3-ply — won't tear even when wet", prompt: "" },
      { shotId: 3, type: "product_reveal", duration: 4, description: "Macro close-up of the tissue texture", camera: "Macro push-in", visualSource: "ai_generate", transition: "ai_start_end", voiceover: "Virgin wood pulp — gentle, no lint", prompt: "" },
      { shotId: 4, type: "cta", duration: 4, description: "Warm family use scene", camera: "Static", visualSource: "product_image", transition: "direct_concat", voiceover: "Buy by the case for the best value — grab it!", prompt: "" },
    ],
  },
};

// ===== Accessors (by UI locale; falls back to Chinese if locale is missing) =====
export function getExampleProducts(locale: Locale): ExampleProduct[] {
  return exampleProductsByLocale[locale] ?? exampleProductsByLocale.zh;
}
export function getExampleTemplates(locale: Locale): ExampleTemplate[] {
  return exampleTemplatesByLocale[locale] ?? exampleTemplatesByLocale.zh;
}
export function getExampleShowcase(locale: Locale): ExampleShowcase {
  return exampleShowcaseByLocale[locale] ?? exampleShowcaseByLocale.zh;
}

// Backward compatibility: default to Chinese (legacy callers that don't pass a locale still work)
export const exampleProducts = exampleProductsByLocale.zh;
export const exampleTemplates = exampleTemplatesByLocale.zh;
export const exampleShowcase = exampleShowcaseByLocale.zh;
