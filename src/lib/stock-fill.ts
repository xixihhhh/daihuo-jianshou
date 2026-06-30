/**
 * Auto-fill stock footage for each shot — fetch one clip/image from a free stock library
 * using the shot's English search keywords, then download and persist it as stock_footage.
 * Reuses the multi-source stock engine + broadenQuery "always-has-results" fallback;
 * this is the core of the "script → auto-matched assets" pipeline.
 */
import { mkdir } from "fs/promises";
import { join, basename } from "path";
import { getUploadsDir } from "@/lib/paths";
import { downloadStockFile, orientationOf, type StockSourceId } from "@/lib/providers/stock-types";
import { searchStock, searchAllStock, type StockSearchOptions } from "@/lib/providers/stock-registry";
import { broadenQuery, pickBestCandidate } from "@/lib/stock-matcher";
import { getDb } from "@/lib/db";
import { assets as assetsTable } from "@/lib/db/schema";

export interface FillShotInput {
  projectId: string;
  shotId: number;
  /** Search query (typically shot.stockKeywords joined, falls back to description) */
  query: string;
  source: StockSourceId | "all";
  searchOpts: StockSearchOptions;
  /** IDs of stock items already used (deduplication across shots to avoid the same image repeating throughout the video); maintained and passed in by the caller */
  usedIds?: Set<string>;
}

/**
 * Search, download, and persist one stock asset for a single shot.
 * Includes the "always-has-results" fallback (retries with broader queries when the original yields nothing).
 * Returns the persisted asset row on success, or null if nothing could be found.
 */
export async function fillShotStock(input: FillShotInput): Promise<Record<string, unknown> | null> {
  const { projectId, shotId, query, source, searchOpts, usedIds } = input;

  let candidates: Awaited<ReturnType<typeof searchStock>> = [];
  for (const q of [query, ...broadenQuery(query)]) {
    if (!q?.trim()) continue;
    try {
      candidates =
        source === "all" ? (await searchAllStock(q, searchOpts)).candidates : await searchStock(source, q, searchOpts);
    } catch {
      /* individual query failed — try the next one */
    }
    if (candidates.length > 0) break;
  }
  if (candidates.length === 0) return null;

  // Pick the best candidate: prefer portrait orientation + deduplicate across shots, instead of just taking the first result (the old logic often produced landscape clips or repeated the same image throughout)
  const scored = candidates.map((cand) => ({
    ...cand,
    id: String(cand.id), // normalize to string so it can be stored in the usedIds dedup Set
    orientation: cand.width && cand.height ? orientationOf(cand.width, cand.height) : undefined,
    type: cand.mediaType === "video" ? ("video" as const) : ("image" as const),
  }));
  const c = pickBestCandidate({ description: query }, scored, { preferPortrait: true, usedIds }) ?? scored[0];
  usedIds?.add(c.id);
  const stockDir = join(getUploadsDir(), projectId, "stock");
  await mkdir(stockDir, { recursive: true });
  const base = `${c.source}_${c.id}_${Date.now()}_${shotId}`;
  const { filePath } = await downloadStockFile(c.downloadUrl, stockDir, base, c.mediaType);
  const publicUrl = `/api/files/${projectId}/stock/${basename(filePath)}`;

  const [row] = await getDb()
    .insert(assetsTable)
    .values({
      projectId,
      shotId,
      type: "stock_footage",
      filePath: publicUrl,
      thumbnailPath: c.previewImage ?? null,
      provider: c.source,
      prompt: query,
      sourceUrl: c.pageUrl,
      author: c.author,
      license: c.license,
      status: "done",
    })
    .returning();

  return { ...row, mediaType: c.mediaType, attributionText: c.attributionText };
}
