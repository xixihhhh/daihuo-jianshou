import { describe, it, expect } from "vitest";
import { buildCoverVf } from "@/lib/video-composer/cover";

describe("buildCoverVf", () => {
  it("short title → a single centered boxed drawtext (reuses the drawtext builder)", () => {
    const vf = buildCoverVf({ title: "测试封面", width: 1080 });
    expect((vf.match(/drawtext=/g) || []).length).toBe(1);
    expect(vf).toContain("expansion=none");
    expect(vf).toContain("fontsize=97"); // round(1080 * 0.09)
    expect(vf).toContain("box=1");
    expect(vf).toContain("x=(w-text_w)/2"); // centered horizontally
    expect(vf).toContain("(h-"); // vertically-centered block expression
  });

  it("long title wraps to multiple per-line centered boxed drawtexts (no horizontal overflow)", () => {
    const vf = buildCoverVf({ title: "谁懂啊这款云柔加厚抽纸真的绝了后悔没早买", width: 1080 });
    expect((vf.match(/drawtext=/g) || []).length).toBeGreaterThan(1); // wrapped to multiple lines
    expect((vf.match(/x=\(w-text_w\)\/2/g) || []).length).toBeGreaterThan(1); // each line centered
  });

  it("escapes colon/bracket in the title (raw separators would break the filter)", () => {
    const vf = buildCoverVf({ title: "A:B[1]", width: 1080 });
    expect(vf).not.toContain("text='A:B[1]'"); // must be escaped, not raw
  });

  it("position lower/upper change the block anchor", () => {
    expect(buildCoverVf({ title: "x", width: 1080, position: "lower" })).toContain("h*0.78-");
    expect(buildCoverVf({ title: "x", width: 1080, position: "upper" })).toContain("h*0.2-");
  });
});
