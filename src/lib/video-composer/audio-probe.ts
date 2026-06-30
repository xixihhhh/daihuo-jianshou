/**
 * Audio track "audible" detection — distinguishes "truly audible" from "silent/empty track"
 * using ffmpeg volumedetect output.
 *
 * Background: some free stock clips (e.g. certain Wikimedia videos) carry a **silent** audio track.
 * Relying solely on "has audio stream" would incorrectly treat them as having voice-over,
 * skipping the free TTS narration and leaving the scene with no commentary.
 * volumedetect's max_volume is used as a fallback check.
 */

/**
 * Parse volumedetect stderr and determine whether the audio track is audible.
 * - max_volume below threshold (default -50dB) or equals -inf → silent (return false, let TTS narration take over);
 * - max_volume not found → conservatively return true (avoid accidentally suppressing genuine model voice/sfx).
 */
export function isAudibleFromVolumedetect(stderr: string, thresholdDb = -50): boolean {
  const m = /max_volume:\s*(-?(?:inf|\d+(?:\.\d+)?))\s*dB/i.exec(stderr || "");
  if (!m) return true;
  const v = m[1].toLowerCase();
  if (v === "-inf" || v === "inf") return false;
  const db = parseFloat(v);
  return Number.isFinite(db) ? db > thresholdDb : true;
}
