import { NextRequest, NextResponse } from "next/server";
import { getDataDir } from "@/lib/paths";
import { ffmpegBin } from "@/lib/ffmpeg-path";
import { join } from "path";
import { existsSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { getDb } from "@/lib/db";
import { compositions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { PLATFORM_SPECS } from "@/lib/platform-specs";

const execAsync = promisify(exec);

// Target dimensions per platform (single source of truth in platform-specs.ts, including TikTok Shop)
const PLATFORM_SIZE = PLATFORM_SPECS;

/**
 * Re-encode the finished video to the target aspect ratio for a given platform.
 * Uses "blur-pad": an enlarged-and-cropped blurred background with the proportionally scaled
 * foreground centered on top — no subtitles/overlays are cropped and no letterboxing is added
 * (standard treatment for short-form commerce videos).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!/^[a-zA-Z0-9-]+$/.test(id)) {
      return NextResponse.json({ error: "无效的项目ID" }, { status: 400 });
    }
    const { platform } = await req.json();
    const target = PLATFORM_SIZE[platform];
    if (!target) {
      return NextResponse.json({ error: "不支持的平台" }, { status: 400 });
    }

    // Fetch the most recent composed video
    const db = getDb();
    const rows = await db
      .select()
      .from(compositions)
      .where(eq(compositions.projectId, id))
      .orderBy(desc(compositions.createdAt))
      .limit(1);
    const src = rows[0]?.outputPath;
    if (!src || !existsSync(src)) {
      return NextResponse.json({ error: "还没有成片，请先合成视频" }, { status: 400 });
    }

    const { w, h } = target;
    const outFile = join(getDataDir(), "output", id, `${platform}-${Date.now()}.mp4`);
    // Blur-pad: [bg] scale-up, crop, and blur; [fg] scale to fit proportionally; overlay centered
    const filter =
      `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=24:4[bg];` +
      `[0:v]scale=${w}:${h}:force_original_aspect_ratio=decrease[fg];` +
      `[bg][fg]overlay=(W-w)/2:(H-h)/2`;
    // -map_metadata 0 explicitly carries source metadata into the output (important: this propagates the implicit AIGC compliance markers to the platform export — this is what the user actually uploads)
    const cmd =
      `"${ffmpegBin()}" -y -i "${src}" -filter_complex "${filter}" ` +
      `-map_metadata 0 -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart ` +
      `-c:a aac -b:a 192k "${outFile}"`;

    await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });

    const fileName = outFile.split("/").pop() ?? "";
    return NextResponse.json({
      success: true,
      platform,
      platformName: target.name,
      url: `/api/output/${id}/${fileName}`,
      size: `${w}x${h}`,
    });
  } catch (error) {
    console.error("多平台导出失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "导出失败" },
      { status: 500 }
    );
  }
}
