/**
 * User-supplied script import — splits a user's own narration/copy into shots and feeds them
 * directly into the video production pipeline (bypassing AI script generation).
 *
 * Enables the "I already have a script, just make it a video" workflow:
 * split by sentence → estimate per-shot duration → produce a standard Shot[],
 * then proceed normally with auto-matching footage (or local assets) + voiceover + compose.
 * Pure functions, zero dependencies, unit-testable.
 * Note: durations are planning estimates; the final cut still snaps to real TTS duration;
 * description reuses the original sentence as a fallback search query for asset matching.
 */

import type { Shot } from "@/lib/db/schema";

/** Sentence-ending punctuation (primary split boundary for shots) */
const SENTENCE_DELIM = /[。！？!?\n]+/;
/** Secondary punctuation (used to further split overly long sentences) */
const SUBCLAUSE_DELIM = /[，,；;、]+/;
/** Maximum characters per shot (exceed this and the sentence is re-split on secondary punctuation to avoid overly long voiceover per shot) */
const MAX_CHARS_PER_SHOT = 100;
/** Maximum number of shots (guards against abuse / excessively long input) */
const MAX_SHOTS = 40;

function hasCJK(s: string): boolean {
  return /[一-鿿぀-ヿ가-힣]/.test(s);
}

/** Estimates TTS duration (seconds) for a piece of copy: ~5 chars/sec for CJK, ~14 chars/sec for Latin; clamped to 2–15 s */
export function estimateDurationSec(text: string): number {
  const cps = hasCJK(text) ? 5 : 14;
  return Math.min(15, Math.max(2, Math.round(text.length / cps)));
}

/** Splits a full narration into one-sentence-per-shot segments: first splits on sentence-ending punctuation, then re-splits overly long sentences on secondary punctuation; empty segments are removed. */
export function splitNarration(text: string): string[] {
  const sentences = (text || "")
    .split(SENTENCE_DELIM)
    .map((s) => s.trim())
    .filter(Boolean);

  const pieces: string[] = [];
  for (const sent of sentences) {
    if (sent.length <= MAX_CHARS_PER_SHOT) {
      pieces.push(sent);
      continue;
    }
    // Overly long sentence: accumulate sub-clauses up to the limit, then split; keep as-is if a single sub-clause still exceeds the limit (edge case)
    let buf = "";
    for (const sub of sent.split(SUBCLAUSE_DELIM).map((s) => s.trim()).filter(Boolean)) {
      if (buf && (buf.length + sub.length) > MAX_CHARS_PER_SHOT) {
        pieces.push(buf);
        buf = sub;
      } else {
        buf = buf ? `${buf}，${sub}` : sub;
      }
    }
    if (buf) pieces.push(buf);
  }
  return pieces.slice(0, MAX_SHOTS);
}

/**
 * Splits a user script into a standard Shot array: first shot is hook, last shot is cta, all others are demo.
 * visualSource is set to "ai_generate" (consistent with theme-based generation; footage is filled by auto-matching or local assets).
 */
export function splitNarrationIntoShots(text: string): Shot[] {
  const pieces = splitNarration(text);
  const n = pieces.length;
  return pieces.map((p, i) => ({
    shotId: i + 1,
    type: i === 0 ? "hook" : i === n - 1 ? "cta" : "demo",
    duration: estimateDurationSec(p),
    description: p, // reuse original sentence as a fallback search query for shotQuery when stockKeywords is empty
    camera: "static",
    visualSource: "ai_generate",
    transition: "ffmpeg_fade",
    voiceover: p,
    stockKeywords: [],
  }));
}
