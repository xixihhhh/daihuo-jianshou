/**
 * 音轨「可听见」判定 —— 从 ffmpeg volumedetect 的输出区分「真有声」与「静音/空轨」。
 *
 * 背景：部分免费素材（如 Wikimedia 的某些视频）带一条**静音**音轨。仅凭「有无音频流」判断会误判为
 *      「自带语音」，从而跳过免费 TTS 旁白，导致该分镜没有解说。用 volumedetect 的 max_volume 兜底。
 */

/**
 * 解析 volumedetect 的 stderr，判断音轨是否可听见。
 * - max_volume 低于阈值（默认 -50dB）或为 -inf → 静音（false，让 TTS 旁白接管）；
 * - 解析不到 max_volume → 保守返回 true（避免误吞模型自带的真实语音/音效）。
 */
export function isAudibleFromVolumedetect(stderr: string, thresholdDb = -50): boolean {
  const m = /max_volume:\s*(-?(?:inf|\d+(?:\.\d+)?))\s*dB/i.exec(stderr || "");
  if (!m) return true;
  const v = m[1].toLowerCase();
  if (v === "-inf" || v === "inf") return false;
  const db = parseFloat(v);
  return Number.isFinite(db) ? db > thresholdDb : true;
}
