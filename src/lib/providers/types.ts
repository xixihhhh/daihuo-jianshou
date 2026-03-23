/**
 * AI Provider 统一类型定义
 * 定义所有 AI 平台的通用接口和数据类型
 */

// ==================== 枚举 ====================

/** 生成模式 */
export type GenerationMode =
  | 'text-to-image'     // 文本生成图片
  | 'image-to-image'    // 图片生成图片（风格转换等）
  | 'text-to-video'     // 文本生成视频
  | 'image-to-video'    // 图片生成视频
  | 'video-to-video'    // 视频生成视频（风格转换等）

/** 任务状态枚举 */
export type TaskStatusEnum =
  | 'pending'       // 排队中
  | 'processing'    // 生成中
  | 'completed'     // 已完成
  | 'failed'        // 失败
  | 'cancelled'     // 已取消

/** 媒体类型 */
export type MediaType = 'image' | 'video'

// ==================== 配置类型 ====================

/** Provider 配置 */
export interface ProviderConfig {
  /** 平台名称标识 */
  name: string
  /** API 密钥 */
  apiKey: string
  /** API 基础地址 */
  baseUrl: string
  /** 请求超时时间（毫秒），默认 30000 */
  timeout?: number
  /** 额外的请求头 */
  headers?: Record<string, string>
  /** 平台特有配置 */
  extra?: Record<string, unknown>
}

// ==================== 模型类型 ====================

/** 模型信息 */
export interface Model {
  /** 模型 ID */
  id: string
  /** 模型名称 */
  name: string
  /** 模型描述 */
  description?: string
  /** 支持的生成模式 */
  modes: GenerationMode[]
  /** 支持的媒体类型 */
  mediaType: MediaType
  /** 模型所属平台 */
  provider: string
  /** 是否支持生成带音频的视频（配音/音效） */
  supportsAudio?: boolean
  /** 额外的模型信息 */
  extra?: Record<string, unknown>
}

// ==================== 图片相关类型 ====================

/** 图片生成选项 */
export interface ImageOptions {
  /** 使用的模型 ID */
  modelId: string
  /** 生成模式 */
  mode: 'text-to-image' | 'image-to-image'
  /** 文本提示词 */
  prompt: string
  /** 反向提示词 */
  negativePrompt?: string
  /** 输出宽度 */
  width?: number
  /** 输出高度 */
  height?: number
  /** 生成数量 */
  count?: number
  /** 参考图片 URL（image-to-image 模式） */
  referenceImageUrl?: string
  /** 引导系数，控制与提示词的匹配程度 */
  guidanceScale?: number
  /** 推理步数 */
  steps?: number
  /** 随机种子 */
  seed?: number
  /** 额外参数 */
  extra?: Record<string, unknown>
}

/** 图片生成结果 */
export interface ImageResult {
  /** 任务 ID */
  taskId: string
  /** 生成的图片 URL 列表 */
  imageUrls: string[]
  /** 生成耗时（毫秒） */
  duration?: number
  /** 模型 ID */
  modelId: string
  /** 使用的种子值 */
  seed?: number
  /** 额外的返回信息 */
  extra?: Record<string, unknown>
}

// ==================== 视频相关类型 ====================

/** 视频生成选项 */
export interface VideoOptions {
  /** 使用的模型 ID */
  modelId: string
  /** 生成模式 */
  mode: 'text-to-video' | 'image-to-video' | 'video-to-video'
  /** 文本提示词 */
  prompt: string
  /** 反向提示词 */
  negativePrompt?: string
  /** 输出宽度 */
  width?: number
  /** 输出高度 */
  height?: number
  /** 视频时长（秒） */
  duration?: number
  /** 帧率 */
  fps?: number
  /** 首帧图片 URL（image-to-video 模式） */
  firstFrameUrl?: string
  /** 尾帧图片 URL（部分平台支持） */
  lastFrameUrl?: string
  /** 参考视频 URL（video-to-video 模式） */
  referenceVideoUrl?: string
  /** 运动强度，控制视频运动幅度 */
  motionStrength?: number
  /** 引导系数 */
  guidanceScale?: number
  /** 随机种子 */
  seed?: number
  /** 配音文案（支持音频的模型会生成带配音的视频） */
  voiceover?: string
  /** 音频提示词（描述音效/音乐风格，部分模型支持） */
  audioPrompt?: string
  /** 是否启用音频生成 */
  audioEnabled?: boolean
  /** 额外参数 */
  extra?: Record<string, unknown>
}

/** 视频生成结果 */
export interface VideoResult {
  /** 任务 ID */
  taskId: string
  /** 生成的视频 URL 列表 */
  videoUrls: string[]
  /** 封面图 URL */
  coverImageUrl?: string
  /** 视频时长（秒） */
  duration?: number
  /** 生成耗时（毫秒） */
  processingTime?: number
  /** 模型 ID */
  modelId: string
  /** 视频是否包含音频轨道 */
  hasAudio?: boolean
  /** 额外的返回信息 */
  extra?: Record<string, unknown>
}

// ==================== 任务状态类型 ====================

/** 任务状态信息 */
export interface TaskStatus {
  /** 任务 ID */
  taskId: string
  /** 当前状态 */
  status: TaskStatusEnum
  /** 进度百分比（0-100） */
  progress?: number
  /** 结果数据（完成时） */
  result?: ImageResult | VideoResult
  /** 错误信息（失败时） */
  error?: string
  /** 错误码 */
  errorCode?: string
  /** 任务创建时间 */
  createdAt?: string
  /** 任务更新时间 */
  updatedAt?: string
  /** 额外信息 */
  extra?: Record<string, unknown>
}

// ==================== Provider 接口 ====================

/** AI Provider 统一接口 */
export interface AIProvider {
  /** 平台名称 */
  readonly name: string

  /** 平台显示名称 */
  readonly displayName: string

  /**
   * 生成图片
   * @param options 图片生成选项
   * @returns 图片生成结果或任务 ID（异步模式）
   */
  generateImage(options: ImageOptions): Promise<ImageResult>

  /**
   * 生成视频
   * @param options 视频生成选项
   * @returns 视频生成结果或任务 ID（异步模式）
   */
  generateVideo(options: VideoOptions): Promise<VideoResult>

  /**
   * 查询任务状态
   * @param taskId 任务 ID
   * @returns 任务状态信息
   */
  getTaskStatus(taskId: string): Promise<TaskStatus>

  /**
   * 获取可用模型列表
   * @param mediaType 可选过滤媒体类型
   * @returns 模型列表
   */
  listModels(mediaType?: MediaType): Promise<Model[]>
}

// ==================== 工厂类型 ====================

/** Provider 注册信息 */
export interface ProviderRegistration {
  /** 平台名称标识 */
  name: string
  /** 平台显示名称 */
  displayName: string
  /** 平台描述 */
  description: string
  /** 工厂函数 */
  factory: (config: ProviderConfig) => AIProvider
}
