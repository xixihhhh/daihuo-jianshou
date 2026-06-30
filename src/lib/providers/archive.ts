/**
 * Internet Archive media source — archive.org public-domain footage (historical films / documentaries / live-action), no API key required.
 *
 * Two-step retrieval: advancedsearch query (forces licenseurl to contain "publicdomain" for commercial use)
 * to get identifiers; then /metadata/{id} to list files → pick mp4/image,
 * with downloads served via archive.org/download/{id}/{file}.
 */

import { fetchWithTimeout, type StockCandidate, type StockMediaType } from "./stock-types";

const ARCHIVE_SEARCH = "https://archive.org/advancedsearch.php";

interface ArchiveFile {
  name?: string;
  format?: string;
  width?: string | number;
  height?: string | number;
}

/** Pick a usable file from metadata.files (for video: prefer an mp4 derivative with width/height; for image: prefer non-thumbnail jpg/png). Pure function. */
export function pickArchiveFile(files: ArchiveFile[], mediaType: Extract<StockMediaType, "video" | "image">): ArchiveFile | null {
  const named = files.filter((f) => typeof f.name === "string" && f.name);
  if (mediaType === "video") {
    const vids = named.filter((f) => /\.(mp4|webm|m4v)$/i.test(f.name as string));
    return vids.find((f) => f.width && f.height) || vids[0] || null;
  }
  const imgs = named.filter((f) => /\.(jpe?g|png)$/i.test(f.name as string) && !/(thumb|__ia_thumb)/i.test(f.name as string));
  return imgs.find((f) => f.width && f.height) || imgs[0] || null;
}

/** Build a direct archive download URL (filename encoded per segment, path separators preserved). Pure function. */
export function archiveDownloadUrl(identifier: string, name: string): string {
  const file = name
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${file}`;
}

interface ArchiveSearchOptions {
  perPage?: number;
}

async function searchArchive(query: string, mediaType: Extract<StockMediaType, "video" | "image">, opts: ArchiveSearchOptions = {}): Promise<StockCandidate[]> {
  const perPage = Math.max(1, Math.min(12, opts.perPage ?? 6));
  const mt = mediaType === "video" ? "movies" : "image";
  // enforce publicdomain license to avoid pulling uploads with unclear or NC licensing
  const q = `(${query}) AND mediatype:${mt} AND licenseurl:*publicdomain*`;
  const url = `${ARCHIVE_SEARCH}?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=creator&rows=${perPage}&output=json`;

  let docs: Array<Record<string, unknown>>;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { response?: { docs?: Array<Record<string, unknown>> } };
    docs = data.response?.docs ?? [];
  } catch {
    return [];
  }

  const settled = await Promise.allSettled(
    docs.map(async (doc): Promise<StockCandidate | null> => {
      const id = typeof doc.identifier === "string" ? doc.identifier : "";
      if (!id) return null;
      const metaRes = await fetchWithTimeout(`https://archive.org/metadata/${encodeURIComponent(id)}`);
      if (!metaRes.ok) return null;
      const meta = (await metaRes.json()) as { files?: ArchiveFile[] };
      const file = pickArchiveFile(meta.files ?? [], mediaType);
      if (!file?.name) return null;
      const creator = Array.isArray(doc.creator) ? doc.creator[0] : doc.creator;
      return {
        source: "archive",
        mediaType,
        id,
        downloadUrl: archiveDownloadUrl(id, file.name),
        pageUrl: `https://archive.org/details/${id}`,
        author: typeof creator === "string" && creator ? creator : "Internet Archive",
        authorUrl: `https://archive.org/details/${id}`,
        license: "Public Domain",
        requiresAttribution: false,
        width: Number(file.width) || undefined,
        height: Number(file.height) || undefined,
        previewImage: `https://archive.org/services/img/${id}`,
      };
    }),
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<StockCandidate> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);
}

export function searchArchiveVideos(query: string, opts: ArchiveSearchOptions = {}): Promise<StockCandidate[]> {
  return searchArchive(query, "video", opts);
}
export function searchArchiveImages(query: string, opts: ArchiveSearchOptions = {}): Promise<StockCandidate[]> {
  return searchArchive(query, "image", opts);
}
