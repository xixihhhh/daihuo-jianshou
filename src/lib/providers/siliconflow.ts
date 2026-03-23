/**
 * 硅基流动 Provider 实现
 * 支持多种开源图片和视频生成模型
 * 文档参考: https://docs.siliconflow.cn
 */

import { BaseProvider, ProviderError } from './base'
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

// ==================== 硅基流动 API 响应类型 ====================

interface SFImageResponse {
  images: Array<{
    url: string
    seed?: number
  }>
  timings?: {
    inference?: number
  }
  [key: string]: unknown
}

interface SFVideoSubmitResponse {
  requestId: string
  [key: string]: unknown
}

interface SFVideoStatusResponse {
  requestId: string
  status: string
  results?: {
    videos: Array<{
      url: string
      duration?: number
    }>
    cover_image_url?: string
  }
  reason?: string
  [key: string]: unknown
}

// ==================== Provider 实现 ====================

export class SiliconFlowProvider extends BaseProvider {
  readonly name = 'siliconflow'
  readonly displayName = '硅基流动'

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.siliconflow.cn/v1',
    })
  }

  /**
   * 生成图片
   * 硅基流动的图片生成是同步接口，直接返回结果
   */
  async generateImage(options: ImageOptions): Promise<ImageResult> {
    const body = {
      model: options.modelId,
      prompt: options.prompt,
      negative_prompt: options.negativePrompt,
      image_size: options.width && options.height
        ? `${options.width}x${options.height}`
        : undefined,
      num_inference_steps: options.steps,
      guidance_scale: options.guidanceScale,
      batch_size: options.count ?? 1,
      seed: options.seed,
      // image-to-image 模式
      ...(options.referenceImageUrl && {
        image: options.referenceImageUrl,
      }),
      ...options.extra,
    }

    const response = await this.request<SFImageResponse>(
      '/images/generations',
      {
        method: 'POST',
        body,
        timeout: 120000, // 图片生成可能较慢，超时设置为 2 分钟
      }
    )

    return {
      taskId: `sf-img-${Date.now()}`,
      imageUrls: response.images.map((img) => img.url),
      modelId: options.modelId,
      seed: response.images[0]?.seed,
      duration: response.timings?.inference,
    }
  }

  /**
   * 生成视频
   * 硅基流动的视频生成是异步接口，需要轮询
   */
  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    const body = {
      model: options.modelId,
      prompt: options.prompt,
      negative_prompt: options.negativePrompt,
      image_size: options.width && options.height
        ? `${options.width}x${options.height}`
        : undefined,
      seed: options.seed,
      // image-to-video 模式
      ...(options.firstFrameUrl && {
        image: options.firstFrameUrl,
      }),
      ...options.extra,
    }

    const response = await this.request<SFVideoSubmitResponse>(
      '/video/submit',
      { method: 'POST', body }
    )

    // 轮询等待结果
    const finalStatus = await this.pollTaskStatus(response.requestId, {
      interval: 5000,
    })

    if (!finalStatus.result) {
      throw new ProviderError('任务完成但未返回结果', 'NO_RESULT', this.name)
    }

    return finalStatus.result as VideoResult
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const response = await this.request<SFVideoStatusResponse>(
      `/video/status/${taskId}`
    )

    const status = this.mapStatus(response.status)

    const taskStatus: TaskStatus = {
      taskId: response.requestId,
      status,
    }

    // 解析视频结果
    if (status === 'completed' && response.results) {
      taskStatus.result = {
        taskId: response.requestId,
        videoUrls: response.results.videos.map((v) => v.url),
        coverImageUrl: response.results.cover_image_url,
        duration: response.results.videos[0]?.duration,
        modelId: '',
      }
    }

    // 失败信息
    if (status === 'failed') {
      taskStatus.error = response.reason ?? '生成失败'
      taskStatus.errorCode = 'GENERATION_FAILED'
    }

    return taskStatus
  }

  /**
   * 获取可用模型列表
   */
  async listModels(mediaType?: MediaType): Promise<Model[]> {
    // 基于硅基流动官方文档和更新公告确认的模型列表（2026-03）
    // 注意：FLUX.1-schnell/dev/pro、SD 3.5、LTX-Video、Wan2.1 系列已于 2025 年下线
    // 文档：https://docs.siliconflow.cn
    const models: Model[] = [
      // ==================== 图片生成 ====================
      {
        id: 'Kwai-Kolors/Kolors',
        name: 'Kolors (快手可图)',
        description: '快手可图文生图模型',
        modes: ['text-to-image'],
        mediaType: 'image',
        provider: this.name,
      },
      {
        id: 'Qwen/Qwen-Image',
        name: 'Qwen Image',
        description: '通义千问图片生成模型',
        modes: ['text-to-image'],
        mediaType: 'image',
        provider: this.name,
      },
    ]

    if (mediaType) {
      return models.filter((m) => m.mediaType === mediaType)
    }

    return models
  }

  // ==================== 私有方法 ====================

  /** 映射硅基流动任务状态 */
  private mapStatus(sfStatus: string): TaskStatusEnum {
    const statusMap: Record<string, TaskStatusEnum> = {
      Pending: 'pending',
      InQueue: 'pending',
      Running: 'processing',
      InProgress: 'processing',
      Succeed: 'completed',
      Success: 'completed',
      Failed: 'failed',
      Cancelled: 'cancelled',
    }
    return statusMap[sfStatus] ?? 'pending'
  }
}
