/**
 * Atlas Cloud「一个 Key 全搞定」一键接入预设。
 *
 * 落地页「先做后配」：小白没配任何 Key 时，粘贴一个 Atlas Key 即可同时跑通
 * 脚本(LLM) + 看商品图(Vision) + 生图 + 生视频 + 配音(TTS)，模型自动选好。
 * 模型 id 取自 Atlas 官方在售清单（2026-06 通过官方 MCP 实测）。
 */

export const ATLAS_BASE_URL = "https://api.atlascloud.ai/api/v1";

export const ATLAS_ONEKEY_MODELS = {
  /** 脚本：DeepSeek V3.2，性价比高、中文带货文案强 */
  llm: "deepseek-ai/deepseek-v3.2",
  /** 看商品图：通义千问 VL 多模态 */
  vision: "qwen/qwen3-vl-30b-a3b-instruct",
  /** 生图：GPT Image 2，商品图质感好 */
  image: "openai/gpt-image-2/text-to-image",
  /** 生视频：Seedance 2.0 文生视频（原生音频，文/图流程都安全） */
  video: "bytedance/seedance-2.0/text-to-video",
} as const;

/** 默认生图/生视频模型：用户已选则保留，未选才用 Atlas 默认（不覆盖用户已配） */
export function fillAtlasModelDefaults(current: { image?: string; video?: string }): {
  image: string;
  video: string;
} {
  return {
    image: current.image?.trim() ? current.image : ATLAS_ONEKEY_MODELS.image,
    video: current.video?.trim() ? current.video : ATLAS_ONEKEY_MODELS.video,
  };
}
