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

/** 创建视频任务响应（V2.0） */
interface AgnesVideoSubmitResponse {
  id: string
  task_id?: string
  video_id?: string
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
  video_id?: string
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
   * 文生视频 / 图生视频（异步任务）— V2.0 新版 API
   * Step 1: POST /v1/videos → 获取 task_id + video_id
   * Step 2: GET /v1/videos/{video_id} → 轮询（新版接口，减少排队）
   */
  async generateVideo(options: VideoOptions): Promise<VideoResult> {
    // Step 1: 创建视频任务
    const submitBody: Record<string, unknown> = {
      model: options.modelId || 'agnes-video-v2.0',
      prompt: options.prompt || '视频',
      num_frames: 121,
      frame_rate: 24,
    }

    if (options.duration && options.duration > 0) {
      const fps = 24
      let frames = Math.round(options.duration * fps)
      frames = Math.min(frames, 441)
      frames = Math.floor((frames - 1) / 8) * 8 + 1
      frames = Math.max(frames, 9)
      submitBody.num_frames = frames
      submitBody.frame_rate = fps
    }

    if (options.imageUrl) {
      submitBody.image = options.imageUrl
    }

    const submitRes = await this.request<AgnesVideoSubmitResponse>('/v1/videos', {
      method: 'POST',
      body: submitBody,
      timeout: 60000,
    })

    // 优先使用 video_id（新版），兼容 task_id（旧版）
    const videoId = submitRes.video_id || submitRes.task_id || submitRes.id
    if (!videoId) {
      throw new ProviderError('未获取到视频 ID', 'NO_VIDEO_ID', this.name)
    }

    // Step 2: 用 video_id 轮询（减少排队）
    const taskStatus = await this.pollVideoStatus(videoId, {
      interval: 5000,
      maxAttempts: 120,
      isTerminal: (s) => ['completed', 'failed'].includes(s),
    })

    const data = taskStatus.rawData as AgnesVideoStatusResponse | undefined
    const videoUrl = data?.remixed_from_video_id || data?.video_url || ''

    return {
      url: videoUrl,
      taskId: videoId,
      duration: 0,
    }
  }

  /**
   * 查询视频任务状态 — 新版 API 优先使用 video_id
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
   * 轮询视频状态 — 新版 API 优先使用 video_id
   */
  private async pollVideoStatus(
    videoId: string,
    opts: { interval: number; maxAttempts: number; isTerminal: (status: string) => boolean },
  ): Promise<{ status: string; rawData: unknown }> {
    for (let i = 0; i < opts.maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, opts.interval))
      // NEW: Use video_id query endpoint (no queuing)
      const res = await this.request<AgnesVideoStatusResponse>(
        `/agnesapi?video_id=${videoId}`,
      )
      if (opts.isTerminal(res.status)) {
        return { status: res.status, rawData: res }
      }
    }
    return { status: 'timeout', rawData: null }
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
