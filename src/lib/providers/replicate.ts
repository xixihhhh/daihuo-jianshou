/**
 * Replicate Provider
 * 基于 Replicate 官方 HTTP API（https://replicate.com/docs/reference/http）
 * - 创建预测：POST /v1/models/{owner}/{name}/predictions  body: { input }
 * - 轮询：    GET  /v1/predictions/{id}
 * - 鉴权：    Authorization: Bearer <token>
 * status: starting | processing | succeeded | failed | canceled
 * output: 图片为 url 数组；视频通常为单个 url 字符串
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

/** Replicate 预测响应 */
interface ReplicatePrediction {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string | string[] | null
  error?: string | null
  metrics?: { predict_time?: number }
}

/** 把宽高映射为 Replicate 常用的 aspect_ratio */
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

  /** Replicate 用 Bearer token 鉴权（基类默认即是，显式声明以防覆盖） */
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
      // 图生图：多数模型用 image 字段
      ...(options.referenceImageUrl && { image: options.referenceImageUrl }),
      ...options.extra,
    }

    const prediction = await this.createPrediction(options.modelId, input)
    const finalStatus = await this.pollTaskStatus(prediction.id, { interval: 2500 })
    const result = this.requireResult(finalStatus.result)
    // getTaskStatus 只有 taskId、无从得知模型，置了空 modelId；这里回填实际模型（与 alibaba/volcengine/siliconflow 一致，否则返给前端的 modelId 为空串）
    result.modelId = options.modelId
    return result as ImageResult
  }

  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    const input: Record<string, unknown> = {
      prompt: options.prompt,
      ...(options.duration != null && { duration: options.duration }),
      ...(options.seed != null && { seed: options.seed }),
      // 图生视频：不同模型字段名不一，常见 start_image / image / first_frame_image
      ...(options.firstFrameUrl && {
        start_image: options.firstFrameUrl,
        image: options.firstFrameUrl,
      }),
      ...options.extra,
    }

    const prediction = await this.createPrediction(options.modelId, input)
    const finalStatus = await this.pollTaskStatus(prediction.id, { interval: 5000 })
    const result = this.requireResult(finalStatus.result)
    // 同 generateImage：getTaskStatus 置了空 modelId，这里回填实际模型，避免返给前端的 modelId 为空串
    result.modelId = options.modelId
    return result as VideoResult
  }

  /** 创建预测：官方模型走 /models/{owner}/{name}/predictions */
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
      // 用扩展名粗判图片/视频
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
    // 基于 Replicate 官方模型库精选（owner/name 形式，2026-06）
    const models: Model[] = [
      // ==================== 图片生成 ====================
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
      // ==================== 视频生成 ====================
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
