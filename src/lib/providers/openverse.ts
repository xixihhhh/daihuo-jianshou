/**
 * Openverse media source (api.openverse.org, maintained by WordPress) — the "no API key" source in the multi-provider media engine
 *
 * Primary value: fully key-free search (anonymous access), covering CC-licensed images + music/sound effects — ideal out-of-the-box for new users.
 * Limitations: no video endpoint; anonymous quota is 20/min · 200/day (OAuth2 token can be configured for higher limits in production).
 * Compliance: CC-aggregated sources have mixed licenses; since e-commerce = commercial use, searches enforce license_type=commercial to exclude NC licenses;
 *             normalized output retains license/licenseUrl/attributionText so export can generate credits.
 */

import { type StockCandidate, fetchWithTimeout } from "./stock-types";

const OPENVERSE_API = "https://api.openverse.org/v1";

// ==================== raw response types ====================

export interface OpenverseImage {
  id: string;
  title?: string;
  url: string; // direct media URL / original image
  thumbnail?: string; // proxied thumbnail
  creator?: string;
  creator_url?: string;
  foreign_landing_url?: string; // original site detail page
  license: string; // e.g. "by-nc"
  license_version?: string;
  license_url?: string;
  attribution?: string; // pre-formatted attribution text provided by Openverse
  width?: number;
  height?: number;
}

export interface OpenverseAudio {
  id: string;
  title?: string;
  url: string;
  thumbnail?: string;
  creator?: string;
  creator_url?: string;
  foreign_landing_url?: string;
  license: string;
  license_version?: string;
  license_url?: string;
  attribution?: string;
  duration?: number; // milliseconds
  alt_files?: Array<{ url: string; bit_rate?: number; filetype?: string }>;
}

// ==================== pure functions (unit-testable) ====================

/** CC0 / public-domain marks require no attribution; everything else (BY family) does */
export function ccRequiresAttribution(license: string): boolean {
  const l = license.toLowerCase();
  return !(l === "cc0" || l === "pdm");
}

/** Compose a license display string, e.g. "by-2.0" */
export function composeLicense(license: string, version?: string): string {
  return version ? `${license}-${version}` : license;
}

/** Normalize an Openverse image into a candidate; returns null if there is no direct URL (filtered out to prevent a failing download from crashing the clip) */
export function toOpenverseImageCandidate(img: OpenverseImage): StockCandidate | null {
  if (!img.url) return null;
  return {
    source: "openverse",
    mediaType: "image",
    id: img.id,
    downloadUrl: img.url,
    pageUrl: img.foreign_landing_url || img.url,
    author: img.creator || "Unknown",
    authorUrl: img.creator_url || img.foreign_landing_url || "https://openverse.org",
    license: composeLicense(img.license, img.license_version),
    licenseUrl: img.license_url,
    attributionText: img.attribution,
    requiresAttribution: ccRequiresAttribution(img.license),
    width: img.width,
    height: img.height,
    previewImage: img.thumbnail,
  };
}

/** Normalize an Openverse audio track into a candidate (picks the highest-bitrate alt_files entry, falls back to url; duration converted from ms to seconds) */
export function toOpenverseAudioCandidate(a: OpenverseAudio): StockCandidate | null {
  const best =
    (a.alt_files || [])
      .slice()
      .sort((x, y) => (y.bit_rate ?? 0) - (x.bit_rate ?? 0))[0]?.url || a.url;
  if (!best) return null; // no usable direct URL → skip to avoid an undefined download crashing the clip
  return {
    source: "openverse",
    mediaType: "audio",
    id: a.id,
    downloadUrl: best,
    pageUrl: a.foreign_landing_url || a.url,
    author: a.creator || "Unknown",
    authorUrl: a.creator_url || a.foreign_landing_url || "https://openverse.org",
    license: composeLicense(a.license, a.license_version),
    licenseUrl: a.license_url,
    attributionText: a.attribution,
    requiresAttribution: ccRequiresAttribution(a.license),
    durationSec: a.duration != null ? Math.round(a.duration / 1000) : undefined,
    previewImage: a.thumbnail,
  };
}

// ==================== network functions ====================

/** Optional Bearer token (used to increase rate limits; not required) */
function authHeaders(token?: string): HeadersInit {
  const h: Record<string, string> = { "User-Agent": "daihuo-jianshou/1.0 (stock media)" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** Search Openverse images (commercial-use only by default; NC licenses filtered out) */
export async function searchOpenverseImages(
  query: string,
  opts: { token?: string; perPage?: number; commercialOnly?: boolean } = {}
): Promise<StockCandidate[]> {
  const { token, perPage = 10, commercialOnly = true } = opts;
  if (!query?.trim()) throw new Error("检索词为空");

  const params = new URLSearchParams({
    q: query.trim(),
    page_size: String(perPage),
    mature: "false",
  });
  if (commercialOnly) params.set("license_type", "commercial");

  const res = await fetchWithTimeout(`${OPENVERSE_API}/images/?${params}`, { headers: authHeaders(token) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Openverse 图片检索失败 ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { results?: OpenverseImage[] };
  return (data.results ?? [])
    .map(toOpenverseImageCandidate)
    .filter((c): c is StockCandidate => c !== null);
}

/** Search Openverse audio (music/sound effects; commercial-use only by default) */
export async function searchOpenverseAudio(
  query: string,
  opts: { token?: string; perPage?: number; commercialOnly?: boolean; category?: "music" | "sound_effect" } = {}
): Promise<StockCandidate[]> {
  const { token, perPage = 10, commercialOnly = true, category } = opts;
  if (!query?.trim()) throw new Error("检索词为空");

  const params = new URLSearchParams({ q: query.trim(), page_size: String(perPage), mature: "false" });
  if (commercialOnly) params.set("license_type", "commercial");
  if (category) params.set("category", category);

  const res = await fetchWithTimeout(`${OPENVERSE_API}/audio/?${params}`, { headers: authHeaders(token) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Openverse 音频检索失败 ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { results?: OpenverseAudio[] };
  return (data.results ?? [])
    .map(toOpenverseAudioCandidate)
    .filter((c): c is StockCandidate => c !== null);
}
