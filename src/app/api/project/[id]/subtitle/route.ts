import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { scripts as scriptsTable } from "@/lib/db/schema";
import { shotsToSrt, shotsToVtt } from "@/lib/subtitle-export";

const SAFE_ID = /^[a-zA-Z0-9\-]+$/;

/**
 * GET /api/project/[id]/subtitle?format=srt|vtt —— 导出最新脚本的字幕（SRT / WebVTT，浏览器直接下载）。
 * 时间轴按脚本规划时长累加，供创作者二次剪辑 / 平台原生字幕 / 无障碍 / 再校对使用（成片仍内烧字幕）。
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
