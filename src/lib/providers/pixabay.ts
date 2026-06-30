/**
 * Pixabay stock source (pixabay.com/api) — the only free source in the multi-source media engine that covers both video and image.
 *
 * Auth: query param ?key=<API_KEY> (shared key for images and videos). Free key: https://pixabay.com/api/docs/
 * Limits: 100 requests/60s, results must be cached for 24h; hot-linking images is forbidden (must download and cache, consistent with the existing Pexels flow).
 * Note: the video endpoint has no orientation param (portrait filtering must be done client-side via width/height); per_page minimum is 3; tags are comma-separated strings.
 */

import { type StockCandidate, type StockOrientation, fetchWithTimeout, orientationOf } from "./stock-types";

const PIXABAY_API = "https://pixabay.com/api";
const LICENSE = "Pixabay Content License";

// ==================== raw response types ====================

export interface PixabayImageHit {
  id: number;
  pageURL: string;
  tags: string;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  user: string;
  user_id: number;
}

export interface PixabayVideoFile {
  url: string;
  width: number;
  height: number;
  size: number;
  thumbnail?: string;
}

export interface PixabayVideoHit {
  id: number;
  pageURL: string;
  tags: string;
  duration: number; // seconds
  videos: {
    large?: PixabayVideoFile;
    medium?: PixabayVideoFile;
    small?: PixabayVideoFile;
    tiny?: PixabayVideoFile;
  };
  user: string;
  user_id: number;
}

// ==================== pure functions (unit-testable) ====================

/** Build the author profile URL */
export function pixabayAuthorUrl(user: string, userId: number): string {
  return `https://pixabay.com/users/${user}-${userId}/`;
}

/**
 * Pick a file from the four quality tiers of a Pixabay video:
 * Filter out entries with an empty url or size=0; prefer the smallest file whose short side >= minShortSide; fall back to the highest resolution if none qualify.
 * Pure function.
 */
export function pickPixabayVideoFile(
  videos: PixabayVideoHit["videos"],
  opts: { minShortSide?: number } = {}
): PixabayVideoFile | null {
  const { minShortSide = 720 } = opts;
  const pool = [videos.large, videos.medium, videos.small, videos.tiny].filter(
    (f): f is PixabayVideoFile => !!f && !!f.url && f.size > 0
  );
  if (pool.length === 0) return null;

  const shortSide = (f: PixabayVideoFile) => Math.min(f.width, f.height);
  const qualified = pool.filter((f) => shortSide(f) >= minShortSide);
  if (qualified.length > 0) return qualified.reduce((best, f) => (f.size < best.size ? f : best));
  return pool.reduce((best, f) => (shortSide(f) > shortSide(best) ? f : best));
}

/** Normalize a Pixabay video hit into a StockCandidate; returns null if no suitable file can be selected */
export function toPixabayVideoCandidate(
  hit: PixabayVideoHit,
  opts: { minShortSide?: number } = {}
): StockCandidate | null {
  const file = pickPixabayVideoFile(hit.videos, opts);
  if (!file) return null;
  // append ?download=1 to trigger a download (as recommended by Pixabay docs)
  const dl = file.url.includes("?") ? file.url : `${file.url}?download=1`;
  return {
    source: "pixabay",
    mediaType: "video",
    id: hit.id,
    downloadUrl: dl,
    pageUrl: hit.pageURL,
    author: hit.user || "Pixabay",
    authorUrl: pixabayAuthorUrl(hit.user, hit.user_id),
    license: LICENSE,
    requiresAttribution: false, // courtesy attribution, not legally required
    width: file.width,
    height: file.height,
    durationSec: hit.duration,
    previewImage: file.thumbnail,
  };
}

/** Normalize a Pixabay image hit into a StockCandidate (free key provides up to largeImageURL at 1280px) */
export function toPixabayImageCandidate(hit: PixabayImageHit): StockCandidate {
  return {
    source: "pixabay",
    mediaType: "image",
    id: hit.id,
    downloadUrl: hit.largeImageURL,
    pageUrl: hit.pageURL,
    author: hit.user || "Pixabay",
    authorUrl: pixabayAuthorUrl(hit.user, hit.user_id),
    license: LICENSE,
    requiresAttribution: false,
    width: hit.imageWidth,
    height: hit.imageHeight,
    previewImage: hit.webformatURL || hit.previewURL,
  };
}

// ==================== network functions ====================

/** Clamp per_page to the Pixabay valid range [3, 200] */
function clampPerPage(n: number): number {
  return Math.max(3, Math.min(200, Math.floor(n)));
}

/** Search Pixabay videos (no orientation param; portrait filtering is done via width/height) */
export async function searchPixabayVideos(
  query: string,
  opts: {
    apiKey: string;
    perPage?: number;
    minShortSide?: number;
    orientation?: StockOrientation;
    minSec?: number;
    maxSec?: number;
  }
): Promise<StockCandidate[]> {
  const { apiKey, perPage = 10, minShortSide, orientation, minSec, maxSec } = opts;
  if (!apiKey) throw new Error("缺少 Pixabay API Key");
  if (!query?.trim()) throw new Error("检索词为空");

  const params = new URLSearchParams({
    key: apiKey,
    q: query.trim(),
    per_page: String(clampPerPage(perPage)),
    safesearch: "true",
  });
  const res = await fetchWithTimeout(`${PIXABAY_API}/videos/?${params}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pixabay 视频检索失败 ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { hits?: PixabayVideoHit[] };
  let candidates = (data.hits ?? [])
    .map((h) => toPixabayVideoCandidate(h, { minShortSide }))
    .filter((c): c is StockCandidate => c !== null);

  if (orientation) {
    candidates = candidates.filter((c) => orientationOf(c.width ?? 1, c.height ?? 1) === orientation);
  }
  if (minSec != null) candidates = candidates.filter((c) => (c.durationSec ?? 0) >= minSec);
  if (maxSec != null) candidates = candidates.filter((c) => (c.durationSec ?? 0) <= maxSec);
  return candidates;
}

/** Search Pixabay images */
export async function searchPixabayImages(
  query: string,
  opts: { apiKey: string; perPage?: number; orientation?: StockOrientation }
): Promise<StockCandidate[]> {
  const { apiKey, perPage = 10, orientation = "portrait" } = opts;
  if (!apiKey) throw new Error("缺少 Pixabay API Key");
  if (!query?.trim()) throw new Error("检索词为空");

  const pixOrientation = orientation === "portrait" ? "vertical" : orientation === "landscape" ? "horizontal" : "all";
  const params = new URLSearchParams({
    key: apiKey,
    q: query.trim(),
    per_page: String(clampPerPage(perPage)),
    image_type: "photo",
    orientation: pixOrientation,
    safesearch: "true",
  });
  const res = await fetchWithTimeout(`${PIXABAY_API}/?${params}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pixabay 图片检索失败 ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { hits?: PixabayImageHit[] };
  return (data.hits ?? []).map(toPixabayImageCandidate);
}
