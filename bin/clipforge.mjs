#!/usr/bin/env node
/**
 * ClipForge CLI —— 命令行一句话出片：给一个主题，自动写脚本、配画面、配音、合成成片。
 *
 * 是 ClipForge HTTP API 的薄封装（与 mcp/clipforge-mcp.mjs 同一套编排：DB / FFmpeg / 免费 TTS / 免费素材），
 * 零第三方依赖、纯 Node。需先启动实例（pnpm dev / pnpm start）。素材+配音全程免 Key，只有写脚本要一个 LLM Key。
 *
 * 用法：
 *   node bin/clipforge.mjs create --topic "在家手冲咖啡" [--duration 25] [--style knowledge]
 *        [--footage auto|image|video] [--voice <id>] [--aspect 9:16|16:9|1:1]
 *        [--quality fast|standard|hd] [--bgm] [--bgm-mood upbeat] [--karaoke] [--cta "👇 点击下方下单"] [--json]
 *   node bin/clipforge.mjs compose --project <id> [上述同款成片选项]   为已有脚本+素材的项目出片
 *   node bin/clipforge.mjs list                     列出项目
 *   node bin/clipforge.mjs voices                   列出免费音色
 *   node bin/clipforge.mjs get --project <id>       查最新成片地址
 *   node bin/clipforge.mjs --help | --version
 *
 * 环境变量（与 MCP 一致）：
 *   CLIPFORGE_BASE_URL（默认 http://localhost:3000）
 *   CLIPFORGE_LLM_BASE_URL / CLIPFORGE_LLM_API_KEY / CLIPFORGE_LLM_MODEL（create 必需，OpenAI 兼容）
 *   CLIPFORGE_PEXELS_KEY / CLIPFORGE_PIXABAY_KEY（可选，补充付费高质量视频源）
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const BASE_URL = (process.env.CLIPFORGE_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const LLM = {
  baseUrl: process.env.CLIPFORGE_LLM_BASE_URL || "",
  apiKey: process.env.CLIPFORGE_LLM_API_KEY || "",
  model: process.env.CLIPFORGE_LLM_MODEL || "",
};
const STOCK_KEYS = {};
if (process.env.CLIPFORGE_PIXABAY_KEY) STOCK_KEYS.pixabay = process.env.CLIPFORGE_PIXABAY_KEY;
if (process.env.CLIPFORGE_PEXELS_KEY) STOCK_KEYS.pexels = process.env.CLIPFORGE_PEXELS_KEY;

const NARRATION_STYLES = ["knowledge", "story", "lifestyle", "inspiration", "travel"];
const FOOTAGE_KINDS = ["auto", "image", "video"];
const ASPECT_RATIOS = ["9:16", "16:9", "1:1"];
const QUALITY_PRESETS = ["fast", "standard", "hd"];
const BGM_MOODS = ["upbeat", "chill", "energetic", "emotional"];

/** 读自身 package 版本（bin/ 上一级即仓库根） */
function readVersion() {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * 极简 argv 解析（零依赖）：首个非 --flag 词作为子命令；--key value 取值，--flag 置 true。
 * 导出便于单测（见 __tests__）。
 */
export function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok.startsWith("--")) {
      const eqBody = tok.slice(2);
      const eq = eqBody.indexOf("=");
      if (eq !== -1) {
        out.flags[eqBody.slice(0, eq)] = eqBody.slice(eq + 1); // --key=value 写法
        continue;
      }
      const key = eqBody;
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        out.flags[key] = true; // 布尔开关
      } else {
        out.flags[key] = next;
        i++;
      }
    } else {
      out._.push(tok);
    }
  }
  return out;
}

