/**
 * 付费 TTS 平台预设（纯数据，前后端通用，不含任何 server-only 依赖）。
 *
 * 统一一个「平台」下拉切换：OpenAI 兼容 / Atlas Cloud / MiniMax / fal.ai。
 * Atlas、fal 的 Key 复用「AI 平台」tab 已填的同名 provider Key；MiniMax 单独填 Key（+可选 GroupId）。
 * 每个平台预置默认 baseUrl/模型/音色，UI 据此条件渲染字段、做音色建议。
 */

export type TTSProvider = "openai" | "atlas" | "minimax" | "falai";

export interface TTSVoiceOption {
  value: string;
  label: string;
}

export interface TTSProviderMeta {
  value: TTSProvider;
  label: string;
  /** 该平台 TTS 端点的默认 baseUrl */
  baseUrl: string;
  /** 默认模型 id */
  defaultModel: string;
  /** 可选模型（为空表示自由输入，如 OpenAI 兼容） */
  models: TTSVoiceOption[];
  /** 默认音色 id */
  defaultVoice: string;
  /** 音色建议列表 */
  voices: TTSVoiceOption[];
  /**
   * Key 来源：
   * - "tts"：用 TTS 配置自带的 apiKey（OpenAI 兼容 / MiniMax）
   * - 其它：复用「AI 平台」store 里对应 provider 的 apiKey（atlas-cloud / fal-ai）
   */
  keySource: "tts" | "atlas-cloud" | "fal-ai";
  /** 是否需要 GroupId（MiniMax 国内端点 api.minimax.chat 需要） */
  needsGroupId?: boolean;
  /** 是否暴露 baseUrl 输入（OpenAI 兼容、MiniMax 可切区域端点） */
  editableBaseUrl?: boolean;
  /** 配置提示 */
  hint?: string;
}

