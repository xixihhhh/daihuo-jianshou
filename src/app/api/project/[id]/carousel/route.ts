import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { join } from "path";
import { getDb } from "@/lib/db";
import { getDataDir } from "@/lib/paths";
import { scripts as scriptsTable, type Shot } from "@/lib/db/schema";
import { generateCarousel } from "@/lib/video-composer/carousel";

const SAFE_ID = /^[a-zA-Z0-9\-]+$/;

/**
 * POST /api/project/[id]/carousel — render an image-card carousel from the selected script
 * (title card + one card per shot's voiceover) for image-first platforms like Xiaohongshu.
 * body: { width?: number, height?: number } (defaults to 1080×1440, 3:4)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || !SAFE_ID.test(id)) return NextResponse.json({ error: "无效的项目ID" }, { status: 400 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* allow empty body; defaults applied below */
  }
  const width = Number(body.width) > 0 ? Math.min(1920, Math.round(Number(body.width))) : 1080;
  const height = Number(body.height) > 0 ? Math.min(1920, Math.round(Number(body.height))) : 1440;

  const db = getDb();
  const rows = await db.select().from(scriptsTable).where(eq(scriptsTable.projectId, id)).orderBy(desc(scriptsTable.version));
  if (!rows.length) return NextResponse.json({ error: "该项目还没有脚本" }, { status: 404 });
  const script = rows.find((r) => r.selected) ?? rows[0];
  const shots = (script.shots ?? []) as Shot[];
  if (!shots.some((s) => (s?.voiceover ?? "").trim())) {
    return NextResponse.json({ error: "脚本没有可生成卡片的旁白文案" }, { status: 422 });
  }

  const prefix = `card-${Date.now()}`;
  const outDir = join(getDataDir(), "uploads", id, "carousel");
  try {
    const files = await generateCarousel({
      title: script.title || "图文",
      shots,
      outDir,
      prefix,
      width,
      height,
    });
    const cards = files.map((f) => `/api/files/${id}/carousel/${f.split("/").pop()}`);
    return NextResponse.json({ count: cards.length, cards });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "卡片生成失败" }, { status: 500 });
  }
}