/** 由 flags 拼 compose 请求体（与 MCP composeBody 同义，命令行风格入参） */
export function composeBodyFromFlags(flags) {
  const body = { freeTts: { enabled: true } };
  if (typeof flags.voice === "string") body.freeTts.voice = flags.voice;
  if (ASPECT_RATIOS.includes(flags.aspect)) body.aspectRatio = flags.aspect;
  if (QUALITY_PRESETS.includes(flags.quality)) body.renderPreset = flags.quality;
  if (flags.bgm === true) body.freeBgm = true;
  if (BGM_MOODS.includes(flags["bgm-mood"])) body.bgmMood = flags["bgm-mood"];
  if (flags["bgm-duck"] === true) body.bgmDuck = true;
  if (flags.karaoke === true) body.karaoke = true;
  if (flags["product-card"] === true) body.productCard = true;
  if (flags["ai-disclosure"] === true) body.aiDisclosure = true;
  if (typeof flags.cta === "string" && flags.cta.trim()) body.ctaText = flags.cta.trim();
  return body;
}

/** 按主题书写系统挑默认免费音色（与 MCP defaultVoiceForTopic 同逻辑），null=用服务端中文默认 */
export function defaultVoiceForTopic(topic) {
  const t = String(topic || "");
  if (/[぀-ヿ]/.test(t)) return "ja-JP-NanamiNeural";
  if (/[가-힯]/.test(t)) return "ko-KR-SunHiNeural";
  if (/[一-鿿]/.test(t)) return null;
  return "en-US-AriaNeural";
}

/** 调 ClipForge HTTP API；非 2xx 抛带后端 error 文案的异常 */
async function api(path, { method = "GET", body, timeoutMs = 600000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res, text;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    text = await res.text();
  } catch (e) {
    if (e?.name === "AbortError") throw new Error(`请求超时：${path}`);
    throw new Error(`连不上 ClipForge（${BASE_URL}）。请先启动实例：pnpm dev 或 pnpm start。原始错误：${e?.message || e}`);
  } finally {
    clearTimeout(timer);
  }
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) throw new Error(data?.error || data?.raw || `HTTP ${res.status}`);
  return data;
}

