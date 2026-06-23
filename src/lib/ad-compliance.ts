/**
 * 带货脚本广告法合规检查 —— 对「已生成」的脚本文案做规则扫描，标出可能违反《广告法》的风险词。
 * 脚本引擎的 prompt 只是「叮嘱 LLM 避免」，但 LLM 仍会漏；这里在出片前对实际产物做兜底校验，
 * 命中即给用户警示 + 修改建议（不强制拦截，由用户决定）。纯函数、可单测、零 Key、与合成管线解耦。
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

// 保守取词，尽量只收「在带货语境下几乎必然违规」的词，减少误报（这是警示工具、非硬拦截）。
const RULES: Rule[] = [
  {
    // 《广告法》第 9 条：禁用国家级、最高级、最佳等绝对化用语
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
    // 普通商品不得宣称医疗、治疗、根治等功效
    terms: [
      "根治", "包治", "治愈", "药到病除", "立竿见影", "三天见效", "七天见效", "永不复发",
      "彻底根除", "疗效", "抗癌", "消炎", "杀菌", "处方药", "药妆", "医学级", "医疗级", "特效药",
    ],
    category: "医疗/虚假功效",
    severity: "high",
    suggestion: "普通商品不得宣称医疗 / 治疗 / 根治等功效，删除或改为真实体验描述",
  },
  {
    // 无认证不得宣称纯天然 / 有机 / 零添加
    terms: ["纯天然", "零添加", "无添加", "有机食品", "100%天然"],
    category: "需认证宣称",
    severity: "med",
    suggestion: "「纯天然 / 有机 / 零添加」需权威认证或检测依据，无依据请删除",
  },
];

/** 扫描一段文本，返回命中的广告法风险词（按 term 去重、high 在前）。 */
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
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
}

/** 扫描整条脚本的所有分镜（旁白 + 文字贴片），汇总去重后的风险词。 */
export function checkScriptCompliance(shots: Array<{ voiceover?: string; textOverlay?: { text?: string } | null }>): AdViolation[] {
  const text = (shots || [])
    .flatMap((s) => [s.voiceover || "", s.textOverlay?.text || ""])
    .join(" \n ");
  return checkAdCompliance(text);
}
