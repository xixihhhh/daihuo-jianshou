/**
 * Wikimedia Commons media source (commons.wikimedia.org/w/api.php) — the key-free source for the multi-provider media engine.
 *
 * Main value: fully key-free search covering CC/public-domain images and videos; currently the **only key-free video source** —
 *             enables B-roll footage for shots even without a Pexels/Pixabay key.
 * Video transcodes: Commons originals are often large .ogv (Theora) files; we prefer ≤720p .webm (VP9) transcodes —
 *             smaller (reliably under the 80 MB download limit) and more standard (FFmpeg/composer-friendly).
 * Compliance: all Commons content is freely licensed, but specific licenses vary (PD / CC0 / CC-BY / CC-BY-SA…);
 *             normalized to retain license/licenseUrl; BY-family licenses set requiresAttribution so credits are generated on export.
 * Note: the Wikimedia API requires a descriptive User-Agent header; requests without one may be rejected.
 */

import { type StockCandidate, type StockMediaType, fetchWithTimeout } from "./stock-types";

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "clipforge/1.0 (https://github.com/xixihhhh/clipforge; stock media search)";

// ==================== Raw response types ====================

interface CommonsExtMeta {
  LicenseShortName?: { value?: string };
  LicenseUrl?: { value?: string };
  Artist?: { value?: string };
}
/** Video transcode variant (TimedMediaHandler derivatives) */
export interface CommonsDerivative {
  src?: string;
  type?: string;
  transcodekey?: string; // e.g. "480p.vp9.webm"
  width?: number;
  height?: number;
}
export interface CommonsMediaInfo {
  url?: string; // direct link to the original file
  thumburl?: string; // thumbnail / poster (only present when *urlwidth is set)
  width?: number;
  height?: number;
  mime?: string;
  duration?: number; // video/audio duration in seconds
  user?: string; // uploader
  extmetadata?: CommonsExtMeta;
  derivatives?: CommonsDerivative[]; // video transcode variants (videoinfo only)
}
export interface CommonsPage {
  pageid: number;
  title: string; // e.g. "File:Foo.ogv"
  imageinfo?: CommonsMediaInfo[];
  videoinfo?: CommonsMediaInfo[];
}

// ==================== Pure functions (unit-testable) ====================

