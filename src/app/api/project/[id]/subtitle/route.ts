import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { scripts as scriptsTable } from "@/lib/db/schema";
import { shotsToSrt, shotsToVtt } from "@/lib/subtitle-export";

const SAFE_ID = /^[a-zA-Z0-9\-]+$/;

/**
 * GET /api/project/[id]/subtitle?format=srt|vtt —— export the latest script's subtitles (SRT / WebVTT, direct browser download).
 * Timestamps are accumulated from the planned shot durations in the script, for use in re-editing, platform-native captions, accessibility, or proofreading (the final video still has burnt-in subtitles).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || !SAFE_ID.test(id)) return NextResponse.json({ error: "无效的项目ID" }, { status: 400 });

  const format = new URL(req.url).searchParams.get("format") === "vtt" ? "vtt" : "srt";

  const db = getDb();
  const [script] = await db
    .select({ shots: scriptsTable.shots })
    .from(scriptsTable)
    .where(eq(scriptsTable.projectId, id))
    .orderBy(desc(scriptsTable.version))
    .limit(1);

  if (!script) return NextResponse.json({ error: "该项目还没有脚本，先生成脚本再导出字幕" }, { status: 404 });
  const shots = Array.isArray(script.shots) ? script.shots : [];
  if (!shots.some((s) => (s?.voiceover ?? "").trim())) {
    return NextResponse.json({ error: "脚本没有可导出的旁白文案" }, { status: 422 });
  }

  const text = format === "vtt" ? shotsToVtt(shots) : shotsToSrt(shots);
  const mime = format === "vtt" ? "text/vtt; charset=utf-8" : "application/x-subrip; charset=utf-8";
  return new NextResponse(text, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="subtitle-${id}.${format}"`,
    },
  });
}
