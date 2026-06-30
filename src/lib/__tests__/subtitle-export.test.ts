import { describe, it, expect } from "vitest";
import { shotsToCues, formatSrtTime, formatVttTime, buildSrt, buildVtt, shotsToSrt } from "@/lib/subtitle-export";

const shots = [
  { duration: 3, voiceover: "第一句" },
  { duration: 2, voiceover: "" }, // blank: occupies 2s on the timeline but produces no cue
  { duration: 4, voiceover: "第三句" },
];

describe("shotsToCues", () => {
  it("按 duration 累加、跳过空旁白但时间轴照推进", () => {
    const cues = shotsToCues(shots);
    expect(cues.length).toBe(2);
    expect(cues[0]).toMatchObject({ index: 1, startMs: 0, endMs: 3000, text: "第一句" });
    // third sentence starts at 3000 + 2000 (blank placeholder) = 5000
    expect(cues[1]).toMatchObject({ index: 2, startMs: 5000, endMs: 9000, text: "第三句" });
  });
  it("时长 0 但有文案 → 给最小可见时长", () => {
    const cues = shotsToCues([{ duration: 0, voiceover: "x" }]);
    expect(cues[0].endMs - cues[0].startMs).toBeGreaterThanOrEqual(500);
  });
  it("短分镜(<500ms)不重叠：cue 尊重真实时长、不撑大", () => {
    const cues = shotsToCues([
      { duration: 0.2, voiceover: "a" },
      { duration: 0.2, voiceover: "b" },
      { duration: 0.2, voiceover: "c" },
    ]);
    expect(cues.map((c) => [c.startMs, c.endMs])).toEqual([
      [0, 200],
      [200, 400],
      [400, 600],
    ]);
    // assert no overlap between consecutive pairs
    for (let i = 1; i < cues.length; i++) expect(cues[i - 1].endMs).toBeLessThanOrEqual(cues[i].startMs);
  });
  it("全空 → 空数组", () => {
    expect(shotsToCues([{ duration: 3, voiceover: "  " }])).toEqual([]);
  });
});

describe("时间戳格式", () => {
  it("SRT 用逗号、VTT 用点，HH:MM:SS,mmm", () => {
    expect(formatSrtTime(3661500)).toBe("01:01:01,500");
    expect(formatVttTime(3661500)).toBe("01:01:01.500");
    expect(formatSrtTime(0)).toBe("00:00:00,000");
  });
});

describe("buildSrt / buildVtt", () => {
  it("SRT：序号 + 时间轴 + 文本", () => {
    const srt = shotsToSrt(shots);
    expect(srt).toContain("1\n00:00:00,000 --> 00:00:03,000\n第一句");
    expect(srt).toContain("2\n00:00:05,000 --> 00:00:09,000\n第三句");
  });
  it("VTT：带 WEBVTT 头", () => {
    const vtt = buildVtt(shotsToCues(shots));
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("00:00:00.000 --> 00:00:03.000");
  });
  it("空 cue → SRT 空串 / VTT 仅头", () => {
    expect(buildSrt([])).toBe("");
    expect(buildVtt([])).toBe("WEBVTT\n\n");
  });
});
