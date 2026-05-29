/**
 * 平台导出服务
 * 管理各平台视频导出配置、转码参数、水印模板
 */

export type PlatformId = 'douyin' | 'kuaishou' | 'xiaohongshu' | 'bilibili' | 'weixin'

export interface PlatformInfo {
  id: PlatformId
  name: string
  icon: string
  color: string
  ratio: string
  resolution: { width: number; height: number }
  bitrate: number // kbps
  fps: number
  maxDuration: number // 秒
  subtitleStyle: 'center_stroke' | 'border' | 'handwrite' | 'top'
  allowWatermark: boolean
}

export interface ExportRequest {
  videoUrl: string
  platform: PlatformId
  title?: string
  description?: string
  coverUrl?: string
  watermark?: {
    text?: string
    logoUrl?: string
    position?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center'
  }
  subtitle?: {
    enabled: boolean
    text?: string
    style?: 'bottom' | 'center' | 'top'
  }
  /** A/B 测试: 同时导出多个变体 */
  abTest?: {
    enabled: boolean
    variants: Array<{
      id: string
      title: string
      hook?: string
      subtitleText?: string
    }>
  }
}

export interface ExportResult {
  success: boolean
  platform: PlatformId
  processedUrl?: string
  coverUrl?: string
  fileSize?: number
  duration?: number
  variants?: Array<{
    id: string
    url: string
    fileSize: number
  }>
  error?: string
}

// 各平台配置
export const PLATFORM_CONFIGS: Record<PlatformId, PlatformInfo> = {
  douyin: {
    id: 'douyin',
    name: '抖音',
    icon: '🎵',
    color: 'from-pink-500 to-red-500',
    ratio: '9:16',
    resolution: { width: 1080, height: 1920 },
    bitrate: 6000,
    fps: 30,
    maxDuration: 300,
    subtitleStyle: 'center_stroke',
    allowWatermark: true,
  },
  kuaishou: {
    id: 'kuaishou',
    name: '快手',
    icon: '📹',
    color: 'from-orange-500 to-amber-500',
    ratio: '9:16',
    resolution: { width: 1080, height: 1920 },
    bitrate: 5000,
    fps: 30,
    maxDuration: 300,
    subtitleStyle: 'border',
    allowWatermark: false,
  },
  xiaohongshu: {
    id: 'xiaohongshu',
    name: '小红书',
    icon: '📕',
    color: 'from-red-500 to-rose-500',
    ratio: '3:4',
    resolution: { width: 1080, height: 1440 },
    bitrate: 4000,
    fps: 24,
    maxDuration: 900,
    subtitleStyle: 'handwrite',
    allowWatermark: false,
  },
  bilibili: {
    id: 'bilibili',
    name: 'B站',
    icon: '📺',
    color: 'from-blue-500 to-cyan-500',
    ratio: '16:9',
    resolution: { width: 1920, height: 1080 },
    bitrate: 8000,
    fps: 60,
    maxDuration: 7200,
    subtitleStyle: 'top',
    allowWatermark: false,
  },
  weixin: {
    id: 'weixin',
    name: '微信视频号',
    icon: '💬',
    color: 'from-green-500 to-emerald-500',
    ratio: '9:16',
    resolution: { width: 1080, height: 1920 },
    bitrate: 4000,
    fps: 30,
    maxDuration: 3600,
    subtitleStyle: 'center_stroke',
    allowWatermark: false,
  },
}

/**
 * 导出视频到指定平台
 * - 分辨率适配
 * - 码率调整
 * - 添加水印
 * - 字幕处理
 * - 封面生成
 */
export async function exportToPlatform(
  request: ExportRequest
): Promise<ExportResult> {
  const { videoUrl, platform, title, coverUrl, watermark, subtitle, abTest } = request
  const config = PLATFORM_CONFIGS[platform]

  if (!config) {
    return { success: false, platform, error: `不支持的平台: ${platform}` }
  }

  try {
    // 1. 远程获取视频（模拟）
    console.log(`[平台导出] 处理 ${config.name} 视频...`)
    console.log(`  源视频: ${videoUrl}`)
    console.log(`  目标分辨率: ${config.resolution.width}x${config.resolution.height}`)
    console.log(`  目标码率: ${config.bitrate}kbps`)

    // 2. 模拟转码处理
    const processedUrl = `${videoUrl}?processed=true&platform=${platform}&ts=${Date.now()}`
    const generatedCover = coverUrl || `${videoUrl.replace(/\.mp4$/, '')}_${platform}_cover.jpg`

    // 3. 处理水印
    if (watermark?.text) {
      console.log(`  添加水印: "${watermark.text}" 位置: ${watermark.position || 'bottomRight'}`)
    }

    // 4. 处理字幕
    if (subtitle?.enabled && subtitle.text) {
      console.log(`  添加字幕: "${subtitle.text.slice(0, 30)}..." 样式: ${subtitle.style || 'bottom'}`)
    }

    const result: ExportResult = {
      success: true,
      platform,
      processedUrl,
      coverUrl: generatedCover,
      fileSize: Math.round(config.resolution.width * config.resolution.height * config.bitrate / 1000000),
      duration: 30,
    }

    // 5. A/B 测试变体
    if (abTest?.enabled && abTest.variants && abTest.variants.length > 0) {
      result.variants = abTest.variants.map((v) => ({
        id: v.id,
        url: `${videoUrl}?variant=${v.id}&platform=${platform}`,
        fileSize: result.fileSize || 0,
      }))
      console.log(`  A/B 测试: ${result.variants.length} 个变体`)
    }

    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : '导出失败'
    console.error(`[平台导出] ${config.name} 导出失败:`, msg)
    return { success: false, platform, error: msg }
  }
}
