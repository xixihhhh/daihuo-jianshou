/**
 * Multi-source media engine — registry and unified search dispatch
 *
 * Public API:
 *  - searchStock(sourceId, query, opts): search a single source
 *  - searchAllStock(query, opts): aggregate search (keyless sources always participate; sources that require a key are silently skipped when the key is absent)
 *  - resolveSourceKey / getAvailableSources: key resolution and source availability check
 */

import {
  STOCK_SOURCES,
  orientationOf,
  type StockCandidate,
  type StockSourceId,
  type StockMediaType,
  type StockOrientation,
  type StockSourceMeta,
} from "./stock-types";
import { searchPexelsVideos, searchPexelsPhotos } from "./pexels";
import { searchPixabayVideos, searchPixabayImages } from "./pixabay";
import { searchOpenverseImages, searchOpenverseAudio } from "./openverse";
import { searchWikimediaImages, searchWikimediaVideos, searchWikimediaAudio } from "./wikimedia";
import { scanLocalMaterials } from "./local-stock";
import { searchNasaVideos, searchNasaImages } from "./nasa";
import { searchArchiveVideos, searchArchiveImages } from "./archive";
import { TtlCache } from "@/lib/ttl-cache";

export interface StockSearchOptions {
  /** Per-source API keys: { pexels: "...", pixabay: "..." }; openverse token is optional */
  apiKeys?: Partial<Record<StockSourceId, string>>;
  mediaType?: StockMediaType; // defaults to video
  perPage?: number;
  orientation?: StockOrientation;
  minSec?: number;
  maxSec?: number;
  /** Absolute path to the local media pool directory; when set, the local source participates in searches, otherwise it is skipped */
  localDir?: string;
}

/** Resolve a source's API key from opts or environment variables (keyless sources simply return an empty string) */
export function resolveSourceKey(sourceId: StockSourceId, apiKeys?: Partial<Record<StockSourceId, string>>): string {
  const fromOpts = apiKeys?.[sourceId];
  if (fromOpts) return fromOpts;
  const meta = STOCK_SOURCES.find((s) => s.id === sourceId);
  if (meta?.envKey && process.env[meta.envKey]) return process.env[meta.envKey] as string;
  return "";
}

/** Whether a source is available given the current keys (keyless sources are always available) */
export function isSourceAvailable(meta: StockSourceMeta, apiKeys?: Partial<Record<StockSourceId, string>>): boolean {
  return meta.keyless || !!resolveSourceKey(meta.id, apiKeys);
}

/** List currently available sources (keyless sources first) */
export function getAvailableSources(apiKeys?: Partial<Record<StockSourceId, string>>): StockSourceMeta[] {
  return STOCK_SOURCES.filter((s) => isSourceAvailable(s, apiKeys));
}

/** Single-source search: dispatch to the appropriate search function based on mediaType */
export async function searchStock(
  sourceId: StockSourceId,
  query: string,
  opts: StockSearchOptions = {}
): Promise<StockCandidate[]> {
  const { mediaType = "video", perPage, orientation, minSec, maxSec } = opts;
  const key = resolveSourceKey(sourceId, opts.apiKeys);

  switch (sourceId) {
    case "pexels":
      if (mediaType === "image") return searchPexelsPhotos(query, { apiKey: key, perPage, orientation });
      if (mediaType === "audio") return [];
      return searchPexelsVideos(query, { apiKey: key, perPage, orientation, minSec, maxSec });

    case "pixabay":
      if (mediaType === "image") return searchPixabayImages(query, { apiKey: key, perPage, orientation });
      if (mediaType === "audio") return [];
      return searchPixabayVideos(query, { apiKey: key, perPage, orientation, minSec, maxSec });

    case "openverse":
      // Openverse has no video; fall back to images when video is requested so that footage-free compositions still have visuals
      if (mediaType === "audio") return searchOpenverseAudio(query, { token: key || undefined, perPage });
      return searchOpenverseImages(query, { token: key || undefined, perPage });

    case "wikimedia":
      // Commons is the key-free image + video + audio source (the only key-free video source; audio URLs are directly downloadable, making it the key-free BGM source)
      if (mediaType === "audio") return searchWikimediaAudio(query, { perPage });
      if (mediaType === "image") return searchWikimediaImages(query, { perPage });
      return searchWikimediaVideos(query, { perPage });

    case "local":
      // local media pool (project-bundled B-roll): no network, scans opts.localDir; skip if no directory provided or if audio is requested
      if (!opts.localDir || mediaType === "audio") return [];
      return scanLocalMaterials(opts.localDir, query, { mediaType, perPage });

    case "nasa":
      // NASA public-domain footage (two-step retrieval); no audio
      if (mediaType === "audio") return [];
      return mediaType === "image" ? searchNasaImages(query, { perPage }) : searchNasaVideos(query, { perPage });

    case "archive":
      // Internet Archive public-domain footage (two-step retrieval, publicdomain license enforced); no audio
      if (mediaType === "audio") return [];
      return mediaType === "image" ? searchArchiveImages(query, { perPage }) : searchArchiveVideos(query, { perPage });

    default:
      return [];
  }
}

