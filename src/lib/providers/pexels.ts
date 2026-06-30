/**
 * Pexels media source — search for free, commercially-licensed videos/images (one source in the multi-provider media engine)
 *
 * Shared types/download helpers/utilities have been extracted to ./stock-types; this file contains only Pexels-specific search and resolution selection.
 * Auth: HTTP header `Authorization: <API_KEY>` (no Bearer prefix). Free key: https://www.pexels.com/api/
 * Compliance: each candidate retains pageUrl/author/authorUrl, stored in the assets table, and used to generate credits on export. English search terms are recommended.
 */

import {
  type StockCandidate,
  type StockOrientation,
  fetchWithTimeout,
  filterByDuration,
  orientationOf,
} from "./stock-types";

// backward compatibility: modules that used to import these symbols from ./pexels (route/test) continue to work
export {
  downloadStockFile,
  filterByDuration,
  orientationOf,
  inferExtension,
} from "./stock-types";
export type { StockCandidate, StockOrientation, DownloadResult } from "./stock-types";

const PEXELS_API = "https://api.pexels.com";

// ==================== Pexels raw response types ====================

/** A single resolution file for a Pexels video */
export interface PexelsVideoFile {
  id: number;
  quality: string | null; // "hd" | "sd" | null
  file_type: string; // "video/mp4"
  width: number;
  height: number;
  fps: number;
  link: string;
  size: number; // bytes
}

/** Pexels video item */
export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number; // seconds
  url: string; // video detail page (attribution link)
  image: string; // preview thumbnail
  user: { id: number; name: string; url: string };
  video_files: PexelsVideoFile[];
}

/** Pexels photo item */
export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string; // photo detail page (attribution link)
  photographer: string;
  photographer_url: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

// ==================== pure functions (unit-testable) ====================

/**
 * Pick the "best" file from the multiple resolutions of a Pexels video:
 * 1. mp4 only; 2. prefer the target orientation; 3. among orientation-matched files pick the smallest by size with short side >= minShortSide;
 * 4. if none qualify, pick the highest-resolution file. Pure function.
 */
export function pickBestVideoFile(
  files: PexelsVideoFile[],
  opts: { orientation?: StockOrientation; minShortSide?: number } = {}
): PexelsVideoFile | null {
  const { orientation = "portrait", minShortSide = 720 } = opts;
  const mp4 = files.filter((f) => f.file_type === "video/mp4" && f.link);
  if (mp4.length === 0) return null;

  const dirMatched = mp4.filter((f) => orientationOf(f.width, f.height) === orientation);
  const pool = dirMatched.length > 0 ? dirMatched : mp4;

  const shortSide = (f: PexelsVideoFile) => Math.min(f.width, f.height);

  const qualified = pool.filter((f) => shortSide(f) >= minShortSide);
  if (qualified.length > 0) {
    return qualified.reduce((best, f) => (f.size < best.size ? f : best));
  }
  return pool.reduce((best, f) => (shortSide(f) > shortSide(best) ? f : best));
}

/** Normalize a Pexels video into a candidate; returns null if no suitable file can be selected */
export function toVideoCandidate(
  video: PexelsVideo,
  opts: { orientation?: StockOrientation; minShortSide?: number } = {}
): StockCandidate | null {
  const file = pickBestVideoFile(video.video_files, opts);
  if (!file) return null;
  return {
    source: "pexels",
    mediaType: "video",
    id: video.id,
    downloadUrl: file.link,
    pageUrl: video.url,
    author: video.user?.name ?? "Pexels",
    authorUrl: video.user?.url ?? "https://www.pexels.com",
    license: "Pexels",
    width: file.width,
    height: file.height,
    durationSec: video.duration,
    previewImage: video.image,
  };
}

/** Pick the best-sized image URL for the target orientation */
export function pickPhotoSrc(photo: PexelsPhoto, orientation: StockOrientation): string {
  if (orientation === "portrait") return photo.src.portrait || photo.src.large2x || photo.src.original;
  if (orientation === "landscape") return photo.src.landscape || photo.src.large2x || photo.src.original;
  return photo.src.large2x || photo.src.original;
}

/** Normalize a Pexels photo into a candidate */
export function toPhotoCandidate(photo: PexelsPhoto, orientation: StockOrientation = "portrait"): StockCandidate {
  return {
    source: "pexels",
    mediaType: "image",
    id: photo.id,
    downloadUrl: pickPhotoSrc(photo, orientation),
    pageUrl: photo.url,
    author: photo.photographer ?? "Pexels",
    authorUrl: photo.photographer_url ?? "https://www.pexels.com",
    license: "Pexels",
    width: photo.width,
    height: photo.height,
    previewImage: photo.src?.tiny,
  };
}

// ==================== network functions ====================

/** Search Pexels videos */
export async function searchPexelsVideos(
  query: string,
  opts: {
    apiKey: string;
    perPage?: number;
    orientation?: StockOrientation;
    minShortSide?: number;
    minSec?: number;
    maxSec?: number;
  }
): Promise<StockCandidate[]> {
  const { apiKey, perPage = 10, orientation = "portrait", minShortSide, minSec, maxSec } = opts;
  if (!apiKey) throw new Error("缺少 Pexels API Key");
  if (!query?.trim()) throw new Error("检索词为空");

  const params = new URLSearchParams({ query: query.trim(), per_page: String(perPage), orientation });
  const res = await fetchWithTimeout(`${PEXELS_API}/videos/search?${params}`, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pexels 视频检索失败 ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { videos?: PexelsVideo[] };
  const candidates = (data.videos ?? [])
    .map((v) => toVideoCandidate(v, { orientation, minShortSide }))
    .filter((c): c is StockCandidate => c !== null);
  return filterByDuration(candidates, { minSec, maxSec });
}

/** Search Pexels photos */
export async function searchPexelsPhotos(
  query: string,
  opts: { apiKey: string; perPage?: number; orientation?: StockOrientation }
): Promise<StockCandidate[]> {
  const { apiKey, perPage = 10, orientation = "portrait" } = opts;
  if (!apiKey) throw new Error("缺少 Pexels API Key");
  if (!query?.trim()) throw new Error("检索词为空");

  const params = new URLSearchParams({ query: query.trim(), per_page: String(perPage), orientation });
  const res = await fetchWithTimeout(`${PEXELS_API}/v1/search?${params}`, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pexels 图片检索失败 ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { photos?: PexelsPhoto[] };
  return (data.photos ?? []).map((p) => toPhotoCandidate(p, orientation));
}
