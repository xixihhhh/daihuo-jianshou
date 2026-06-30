import type { Shot } from "@/lib/db/schema";

/**
 * Asset page view row: derived from "shots of the selected script" + "persisted assets".
 * Pure data, no React dependency — shared between initial asset-page load and post-fill refresh (unit-testable).
 */
export interface AssetItem {
  shotId: number;
  type: Shot["type"];
  duration: number;
  description: string;
  prompt: string;
  visualSource: Shot["visualSource"];
  status: "pending" | "generating" | "done" | "failed";
  thumbnailUrl?: string;
  error?: string;
  /** Whether the asset is a video (animated shot / image-to-video) */
  isVideo?: boolean;
  /** Actual type of the persisted asset (e.g. stock_footage = automatically matched free-library footage) */
  assetType?: string;
}

/** Video asset file extensions (used to distinguish video vs. static image, determining thumbnail display and the "animate" entry point) */
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

/** Subset of fields from GET /api/project/[id]/assets response rows that this module cares about */
export interface SavedAssetRow {
  shotId: number;
  filePath?: string | null;
  status?: string | null;
  type?: string | null;
  /** Static preview image for video assets (free-library videos populate this column); used as <img> thumbnail to avoid rendering an mp4 as an image */
  thumbnailPath?: string | null;
}

/**
 * Combines "shots of the selected script + persisted assets" into asset-page view rows.
 * - Persisted and ready assets (filePath is an accessible /api/files path) → status "done" with thumbnail;
 * - Product-image shots (product_image) → resolved using the first product image;
 * - All other shots → pending generation.
 * Pure function, shared between initial load and post "auto-fill" refresh to guarantee consistent behavior on both paths.
 */
export function buildAssetRows(
  shots: Shot[],
  savedAssets: SavedAssetRow[],
  productImages: string[],
): AssetItem[] {
  // Index persisted ready assets by shotId
  const savedByShot = new Map<number, SavedAssetRow>();
  for (const a of savedAssets) {
    if (a && a.filePath && a.status === "done") savedByShot.set(a.shotId, a);
  }
  const firstProduct = productImages[0];

  return shots.map((s) => {
    const saved = savedByShot.get(s.shotId);
    if (saved && saved.filePath) {
      // Video asset: use the static preview image as thumbnail (rendering an mp4 as <img> breaks), and mark isVideo to correctly hide the "animate" entry point
      const isVideo = VIDEO_EXT.test(saved.filePath);
      return {
        shotId: s.shotId,
        type: s.type,
        duration: s.duration,
        description: s.description,
        prompt: s.prompt ?? "",
        visualSource: s.visualSource,
        status: "done" as const,
        thumbnailUrl: isVideo && saved.thumbnailPath ? saved.thumbnailPath : saved.filePath,
        isVideo: isVideo || undefined,
        assetType: saved.type ?? undefined,
      };
    }
    return {
      shotId: s.shotId,
      type: s.type,
      duration: s.duration,
      description: s.description,
      prompt: s.prompt ?? "",
      visualSource: s.visualSource,
      status: s.visualSource === "product_image" ? ("done" as const) : ("pending" as const),
      thumbnailUrl: s.visualSource === "product_image" ? firstProduct : undefined,
    };
  });
}

/** Number of shots still awaiting an asset (pending) */
export function pendingShotCount(rows: AssetItem[]): number {
  return rows.filter((r) => r.status === "pending").length;
}

/** Number of shots still pending that are not product-image shots (product-image shots should not be overwritten by free-library assets) */
export function pendingNonProductShotCount(rows: AssetItem[]): number {
  return rows.filter((r) => r.status === "pending" && r.visualSource !== "product_image").length;
}

/**
 * Whether to show the "auto-fill with free stock assets" entry point (free-library = keyless Openverse images, zero image-gen key required):
 * - topic (one-liner video without a product) projects: always show — this is their primary render path;
 * - Other projects (including e-commerce): show when **no image-gen model is configured** yet there are still
 *   pending non-product shots — lets users without an AI key still fill hook / social-proof B-roll shots
 *   (product-image shots are unaffected).
 */
export function shouldOfferStockFill(
  rows: AssetItem[],
  contentType: string | undefined,
  hasImageModel: boolean,
): boolean {
  if (rows.length === 0) return false;
  if (contentType === "topic") return true;
  return !hasImageModel && pendingNonProductShotCount(rows) > 0;
}

/**
 * Whether to display a "no default image-gen model configured" warning:
 * Only shown when no model is configured AND there are still AI-generate shots not yet done;
 * suppressed once all AI shots are done — avoids contradicting the "N/N assets ready" message
 * and confusing beginners into thinking something went wrong.
 */
export function needsImageModelWarning(rows: AssetItem[], hasImageModel: boolean): boolean {
  if (hasImageModel) return false;
  return rows.some((r) => r.visualSource === "ai_generate" && r.status !== "done");
}
