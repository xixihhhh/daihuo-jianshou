/**
 * Replicate Provider
 * Based on the official Replicate HTTP API (https://replicate.com/docs/reference/http)
 * - Create prediction: POST /v1/models/{owner}/{name}/predictions  body: { input }
 * - Poll:              GET  /v1/predictions/{id}
 * - Auth:              Authorization: Bearer <token>
 * status: starting | processing | succeeded | failed | canceled
 * output: images are a url array; videos are typically a single url string
 */
import { BaseProvider } from './base'
import type {
  ProviderConfig,
  ImageOptions,
  ImageResult,
  VideoOptions,
  VideoResult,
  TaskStatus,
  TaskStatusEnum,
  Model,
  MediaType,
} from './types'

/** Replicate prediction response */
interface ReplicatePrediction {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string | string[] | null
  error?: string | null
  metrics?: { predict_time?: number }
}

/** Map width/height to an aspect_ratio string used by Replicate */
function toAspectRatio(width?: number, height?: number): string {
  const w = width ?? 0
  const h = height ?? 0
  if (w > h) return '16:9'
  if (h > w) return '9:16'
  return '1:1'
}

export class ReplicateProvider extends BaseProvider {
  readonly name = 'replicate'
  readonly displayName = 'Replicate'

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.replicate.com/v1',
    })
  }

  /** Replicate uses Bearer token auth (base class default, declared explicitly to prevent accidental override) */
  protected getAuthHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.config.apiKey}` }
  }

  async generateImage(options: ImageOptions): Promise<ImageResult> {
    const input: Record<string, unknown> = {
      prompt: options.prompt,
      aspect_ratio: toAspectRatio(options.width, options.height),
      num_outputs: options.count ?? 1,
      output_format: 'png',
      ...(options.seed != null && { seed: options.seed }),
      // image-to-image: most models use the image field
      ...(options.referenceImageUrl && { image: options.referenceImageUrl }),
      ...options.extra,
    }

    const prediction = await this.createPrediction(options.modelId, input)
    const finalStatus = await this.pollTaskStatus(prediction.id, { interval: 2500 })
    const result = this.requireResult(finalStatus.result)
    // getTaskStatus only has taskId with no way to know the model, so modelId is set to empty string there; backfill the actual model here (consistent with alibaba/volcengine/siliconflow, otherwise the modelId returned to the frontend would be an empty string)
    result.modelId = options.modelId
    return result as ImageResult
  }

  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    const input: Record<string, unknown> = {
      prompt: options.prompt,
      ...(options.duration != null && { duration: options.duration }),
      ...(options.seed != null && { seed: options.seed }),
      // image-to-video: field names vary by model; common ones are start_image / image / first_frame_image
      ...(options.firstFrameUrl && {
        start_image: options.firstFrameUrl,
        image: options.firstFrameUrl,
      }),
      ...options.extra,
    }

    const prediction = await this.createPrediction(options.modelId, input)
    const finalStatus = await this.pollTaskStatus(prediction.id, { interval: 5000 })
    const result = this.requireResult(finalStatus.result)
    // same as generateImage: getTaskStatus sets modelId to empty string, backfill the actual model here to avoid returning an empty modelId to the frontend
    result.modelId = options.modelId
    return result as VideoResult
  }

  /** Create a prediction: official models use /models/{owner}/{name}/predictions */
  private async createPrediction(
    modelId: string,
    input: Record<string, unknown>
  ): Promise<ReplicatePrediction> {
    return this.request<ReplicatePrediction>(`/models/${modelId}/predictions`, {
      method: 'POST',
      body: { input },
    })
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const p = await this.request<ReplicatePrediction>(`/predictions/${taskId}`)
    const status = this.mapStatus(p.status)

    const base: TaskStatus = {
      taskId,
      status,
      error: p.error ?? undefined,
    }

    if (status === 'completed' && p.output != null) {
      const urls = Array.isArray(p.output) ? p.output : [p.output]
      const duration = p.metrics?.predict_time ? Math.round(p.metrics.predict_time * 1000) : undefined
      // use file extension to roughly determine image vs. video
      const isVideo = urls.some((u) => /\.(mp4|webm|mov)(\?|$)/i.test(u))
      base.result = isVideo
        ? ({ taskId, videoUrls: urls, modelId: '', processingTime: duration } as VideoResult)
        : ({ taskId, imageUrls: urls, modelId: '', duration } as ImageResult)
    }
    return base
  }

  private mapStatus(s: ReplicatePrediction['status']): TaskStatusEnum {
    switch (s) {
      case 'starting':
        return 'pending'
      case 'processing':
        return 'processing'
      case 'succeeded':
        return 'completed'
      case 'failed':
        return 'failed'
      case 'canceled':
        return 'cancelled'
      default:
        return 'processing'
    }
  }

  async listModels(mediaType?: MediaType): Promise<Model[]> {
    // curated selection from the official Replicate model library (owner/name format, 2026-06)
    const models: Model[] = [
      // ==================== image generation ====================
      {
        id: 'black-forest-labs/flux-1.1-pro',
        name: 'FLUX 1.1 Pro',
        description: '高质量专业文生图',
        modes: ['text-to-image'],
        mediaType: 'image',
        provider: this.name,
      },
      {
        id: 'black-forest-labs/flux-schnell',
        name: 'FLUX schnell',
        description: '极速文生图，适合迭代',
        modes: ['text-to-image'],
        mediaType: 'image',
        provider: this.name,
      },
      {
        id: 'black-forest-labs/flux-kontext-pro',
        name: 'FLUX Kontext Pro',
        description: '文本指令图像编辑，商品保真重绘',
        modes: ['image-to-image'],
        mediaType: 'image',
        provider: this.name,
      },
      {
        id: 'google/imagen-4',
        name: 'Imagen 4',
        description: 'Google 高保真文生图',
        modes: ['text-to-image'],
        mediaType: 'image',
        provider: this.name,
      },
      {
        id: 'bytedance/seedream-4',
        name: 'Seedream 4',
        description: '字节 Seedream 文生图，排版与质感强',
        modes: ['text-to-image'],
        mediaType: 'image',
        provider: this.name,
      },
      // ==================== video generation ====================
      {
        id: 'kwaivgi/kling-v2.1',
        name: 'Kling v2.1',
        description: '可灵图生视频，运动自然',
        modes: ['image-to-video', 'text-to-video'],
        mediaType: 'video',
        provider: this.name,
      },
      {
        id: 'bytedance/seedance-1-pro',
        name: 'Seedance 1 Pro',
        description: '字节 Seedance 文/图生视频',
        modes: ['text-to-video', 'image-to-video'],
        mediaType: 'video',
        provider: this.name,
      },
      {
        id: 'minimax/hailuo-02',
        name: 'Hailuo 02 (MiniMax)',
        description: 'MiniMax 海螺视频，动态强',
        modes: ['text-to-video', 'image-to-video'],
        mediaType: 'video',
        provider: this.name,
        supportsAudio: true,
      },
      {
        id: 'google/veo-3-fast',
        name: 'Veo 3 Fast',
        description: 'Google Veo 3，带原生音频',
        modes: ['text-to-video', 'image-to-video'],
        mediaType: 'video',
        provider: this.name,
        supportsAudio: true,
      },
    ]

    if (mediaType) return models.filter((m) => m.mediaType === mediaType)
    return models
  }
}
