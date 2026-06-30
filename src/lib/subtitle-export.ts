/**
 * Subtitle export — converts script shot voiceover text into standard subtitle formats (SRT / WebVTT).
 *
 * ClipForge normally burns subtitles directly into the video (drawtext / karaoke ASS) and does not
 * expose them to users; however, creators often need editable .srt/.vtt files for: re-editing,
 * uploading platform-native subtitles, accessibility/localization, and proofreading.
 * Timestamps are accumulated using the scripted duration (shot.duration, in seconds) —
 * pure function, zero dependencies, unit-testable.
 * Note: export is based on scripted durations; millisecond-level drift from the final render
 * (which snaps to actual TTS durations) is expected but acceptable as an editable draft.
 */

export interface SubtitleCue {
  index: number; // 1-based index
  startMs: number;
  endMs: number;
  text: string;
}

/** Minimum visible duration for empty tracks, to avoid zero-length cues */
const MIN_CUE_MS = 500;

interface ShotLike {
  duration?: number; // seconds (scripted planned duration)
  voiceover?: string;
}

/**
 * Converts a shot array into sequential subtitle cues: accumulates the timeline by duration,
 * skipping shots with empty voiceover (but their duration still advances the cursor to keep
 * subsequent cues aligned).
 * @param gapMs Gap between adjacent cues in milliseconds (default 0, continuous)
 */
export function shotsToCues(shots: ShotLike[], opts: { gapMs?: number } = {}): SubtitleCue[] {
  const gapMs = Math.max(0, opts.gapMs ?? 0);
  const cues: SubtitleCue[] = [];
  let cursorMs = 0;
  let index = 0;
  for (const shot of shots) {
    const durMs = Math.max(0, Math.round((Number(shot.duration) || 0) * 1000));
    const text = (shot.voiceover ?? "").trim();
    if (text) {
      const startMs = cursorMs;
      // cue duration respects the actual shot duration to stay in sync with the timeline and
      // prevent adjacent cues from overlapping (short shots are not padded to 500ms);
      // only fall back to MIN_CUE_MS when duration is missing or zero (degenerate input that
      // may cause slight overlap with the next cue — already an abnormal case)
      const cueLen = durMs > 0 ? durMs : MIN_CUE_MS;
      const endMs = Math.max(startMs + cueLen - gapMs, startMs + 1);
      cues.push({ index: ++index, startMs, endMs, text });
    }
    cursorMs += durMs; // advance the timeline by the planned duration regardless of voiceover presence
  }
  return cues;
}

/** Milliseconds → SRT timestamp HH:MM:SS,mmm */
export function formatSrtTime(ms: number): string {
  return formatClock(ms, ",");
}

/** Milliseconds → WebVTT timestamp HH:MM:SS.mmm */
export function formatVttTime(ms: number): string {
  return formatClock(ms, ".");
}

function formatClock(ms: number, msSep: "," | "."): string {
  const t = Math.max(0, Math.round(ms));
  const h = Math.floor(t / 3_600_000);
  const m = Math.floor((t % 3_600_000) / 60_000);
  const s = Math.floor((t % 60_000) / 1000);
  const millis = t % 1000;
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${p2(h)}:${p2(m)}:${p2(s)}${msSep}${String(millis).padStart(3, "0")}`;
}

/** Build SRT text */
export function buildSrt(cues: SubtitleCue[]): string {
  return (
    cues
      .map((c) => `${c.index}\n${formatSrtTime(c.startMs)} --> ${formatSrtTime(c.endMs)}\n${c.text}`)
      .join("\n\n") + (cues.length ? "\n" : "")
  );
}

/** Build WebVTT text (with WEBVTT header) */
export function buildVtt(cues: SubtitleCue[]): string {
  const body = cues
    .map((c) => `${c.index}\n${formatVttTime(c.startMs)} --> ${formatVttTime(c.endMs)}\n${c.text}`)
    .join("\n\n");
  return `WEBVTT\n\n${body}${cues.length ? "\n" : ""}`;
}

/** Convenience: convert shots directly to SRT/VTT */
export function shotsToSrt(shots: ShotLike[], opts?: { gapMs?: number }): string {
  return buildSrt(shotsToCues(shots, opts));
}
export function shotsToVtt(shots: ShotLike[], opts?: { gapMs?: number }): string {
  return buildVtt(shotsToCues(shots, opts));
}
