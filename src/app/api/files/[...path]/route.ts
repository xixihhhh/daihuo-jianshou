import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// 静态文件服务 - 提供上传的图片/视频访问
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filePath = join(process.cwd(), "data", "uploads", ...path);

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
