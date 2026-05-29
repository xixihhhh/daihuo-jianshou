/**
 * 视频下载代理 API
 * POST /api/ai/download - 后端代理下载视频（解决跨域、大文件支持）
 */

import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url: videoUrl, fileName } = body

    if (!videoUrl) {
      return NextResponse.json({ error: "缺少视频URL" }, { status: 400 })
    }

    // 从远程获取视频流
    const response = await fetch(videoUrl)
    if (!response.ok) {
      return NextResponse.json(
        { error: `远程视频获取失败: HTTP ${response.status}` },
        { status: 502 }
      )
    }

    // 获取视频数据
    const blob = await response.blob()
    const safeName = fileName || `video_${Date.now()}.mp4`

    // 返回文件流
    return new NextResponse(blob, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "video/mp4",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}"`,
        "Content-Length": String(blob.size),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "下载失败"
    console.error("[Download API] ❌", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
