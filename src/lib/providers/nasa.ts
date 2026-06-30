/**
 * NASA Image and Video Library media source — public-domain imagery from images.nasa.gov (Earth/space/science footage), no API key required.
 *
 * Two-step retrieval: the search endpoint returns a list of items with preview images; each item's collection.json
 * then lists the actual downloadable files (pick mp4 / largest image).
 * Most NASA imagery is public domain (a few items with identifiable logos/faces have restrictions);
 * sufficient for B-roll use — retaining "NASA" attribution is recommended.
 */

import { fetchWithTimeout, type StockCandidate, type StockMediaType } from "./stock-types";

const NASA_SEARCH = "https://images-api.nasa.gov/search";

/** Pick a suitable mp4 from the file URL list in collection.json (prefer medium quality, avoid ~orig.mov), and upgrade to https. Pure function. */
export function pickNasaVideoUrl(urls: string[]): string | null {
  const mp4 = urls.filter((u) => u.toLowerCase().endsWith(".mp4"));
  const byTag = (tag: string) => mp4.find((u) => u.includes(`~${tag}.mp4`));
  const pick = byTag("medium") || byTag("large") || byTag("mobile") || byTag("small") || mp4[0] || null;
  return pick ? pick.replace(/^http:/, "https:") : null;
}

/** Pick an appropriately sized image from the file URL list in collection.json, and upgrade to https. Pure function. */
export function pickNasaImageUrl(urls: string[]): string | null {
  const img = urls.filter((u) => /\.(jpe?g|png)$/i.test(u));
  const byTag = (tag: string) => img.find((u) => u.includes(`~${tag}.`));
  const pick = byTag("large") || byTag("medium") || byTag("orig") || img[0] || null;
  return pick ? pick.replace(/^http:/, "https:") : null;
}

interface NasaSearchOptions {
  perPage?: number;
}

async function searchNasa(query: string, mediaType: Extract<StockMediaType, "video" | "image">, opts: NasaSearchOptions = {}): Promise<StockCandidate[]> {
  const perPage = Math.max(1, Math.min(12, opts.perPage ?? 6));
  let items: unknown[];
  try {
    const res = await fetchWithTimeout(`${NASA_SEARCH}?q=${encodeURIComponent(query)}&media_type=${mediaType}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { collection?: { items?: unknown[] } };
    items = (data.collection?.items ?? []).slice(0, perPage);
  } catch {
    return [];
  }

  const settled = await Promise.allSettled(
    items.map(async (raw): Promise<StockCandidate | null> => {
      const it = raw as { href?: string; data?: Array<Record<string, unknown>>; links?: Array<Record<string, unknown>> };
      if (typeof it.href !== "string") return null;
      const d = it.data?.[0] ?? {};
      const link = it.links?.[0] ?? {};
      const assetRes = await fetchWithTimeout(it.href);
      if (!assetRes.ok) return null;
      const urls = (await assetRes.json()) as string[];
      if (!Array.isArray(urls)) return null;
      const downloadUrl = mediaType === "video" ? pickNasaVideoUrl(urls) : pickNasaImageUrl(urls);
      if (!downloadUrl) return null;
      const nasaId = typeof d.nasa_id === "string" ? d.nasa_id : "";
      return {
        source: "nasa",
        mediaType,
        id: nasaId,
        downloadUrl,
        pageUrl: nasaId ? `https://images.nasa.gov/details-${nasaId}` : "",
        author: typeof d.center === "string" && d.center ? `NASA / ${d.center}` : "NASA",
        authorUrl: "https://www.nasa.gov",
        license: "Public Domain (NASA)",
        requiresAttribution: false,
        width: Number(link.width) || undefined,
        height: Number(link.height) || undefined,
        previewImage: typeof link.href === "string" ? link.href : undefined,
      };
    }),
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<StockCandidate> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);
}

export function searchNasaVideos(query: string, opts: NasaSearchOptions = {}): Promise<StockCandidate[]> {
  return searchNasa(query, "video", opts);
}
export function searchNasaImages(query: string, opts: NasaSearchOptions = {}): Promise<StockCandidate[]> {
  return searchNasa(query, "image", opts);
}
