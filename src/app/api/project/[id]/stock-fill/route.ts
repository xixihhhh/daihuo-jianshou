import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { join } from "path";
import { access } from "fs/promises";
import { getDb } from "@/lib/db";
import { getDataDir } from "@/lib/paths";
import { scripts as scriptsTable, assets as assetsTable, type Shot } from "@/lib/db/schema";
import { fillShotStock } from "@/lib/stock-fill";
import { shotQuery } from "@/lib/stock-matcher";
import { mapWithConcurrency } from "@/lib/concurrency";
import type { StockSourceId, StockMediaType, StockOrientation } from "@/lib/providers/stock-types";

const SAFE_ID = /^[a-zA-Z0-9\-]+$/;

/**
 * POST /api/project/[id]/stock-fill —— for each shot in the currently selected script, auto-match one free stock asset and persist it.
 * This is the key step of "script → assets auto-fill" (non-product-theme video), reusing the multi-source asset engine with a guaranteed fallback.
 *
 * body: { source?, mediaType?, orientation?, apiKeys?, force? }
 *  - source defaults to "all" (aggregated; keyless Openverse always participates)
 *  - force=true re-fills a shot even if it already has a stock asset
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || !SAFE_ID.test(id)) {
    return NextResponse.json({ error: "无效的项目ID" }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is allowed */
  }

  const source = (body.source as StockSourceId | "all") ?? "all";
  // mediaType="auto": per-shot "video first, fall back to image if unavailable" — gets dynamic B-roll while guaranteeing every shot has a visual (no API key needed throughout)
  const autoMode = body.mediaType === "auto";
  const mediaType: StockMediaType =
    body.mediaType === "image" || body.mediaType === "audio" ? (body.mediaType as StockMediaType) : "video";
  const orientation: StockOrientation =
    body.orientation === "landscape" || body.orientation === "square" ? (body.orientation as StockOrientation) : "portrait";
  const apiKeys = (body.apiKeys as Record<string, string>) ?? {};
  const force = body.force === true;

  const db = getDb();

  // Get the selected script (fall back to the most recent one if none is selected)
  const rows = await db.select().from(scriptsTable).where(eq(scriptsTable.projectId, id));
  if (rows.length === 0) {
    return NextResponse.json({ error: "该项目还没有脚本，请先生成脚本" }, { status: 404 });
  }
  const script = rows.find((r) => r.selected) ?? rows[rows.length - 1];
  const shots = (script.shots ?? []) as Shot[];
  if (shots.length === 0) {
    return NextResponse.json({ error: "脚本没有分镜" }, { status: 400 });
  }

  // Shots that already have any asset (avoids duplicate filling and conflicts with AI/product assets on the same shot, unless force is set)
  const existing = await db
    .select({ shotId: assetsTable.shotId })
    .from(assetsTable)
    .where(eq(assetsTable.projectId, id));
  const already = new Set(existing.map((e) => e.shotId));

  // If the local material pool exists, include it in auto-fill: user-owned B-roll competes alongside free stock assets
  const materialsDir = join(getDataDir(), "uploads", id, "materials");
  let localDir: string | undefined;
  try {
    await access(materialsDir);
    localDir = materialsDir;
  } catch {
    /* no material pool; proceed with network free sources only */
  }

  const searchOpts = { apiKeys, mediaType, orientation, perPage: 10, localDir };
  type ShotFillResult = { shotId: number; ok: boolean; query: string; provider?: string; mediaType?: StockMediaType; reason?: string };

  // Per-shot searches are independent (each result depends only on itself and writes a distinct asset row); bounded concurrency (4) replaces serial execution — faster overall without hammering downstream APIs
  const results = await mapWithConcurrency<Shot, ShotFillResult>(shots, 4, async (shot) => {
    const sid = shot.shotId;
    if (!force && already.has(sid)) return { shotId: sid, ok: false, query: "", reason: "already has asset, skipped" };
    // Product-image shots do not receive free stock: the compose step uses the product image for fidelity, and free stock would overwrite it
    if (shot.visualSource === "product_image") return { shotId: sid, ok: false, query: "", reason: "product-image shot, skipped" };
    const query = shotQuery(shot);
    if (!query) return { shotId: sid, ok: false, query: "", reason: "no search query" };
    try {
      let asset = await fillShotStock({ projectId: id, shotId: sid, query, source, searchOpts });
      let usedType: StockMediaType = mediaType;
      // In auto mode, if no video was found → fall back to image to ensure the shot is never empty
      if (!asset && autoMode && mediaType !== "image") {
        asset = await fillShotStock({ projectId: id, shotId: sid, query, source, searchOpts: { ...searchOpts, mediaType: "image" } });
        usedType = "image";
      }
      return asset
        ? { shotId: sid, ok: true, query, provider: String(asset.provider), mediaType: usedType }
        : { shotId: sid, ok: false, query, reason: "no asset found" };
    } catch (e) {
      return { shotId: sid, ok: false, query, reason: e instanceof Error ? e.message : String(e) };
    }
  });

  const filled = results.filter((r) => r.ok).length;
  return NextResponse.json({ projectId: id, scriptId: script.id, total: shots.length, filled, results });
}
