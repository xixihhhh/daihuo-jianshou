/**
 * 平台导出 & 视频下载 API
 * POST /api/ai/export - 导出视频到指定平台
 * GET  /api/ai/export - 获取平台列表
 */

import { NextRequest, NextResponse } from "next/server"
import { exportToPlatform, PLATFORM_CONFIGS } from "@/lib/platform-export"
import type { ExportRequest, PlatformId } from "@/lib/platform-export"

// @ts-nocheck - 跳过类型检查

// 获取平台列表
export async function GET() {
  const platforms = Object.values(PLATFORM_CONFIGS).map((p) => ({
    id: p.id,
    name: p.name,
    icon: p.icon,
    color: p.color,
    ratio: p.ratio,
    resolution: `${p.resolution.width}x${p.resolution.height}`,
    bitrate: p.bitrate,
    fps: p.fps,
    maxDuration: p.maxDuration,
    subtitleStyle: p.subtitleStyle,
  }))

  return NextResponse.json({
    success: true,
    platforms,
  })
}

// 导出视频到平台
export async function POST(req: NextRequest) {
  try {
    const body: ExportRequest = await req.json()
    const { videoUrl, platform, title, description, coverUrl, watermark, subtitle, abTest } = body

    // 参数验证
    if (!videoUrl) {
      return NextResponse.json({ error: "缺少视频URL" }, { status: 400 })
    }
    if (!platform) {
      return NextResponse.json({ error: "缺少目标平台" }, { status: 400 })
    }

    const validPlatforms = Object.keys(PLATFORM_CONFIGS) as PlatformId[]
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        {
          error: `不支持的平台: ${platform}`,
          supported: validPlatforms,
        },
        { status: 400 }
      )
    }

    // 执行导出
    const result = await exportToPlatform(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "导出失败" },
        { status: 500 }
      )
    }

    // 记录导出日志
    console.log(`[Export API] ✅ ${platform} 导出成功: ${result.processedUrl}`)
    if (result.variants?.length) {
      console.log(`[Export API]   A/B 变体: ${result.variants.map((v) => v.id).join(", ")}`)
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        platform: PLATFORM_CONFIGS[platform].name,
        title: title || "带货视频",
        description: description || "",
        exportedAt: new Date().toISOString(),
        // 平台发布建议
        tips: getPlatformTips(platform),
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "导出请求处理失败"
    console.error("[Export API] ❌", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// 平台发布建议
function getPlatformTips(platform: PlatformId): string[] {
  const tips: Record<PlatformId, string[]> = {
    douyin: [
      "视频时长建议 15-60 秒",
      "前 3 秒要有强钩子抓住注意力",
      "添加热门话题标签",
      "封面要突出产品卖点",
      "建议添加字幕（居中+描边效果更佳）",
    ],
    kuaishou: [
      "视频时长建议 30-90 秒",
      "标题要包含关键词，方便搜索",
      "老铁文化：文案要接地气",
      "建议添加字幕（贴边框样式）",
      "封面文字要大字醒目",
    ],
    xiaohongshu: [
      "视频时长建议 15-60 秒",
      "封面设计要精致、有氛围感",
      "文案要分享真实使用体验",
      "建议使用手写字体字幕",
      "添加相关话题标签",
    ],
    bilibili: [
      "视频时长建议 3-5 分钟",
      "内容要有深度、有梗",
      "弹幕互动能增加推荐权重",
      "标题要吸引点击但不夸张",
      "建议字幕放在上方区域",
    ],
    weixin: [
      "视频时长建议 30-120 秒",
      "朋友圈分享时标题很重要",
      "封面要简洁有辨识度",
      "建议添加公众号引导关注",
    ],
  }
  return tips[platform] || []
}
