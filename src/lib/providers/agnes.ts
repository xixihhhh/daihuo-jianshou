/**
 * Agnes AI (Sapiens AI) Provider 实现
 * 基于 OpenAI 兼容 API，支持图片和视频生成
 * 文档: https://agnes-ai.com/docs
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

// ==================== Agnes API 响应类型 ====================

interface AgnesImageResponse {
  created: number
  data: Array<{ url: string; b64_json?: string }>
}

/** 创建视频任务响应 */
interface AgnesVideoSubmitResponse {
  id: string
  task_id: string
  object: string
  model: string
  status: string
  progress: number
  created_at: number
  seconds: string
  size: string
}

/** 查询视频任务响应 */
interface AgnesVideoStatusResponse {
  id: string
  model: string
  object: string
  status: string
  progress: number
  created_at: number
  completed_at?: number
  seconds: string
  size: string
  error?: string | null
  remixed_from_video_id?: string
  video_url?: string
  usage?: { duration_seconds?: number }
}

// ==================== Provider 实现 ====================

export class AgnesProvider extends BaseProvider {
  readonly name = 'agnes'
  readonly displayName = 'Agnes AI (Sapiens AI)'

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://apihub.agnes-ai.com/v1',
    })
  }

  /**
   * 图生图 / 文生图
   */
  async generateImage(options: ImageOptions): Promise<ImageResult> {
    const body: Record<string, unknown> = {
      model: options.modelId || 'agnes-image-2.1-flash',
      prompt: options.prompt,
      size: options.width && options.height ? `${options.width}x${options.height}` : '1024x1024',
    }

    if (options.imageUrl) {
      body.extra_body = {
        image: [options.imageUrl],
        response_format: 'url',
      }
    }

    const res = await this.request<AgnesImageResponse>('/images/generations', {
      method: 'POST',
      body,
    })

    return {
      url: res.data?.[0]?.url || '',
      b64Json: res.data?.[0]?.b64_json || undefined,
    }
  }

  /**
   * 文生视频 / 图生视频（异步任务）
   * Step 1: POST /v1/videos → 获取 task_id
   * Step 2: GET  /v1/videos/{task_id} → 轮询直到 completed
   */
  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    // Step 1: 创建视频任务
    const submitBody: Record<string, unknown> = {
      model: options.modelId || 'agnes-video-v2.0',
      prompt: options.prompt || '视频',
      // 默认 5 秒视频：121 帧 / 24 fps ≈ 5 秒
      num_frames: 121,
      frame_rate: 24,
    }

    // 如果指定了时长，计算合适的参数
    if (options.duration && options.duration > 0) {
      const fps = 24
      let frames = Math.round(options.duration * fps)
      // 帧数必须 ≤ 441 且满足 8n + 1
      frames = Math.min(frames, 441)
      frames = Math.floor((frames - 1) / 8) * 8 + 1
      frames = Math.max(frames, 9) // 至少 9 帧
      submitBody.num_frames = frames
      submitBody.frame_rate = fps
    }

    // 图生视频
    if (options.imageUrl) {
      submitBody.image = options.imageUrl
    }

    const submitRes = await this.request<AgnesVideoSubmitResponse>('/v1/videos', {
      method: 'POST',
      body: submitBody,
      timeout: 60000,
    })

    const taskId = submitRes.task_id
    if (!taskId) {
      throw new ProviderError('未获取到视频任务 ID', 'NO_TASK_ID', this.name)
    }

    // Step 2: 轮询任务状态（最长等 10 分钟）
    const taskStatus = await this.pollTaskStatus(taskId, {
      interval: 5000,
      maxAttempts: 120,
      isTerminal: (s) => ['completed', 'failed'].includes(s),
    })

    // Step 3: 从结果中提取视频 URL
    const data = taskStatus.rawData as AgnesVideoStatusResponse | undefined
    const videoUrl = data?.remixed_from_video_id || data?.video_url || ''

    return {
      url: videoUrl,
      taskId,
      duration: 0,
    }
  }

  /**
   * 查询视频任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const res = await this.request<AgnesVideoStatusResponse>(`/v1/videos/${taskId}`)

    const rawStatus = res.status || 'unknown'
    let mappedStatus: TaskStatusEnum

    switch (rawStatus) {
      case 'completed':
        mappedStatus = 'completed'
        break
      case 'failed':
        mappedStatus = 'failed'
        break
      case 'queued':
        mappedStatus = 'pending'
        break
      case 'in_progress':
        mappedStatus = 'processing'
        break
      default:
        mappedStatus = 'pending'
    }

    return {
      taskId,
      status: mappedStatus,
      progress: res.progress || 0,
      error: res.error || undefined,
      rawData: res,
    }
  }

  /**
   * 列出可用模型
   */
  async listModels(mediaType?: MediaType): Promise<Model[]> {
    const res = await this.request<{ data: Array<{ id: string }> }>('/models')

    return (res.data || [])
      .filter((m) => {
        if (!mediaType) return true
        const id = m.id.toLowerCase()
        if (mediaType === 'image') return id.includes('image')
        if (mediaType === 'video') return id.includes('video')
        return true
      })
      .map((m) => ({
        id: m.id,
        name: m.id,
        supportedModes: m.id.includes('image')
          ? ['text-to-image', 'image-to-image']
          : m.id.includes('video')
            ? ['text-to-video', 'image-to-video']
            : ['text-to-image'],
      }))
  }
}
