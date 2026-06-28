/**
 * 发布前「限流自检」体检 —— 出片前对脚本做一次有据可循的逐项检查（违禁词 / 钩子 / 时长 /
 * 字幕可读性 / 行动号召 / 带货三段式 / AIGC 标签），每项给 ✓⚠✗ + 具体可操作改法。
 *
 * 刻意不打「73 分」这种假精确分数：带货能不能爆受太多外部因素影响，谎报一个数字是误导。
 * 这里只做「有据可循、能照着改」的体检项。纯函数、可单测；UI 在脚本页展示。
 */
import { checkScriptCompliance } from "./ad-compliance";
import type { Shot } from "./db/schema";

export type CheckStatus = "pass" | "warn" | "fail";
export type CheckKey = "compliance" | "hook" | "duration" | "caption" | "cta" | "structure" | "aigc";

export interface ReadinessItem {
  key: CheckKey;
  status: CheckStatus;
  message: string;
}

export interface ReadinessReport {
  items: ReadinessItem[];
  pass: number;
  warn: number;
  fail: number;
  /** 整体就绪度：有 fail=needsWork（建议改），仅 warn=risky（有风险），全 pass=ready */
  overall: "ready" | "risky" | "needsWork";
}

export interface ReadinessOptions {
  /** 是否会烧录 AIGC 合规标签；undefined 表示不检该项 */
  aigcLabel?: boolean;
  locale?: "zh" | "en";
}

// 带货时长甜区（秒）：太短信息不足促单，太长完播率掉
const DUR_MIN = 15;
const DUR_SWEET_HI = 45;
const DUR_MAX = 60;
// 开场钩子：黄金 3 秒，留 1s 余量到 4s 才告警
const HOOK_MAX_SEC = 4;
// 字幕可读速度上限（CJK 字/秒），超了读不完
const READ_CPS = 9;

// 钩子信号：疑问 / 数字 / 痛点 / 反差，任一即算「有钩子」
const HOOK_SIGNAL = /[?？!！]|\d|别再|还在|总是|为什么|怎么|居然|竟然|没想到|原来|你知道|千万别|后悔|踩雷|谁懂|绝了/;
// 行动号召信号
const CTA_SIGNAL = /小黄车|下方|点击|购买|带走|链接|加购|抢|下单|橱窗|入手|戳|领|tap|link|buy|shop|cart|grab/i;

const cjkLen = (s: string) => Array.from((s || "").replace(/\s+/g, "")).length;

