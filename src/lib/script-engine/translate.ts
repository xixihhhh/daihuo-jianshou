/**
 * 配音译制 —— 把已生成的脚本旁白翻成另一语种，再换语种配音重新合成（出海：同一条片发不同市场）。
 *
 * 因为是「给自己生成的视频换语种」，脚本与时间轴本就已知，**无需转写**：
 * 已知旁白 → LLM 翻译 → 换语种 Edge TTS → 重新合成。画面检索词（description/stockKeywords）保持原文，
 * 让译制版沿用同样的画面，只换声音与字幕。纯 prompt/解析可单测，LLM 调用复用脚本生成同一条路径。
 */

import OpenAI from "openai";
import { FREE_TTS_VOICES } from "@/lib/edge-tts";
import { estimateDurationSec } from "@/lib/script-import";
import type { Shot } from "@/lib/db/schema";

export interface DubLLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** 目标语种 code → 人类可读名（喂给 LLM 的翻译目标） */
export const LANG_NAMES: Record<string, string> = {
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  es: "Spanish",
  zh: "Chinese (Simplified)",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  ru: "Russian",
  id: "Indonesian",
  th: "Thai",
  vi: "Vietnamese",
  ar: "Arabic",
};

export function langName(code: string): string {
  const c = (code || "").toLowerCase();
  return LANG_NAMES[c] || LANG_NAMES[c.split("-")[0]] || code;
}

/** 目标语种 → 推荐的免费 Edge 音色（取 FREE_TTS_VOICES 中 lang 前缀匹配的第一个），无则 null。纯函数。 */
export function defaultVoiceForLang(code: string): string | null {
  const c = (code || "").toLowerCase().split("-")[0];
  return FREE_TTS_VOICES.find((v) => v.lang.toLowerCase().startsWith(c))?.value ?? null;
}

/** 构造翻译 prompt：把 N 条旁白逐条翻成目标语种，要求返回等长 JSON 字符串数组。纯函数。 */
export function buildTranslatePrompt(voiceovers: string[], targetLang: string): string {
  const target = langName(targetLang);
  const numbered = voiceovers.map((v, i) => `${i + 1}. ${v}`).join("\n");
  return [
    `Translate the following ${voiceovers.length} short-video narration lines into ${target}.`,
    `Keep each line punchy and natural for spoken voiceover. Do NOT merge or split lines; keep the same order and count.`,
    `Return ONLY a JSON array of ${voiceovers.length} strings — no numbering, no markdown, no extra text.`,
    "",
    numbered,
  ].join("\n");
}

/** 从 LLM 文本解析出等长译文数组；数量不符/非法则返回 null。纯函数。 */
export function parseTranslations(text: string, expectedCount: number): string[] | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  let arr: unknown;
  try {
    arr = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(arr) || arr.length !== expectedCount) return null;
  if (!arr.every((x) => typeof x === "string")) return null;
  return arr.map((s) => (s as string).trim());
}

function createClient(cfg: DubLLMConfig): OpenAI {
  // 本地/免费端点（Ollama/Pollinations）无需真 Key，缺省给占位符（SDK 要求非空）
  return new OpenAI({ baseURL: cfg.baseUrl, apiKey: cfg.apiKey || "no-key" });
}

/** 调 LLM 把旁白批量翻成目标语种，返回等长译文数组（解析失败抛错）。 */
export async function translateVoiceovers(voiceovers: string[], targetLang: string, cfg: DubLLMConfig): Promise<string[]> {
  if (!voiceovers.length) return [];
  const client = createClient(cfg);
  const res = await client.chat.completions.create({
    model: cfg.model,
    messages: [{ role: "user", content: buildTranslatePrompt(voiceovers, targetLang) }],
    temperature: 0.3,
  });
  const text = res.choices?.[0]?.message?.content ?? "";
  const out = parseTranslations(text, voiceovers.length);
  if (!out) throw new Error("翻译结果解析失败（LLM 未返回等长 JSON 数组），可换模型或重试");
  return out;
}

/**
 * 把整段脚本翻成目标语种：逐镜替换 voiceover、按译文重估时长；
 * **保留 description/stockKeywords 等画面检索字段不变**，让译制版沿用同样画面、只换声音/字幕。
 */
export async function translateShots(shots: Shot[], targetLang: string, cfg: DubLLMConfig): Promise<Shot[]> {
  const voiceovers = shots.map((s) => s.voiceover || "");
  const translated = await translateVoiceovers(voiceovers, targetLang, cfg);
  return shots.map((s, i) => {
    const vo = translated[i] || s.voiceover;
    return { ...s, voiceover: vo, duration: estimateDurationSec(vo || s.voiceover || "") };
  });
}