/** 轮询合成结果直到 done/failed */
async function pollCompose(projectId, { timeoutMs = 300000, intervalMs = 2500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { composition } = await api(`/api/project/${projectId}/compose`);
    const status = composition?.status;
    if (status === "done") return composition;
    if (status === "failed") throw new Error("合成失败（FFmpeg/TTS 出错），请检查素材与脚本");
    if (Date.now() > deadline) throw new Error("合成超时，可稍后用 `get --project` 再查");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

const absVideoUrl = (c) => (c?.url ? `${BASE_URL}${c.url}` : null);
/** 进度走 stderr（stdout 留给最终结果，便于脚本管道取 videoUrl） */
const step = (m) => process.stderr.write(`· ${m}\n`);

function requireLlm() {
  if (!LLM.baseUrl || !LLM.apiKey || !LLM.model) {
    throw new Error(
      "create 需要 LLM。请设置环境变量 CLIPFORGE_LLM_BASE_URL、CLIPFORGE_LLM_API_KEY、CLIPFORGE_LLM_MODEL（OpenAI 兼容，如 Atlas Cloud / DeepSeek / OpenRouter）。",
    );
  }
}

async function cmdCreate(flags) {
  requireLlm();
  const topic = String(flags.topic || "").trim();
  if (topic.length < 2) throw new Error("--topic 太短，请给一句完整主题，如 --topic \"在家手冲咖啡\"");
  const narrationStyle = NARRATION_STYLES.includes(flags.style) ? flags.style : "knowledge";
  const targetDuration = Number.isFinite(Number(flags.duration)) && flags.duration ? Number(flags.duration) : 25;
  const mediaType = FOOTAGE_KINDS.includes(flags.footage) ? flags.footage : "auto";

  step(`写脚本：「${topic}」（${narrationStyle} · ${targetDuration}s）`);
  const scriptRes = await api("/api/topic/script", {
    method: "POST",
    body: { topic, narrationStyle, targetDuration, llmConfig: LLM },
  });
  const projectId = scriptRes.projectId;
  const shots = scriptRes?.scripts?.[0]?.shots ?? [];
  step(`脚本完成：${shots.length} 个分镜 · 项目 ${projectId}`);

  step(`配画面（${mediaType}，免费素材库）…`);
  const fill = await api(`/api/project/${projectId}/stock-fill`, {
    method: "POST",
    body: { source: "all", mediaType, apiKeys: STOCK_KEYS },
  });
  if (!fill.filled) {
    throw new Error(
      `免费素材库没给「${topic}」配到画面，无法合成。换个更常见/具体的主题，或设置 CLIPFORGE_PEXELS_KEY 后重试。`,
    );
  }
  step(`画面就绪：${fill.filled}/${fill.total}`);

  const body = composeBodyFromFlags(flags);
  if (!body.freeTts.voice) {
    const v = defaultVoiceForTopic(topic);
    if (v) body.freeTts.voice = v;
  }
  const usedVoice = body.freeTts.voice || "zh-CN-XiaoxiaoNeural";
  step(`合成中（Edge TTS 配音 · 音色 ${usedVoice}）…`);
  await api(`/api/project/${projectId}/compose`, { method: "POST", body });
  const composition = await pollCompose(projectId);

  return {
    ok: true,
    projectId,
    topic,
    voice: usedVoice,
    aspectRatio: ASPECT_RATIOS.includes(flags.aspect) ? flags.aspect : "9:16",
    shots: shots.length,
    footageFilled: `${fill.filled}/${fill.total}`,
    videoUrl: absVideoUrl(composition),
    status: composition.status,
  };
}

async function cmdCompose(flags) {
  const projectId = String(flags.project || "").trim();
  if (!projectId) throw new Error("--project 不能为空");
  if (flags["no-fill"] !== true) {
    step("自动配缺失画面…");
    await api(`/api/project/${projectId}/stock-fill`, {
      method: "POST",
      body: { source: "all", mediaType: FOOTAGE_KINDS.includes(flags.footage) ? flags.footage : "auto", apiKeys: STOCK_KEYS },
    }).catch(() => {});
  }
  const body = composeBodyFromFlags(flags);
  if (!body.freeTts.voice) {
    const proj = await api(`/api/project/${projectId}`).catch(() => null);
    const v = proj?.topic ? defaultVoiceForTopic(String(proj.topic)) : null;
    if (v) body.freeTts.voice = v;
  }
  step("合成中…");
  await api(`/api/project/${projectId}/compose`, { method: "POST", body });
  const composition = await pollCompose(projectId);
  return { ok: true, projectId, voice: body.freeTts.voice || "zh-CN-XiaoxiaoNeural", videoUrl: absVideoUrl(composition), status: composition.status };
}

async function cmdList() {
  const rows = await api("/api/project");
  const projects = (Array.isArray(rows) ? rows : []).map((p) => ({ id: p.id, name: p.name, contentType: p.contentType, status: p.status }));
  return { ok: true, count: projects.length, projects };
}

async function cmdVoices() {
  const res = await api("/api/tts/free");
  return { ok: true, default: res.default, voices: res.voices ?? [] };
}

// 热点选题：拉某地区每日热搜，建议该做什么主题（再 create --topic 出片）
async function cmdTrends(flags) {
  const geo = typeof flags.geo === "string" ? flags.geo : "US";
  const res = await api(`/api/trends?geo=${encodeURIComponent(geo)}`);
  const topics = res.topics || [];
  step(`${res.geo} 热搜选题 ${topics.length} 条：`);
  topics.forEach((t, i) => process.stderr.write(`  ${i + 1}. ${t.title}${t.traffic ? ` (${t.traffic})` : ""}\n`));
  return { ok: true, geo: res.geo, count: topics.length, topics };
}

async function cmdGet(flags) {
  const projectId = String(flags.project || "").trim();
  if (!projectId) throw new Error("--project 不能为空");
  const { composition } = await api(`/api/project/${projectId}/compose`);
  if (!composition) return { ok: true, projectId, status: "none", videoUrl: null };
  return { ok: true, projectId, status: composition.status, videoUrl: absVideoUrl(composition) };
}

// 自带脚本导入：把你写好的稿子切成分镜存为当前脚本，之后用 compose 出片（配合本地素材即全自主成片）
async function cmdImport(flags) {
  const projectId = String(flags.project || "").trim();
  if (!projectId) throw new Error("--project 不能为空");
  let script = typeof flags.text === "string" ? flags.text : "";
  if (!script && flags.file) script = readFileSync(String(flags.file), "utf8");
  if (!script.trim()) throw new Error('用 --file <路径> 或 --text "你的脚本文案" 提供稿子');
  const res = await api(`/api/project/${projectId}/import-script`, {
    method: "POST",
    body: { script, title: typeof flags.title === "string" ? flags.title : undefined },
  });
  step(`已导入 ${res.shots} 个分镜（约 ${res.totalDuration}s）。下一步：clipforge compose --project ${projectId}`);
  return { ok: true, projectId, ...res };
}

// 配音译制：把当前脚本翻成目标语种存为译制版，再用推荐音色 compose 即得换语种配音版（出海）
async function cmdDub(flags) {
  requireLlm();
  const projectId = String(flags.project || "").trim();
  if (!projectId) throw new Error("--project 不能为空");
  const lang = String(flags.lang || "").trim();
  if (!lang) throw new Error('--lang 不能为空（如 --lang en）');
  const res = await api(`/api/project/${projectId}/dub`, { method: "POST", body: { targetLang: lang, llmConfig: LLM } });
  step(`已生成 ${lang} 译制脚本（${res.shots} 镜）。下一步：clipforge compose --project ${projectId} --voice ${res.recommendedVoice || "<目标语种音色>"}`);
  return { ok: true, projectId, ...res };
}

const HELP = `ClipForge CLI · 命令行一句话出片

用法：
  clipforge create --topic "在家手冲咖啡" [--duration 25] [--style knowledge]
                   [--footage auto|image|video] [--voice <id>] [--aspect 9:16|16:9|1:1]
                   [--quality fast|standard|hd] [--bgm] [--bgm-mood upbeat] [--karaoke] [--cta "..."] [--json]
  clipforge import --project <id> (--file <路径> | --text "你的脚本") [--title "..."]   自带脚本出片
  clipforge dub --project <id> --lang en                                              配音译制(换语种,出海)
  clipforge compose --project <id> [同款成片选项] [--no-fill]
  clipforge trends [--geo US]   拉热搜选题(不知道做什么时)
  clipforge list                列出项目
  clipforge voices              列出免费 Edge TTS 音色
  clipforge get --project <id>  查最新成片地址
  clipforge --help | --version

环境变量：
  CLIPFORGE_BASE_URL（默认 http://localhost:3000，需先 pnpm dev/start）
  CLIPFORGE_LLM_BASE_URL / CLIPFORGE_LLM_API_KEY / CLIPFORGE_LLM_MODEL（create 必需）
  CLIPFORGE_PEXELS_KEY / CLIPFORGE_PIXABAY_KEY（可选）

进度打印到 stderr，最终结果（含 videoUrl）打印到 stdout，便于管道取值。`;

const COMMANDS = { create: cmdCreate, import: cmdImport, dub: cmdDub, compose: cmdCompose, list: cmdList, voices: cmdVoices, get: cmdGet, trends: cmdTrends };

async function main() {
  const { _, flags } = parseArgs(process.argv.slice(2));
  if (flags.version || flags.v) {
    process.stdout.write(`${readVersion()}\n`);
    return 0;
  }
  const cmd = _[0];
  if (!cmd || flags.help || flags.h || cmd === "help") {
    process.stdout.write(HELP + "\n");
    return cmd && !COMMANDS[cmd] ? 1 : 0;
  }
  const handler = COMMANDS[cmd];
  if (!handler) {
    process.stderr.write(`未知命令：${cmd}\n\n${HELP}\n`);
    return 1;
  }
  const result = await handler(flags);
  if (flags.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    if (result.videoUrl) {
      step("完成 ✓");
      process.stdout.write(result.videoUrl + "\n");
    } else {
      process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    }
  }
  return 0;
}

// 仅作为入口运行时执行（被单测 import 时不跑）
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .then((code) => process.exit(code ?? 0))
    .catch((e) => {
      process.stderr.write(`✗ ${e?.message || e}\n`);
      process.exit(1);
    });
}
