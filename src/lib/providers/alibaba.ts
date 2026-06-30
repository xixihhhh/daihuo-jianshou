/**
 * Alibaba Bailian Provider implementation
 * Supports Wan (Wanxiang) video generation and Qwen image generation models
 * Docs: https://help.aliyun.com/zh/model-studio/
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

// ==================== Alibaba Bailian API response types ====================

interface AliResponse<T = unknown> {
  request_id: string
  output: T
  usage?: Record<string, unknown>
}

interface AliAsyncOutput {
  task_id: string
  task_status: string
}

interface AliTaskOutput {
  task_id: string
  task_status: string
  task_metrics?: {
    TOTAL?: number
    SUCCEEDED?: number
    FAILED?: number
  }
  results?: Array<{
    url?: string
    code?: string
    message?: string
  }>
  video_url?: string
  cover_image_url?: string
  error_code?: string
  error_message?: string
  submit_time?: string
  end_time?: string
}

// ==================== Provider implementation ====================

export class AlibabaProvider extends BaseProvider {
  readonly name = 'alibaba'
  readonly displayName = '阿里百炼'

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://dashscope.aliyuncs.com/api/v1',
    })
  }

  /**
   * Get authentication headers - Alibaba Bailian uses API-Key auth
   */
  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
    }
  }

  /**
   * Generate an image
   */
  async generateImage(options: ImageOptions): Promise<ImageResult> {
    const body = {
      model: options.modelId,
      input: {
        prompt: options.prompt,
        negative_prompt: options.negativePrompt,
        ...(options.referenceImageUrl && {
          ref_img: options.referenceImageUrl,
        }),
      },
      parameters: {
        size: options.width && options.height
          ? `${options.width}*${options.height}`
          : undefined,
        n: options.count ?? 1,
        guidance_scale: options.guidanceScale,
        steps: options.steps,
        seed: options.seed,
        ...options.extra,
      },
    }

    // use the async task API
    const response = await this.request<AliResponse<AliAsyncOutput>>(
      '/services/aigc/text2image/image-synthesis',
      {
        method: 'POST',
        body,
        headers: {
          'X-DashScope-Async': 'enable',
        },
      }
    )

    // guard: async submission occasionally returns 200 but without output/task_id; accessing .task_id would throw TypeError
    if (!response.output?.task_id) {
      throw new ProviderError('未返回任务ID', 'NO_TASK_ID', this.name)
    }
    const taskId = response.output.task_id

    // poll until result is ready
    const finalStatus = await this.pollTaskStatus(taskId)

    // the status API does not echo back the model; backfill using the caller's modelId
    const result = this.requireResult(finalStatus.result) as ImageResult
    result.modelId = options.modelId
    return result
  }

  /**
   * Generate a video
   */
  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    // models that support audio embed the voiceover into the prompt
    let prompt = options.prompt
    if (options.audioEnabled && options.voiceover) {
      prompt = `${options.prompt}. 旁白: "${options.voiceover}"`
    }

    const body = {
      model: options.modelId,
      input: {
        prompt,
        negative_prompt: options.negativePrompt,
        ...(options.firstFrameUrl && {
          img_url: options.firstFrameUrl,
        }),
        ...(options.referenceVideoUrl && {
          video_url: options.referenceVideoUrl,
        }),
      },
      parameters: {
        size: options.width && options.height
          ? `${options.width}*${options.height}`
          : undefined,
        duration: options.duration,
        fps: options.fps,
        motion_strength: options.motionStrength,
        guidance_scale: options.guidanceScale,
        seed: options.seed,
        // pass through audio parameters
        ...(options.audioEnabled && {
          enable_audio: true,
          ...(options.audioPrompt && { audio_prompt: options.audioPrompt }),
        }),
        ...options.extra,
      },
    }

    // video generation uses the async API
    const response = await this.request<AliResponse<AliAsyncOutput>>(
      '/services/aigc/video-generation/generation',
      {
        method: 'POST',
        body,
        headers: {
          'X-DashScope-Async': 'enable',
        },
      }
    )

    // guard: async submission occasionally returns 200 but without output/task_id; accessing .task_id would throw TypeError
    if (!response.output?.task_id) {
      throw new ProviderError('未返回任务ID', 'NO_TASK_ID', this.name)
    }
    const taskId = response.output.task_id

    // poll with a longer interval since video generation takes more time
    const finalStatus = await this.pollTaskStatus(taskId, {
      interval: 5000,
    })

    // the status API does not echo back the model; backfill using the caller's modelId
    const result = this.requireResult(finalStatus.result) as VideoResult
    result.modelId = options.modelId
    return result
  }

  /**
   * Query task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const response = await this.request<AliResponse<AliTaskOutput>>(
      `/tasks/${taskId}`
    )

    const data = response.output
    const status = this.mapStatus(data.task_status)

    const taskStatus: TaskStatus = {
      taskId: data.task_id,
      status,
      createdAt: data.submit_time,
      updatedAt: data.end_time,
    }

    // calculate progress
    if (data.task_metrics) {
      const total = data.task_metrics.TOTAL ?? 1
      const succeeded = data.task_metrics.SUCCEEDED ?? 0
      taskStatus.progress = Math.round((succeeded / total) * 100)
    }

    // parse image result
    if (status === 'completed' && data.results && data.results.length > 0) {
      const validResults = data.results.filter((r) => r.url)
      if (validResults.length > 0) {
        taskStatus.result = {
          taskId: data.task_id,
          imageUrls: validResults.map((r) => r.url!),
          modelId: '',
        }
      }
    }

    // parse video result
    if (status === 'completed' && data.video_url) {
      taskStatus.result = {
        taskId: data.task_id,
        videoUrls: [data.video_url],
        coverImageUrl: data.cover_image_url,
        modelId: '',
      }
    }

    // failure info
    if (status === 'failed') {
      taskStatus.error = data.error_message
      taskStatus.errorCode = data.error_code
    }

    return taskStatus
  }

  /**
   * List available models
   */
  async listModels(mediaType?: MediaType): Promise<Model[]> {
    // model list confirmed from official Alibaba Bailian docs (2026-03)
    // docs: https://help.aliyun.com/zh/model-studio/image-to-video-api-reference/
    const models: Model[] = [
      // ==================== Video generation (Wan series) ====================
      // --- wan2.6 series (latest) ---
      {
        id: 'wan2.6-i2v-flash',
        name: '万相 2.6 Flash (图生视频)',
        description: '万相 2.6 快速图生视频',
        modes: ['image-to-video'],
        mediaType: 'video',
        provider: this.name,
      },
      {
        id: 'wan2.6-i2v',
        name: '万相 2.6 (图生视频)',
        description: '万相 2.6 标准图生视频',
        modes: ['image-to-video'],
        mediaType: 'video',
        provider: this.name,
      },
      // --- wan2.5 series ---
      {
        id: 'wan2.5-i2v-preview',
        name: '万相 2.5 Preview (图生视频)',
        description: '万相 2.5 预览版图生视频',
        modes: ['image-to-video'],
        mediaType: 'video',
        provider: this.name,
      },
      // --- wan2.2 series ---
      {
        id: 'wan2.2-i2v-plus',
        name: '万相 2.2 Plus (图生视频)',
        description: '万相 2.2 高质量图生视频',
        modes: ['image-to-video'],
        mediaType: 'video',
        provider: this.name,
      },
      // --- wanx2.1 series (legacy, kept for compatibility) ---
      {
        id: 'wanx2.1-i2v-turbo',
        name: '万相 2.1 Turbo (图生视频)',
        description: '万相 2.1 快速图生视频',
        modes: ['image-to-video'],
        mediaType: 'video',
        provider: this.name,
      },
      {
        id: 'wanx2.1-i2v-plus',
        name: '万相 2.1 Plus (图生视频)',
        description: '万相 2.1 高质量图生视频',
        modes: ['image-to-video'],
        mediaType: 'video',
        provider: this.name,
      },
      // ==================== Image generation ====================
      {
        id: 'wanx-v1',
        name: '通义万相 (文生图)',
        description: '通义万相文生图模型',
        modes: ['text-to-image'],
        mediaType: 'image',
        provider: this.name,
      },
      {
        id: 'qwen-vl-max',
        name: '通义千问 VL Max',
        description: '通义千问视觉语言模型（图片理解/分析）',
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

  // ==================== Private methods ====================

  /** Map Alibaba Bailian task status to unified status */
  private mapStatus(aliStatus: string): TaskStatusEnum {
    const statusMap: Record<string, TaskStatusEnum> = {
      PENDING: 'pending',
      RUNNING: 'processing',
      SUCCEEDED: 'completed',
      FAILED: 'failed',
      CANCELED: 'cancelled',
      UNKNOWN: 'pending',
    }
    return statusMap[aliStatus] ?? 'pending'
  }
}
