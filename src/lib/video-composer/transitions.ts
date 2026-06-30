/**
 * Transition strategy
 * Core idea: achieve natural transitions by stitching AI-generated start/end frames,
 * rather than using FFmpeg template transitions.
 *
 * Workflow:
 * 1. Generate the video for the first clip
 * 2. Extract the last frame as the "end frame"
 * 3. Generate the "start frame" for the next clip (can be an AI image or product image)
 * 4. Use a model that supports start/end frames (Vidu start-end / Kling start-end) to generate the transition clip
 * 5. Or directly let the AI use the last frame of the previous clip as a reference when generating the next clip
 */

// transition mode
export type TransitionMode =
  | "ai_start_end"    // AI start/end frame transition (recommended, best quality)
  | "ai_reference"    // AI generation with reference to previous frame (second choice)
  | "direct_concat"   // direct concatenation (hard cut)
  | "ffmpeg_fade";    // FFmpeg fade in/out (fallback option)

export interface TransitionConfig {
  mode: TransitionMode;
  label: string;
  description: string;
  // models that support this transition mode
  supportedModels: string[];
}

// list of transition configurations
export const TRANSITIONS: Record<TransitionMode, TransitionConfig> = {
  ai_start_end: {
    mode: "ai_start_end",
    label: "AI 智能过渡",
    description: "提取前一片段最后一帧和后一片段首帧，用 AI 生成自然转场视频",
    supportedModels: [
      // Seedance 2.0 (supports start frame image + end frame last_image)
      "bytedance/seedance-2.0/image-to-video",
      "bytedance/seedance-2.0-fast/image-to-video",
      // Vidu Q3 series
      "vidu/q3-pro/start-end-to-video",
      "vidu/q3-turbo/start-end-to-video",
      "vidu/start-end-to-video-2.0",
    ],
  },
  ai_reference: {
    mode: "ai_reference",
    label: "AI 参考过渡",
    description: "将前一片段最后一帧作为参考图，生成下一个片段时自动衔接",
    supportedModels: [
      // Kling 3.0 O3 series (latest)
      "kwaivgi/kling-video-o3-pro/reference-to-video",
      "kwaivgi/kling-video-o3-std/reference-to-video",
      // Kling 3.0 Pro/Std
      "kwaivgi/kling-v3.0-pro/image-to-video",
      "kwaivgi/kling-v3.0-std/image-to-video",
      // Google Veo 3.1
      "google/veo3.1/reference-to-video",
      "google/veo3.1/image-to-video",
      // Vidu
      "vidu/reference-to-video-q1",
      "vidu/reference-to-video-2.0",
      // Seedance 2.0 (multimodal reference-to-video)
      "bytedance/seedance-2.0/reference-to-video",
      "bytedance/seedance-2.0-fast/reference-to-video",
      // Seedance v1.5
      "bytedance/seedance-v1.5-pro/image-to-video",
      // Wan 2.6
      "alibaba/wan-2.6/image-to-video",
    ],
  },
  direct_concat: {
    mode: "direct_concat",
    label: "直接拼接",
    description: "硬切，无转场效果",
    supportedModels: [],
  },
  ffmpeg_fade: {
    mode: "ffmpeg_fade",
    label: "淡入淡出",
    description: "FFmpeg 淡入淡出效果（保底方案）",
    supportedModels: [],
  },
};

// get the list of all transitions
export function getTransitionList(): TransitionConfig[] {
  return Object.values(TRANSITIONS);
}

// recommend the best transition mode based on the user's configured providers
export function recommendTransition(availableModels: string[]): TransitionMode {
  // prefer AI start/end frame transition
  const hasStartEnd = TRANSITIONS.ai_start_end.supportedModels.some((m) =>
    availableModels.includes(m)
  );
  if (hasStartEnd) return "ai_start_end";

  // second choice: AI reference transition
  const hasReference = TRANSITIONS.ai_reference.supportedModels.some((m) =>
    availableModels.includes(m)
  );
  if (hasReference) return "ai_reference";

  // fallback: fade in/out
  return "ffmpeg_fade";
}
