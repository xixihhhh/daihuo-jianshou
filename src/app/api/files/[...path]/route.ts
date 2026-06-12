import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, normalize, sep } from "path";
import { existsSync } from "fs";

// 静态文件服务 - 提供上传的图片/视频访问
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  // 上传根目录
  const uploadsRoot = join(process.cwd(), "data", "uploads");
  // 解码并归一化路径后再拼接，防止 ..%2f 等编码绕过造成路径穿越
  const decodedSegments = path.map((seg) => decodeURIComponent(seg));
  const filePath = normalize(join(uploadsRoot, ...decodedSegments));

  // 校验最终路径必须仍位于上传根目录内
  if (filePath !== uploadsRoot && !filePath.startsWith(uploadsRoot + sep)) {
    return NextResponse.json({ error: "非法路径" }, { status: 403 });
  }

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const buffer = await readFile(filePath);
  const ext = filePath.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    webm: "video/webm",
  };

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeTypes[ext || ""] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000",
    },
  });
}
