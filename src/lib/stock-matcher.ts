/**
 * Stock-matching helpers — in service of the goal "produce a video even without a product, and always have footage"
 *
 * broadenQuery: when an English search term returns no results from the stock library,
 * generates a sequence of progressively broader fallback queries until something matches
 * (prevents obscure topics entered by beginners from leaving a shot with no footage at all).
 */

/** Universal fallback queries: every free stock library has plenty of results for these */
const UNIVERSAL_FALLBACKS = ["abstract background", "lifestyle", "nature", "light"];

/**
 * Given an English search query, produces a sequence of fallback queries from specific to broad (original excluded, deduplicated).
 * Example: broadenQuery("quantum entanglement physics")
 *   → ["entanglement physics", "physics", "abstract background", "lifestyle", "nature", "light"]
 * Pure function — easy to unit-test.
 */
export function broadenQuery(query: string): string[] {
  const q = (query || "").trim();
  const words = q.split(/\s+/).filter(Boolean);
  const out: string[] = [];

  if (words.length > 2) out.push(words.slice(-2).join(" ")); // last two words
  if (words.length > 1) out.push(words[words.length - 1]); // last word (typically the main noun)
  out.push(...UNIVERSAL_FALLBACKS);

  const seen = new Set<string>([q.toLowerCase()]);
  return out.filter((t) => {
    const k = t.toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Build a stock search query for a shot: prefers English stockKeywords, falls back to the visual description or voiceover */
export function shotQuery(shot: { stockKeywords?: string[]; description?: string; voiceover?: string }): string {
  if (shot.stockKeywords?.length) return shot.stockKeywords.join(" ");
  return (shot.description || shot.voiceover || "").trim();
}

// ==================== candidate scoring ====================
// Currently only the first search result is used, which often picks the wrong footage or repeats the same image throughout.
// The code below scores multiple candidates by keyword overlap + portrait orientation + cross-shot deduplication to select the best one.
// Pure functions — unit-testable.

type ShotLike = { stockKeywords?: string[]; description?: string; voiceover?: string };

export interface CandidateLike {
  /** Unique identifier, used for cross-shot deduplication */
  id?: string;
  /** Tags provided by the stock asset */
  tags?: string[];
  /** Title or description */
  title?: string;
  orientation?: "portrait" | "landscape" | "square";
  type?: "image" | "video";
}

export interface ScoreOpts {
  /** Prefer portrait (9:16) orientation, default true */
  preferPortrait?: boolean;
  /** Prefer dynamic video B-roll, default false */
  preferVideo?: boolean;
  /** IDs of candidates already used (cross-shot deduplication to avoid the same image repeating) */
  usedIds?: Set<string>;
}

const terms = (s: string) =>
  (s || "")
    .toLowerCase()
    .split(/[^a-z0-9一-鿿]+/)
    .filter(Boolean);

/** Score a single candidate (higher = better fit). Pure function. */
export function scoreCandidate(shot: ShotLike, candidate: CandidateLike, opts: ScoreOpts = {}): number {
  const wantTerms = new Set([...(shot.stockKeywords ?? []), ...terms(shotQuery(shot))].flatMap((t) => terms(t)));
  const candTerms = new Set([...(candidate.tags ?? []), ...terms(candidate.title ?? "")].flatMap((t) => terms(t)));
  let overlap = 0;
  for (const t of candTerms) if (wantTerms.has(t)) overlap++;
  let score = overlap * 10; // keyword match carries the highest weight

  if (opts.preferPortrait !== false) {
    if (candidate.orientation === "portrait") score += 5;
    else if (candidate.orientation === "landscape") score -= 3; // landscape stretched to portrait gets blurry or leaves black bars
  }
  if (opts.preferVideo && candidate.type === "video") score += 4;
  if (candidate.id && opts.usedIds?.has(candidate.id)) score -= 8; // avoid reusing the same asset across the whole video

  return score;
}

/** Pick the best candidate from a list (returns undefined when the list is empty). After selecting, the caller can add the winner's id to usedIds for subsequent deduplication. */
export function pickBestCandidate<T extends CandidateLike>(shot: ShotLike, candidates: T[], opts: ScoreOpts = {}): T | undefined {
  let best: T | undefined;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const s = scoreCandidate(shot, c, opts);
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}
