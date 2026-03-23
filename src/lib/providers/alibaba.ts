/**
 * 阿里百炼 Provider 实现
 * 支持万相（Wan）视频生成和通义千问（Qwen）图片生成等模型
 * 文档参考: https://help.aliyun.com/zh/model-studio/
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

// ==================== 阿里百炼 API 响应类型 ====================

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

// ==================== Provider 实现 ====================

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
   * 获取认证头 - 阿里百炼使用 API-Key 认证
   */
  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
    }
  }

  /**
   * 生成图片
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

    // 使用异步任务接口
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

    const taskId = response.output.task_id

    // 轮询等待结果
    const finalStatus = await this.pollTaskStatus(taskId)

    if (!finalStatus.result) {
      throw new ProviderError('任务完成但未返回结果', 'NO_RESULT', this.name)
    }

    return finalStatus.result as ImageResult
  }

  /**
   * 生成视频
   */
  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    // 支持音频的模型将配音融入 prompt
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
        // 音频参数透传
        ...(options.audioEnabled && {
          enable_audio: true,
          ...(options.audioPrompt && { audio_prompt: options.audioPrompt }),
        }),
        ...options.extra,
      },
    }

    // 视频生成使用异步接口
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

    const taskId = response.output.task_id

    // 轮询等待结果（视频生成间隔较长）
    const finalStatus = await this.pollTaskStatus(taskId, {
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

    // 计算进度
    if (data.task_metrics) {
      const total = data.task_metrics.TOTAL ?? 1
      const succeeded = data.task_metrics.SUCCEEDED ?? 0
      taskStatus.progress = Math.round((succeeded / total) * 100)
    }

    // 解析图片结果
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

    // 解析视频结果
    if (status === 'completed' && data.video_url) {
      taskStatus.result = {
        taskId: data.task_id,
        videoUrls: [data.video_url],
        coverImageUrl: data.cover_image_url,
        modelId: '',
      }
    }

    // 失败信息
    if (status === 'failed') {
      taskStatus.error = data.error_message
      taskStatus.errorCode = data.error_code
    }

    return taskStatus
  }

  /**
   * 获取可用模型列表
   */
  async listModels(mediaType?: MediaType): Promise<Model[]> {
    // 基于阿里百炼官方文档确认的模型列表（2026-03）
    // 文档：https://help.aliyun.com/zh/model-studio/image-to-video-api-reference/
    const models: Model[] = [
      // ==================== 视频生成（万相系列） ====================
      // --- wan2.6 系列（最新） ---
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
      // --- wan2.5 系列 ---
      {
        id: 'wan2.5-i2v-preview',
        name: '万相 2.5 Preview (图生视频)',
        description: '万相 2.5 预览版图生视频',
        modes: ['image-to-video'],
        mediaType: 'video',
        provider: this.name,
      },
      // --- wan2.2 系列 ---
      {
        id: 'wan2.2-i2v-plus',
        name: '万相 2.2 Plus (图生视频)',
        description: '万相 2.2 高质量图生视频',
        modes: ['image-to-video'],
        mediaType: 'video',
        provider: this.name,
      },
      // --- wanx2.1 系列（旧版保留） ---
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
      // ==================== 图片生成 ====================
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

  // ==================== 私有方法 ====================

  /** 映射阿里百炼任务状态 */
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
