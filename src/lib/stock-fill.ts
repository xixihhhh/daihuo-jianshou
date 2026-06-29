/**
 * 按分镜自动配素材 —— 用分镜的英文检索词从免费素材库取一条画面，下载落库为 stock_footage。
 * 复用多源素材引擎 + broadenQuery「永远有素材」兜底，是「脚本→素材自动配齐」的核心。
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
  /** 检索词（一般是 shot.stockKeywords 拼接，回退到描述） */
  query: string;
  source: StockSourceId | "all";
  searchOpts: StockSearchOptions;
  /** 已用过的素材 id（跨分镜去重，避免整片重复同图）；调用方维护并传入 */
  usedIds?: Set<string>;
}

/**
 * 为单个分镜检索 + 下载一条素材并落库。带「永远有素材」回退（原词无果时用更宽泛词重试）。
 * 命中返回落库的 asset 行；始终找不到返回 null。
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
      /* 单个检索词失败则换下一个 */
    }
    if (candidates.length > 0) break;
  }
  if (candidates.length === 0) return null;

  // 多候选择优：竖屏优先 + 跨分镜去重，替代「取第一条」（旧逻辑易配到横屏 / 整片重复同图）
  const scored = candidates.map((cand) => ({
    ...cand,
    id: String(cand.id), // 统一成 string，便于进 usedIds 去重 Set
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
