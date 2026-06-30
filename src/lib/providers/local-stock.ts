/**
 * Local media source — treats user-supplied videos/images in uploads/{id}/materials/ as stock candidates,
 * enabling "use self-shot / own B-roll" without any network access or API key;
 * the directory is assembled server-side from the project ID, and filenames come from readdir (not user input).
 */

import { readdir } from "fs/promises";
import { join, extname, basename } from "path";
import type { StockCandidate, StockMediaType } from "./stock-types";

/** Allowed extensions for the media pool (kept in sync with the composer consumer side) */
export const LOCAL_VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v"]);
export const LOCAL_IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

/** Filename → media type (only recognizes whitelisted extensions; everything else is ignored). Pure function, unit-testable. */
export function classifyMaterial(fileName: string): StockMediaType | null {
  const ext = extname(fileName).slice(1).toLowerCase();
  if (LOCAL_VIDEO_EXT.has(ext)) return "video";
  if (LOCAL_IMAGE_EXT.has(ext)) return "image";
  return null;
}

/**
 * Score the relevance of a filename against a search query (pure function): tokenize both by
 * non-alphanumeric characters and count the number of matching tokens.
 * Example: filename "kitchen_pour_over.mp4" + query "pour over coffee" → hits pour/over = 2.
 */
export function scoreByFilename(fileName: string, query: string): number {
  const toks = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .split(/[^a-z0-9一-鿿]+/)
        .filter((w) => w.length >= 2),
    );
  const fileToks = toks(basename(fileName, extname(fileName)));
  const qToks = toks(query);
  let hits = 0;
  for (const q of qToks) if (fileToks.has(q)) hits++;
  return hits;
}

/** Local media file → unified candidate (downloadUrl = absolute path; downloadStockFile handles it as a local copy) */
function toCandidate(absPath: string, name: string, mediaType: StockMediaType): StockCandidate {
  return {
    source: "local",
    mediaType,
    id: name,
    downloadUrl: absPath, // absolute filesystem path, not a network URL
    pageUrl: "",
    author: "本地素材",
    authorUrl: "",
    license: "本地/自有",
    requiresAttribution: false,
  };
}

/**
 * Scan the local media pool directory, filter by media type, sort by filename-query relevance, and return candidates.
 * Returns [] when the directory does not exist or is empty (so the aggregated search continues with other sources without error).
 * Image files are also accepted as a fallback for video requests; audio is not supported locally.
 */
export async function scanLocalMaterials(
  dir: string,
  query: string,
  opts: { mediaType?: StockMediaType; perPage?: number } = {},
): Promise<StockCandidate[]> {
  const wantType = opts.mediaType ?? "video";
  if (wantType === "audio") return [];

  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return []; // directory does not exist
  }

  const ranked = names
    .map((name) => ({ name, mt: classifyMaterial(name) }))
    .filter((x): x is { name: string; mt: StockMediaType } => x.mt !== null)
    .map((x) => ({ ...x, typeMatch: x.mt === wantType ? 0 : 1, score: scoreByFilename(x.name, query) }))
    .sort((a, b) => a.typeMatch - b.typeMatch || b.score - a.score || a.name.localeCompare(b.name))
    .map((x) => toCandidate(join(dir, x.name), x.name, x.mt));

  return opts.perPage ? ranked.slice(0, opts.perPage) : ranked;
}
