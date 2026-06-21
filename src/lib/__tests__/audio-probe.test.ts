import { describe, it, expect } from "vitest";
import { isAudibleFromVolumedetect } from "@/lib/video-composer/audio-probe";

describe("isAudibleFromVolumedetect", () => {
  const wrap = (line: string) =>
    `[Parsed_volumedetect_0 @ 0x55] n_samples: 441000\n[Parsed_volumedetect_0 @ 0x55] mean_volume: -20.0 dB\n[Parsed_volumedetect_0 @ 0x55] ${line}\n`;

  it("有声音（max_volume 高于阈值）→ 可听见", () => {
    expect(isAudibleFromVolumedetect(wrap("max_volume: -3.0 dB"))).toBe(true);
    expect(isAudibleFromVolumedetect(wrap("max_volume: 0.0 dB"))).toBe(true);
  });

  it("静音轨（max_volume 极低）→ 不可听见（让 TTS 接管）", () => {
    expect(isAudibleFromVolumedetect(wrap("max_volume: -91.0 dB"))).toBe(false);
    expect(isAudibleFromVolumedetect(wrap("max_volume: -70.5 dB"))).toBe(false);
  });

  it("纯数字静音 -inf → 不可听见", () => {
    expect(isAudibleFromVolumedetect(wrap("max_volume: -inf dB"))).toBe(false);
  });

  it("阈值边界：-50dB 不算可听见，-49dB 算", () => {
    expect(isAudibleFromVolumedetect(wrap("max_volume: -50.0 dB"))).toBe(false);
    expect(isAudibleFromVolumedetect(wrap("max_volume: -49.0 dB"))).toBe(true);
  });

  it("解析不到 max_volume → 保守认为有声（不误吞模型自带语音）", () => {
    expect(isAudibleFromVolumedetect("")).toBe(true);
    expect(isAudibleFromVolumedetect("some unrelated ffmpeg output")).toBe(true);
  });

  it("自定义阈值", () => {
    expect(isAudibleFromVolumedetect(wrap("max_volume: -55.0 dB"), -60)).toBe(true);
  });
});
