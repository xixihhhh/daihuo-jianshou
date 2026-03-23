/**
 * Atlas Cloud Provider 实现
 * 基于 Atlas Cloud REST API，支持图片和视频生成
 * 文档参考: https://docs.atlas.cloud
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

// ==================== Atlas Cloud API 响应类型 ====================

interface AtlasCreateTaskResponse {
  id: string
  status: string
  [key: string]: unknown
}

interface AtlasTaskStatusResponse {
  id: string
  status: string
  progress?: number
  output?: {
    images?: Array<{ url: string }>
    videos?: Array<{ url: string; cover_url?: string; duration?: number }>
  }
  error?: {
    message: string
    code: string
  }
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

interface AtlasModelResponse {
  id: string
  name: string
  description?: string
  type: string
  supported_modes?: string[]
  [key: string]: unknown
}

interface AtlasListModelsResponse {
  models: AtlasModelResponse[]
}

// ==================== Provider 实现 ====================

export class AtlasCloudProvider extends BaseProvider {
  readonly name = 'atlas-cloud'
  readonly displayName = 'Atlas Cloud'

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.atlas.cloud/v1',
    })
  }

  /**
   * 生成图片
   */
  async generateImage(options: ImageOptions): Promise<ImageResult> {
    const body = {
      model: options.modelId,
      prompt: options.prompt,
      negative_prompt: options.negativePrompt,
      width: options.width,
      height: options.height,
      num_images: options.count ?? 1,
      guidance_scale: options.guidanceScale,
      num_steps: options.steps,
      seed: options.seed,
      // image-to-image 模式的参考图
      ...(options.referenceImageUrl && {
        input_image: options.referenceImageUrl,
      }),
      ...options.extra,
    }

    const response = await this.request<AtlasCreateTaskResponse>('/predictions', {
      method: 'POST',
      body,
    })

    // Atlas Cloud 使用异步任务模式，需要轮询获取结果
    const finalStatus = await this.pollTaskStatus(response.id)

    if (!finalStatus.result) {
      throw new ProviderError('任务完成但未返回结果', 'NO_RESULT', this.name)
    }

    return finalStatus.result as ImageResult
  }

  /**
   * 生成视频
   */
  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    const body = {
      model: options.modelId,
      prompt: options.prompt,
      negative_prompt: options.negativePrompt,
      width: options.width,
      height: options.height,
      duration: options.duration,
      fps: options.fps,
      motion_strength: options.motionStrength,
      guidance_scale: options.guidanceScale,
      seed: options.seed,
      // image-to-video 模式的首帧图
      ...(options.firstFrameUrl && {
        first_frame: options.firstFrameUrl,
      }),
      ...(options.lastFrameUrl && {
        last_frame: options.lastFrameUrl,
      }),
      // video-to-video 模式的参考视频
      ...(options.referenceVideoUrl && {
        input_video: options.referenceVideoUrl,
      }),
      ...options.extra,
    }

    const response = await this.request<AtlasCreateTaskResponse>('/predictions', {
      method: 'POST',
      body,
    })

    // 异步轮询获取结果
    const finalStatus = await this.pollTaskStatus(response.id)

    if (!finalStatus.result) {
      throw new ProviderError('任务完成但未返回结果', 'NO_RESULT', this.name)
    }

    return finalStatus.result as VideoResult
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const response = await this.request<AtlasTaskStatusResponse>(
      `/predictions/${taskId}`
    )

    // 将 Atlas Cloud 的状态映射为统一状态
    const status = this.mapStatus(response.status)

    const taskStatus: TaskStatus = {
      taskId: response.id,
      status,
      progress: response.progress,
      createdAt: response.created_at,
      updatedAt: response.updated_at,
    }

    // 任务完成时解析结果
    if (status === 'completed' && response.output) {
      if (response.output.images && response.output.images.length > 0) {
        taskStatus.result = {
          taskId: response.id,
          imageUrls: response.output.images.map((img) => img.url),
          modelId: '',
        }
      } else if (response.output.videos && response.output.videos.length > 0) {
        const firstVideo = response.output.videos[0]
        taskStatus.result = {
          taskId: response.id,
          videoUrls: response.output.videos.map((v) => v.url),
          coverImageUrl: firstVideo.cover_url,
          duration: firstVideo.duration,
          modelId: '',
        }
      }
    }

    // 任务失败时填充错误信息
    if (status === 'failed' && response.error) {
      taskStatus.error = response.error.message
      taskStatus.errorCode = response.error.code
    }

    return taskStatus
  }

  /**
   * 获取可用模型列表
   */
  async listModels(mediaType?: MediaType): Promise<Model[]> {
    try {
      // 优先从 API 动态获取最新模型列表
      const response = await this.request<AtlasListModelsResponse>('/models')
      let models = response.models.map((m) => this.mapModel(m))
      if (mediaType) {
        models = models.filter((m) => m.mediaType === mediaType)
      }
      return models
    } catch {
      // API 不可用时返回静态 fallback 列表
      // 基于 Atlas Cloud 官方模型页面确认（2026-03）
      // 来源：https://www.atlascloud.ai/models/media
      let models: Model[] = [
        // ==================== 视频生成 ====================
        // --- 可灵 Kling 3.0 ---
        { id: 'kwaivgi/kling-v3.0-pro/text-to-video', name: 'Kling 3.0 Pro (文生视频)', modes: ['text-to-video'], mediaType: 'video', provider: this.name },
        { id: 'kwaivgi/kling-v3.0-pro/image-to-video', name: 'Kling 3.0 Pro (图生视频)', modes: ['image-to-video'], mediaType: 'video', provider: this.name },
        { id: 'kwaivgi/kling-v3.0-std/text-to-video', name: 'Kling 3.0 Std (文生视频)', modes: ['text-to-video'], mediaType: 'video', provider: this.name },
        { id: 'kwaivgi/kling-v3.0-std/image-to-video', name: 'Kling 3.0 Std (图生视频)', modes: ['image-to-video'], mediaType: 'video', provider: this.name },
        // --- Vidu Q3 ---
        { id: 'vidu/q3-pro/text-to-video', name: 'Vidu Q3 Pro (文生视频)', modes: ['text-to-video'], mediaType: 'video', provider: this.name },
        { id: 'vidu/q3-pro/image-to-video', name: 'Vidu Q3 Pro (图生视频)', modes: ['image-to-video'], mediaType: 'video', provider: this.name },
        { id: 'vidu/q3-pro/start-end-to-video', name: 'Vidu Q3 Pro (首尾帧过渡)', description: '指定首尾帧生成过渡视频', modes: ['image-to-video'], mediaType: 'video', provider: this.name },
        { id: 'vidu/q3-turbo/image-to-video', name: 'Vidu Q3 Turbo (图生视频)', modes: ['image-to-video'], mediaType: 'video', provider: this.name },
        // --- 豆包 Seedance ---
        { id: 'bytedance/seedance-v1.5-pro/text-to-video', name: 'Seedance 1.5 Pro (文生视频)', modes: ['text-to-video'], mediaType: 'video', provider: this.name },
        { id: 'bytedance/seedance-v1.5-pro/image-to-video', name: 'Seedance 1.5 Pro (图生视频)', modes: ['image-to-video'], mediaType: 'video', provider: this.name },
        // --- 万相 Wan ---
        { id: 'alibaba/wan-2.6/image-to-video-flash', name: '万相 2.6 Flash (图生视频)', modes: ['image-to-video'], mediaType: 'video', provider: this.name },
        // ==================== 图片生成 ====================
        { id: 'bytedance/seedream-v5.0-lite', name: 'Seedream 5.0 Lite (文生图)', modes: ['text-to-image'], mediaType: 'image', provider: this.name },
        { id: 'google/nano-banana-2/text-to-image', name: 'Nano Banana 2 (文生图)', modes: ['text-to-image'], mediaType: 'image', provider: this.name },
      ]
      if (mediaType) {
        models = models.filter((m) => m.mediaType === mediaType)
      }
      return models
    }
  }

  // ==================== 私有方法 ====================

  /** 映射 Atlas Cloud 任务状态到统一状态 */
  private mapStatus(atlasStatus: string): TaskStatusEnum {
    const statusMap: Record<string, TaskStatusEnum> = {
      starting: 'pending',
      queued: 'pending',
      processing: 'processing',
      running: 'processing',
      succeeded: 'completed',
      completed: 'completed',
      failed: 'failed',
      canceled: 'cancelled',
      cancelled: 'cancelled',
    }
    return statusMap[atlasStatus] ?? 'pending'
  }

  /** 映射 Atlas Cloud 模型到统一模型格式 */
  private mapModel(atlasModel: AtlasModelResponse): Model {
    const isVideo = atlasModel.type === 'video' || atlasModel.type === 'video-generation'
    return {
      id: atlasModel.id,
      name: atlasModel.name,
      description: atlasModel.description,
      modes: (atlasModel.supported_modes as Model['modes']) ?? (isVideo
        ? ['text-to-video', 'image-to-video']
        : ['text-to-image']),
      mediaType: isVideo ? 'video' : 'image',
      provider: this.name,
    }
  }
}
