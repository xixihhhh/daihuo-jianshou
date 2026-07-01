/**
 * Script generator
 * Calls an LLM in OpenAI-compatible format to generate e-commerce short-video scripts.
 * Supports custom LLM endpoints, streaming output, and product image analysis.
 */

import OpenAI from "openai";
import {
  SYSTEM_PROMPT,
  PRODUCT_ANALYSIS_PROMPT,
  TOPIC_SYSTEM_PROMPT,
  buildUserPrompt,
  buildBatchPrompt,
  buildTopicBatchPrompt,
  type ScriptGenerationInput,
  type TopicScriptInput,
} from "./prompts";
import type { Shot } from "@/lib/db/schema";

// ==================== Type definitions ====================

/** LLM configuration */
export interface LLMConfig {
  /** API base URL (any OpenAI-compatible endpoint) */
  baseUrl: string;
  /** API key */
  apiKey: string;
  /** Text model name */
  model: string;
  /** Vision model name (used for product image analysis; falls back to model if not specified) */
  visionModel?: string;
}

/** Script generation input parameters */
export interface ScriptInput extends ScriptGenerationInput {
  /** LLM configuration */
  llmConfig: LLMConfig;
}

/** Generated script result */
export interface GeneratedScript {
  /** Script title */
  title: string;
  /** Script style */
  styleType: string;
  /** Total duration (seconds) */
  totalDuration: number;
  /** Shot list */
  shots: Shot[];
}

/** Streaming output callbacks */
export interface StreamCallbacks {
  /** Fired when a text token is received */
  onToken?: (token: string) => void;
  /** Fired when generation is complete */
  onComplete?: (scripts: GeneratedScript[]) => void;
  /** Fired when an error occurs */
  onError?: (error: Error) => void;
}

/** Product analysis result */
export interface ProductAnalysisResult {
  /** Product name */
  productName: string;
  /** Category */
  category: string;
  /** Brand */
  brand: string;
  /** Visual characteristics */
  visualFeatures: {
    mainColor: string;
    designStyle: string;
    productForm: string;
    texture: string;
  };
  /** List of selling points */
  sellingPoints: string[];
  /** Target audience */
  targetAudience: string;
  /** Usage scenarios */
  usageScenarios: string[];
  /** Pain points */
  painPoints: string[];
  /** Video suggestions */
  videoSuggestions: {
    recommendedAngles: string[];
    keyVisuals: string[];
    suggestedStyle: string;
  };
}

// ==================== Utility functions ====================

/** Create an OpenAI client */
function createClient(config: LLMConfig): OpenAI {
  return new OpenAI({
    baseURL: config.baseUrl,
    // Local/free OpenAI-compatible endpoints (Ollama, Pollinations) don't need a real key; the SDK requires a non-empty value, so use a placeholder
    apiKey: config.apiKey || "no-key",
  });
}

/**
 * Extra request params for reasoning-model endpoints.
 * Pollinations' only keyless (anonymous-tier) model is now a reasoning model (GPT-OSS 20B) with a small
 * output-token cap: on our large generation prompts it exhausts the entire budget on its reasoning trace
 * and returns EMPTY content (finish_reason "length"), so keyless generation would always fail. Passing
 * reasoning_effort:"low" makes it think minimally and actually emit the JSON.
 * Scoped to Pollinations by baseUrl on purpose — real OpenAI rejects reasoning_effort for non-reasoning
 * models (400 unsupported_parameter), so it must NOT be sent globally.
 */
export function reasoningParams(baseUrl: string): { reasoning_effort?: "low" } {
  return /pollinations\.ai/i.test(baseUrl || "") ? { reasoning_effort: "low" } : {};
}

/**
 * How many script variants to request in one batch call.
 * Pollinations' anonymous tier caps output tokens low: 3 full commerce scripts (~7500 chars) overflow
 * that cap and truncate to invalid JSON, so keyless generation would fail entirely. Request a single
 * complete script instead — one valid script beats three truncated ones, and the user can regenerate
 * for more variants. Other endpoints keep the requested batch size. Scoped to Pollinations by baseUrl.
 */