export function checkPublishReadiness(
  shots: Shot[],
  totalDuration: number,
  opts: ReadinessOptions = {}
): ReadinessReport {
  const en = opts.locale === "en";
  const items: ReadinessItem[] = [];
  const push = (key: CheckKey, status: CheckStatus, message: string) => items.push({ key, status, message });

  // 1) 广告法 / 违禁词
  const violations = checkScriptCompliance(shots);
  if (violations.length === 0) {
    push("compliance", "pass", en ? "No ad-law risk words" : "无广告法风险词");
  } else {
    const words = [...new Set(violations.map((v) => v.term))].slice(0, 5).join(" / ");
    push(
      "compliance",
      "fail",
      en
        ? `${violations.length} ad-law risk word(s) (${words}) — platforms throttle absolute/false-efficacy claims; fix before publishing`
        : `${violations.length} 处广告法风险词（${words}）——平台对绝对化/虚假功效易限流，建议先改`
    );
  }

  // 2) 开场钩子
  const hook = shots.find((s) => s.type === "hook") ?? shots[0];
  if (!hook || !(hook.voiceover || "").trim()) {
    push("hook", "fail", en ? "Missing opening hook (shot 1 should be a hook with voiceover)" : "缺开场钩子（第 1 镜应是 hook，且要有口播）");
  } else if (hook.duration > HOOK_MAX_SEC) {
    push("hook", "warn", en ? `Opening hook is ${hook.duration}s — grab attention within the first 3s` : `开场钩子 ${hook.duration}s 偏长——黄金 3 秒内要抓住人`);
  } else if (!HOOK_SIGNAL.test(hook.voiceover)) {
    push("hook", "warn", en ? "Opening hook is flat — add a question / pain-point / number" : "开场钩子偏平——加个疑问 / 痛点 / 数字会更抓人");
  } else {
    push("hook", "pass", en ? "Opening hook is short and punchy" : "开场钩子够短够冲");
  }

  // 3) 时长甜区
  const d = Math.round(totalDuration);
  if (d < DUR_MIN) {
    push("duration", "warn", en ? `Total ${d}s is short — may not be enough to drive a purchase` : `总时长 ${d}s 偏短——信息可能不足以促单`);
  } else if (d > DUR_MAX) {
    push("duration", "warn", en ? `Total ${d}s is long — completion rate drops; e-commerce sweet spot ~21–45s` : `总时长 ${d}s 偏长——完播率易掉，带货甜区约 21–45s`);
  } else {
    const note = d > DUR_SWEET_HI ? (en ? " (upper edge)" : "（偏上限）") : "";
    push("duration", "pass", en ? `Total ${d}s is in the e-commerce sweet spot${note}` : `总时长 ${d}s 在带货甜区${note}`);
  }

  // 4) 字幕可读性：逐镜口播字数 / 时长，超阅读速度即过密
  const dense = shots
    .filter((s) => s.duration > 0 && cjkLen(s.voiceover) / s.duration > READ_CPS)
    .map((s) => s.shotId);
  if (dense.length === 0) {
    push("caption", "pass", en ? "Subtitle pacing is readable" : "字幕节奏可读");
  } else {
    push(
      "caption",
      "warn",
      en
        ? `Shot(s) ${dense.join(", ")} have too-dense subtitles to read — trim copy or add time`
        : `第 ${dense.join("、")} 镜字幕过密、读不完——精简文案或加时长`
    );
  }

  // 5) 行动号召
  const hasCtaShot = shots.some((s) => s.type === "cta");
  const hasCtaWords = shots.some((s) => CTA_SIGNAL.test(s.voiceover || "") || CTA_SIGNAL.test(s.textOverlay?.text || ""));
  if (hasCtaShot || hasCtaWords) {
    push("cta", "pass", en ? "Has a clear call to action" : "有明确行动号召");
  } else {
    push("cta", "warn", en ? "No clear call to action (e.g. 'tap the cart below') — hurts conversion" : "缺明确行动号召（如「点下方小黄车」）——转化会打折");
  }

  // 6) 带货三段式：钩子 → 展示/演示 → 号召
  const types = new Set(shots.map((s) => s.type));
  const missing: string[] = [];
  if (!types.has("hook")) missing.push(en ? "hook" : "钩子");
  if (!types.has("product_reveal") && !types.has("demo")) missing.push(en ? "reveal/demo" : "展示/演示");
  if (!types.has("cta")) missing.push(en ? "CTA" : "号召");
  if (missing.length === 0) {
    push("structure", "pass", en ? "Complete hook → reveal → CTA structure" : "带货三段式完整");
  } else {
    push(
      "structure",
      "warn",
      en
        ? `Missing "${missing.join(", ")}" — the e-commerce structure is hook → reveal/demo → CTA`
        : `结构缺「${missing.join("、")}」——带货三段式：钩子 → 展示/演示 → 号召`
    );
  }

  // 7) AIGC 合规标签（仅在调用方告知开关状态时检）
  if (opts.aigcLabel === true) {
    push("aigc", "pass", en ? "AIGC compliance label is on" : "已开 AIGC 合规标签");
  } else if (opts.aigcLabel === false) {
    push("aigc", "warn", en ? "AIGC label is off — platforms may down-rank unlabeled AI content" : "未开 AIGC 合规标签——平台对未标注 AI 内容可能降权");
  }

  const pass = items.filter((i) => i.status === "pass").length;
  const warn = items.filter((i) => i.status === "warn").length;
  const fail = items.filter((i) => i.status === "fail").length;
  const overall = fail > 0 ? "needsWork" : warn > 0 ? "risky" : "ready";
  return { items, pass, warn, fail, overall };
}