/** Strip HTML tags commonly present in Wikimedia fields (Artist/License often contain <a> elements) */
export function stripHtml(s?: string): string {
  return (s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/** Public domain / CC0 requires no attribution; all other licenses (BY/BY-SA etc.) do */
export function wikimediaRequiresAttribution(licenseShort?: string): boolean {
  const l = (licenseShort ?? "").toLowerCase();
  return !(l.includes("public domain") || l.includes("pd-") || l === "cc0" || l.includes("cc0"));
}

/** Get derivative height: prefer the height field, otherwise parse it from the transcodekey (e.g. "480p") */
export function derivativeHeight(d: CommonsDerivative): number {
  if (typeof d.height === "number") return d.height;
  const m = /(\d+)p/.exec(d.transcodekey ?? "");
  return m ? parseInt(m[1], 10) : 0;
}

/** For video, pick the highest ≤720p webm (VP9) transcode; fall back to the original direct URL if no webm transcode exists */
export function pickWikimediaVideoSrc(derivatives: CommonsDerivative[] | undefined, fallbackUrl: string): string {
  const webm = (derivatives ?? []).filter((d) => d.src && /webm/i.test(`${d.transcodekey ?? ""} ${d.type ?? ""}`));
  if (!webm.length) return fallbackUrl;
  const byHeightAsc = webm.slice().sort((a, b) => derivativeHeight(a) - derivativeHeight(b));
  const best = [...byHeightAsc].reverse().find((d) => derivativeHeight(d) <= 720) ?? byHeightAsc[0];
  return best.src ?? fallbackUrl;
}

/** Normalize a Commons file page into a candidate; returns null if there is no direct URL. Videos use the ≤720p webm transcode as the download source */
export function toWikimediaCandidate(page: CommonsPage, requested: StockMediaType): StockCandidate | null {
  const ii = page.imageinfo?.[0] ?? page.videoinfo?.[0];
  if (!ii?.url) return null;
  const ext = ii.extmetadata ?? {};
  const license = stripHtml(ext.LicenseShortName?.value) || "Unknown";
  const mime = ii.mime ?? "";
  const isAudio = requested === "audio" || /^audio\//.test(mime);
  const isVideo = !isAudio && (requested === "video" || /^video\//.test(mime));
  const downloadUrl = isVideo ? pickWikimediaVideoSrc(ii.derivatives, ii.url) : ii.url;
  // Video with no ≤720p webm transcode (falls back to original .ogv etc.) → skip: large file size, poor FFmpeg/browser compatibility,
  // and the static file route doesn't recognise its MIME type (octet-stream is unplayable). Let the shot fall back to another source or an image.
  if (isVideo && !/\.webm(\?|$)/i.test(downloadUrl)) return null;
  const commonsPageUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`;
  return {
    source: "wikimedia",
    mediaType: isAudio ? "audio" : isVideo ? "video" : "image",
    id: page.pageid,
    downloadUrl,
    pageUrl: commonsPageUrl,
    author: stripHtml(ext.Artist?.value) || ii.user || "Unknown",
    authorUrl: commonsPageUrl,
    license,
    licenseUrl: ext.LicenseUrl?.value,
    requiresAttribution: wikimediaRequiresAttribution(license),
    width: ii.width,
    height: ii.height,
    durationSec: ii.duration != null ? Math.round(ii.duration) : undefined,
    previewImage: ii.thumburl,
  };
}

// ==================== Network functions ====================

/** Search Commons media: generator=search + namespace=6(File); video requests use videoinfo to fetch transcode variants */
async function searchWikimedia(
  query: string,
  mediaType: StockMediaType,
  opts: { perPage?: number } = {}
): Promise<StockCandidate[]> {
  if (!query?.trim()) throw new Error("检索词为空");
  const { perPage = 10 } = opts;
  const isVideo = mediaType === "video";
  const filetype =
    mediaType === "video" ? "filetype:video" : mediaType === "audio" ? "filetype:audio" : "filetype:bitmap";
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${query.trim()} ${filetype}`,
    gsrnamespace: "6",
    gsrlimit: String(perPage),
  });
  if (isVideo) {
    // videoinfo includes derivatives (transcode variants) that imageinfo does not
    params.set("prop", "videoinfo");
    params.set("viprop", "url|size|mime|extmetadata|user|derivatives");
    params.set("viurlwidth", "640");
  } else {
    params.set("prop", "imageinfo");
    params.set("iiprop", "url|size|mime|extmetadata|user");
    params.set("iiurlwidth", "640");
  }

  const res = await fetchWithTimeout(`${COMMONS_API}?${params}`, {
    headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Wikimedia 检索失败 ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  const pages = data.query?.pages ? Object.values(data.query.pages) : [];
  return pages
    .map((p) => toWikimediaCandidate(p, mediaType))
    .filter((c): c is StockCandidate => c !== null);
}

/** Search Commons images (CC/PD) */
export function searchWikimediaImages(query: string, opts: { perPage?: number } = {}): Promise<StockCandidate[]> {
  return searchWikimedia(query, "image", opts);
}

/** Search Commons videos (uses ≤720p webm transcodes; key-free live-action B-roll) */
export function searchWikimediaVideos(query: string, opts: { perPage?: number } = {}): Promise<StockCandidate[]> {
  return searchWikimedia(query, "video", opts);
}

/** Search Commons audio (CC/PD, direct download link, key-free background music source) */
export function searchWikimediaAudio(query: string, opts: { perPage?: number } = {}): Promise<StockCandidate[]> {
  return searchWikimedia(query, "audio", opts);
}