/** OpenAI 兼容快捷预设（点一下填好 baseUrl + 模型 + 音色） */
export const OPENAI_TTS_PRESETS = [
  { label: "硅基流动 CosyVoice", baseUrl: "https://api.siliconflow.cn/v1", model: "FunAudioLLM/CosyVoice2-0.5B", voice: "FunAudioLLM/CosyVoice2-0.5B:alex" },
  { label: "OpenAI tts-1", baseUrl: "https://api.openai.com/v1", model: "tts-1", voice: "alloy" },
  { label: "火山方舟", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", model: "doubao-tts", voice: "zh_female_cancan" },
];

export const TTS_PROVIDERS: TTSProviderMeta[] = [
  {
    value: "openai",
    label: "OpenAI 兼容 (/audio/speech)",
    baseUrl: "https://api.siliconflow.cn/v1",
    defaultModel: "FunAudioLLM/CosyVoice2-0.5B",
    models: [],
    defaultVoice: "FunAudioLLM/CosyVoice2-0.5B:alex",
    voices: [],
    keySource: "tts",
    editableBaseUrl: true,
    hint: "兼容 OpenAI tts-1、硅基流动 CosyVoice、火山方舟等所有 /audio/speech 端点。",
  },
  {
    value: "atlas",
    label: "Atlas Cloud (xAI TTS)",
    baseUrl: "https://api.atlascloud.ai/api/v1",
    defaultModel: "xai/tts-v1",
    models: [{ value: "xai/tts-v1", label: "xAI TTS v1（多语高保真）" }],
    defaultVoice: "eve",
    voices: [
      { value: "eve", label: "Eve · 多语女声（默认）" },
      { value: "leo", label: "Leo · 多语男声" },
      { value: "rex", label: "Rex · 多语男声" },
      { value: "ara", label: "Ara · 多语女声" },
      { value: "sal", label: "Sal · 多语男声" },
    ],
    keySource: "atlas-cloud",
    hint: "复用「AI 平台」里 Atlas Cloud 的 Key（与生图/生视频同一个）。",
  },
  {
    value: "minimax",
    label: "MiniMax 海螺 (T2A v2)",
    baseUrl: "https://api.minimax.chat/v1",
    defaultModel: "speech-2.6-hd",
    models: [
      { value: "speech-2.6-hd", label: "speech-2.6-hd（高保真）" },
      { value: "speech-2.6-turbo", label: "speech-2.6-turbo（快速）" },
      { value: "speech-2.5-hd", label: "speech-2.5-hd" },
    ],
    defaultVoice: "female-tianmei",
    voices: [
      { value: "female-tianmei", label: "甜美女声（默认）" },
      { value: "female-shaonv", label: "少女音" },
      { value: "female-yujie", label: "御姐音" },
      { value: "female-chengshu", label: "成熟女声" },
      { value: "presenter_female", label: "女主持人" },
      { value: "presenter_male", label: "男主持人" },
      { value: "male-qn-qingse", label: "青涩青年（男）" },
      { value: "male-qn-jingying", label: "精英青年（男）" },
      { value: "audiobook_female_1", label: "有声书女声" },
    ],
    keySource: "tts",
    needsGroupId: true,
    editableBaseUrl: true,
    hint: "海螺开放平台的 API Key + GroupId。国际版改 baseUrl 为 https://api.minimax.io/v1（可不填 GroupId）。",
  },
  {
    value: "falai",
    label: "fal.ai (MiniMax Speech-02)",
    baseUrl: "https://queue.fal.run",
    defaultModel: "fal-ai/minimax/speech-02-hd",
    models: [
      { value: "fal-ai/minimax/speech-02-hd", label: "MiniMax Speech-02 HD" },
      { value: "fal-ai/minimax/speech-02-turbo", label: "MiniMax Speech-02 Turbo" },
    ],
    defaultVoice: "Wise_Woman",
    voices: [
      { value: "Wise_Woman", label: "睿智女声（默认）" },
      { value: "Calm_Woman", label: "沉稳女声" },
      { value: "Lively_Girl", label: "活力女声" },
      { value: "Sweet_Girl_2", label: "甜美女声" },
      { value: "Friendly_Person", label: "亲和声线" },
      { value: "Deep_Voice_Man", label: "低沉男声" },
      { value: "Casual_Guy", label: "随性男声" },
      { value: "Patient_Man", label: "沉稳男声" },
    ],
    keySource: "fal-ai",
    hint: "复用「AI 平台」里 fal.ai 的 Key（FAL_KEY）。",
  },
];

export const DEFAULT_TTS_PROVIDER: TTSProvider = "openai";

/** 取平台元信息（容错：未知/旧配置回退到 openai） */
export function getTTSProviderMeta(provider?: string | null): TTSProviderMeta {
  return TTS_PROVIDERS.find((p) => p.value === provider) ?? TTS_PROVIDERS[0];
}

/** 解析 TTS 配置时所需的最小输入形状（避免与 store 类型循环依赖） */
interface TTSSettingLike {
  enabled?: boolean;
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  voice?: string;
  speed?: number;
  groupId?: string;
}
type ProvidersLike = Record<string, { apiKey?: string; baseUrl?: string } | undefined>;

/** 解析后用于实际请求 / 试听的完整 TTS 配置 */
export interface ResolvedTTSConfig {
  provider: TTSProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  voice: string;
  speed?: number;
  groupId?: string;
}

/**
 * 把「平台选择 + 复用的 AI 平台 Key」解析成一份可直接发给后端的完整 TTS 配置。
 * Atlas/fal 的 Key 从 providers store 取；OpenAI 兼容/MiniMax 用 TTS 自带 Key。
 */
export function resolveTTSConfig(tts: TTSSettingLike | undefined, providers: ProvidersLike): ResolvedTTSConfig {
  const meta = getTTSProviderMeta(tts?.provider);
  // baseUrl：可编辑平台用用户填的（空则回退默认），否则强制平台默认端点
  const baseUrl = meta.editableBaseUrl ? (tts?.baseUrl || meta.baseUrl) : meta.baseUrl;
  // apiKey：复用 AI 平台 Key 或用 TTS 自带
  const apiKey = meta.keySource === "tts" ? (tts?.apiKey || "") : (providers?.[meta.keySource]?.apiKey || "");
  return {
    provider: meta.value,
    baseUrl,
    apiKey,
    model: tts?.model || meta.defaultModel,
    voice: tts?.voice || meta.defaultVoice,
    ...(tts?.speed != null && { speed: tts.speed }),
    ...(meta.value === "minimax" && tts?.groupId ? { groupId: tts.groupId } : {}),
  };
}

/** 付费 TTS 是否已就绪（开关开 + 解析后 Key/模型/音色齐全） */
export function isPaidTTSReady(tts: TTSSettingLike | undefined, providers: ProvidersLike): boolean {
  if (!tts?.enabled) return false;
  const c = resolveTTSConfig(tts, providers);
  return Boolean(c.apiKey && c.baseUrl && c.model && c.voice);
}
