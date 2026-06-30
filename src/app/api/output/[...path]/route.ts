import { NextRequest, NextResponse } from "next/server";
import { getDataDir } from "@/lib/paths";
import { readFile, stat } from "fs/promises";
import { join, normalize, sep } from "path";
import { existsSync } from "fs";

// File server for composed output (video) — serves finished clips under data/output for playback and download
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  const outputRoot = join(getDataDir(), "output");
  // Decode and normalize the path to prevent path traversal via encoded sequences like ..%2f
  const decodedSegments = path.map((seg) => decodeURIComponent(seg));
  const filePath = normalize(join(outputRoot, ...decodedSegments));

  if (filePath !== outputRoot && !filePath.startsWith(outputRoot + sep)) {
    return NextResponse.json({ error: "非法路径" }, { status: 403 });
  }

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const buffer = await readFile(filePath);
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
  };

  // Optional download: when ?download=1 is present, instruct the browser to download the file
  const download = req.nextUrl.searchParams.get("download");
  const fileName = filePath.split(sep).pop() ?? "video.mp4";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeTypes[ext || ""] || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
      ...(download ? { "Content-Disposition": `attachment; filename="${fileName}"` } : {}),
    },
  });
}
