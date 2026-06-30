/**
 * SiliconFlow Provider implementation
 * Supports multiple open-source image and video generation models
 * API docs: https://docs.siliconflow.cn
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

// ==================== SiliconFlow API response types ====================

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

// ==================== Provider implementation ====================

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
   * Generate an image
   * SiliconFlow's image generation is a synchronous API that returns the result directly
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
      // image-to-image mode
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
        timeout: 120000, // image generation can be slow; timeout set to 2 minutes
      }
    )

    // guard: the API occasionally returns HTTP 200 but with a missing or empty images array (rate-limited / error body); calling .map directly would throw a TypeError, so surface a clear ProviderError instead
    if (!Array.isArray(response.images) || response.images.length === 0) {
      throw new ProviderError('未返回图片结果', 'NO_IMAGES', this.name)
    }
    return {
      taskId: `sf-img-${Date.now()}`,
      imageUrls: response.images.map((img) => img.url),
      modelId: options.modelId,
      seed: response.images[0]?.seed,
      duration: response.timings?.inference,
    }
  }

  /**
   * Generate a video
   * SiliconFlow's video generation is an asynchronous API that requires polling
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
      // image-to-video mode
      ...(options.firstFrameUrl && {
        image: options.firstFrameUrl,
      }),
      ...options.extra,
    }

    const response = await this.request<SFVideoSubmitResponse>(
      '/video/submit',
      { method: 'POST', body }
    )

    // guard: submit occasionally does not return a requestId; without this check, undefined would be used to poll /video/status/undefined and the error would only surface after the polling timeout
    if (!response.requestId) {
      throw new ProviderError('未返回任务ID', 'NO_REQUEST_ID', this.name)
    }
    // poll until the result is ready
    const finalStatus = await this.pollTaskStatus(response.requestId, {
      interval: 5000,
    })

    // the status API does not echo back the model; backfill from the caller's modelId
    const result = this.requireResult(finalStatus.result) as VideoResult
    result.modelId = options.modelId
    return result
  }

  /**
   * Query task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const response = await this.request<SFVideoStatusResponse>(
      `/video/status/${taskId}`
    )

    const status = this.mapStatus(response.status)

    // the status API may not echo back requestId; always use the input taskId as the task identifier
    const taskStatus: TaskStatus = {
      taskId,
      status,
    }

    // parse video result
    if (status === 'completed' && response.results) {
      // guard: if results is present but videos is missing or empty, .map would crash and hang the polling loop; throw explicitly
      if (!Array.isArray(response.results.videos) || response.results.videos.length === 0) {
        throw new ProviderError('任务完成但未返回视频', 'NO_VIDEOS', this.name)
      }
      taskStatus.result = {
        taskId,
        videoUrls: response.results.videos.map((v) => v.url),
        coverImageUrl: response.results.cover_image_url,
        duration: response.results.videos[0]?.duration,
        modelId: '',
      }
    }

    // failure details
    if (status === 'failed') {
      taskStatus.error = response.reason ?? '生成失败'
      taskStatus.errorCode = 'GENERATION_FAILED'
    }

    return taskStatus
  }

  /**
   * Get the list of available models
   */
  async listModels(mediaType?: MediaType): Promise<Model[]> {
    // model list confirmed from SiliconFlow official docs and release announcements (2026-03)
    // note: FLUX.1-schnell/dev/pro, SD 3.5, LTX-Video, and the Wan2.1 series were deprecated in 2025
    // docs: https://docs.siliconflow.cn
    const models: Model[] = [
      // ==================== image generation ====================
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

  // ==================== private methods ====================

  /** Map SiliconFlow task status to the internal TaskStatusEnum */
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