export interface AggregateResult {
  candidates: StockCandidate[];
  /** Source ids skipped due to missing API key */
  skippedSources: StockSourceId[];
  /** Source ids that errored during search (does not block other sources) */
  erroredSources: StockSourceId[];
}

/**
 * Aggregate search: concurrently searches all sources that support the given mediaType and are available, then merges candidates.
 * Keyless sources are ranked first; a failure in one source does not block others (Promise.allSettled).
 */
/** Aggregate search result cache: when matching footage shot-by-shot in batch, semantically similar queries hit each source's API repeatedly (and trigger Pixabay/Openverse rate limits). */
const stockCache = new TtlCache<AggregateResult>(5 * 60 * 1000, 64);

/** Cache key: parameters that affect search results + the sources that actually participate (determined by apiKeys, so included in the key). Exported for unit testing. */
export function stockCacheKey(query: string, opts: StockSearchOptions, sourceIds: string[]): string {
  const { mediaType = "video", orientation, perPage, minSec, maxSec } = opts;
  return [mediaType, orientation || "", perPage || "", minSec || "", maxSec || "", sourceIds.slice().sort().join(","), query.trim().toLowerCase()].join("|");
}

export async function searchAllStock(query: string, opts: StockSearchOptions = {}): Promise<AggregateResult> {
  const { mediaType = "video" } = opts;
  const skippedSources: StockSourceId[] = [];
  const erroredSources: StockSourceId[] = [];

  // select sources that support the requested mediaType (openverse also participates for video requests — it falls back to images)
  const usable = STOCK_SOURCES.filter((s) => {
    if (s.id === "local" && !opts.localDir) return false; // local source only participates when a media pool directory is provided
    if (s.aggregate === false) return false; // archive sources (NASA/Archive) are excluded from default aggregation and must be selected explicitly
    const supports = s.mediaTypes.includes(mediaType) || (s.id === "openverse" && mediaType === "video");
    if (!supports) return false;
    if (!isSourceAvailable(s, opts.apiKeys)) {
      skippedSources.push(s.id);
      return false;
    }
    return true;
  });

  // serve from cache when available (same query + params + available sources, within 5 minutes)
  const ck = stockCacheKey(query, opts, usable.map((s) => s.id));
  const cached = stockCache.get(ck);
  if (cached) return cached;

  const settled = await Promise.allSettled(usable.map((s) => searchStock(s.id, query, opts)));

  const merged: StockCandidate[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") merged.push(...r.value);
    else erroredSources.push(usable[i].id);
  });

  const result = { candidates: rankStockCandidates(merged, mediaType, opts.orientation), skippedSources, erroredSources };
  // only cache non-empty results (empty results are usually transient failures or zero hits; caching them would block retries and the "always find something" fallback)
  if (result.candidates.length > 0) stockCache.set(ck, result);
  return result;
}

/**
 * Rank aggregate candidates (pure function, unit-testable). Priority:
 * 1. Matches requested media type (real video > Openverse fallback image, avoids "asked for video but got a static image")
 * 2. Keyless sources first  3. Orientation match (vertical content preferred for portrait short videos to minimize cropping/letterboxing)  4. Higher short-side resolution
 */
export function rankStockCandidates(
  candidates: StockCandidate[],
  mediaType: StockMediaType,
  orientation?: StockOrientation
): StockCandidate[] {
  const keylessIds = new Set(STOCK_SOURCES.filter((s) => s.keyless).map((s) => s.id));
  const matchesOrientation = (c: StockCandidate) =>
    orientation && c.width && c.height ? orientationOf(c.width, c.height) === orientation : false;
  return candidates.slice().sort((a, b) => {
    const am = a.mediaType === mediaType ? 0 : 1;
    const bm = b.mediaType === mediaType ? 0 : 1;
    if (am !== bm) return am - bm;
    // locally-owned footage takes priority (within the same media type): if the user has uploaded B-roll, use it first; free stock fills the gaps
    const al = a.source === "local" ? 0 : 1;
    const bl = b.source === "local" ? 0 : 1;
    if (al !== bl) return al - bl;
    const ak = keylessIds.has(a.source) ? 0 : 1;
    const bk = keylessIds.has(b.source) ? 0 : 1;
    if (ak !== bk) return ak - bk;
    if (orientation) {
      const ao = matchesOrientation(a) ? 0 : 1;
      const bo = matchesOrientation(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
    }
    const aShort = Math.min(a.width ?? 0, a.height ?? 0);
    const bShort = Math.min(b.width ?? 0, b.height ?? 0);
    return bShort - aShort;
  });
}