export function batchCountFor(baseUrl: string, requested = 3): number {
  return /pollinations\.ai/i.test(baseUrl || "") ? 1 : requested;
}

/**
 * Extract JSON from LLM output text.
 * Handles both raw JSON output and JSON wrapped in a markdown code block.
 */
export function extractJSON(text: string): string {
  // Try stripping markdown code block markers
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try finding the first { or [ to locate the JSON
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  return text.trim();
}

/**
 * Append an actionable hint to "JSON parse failed" errors: if the string starts with {/[ but doesn't end with }/],
 * the output was likely truncated by max_tokens — suggest increasing the token limit rather than just saying "invalid JSON".
 */
function truncationHint(jsonStr: string): string {
  return /^[{[]/.test(jsonStr) && !/[}\]]\s*$/.test(jsonStr) ? "（输出疑似被截断，请增大 max_tokens 后重试）" : "";
}

/**
 * Validate and correct a single Shot object.
 * Ensures all required fields have valid values.
 */
function validateShot(shot: Partial<Shot>, index: number): Shot {
  const validTypes: Shot["type"][] = ["hook", "pain_point", "product_reveal", "demo", "social_proof", "cta"];
  const validTransitions: Shot["transition"][] = ["ai_start_end", "ai_reference", "direct_concat", "ffmpeg_fade"];
  const validSources: Shot["visualSource"][] = ["ai_generate", "product_image", "user_upload"];

  const validMotions: NonNullable<Shot["motion"]>[] = ["zoom_in_slow", "pan_left", "pan_right", "ken_burns", "static"];

  // Parse LLM-generated English stock-search terms (field name searchTerms or stockKeywords), keep first 3 non-empty strings
  const rawTerms = (shot as Record<string, unknown>).searchTerms ?? shot.stockKeywords;
  const stockKeywords = Array.isArray(rawTerms)
    ? rawTerms.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.trim()).slice(0, 3)
    : undefined;

  return {
    shotId: shot.shotId || index + 1,
    type: validTypes.includes(shot.type as Shot["type"]) ? (shot.type as Shot["type"]) : "demo",
    duration: typeof shot.duration === "number" && shot.duration > 0 ? shot.duration : 3,
    description: shot.description || "",
    camera: shot.camera || "固定镜头",
    visualSource: validSources.includes(shot.visualSource as Shot["visualSource"]) ? (shot.visualSource as Shot["visualSource"]) : "ai_generate",
    // Default transition matches the schema (videoClips.transitionType) and UI default (ai_start_end)
    transition: validTransitions.includes(shot.transition as Shot["transition"]) ? (shot.transition as Shot["transition"]) : "ai_start_end",
    voiceover: shot.voiceover || "",
    prompt: shot.prompt || undefined,
    // Pass through LLM-generated extended fields (video mode) so they are not silently dropped
    ...(stockKeywords?.length && { stockKeywords }),
    ...(shot.characterId && { characterId: shot.characterId }),
    ...(validMotions.includes(shot.motion as NonNullable<Shot["motion"]>) && { motion: shot.motion }),
    ...(shot.textOverlay?.text && {
      textOverlay: {
        text: shot.textOverlay.text,
        style: shot.textOverlay.style ?? "subtitle",
      },
    }),
  };
}

/**
 * Validate and correct a complete script object.
 */
function validateScript(raw: Record<string, unknown>, fallbackStyleType: string): GeneratedScript {
  const shots = Array.isArray(raw.shots)
    ? (raw.shots as Partial<Shot>[]).map((s, i) => validateShot(s, i))
    : [];

  const totalDuration = typeof raw.totalDuration === "number"
    ? raw.totalDuration
    : shots.reduce((sum, s) => sum + s.duration, 0);

  return {
    title: (raw.title as string) || "未命名脚本",
    styleType: (raw.styleType as string) || fallbackStyleType,
    totalDuration,
    shots,
  };
}

// ==================== Core functionality ====================

/**
 * Generate e-commerce scripts (single call, returns complete result).
 * @param input - Script generation input parameters
 * @returns Array of generated scripts
 */
export async function generateScript(input: ScriptInput): Promise<GeneratedScript[]> {
  const client = createClient(input.llmConfig);
  const userPrompt = buildBatchPrompt(input, batchCountFor(input.llmConfig.baseUrl));

  // Call the LLM to generate the script
  let response;
  try {
    response = await client.chat.completions.create({
      model: input.llmConfig.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 16000,
      ...reasoningParams(input.llmConfig.baseUrl),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`LLM 请求失败（模型: ${input.llmConfig.model}，地址: ${input.llmConfig.baseUrl}）: ${msg}`);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM 未返回有效内容");
  }

  return parseScriptResponse(content, input.styleType);
}

/** Topic-based script generation input (one-sentence topic + LLM config) */
export interface TopicScriptGenInput extends TopicScriptInput {
  llmConfig: LLMConfig;
  /** Number of variants to generate, defaults to 3 */
  count?: number;
}

/**
 * Generate "one-sentence topic" scripts (product-free; each shot includes English search terms for automatic media matching).
 * @param input - Topic + LLM config
 * @returns Array of generated scripts (includes stockKeywords, ready to feed directly into stock-fill for media matching)
 */
export async function generateTopicScript(input: TopicScriptGenInput): Promise<GeneratedScript[]> {
  const client = createClient(input.llmConfig);
  const userPrompt = buildTopicBatchPrompt(input, batchCountFor(input.llmConfig.baseUrl, input.count ?? 3));

  let response;
  try {
    response = await client.chat.completions.create({
      model: input.llmConfig.model,
      messages: [
        { role: "system", content: TOPIC_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 16000,
      ...reasoningParams(input.llmConfig.baseUrl),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`LLM 请求失败（模型: ${input.llmConfig.model}，地址: ${input.llmConfig.baseUrl}）: ${msg}`);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM 未返回有效内容");
  }

  // Topic-based videos have no e-commerce style concept; fall back uniformly to "custom"
  return parseScriptResponse(content, "custom");
}

/**
 * Generate a single script (faster response).
 * @param input - Script generation input parameters
 * @returns A single generated script
 */
export async function generateSingleScript(input: ScriptInput): Promise<GeneratedScript> {
  const client = createClient(input.llmConfig);
  const userPrompt = buildUserPrompt(input);

  const response = await client.chat.completions.create({
    model: input.llmConfig.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    ...reasoningParams(input.llmConfig.baseUrl),
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM 未返回有效内容");
  }

  const jsonStr = extractJSON(content);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`LLM 返回的内容不是合法 JSON${truncationHint(jsonStr)}: ${jsonStr.substring(0, 200)}`);
  }
  return validateScript(parsed, input.styleType);
}

/**
 * Generate a script with streaming output.
 * Supports real-time progress updates; suitable for frontend streaming display.
 * @param input - Script generation input parameters
 * @param callbacks - Streaming callback functions
 * @returns AbortController for cancelling generation
 */
export function generateScriptStream(
  input: ScriptInput,
  callbacks: StreamCallbacks,
): AbortController {
  const abortController = new AbortController();

  const run = async () => {
    const client = createClient(input.llmConfig);
    const userPrompt = buildUserPrompt(input);

    let fullContent = "";

    try {
      const stream = await client.chat.completions.create({
        model: input.llmConfig.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        stream: true,
        ...reasoningParams(input.llmConfig.baseUrl),
      }, {
        signal: abortController.signal,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          callbacks.onToken?.(delta);
        }
      }

      // Parse the complete result after streaming finishes
      const scripts = parseScriptResponse(fullContent, input.styleType);
      callbacks.onComplete?.(scripts);
    } catch (error) {
      // User-initiated cancellation is not an error
      if (abortController.signal.aborted) return;
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  run();
  return abortController;
}

/**
 * Create a ReadableStream for streaming script generation.
 * Used for streaming responses in Next.js API routes.
 * @param input - Script generation input parameters
 * @returns ReadableStream
 */
export function createScriptStream(input: ScriptInput): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const client = createClient(input.llmConfig);
      const userPrompt = buildUserPrompt(input);

      try {
        const stream = await client.chat.completions.create({
          model: input.llmConfig.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
          stream: true,
          ...reasoningParams(input.llmConfig.baseUrl),
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

// ==================== Product image analysis ====================

/**
 * Analyse product images.
 * Calls the vision model to extract product information, selling points, target audience, etc.
 * @param imageUrls - List of product image URLs (http/https or base64 data URIs)
 * @param config - LLM configuration
 * @returns Product analysis result as a JSON string
 */
export async function analyzeProduct(
  imageUrls: string[],
  config: LLMConfig,
): Promise<string> {
  const client = createClient(config);
  const model = config.visionModel || config.model;

  // Build message content with images
  const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = imageUrls.map(
    (url) => ({
      type: "image_url" as const,
      image_url: { url, detail: "high" as const },
    }),
  );

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PRODUCT_ANALYSIS_PROMPT },
          ...imageContent,
        ],
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || "";
}

/**
 * Analyse product images and return structured data.
 * @param imageUrls - List of product image URLs
 * @param config - LLM configuration
 * @returns Structured product analysis result
 */
export async function analyzeProductStructured(
  imageUrls: string[],
  config: LLMConfig,
): Promise<ProductAnalysisResult> {
  const rawResult = await analyzeProduct(imageUrls, config);
  const jsonStr = extractJSON(rawResult);
  try {
    return JSON.parse(jsonStr) as ProductAnalysisResult;
  } catch {
    throw new Error(`商品分析结果不是合法 JSON${truncationHint(jsonStr)}: ${jsonStr.substring(0, 200)}`);
  }
}

// ==================== Parsing utilities ====================

/**
 * Parse LLM script response content.
 * Handles multiple return formats (single object, array, nested object, etc.)
 */
export function parseScriptResponse(content: string, fallbackStyleType: string): GeneratedScript[] {
  const jsonStr = extractJSON(content);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`LLM 返回的内容不是合法 JSON${truncationHint(jsonStr)}: ${jsonStr.substring(0, 200)}`);
  }

  // Handle different return formats
  let rawScripts: Record<string, unknown>[];

  if (Array.isArray(parsed)) {
    // direct array
    rawScripts = parsed;
  } else if (parsed.scripts && Array.isArray(parsed.scripts)) {
    // { scripts: [...] } format
    rawScripts = parsed.scripts;
  } else if (parsed.shots && Array.isArray(parsed.shots)) {
    // single script object
    rawScripts = [parsed];
  } else {
    throw new Error("无法解析 LLM 返回的脚本格式");
  }

  // Discard scripts with no shots (LLM occasionally returns entries with only a title and no shots);
  // if all are empty, throw — otherwise a "zero-shot script" would be saved as a success and downstream
  // compositing / rendering would have nothing to work with, yet would not report an error.
  // Filter out null/non-object elements first: LLM occasionally emits [null, {...}], and validateScript
  // reads raw.shots on its first line, which throws on null and corrupts the entire parse.
  const scripts = rawScripts
    .filter((raw): raw is Record<string, unknown> => typeof raw === "object" && raw !== null)
    .map((raw) => validateScript(raw, fallbackStyleType))
    .filter((s) => s.shots.length > 0);
  if (scripts.length === 0) {
    throw new Error("LLM 未生成有效分镜（脚本为空），请重试或调整输入");
  }
  return scripts;
}
