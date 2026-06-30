/**
 * Ad-law compliance check for e-commerce scripts — scans already-generated script copy for terms
 * that may violate China's Advertising Law. The script engine prompt only asks the LLM to avoid
 * them, but the LLM still misses some; this provides a safety-net check on the actual output
 * before rendering. Hits surface a warning + revision suggestion (not a hard block — user decides).
 * Pure function, unit-testable, zero external keys, decoupled from the compose pipeline.
 */

export type AdViolationCategory = "绝对化用语" | "医疗/虚假功效" | "需认证宣称";

export interface AdViolation {
  term: string;
  category: AdViolationCategory;
  severity: "high" | "med";
  suggestion: string;
}

interface Rule {
  terms: string[];
  category: AdViolationCategory;
  severity: "high" | "med";
  suggestion: string;
}

// Conservative term selection — only include terms that are almost certainly illegal in an e-commerce context, to minimize false positives (this is a warning tool, not a hard block).
const RULES: Rule[] = [
  {
    // Advertising Law Article 9: prohibits absolute superlatives such as "national level", "highest grade", "best"
    terms: [
      "最佳", "最好", "最优", "最强", "最高级", "国家级", "世界级", "顶级", "顶尖", "极致",
      "100%", "百分百", "绝对", "万能", "史上最", "无敌", "销量第一", "全网第一", "排名第一",
      "行业第一", "独一无二", "领导品牌", "王牌", "首选品牌",
    ],
    category: "绝对化用语",
    severity: "high",
    suggestion: "《广告法》第9条禁用绝对化用语，改为「之一 / 较 / 更 / 深受喜爱」等相对表述",
  },
  {
    // Ordinary goods must not claim medical, therapeutic, or curative effects
    terms: [
      "根治", "包治", "治愈", "药到病除", "立竿见影", "三天见效", "七天见效", "永不复发",
      "彻底根除", "疗效", "抗癌", "消炎", "杀菌", "处方药", "药妆", "医学级", "医疗级", "特效药",
    ],
    category: "医疗/虚假功效",
    severity: "high",
    suggestion: "普通商品不得宣称医疗 / 治疗 / 根治等功效，删除或改为真实体验描述",
  },
  {
    // "Pure natural / organic / additive-free" claims require authoritative certification
    terms: ["纯天然", "零添加", "无添加", "有机食品", "100%天然"],
    category: "需认证宣称",
    severity: "med",
    suggestion: "「纯天然 / 有机 / 零添加」需权威认证或检测依据，无依据请删除",
  },
];

/** Scans a text string and returns matched ad-law risk terms (deduplicated by term, high-severity first). */
export function checkAdCompliance(text: string): AdViolation[] {
  const clean = String(text || "");
  if (!clean) return [];
  const seen = new Set<string>();
  const out: AdViolation[] = [];
  for (const rule of RULES) {
    for (const term of rule.terms) {
      if (!seen.has(term) && clean.includes(term)) {
        seen.add(term);
        out.push({ term, category: rule.category, severity: rule.severity, suggestion: rule.suggestion });
      }
    }
  }
  // Remove shorter terms that are substrings of a longer matched term (e.g. "100%" subsumed by "100%天然") to avoid duplicate or contradictory hints for the same text span
  const terms = out.map((v) => v.term);
  const deduped = out.filter((v) => !terms.some((t) => t !== v.term && t.includes(v.term)));
  return deduped.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
}

/** Scans all shots in a script (voiceover + text overlays) and returns deduplicated risk terms. */
export function checkScriptCompliance(shots: Array<{ voiceover?: string; textOverlay?: { text?: string } | null }>): AdViolation[] {
  const text = (shots || [])
    .flatMap((s) => [s.voiceover || "", s.textOverlay?.text || ""])
    .join(" \n ");
  return checkAdCompliance(text);
}
