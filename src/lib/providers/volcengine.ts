/**
 * 火山引擎 Provider 实现
 * 支持 Kling（可灵）和 Seedance（豆包）等模型
 * 文档参考: https://www.volcengine.com/docs/6791
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

// ==================== 火山引擎 API 响应类型 ====================

interface VolcResponse<T = unknown> {
  code: number
  message: string
  data: T
}

interface VolcCreateTaskData {
  task_id: string
}

interface VolcTaskStatusData {
  task_id: string
  status: string
  progress?: number
  output?: {
    image_urls?: string[]
    video_url?: string
    video_urls?: string[]
    cover_url?: string
    duration?: number
  }
  error_message?: string
  error_code?: string
  create_time?: string
  update_time?: string
}

interface VolcModelInfo {
  model_id: string
  model_name: string
  description?: string
  model_type: string
  supported_modes?: string[]
}

// ==================== Provider 实现 ====================

export class VolcEngineProvider extends BaseProvider {
  readonly name = 'volcengine'
  readonly displayName = '火山引擎'

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://visual.volcengineapi.com',
    })
  }

  /**
   * 获取认证头 - 火山引擎使用 Access Key 认证
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
      prompt: options.prompt,
      negative_prompt: options.negativePrompt,
      width: options.width ?? 1024,
      height: options.height ?? 1024,
      num: options.count ?? 1,
      guidance_scale: options.guidanceScale,
      steps: options.steps,
      seed: options.seed,
      ...(options.referenceImageUrl && {
        reference_image: options.referenceImageUrl,
      }),
      ...options.extra,
    }

    const response = await this.request<VolcResponse<VolcCreateTaskData>>(
      '/v1/image/generate',
      { method: 'POST', body }
    )

    this.checkVolcResponse(response)

    // 轮询等待结果
    const finalStatus = await this.pollTaskStatus(response.data.task_id)

    if (!finalStatus.result) {
      throw new ProviderError('任务完成但未返回结果', 'NO_RESULT', this.name)
    }

    return finalStatus.result as ImageResult
  }

  /**
   * 生成视频
   */
  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    // 支持音频的模型将配音文案融入 prompt
    let prompt = options.prompt
    if (options.audioEnabled && options.voiceover) {
      prompt = `${options.prompt}. 旁白: "${options.voiceover}"`
    }

    const body = {
      model: options.modelId,
      prompt,
      negative_prompt: options.negativePrompt,
      width: options.width,
      height: options.height,
      duration: options.duration,
      fps: options.fps,
      motion_strength: options.motionStrength,
      guidance_scale: options.guidanceScale,
      seed: options.seed,
      ...(options.firstFrameUrl && {
        first_frame_image: options.firstFrameUrl,
      }),
      ...(options.lastFrameUrl && {
        last_frame_image: options.lastFrameUrl,
      }),
      ...(options.referenceVideoUrl && {
        reference_video: options.referenceVideoUrl,
      }),
      // 音频参数透传
      ...(options.audioEnabled && {
        enable_audio: true,
        ...(options.audioPrompt && { audio_prompt: options.audioPrompt }),
      }),
      ...options.extra,
    }

    const response = await this.request<VolcResponse<VolcCreateTaskData>>(
      '/v1/video/generate',
      { method: 'POST', body }
    )

    this.checkVolcResponse(response)

    // 轮询等待结果
    const finalStatus = await this.pollTaskStatus(response.data.task_id, {
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
    const response = await this.request<VolcResponse<VolcTaskStatusData>>(
      `/v1/task/${taskId}`
    )

    this.checkVolcResponse(response)

    const data = response.data
    const status = this.mapStatus(data.status)

    const taskStatus: TaskStatus = {
      taskId: data.task_id,
      status,
      progress: data.progress,
      createdAt: data.create_time,
      updatedAt: data.update_time,
    }

    // 解析完成结果
    if (status === 'completed' && data.output) {
      if (data.output.image_urls && data.output.image_urls.length > 0) {
        taskStatus.result = {
          taskId: data.task_id,
          imageUrls: data.output.image_urls,
          modelId: '',
        }
      } else if (data.output.video_url || (data.output.video_urls && data.output.video_urls.length > 0)) {
        taskStatus.result = {
          taskId: data.task_id,
          videoUrls: data.output.video_urls ?? [data.output.video_url!],
          coverImageUrl: data.output.cover_url,
          duration: data.output.duration,
          modelId: '',
        }
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
    // 基于火山方舟官方文档和公开资料确认的模型列表（2026-03）
    // 火山引擎使用 doubao- 前缀的模型标识符
    // 注意：实际调用时需要在火山方舟控制台创建推理接入点（endpoint），使用 endpoint ID 调用
    // 来源：https://www.volcengine.com/docs/82379/1330310
    const models: Model[] = [
      // ==================== 视频生成 ====================
      // --- Seedance 系列（字节豆包） ---
      {
        id: 'doubao-seedance-1-5-pro-251215',
        name: 'Seedance 1.5 Pro',
        description: '字节豆包视频生成，电影级画质，1-10秒',
        modes: ['text-to-video', 'image-to-video'],
        mediaType: 'video',
        provider: this.name,
      },
      // ==================== 图片生成 ====================
      // --- Seedream 系列（字节豆包） ---
      {
        id: 'doubao-seedream-5-0-lite',
        name: 'Seedream 5.0 Lite',
        description: '豆包最新图片生成模型 5.0 轻量版',
        modes: ['text-to-image', 'image-to-image'],
        mediaType: 'image',
        provider: this.name,
      },
      {
        id: 'doubao-seedream-4-5-251128',
        name: 'Seedream 4.5',
        description: '豆包图片生成 4.5',
        modes: ['text-to-image', 'image-to-image'],
        mediaType: 'image',
        provider: this.name,
      },
      {
        id: 'doubao-seedream-4-0',
        name: 'Seedream 4.0',
        description: '豆包图片生成 4.0',
        modes: ['text-to-image', 'image-to-image'],
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

  /** 检查火山引擎 API 返回是否成功 */
  private checkVolcResponse<T>(response: VolcResponse<T>): void {
    if (response.code !== 0) {
      throw new ProviderError(
        `火山引擎 API 错误: ${response.message}`,
        String(response.code),
        this.name
      )
    }
  }

  /** 映射火山引擎任务状态 */
  private mapStatus(volcStatus: string): TaskStatusEnum {
    const statusMap: Record<string, TaskStatusEnum> = {
      pending: 'pending',
      queued: 'pending',
      running: 'processing',
      processing: 'processing',
      success: 'completed',
      succeeded: 'completed',
      completed: 'completed',
      failed: 'failed',
      cancelled: 'cancelled',
    }
    return statusMap[volcStatus] ?? 'pending'
  }
}
