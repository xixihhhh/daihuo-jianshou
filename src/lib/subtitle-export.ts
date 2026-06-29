/**
 * 字幕导出 —— 把脚本分镜的旁白文案导出为通用字幕格式（SRT / WebVTT）。
 *
 * ClipForge 平时把字幕直接烧进画面（drawtext / 卡拉OK ASS），不外露给用户；
 * 但创作者常需要可编辑的 .srt/.vtt 用于：二次剪辑、上传平台原生字幕、无障碍/多语言、再校对。
 * 这里按脚本「计划时长」（shot.duration，秒）累加成时间轴——纯函数、零依赖、可单测。
 * 注：导出基于脚本规划时长，与最终成片（按真实配音时长卡点）可能有毫秒级出入，作可编辑底稿足够。
 */

export interface SubtitleCue {
  index: number; // 1 起的序号
  startMs: number;
  endMs: number;
  text: string;
}

/** 空轨道时给一个最小可见时长，避免 0 长度 cue */
const MIN_CUE_MS = 500;

interface ShotLike {
  duration?: number; // 秒（脚本规划时长）
  voiceover?: string;
}

/**
 * 把分镜数组转成连续字幕 cue：按 duration 累加时间轴，跳过空白旁白（但其时长仍占位、保持后续 cue 对齐）。
 * @param gapMs 相邻 cue 之间留白（默认 0，连续）
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
      // cue 时长尊重真实分镜时长，保证与时间轴一致、相邻 cue 不重叠（短分镜也不撑大到 500ms）；
      // 仅当时长缺失/为 0 才退到最小可见时长（此退化输入下可能与紧邻 cue 轻微重叠，已属异常）
      const cueLen = durMs > 0 ? durMs : MIN_CUE_MS;
      const endMs = Math.max(startMs + cueLen - gapMs, startMs + 1);
      cues.push({ index: ++index, startMs, endMs, text });
    }
    cursorMs += durMs; // 无论有无文案，时间轴都按规划时长推进
  }
  return cues;
}

/** 毫秒 → SRT 时间戳 HH:MM:SS,mmm */
export function formatSrtTime(ms: number): string {
  return formatClock(ms, ",");
}

/** 毫秒 → WebVTT 时间戳 HH:MM:SS.mmm */
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

/** 构建 SRT 文本 */
export function buildSrt(cues: SubtitleCue[]): string {
  return (
    cues
      .map((c) => `${c.index}\n${formatSrtTime(c.startMs)} --> ${formatSrtTime(c.endMs)}\n${c.text}`)
      .join("\n\n") + (cues.length ? "\n" : "")
  );
}

/** 构建 WebVTT 文本（带 WEBVTT 头） */
export function buildVtt(cues: SubtitleCue[]): string {
  const body = cues
    .map((c) => `${c.index}\n${formatVttTime(c.startMs)} --> ${formatVttTime(c.endMs)}\n${c.text}`)
    .join("\n\n");
  return `WEBVTT\n\n${body}${cues.length ? "\n" : ""}`;
}

/** 便捷：分镜直接出 SRT/VTT */
export function shotsToSrt(shots: ShotLike[], opts?: { gapMs?: number }): string {
  return buildSrt(shotsToCues(shots, opts));
}
export function shotsToVtt(shots: ShotLike[], opts?: { gapMs?: number }): string {
  return buildVtt(shotsToCues(shots, opts));
}
