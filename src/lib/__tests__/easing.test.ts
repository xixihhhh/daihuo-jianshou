import { describe, it, expect } from "vitest";
import { easeExpr, interpolate } from "@/lib/video-composer/easing";
import { MOTIONS } from "@/lib/video-composer/motions";

describe("easeExpr", () => {
  it("linear 原样；easeOut/easeIn 各自公式", () => {
    expect(easeExpr("p", "linear")).toBe("(p)");
    expect(easeExpr("p", "easeOut")).toContain("1-pow(1-p,2)");
    expect(easeExpr("p", "easeIn")).toContain("pow(p,2)");
  });
});

describe("interpolate", () => {
  it("含进度、起止值与缓动", () => {
    const z = interpolate("on", 90, 1, 1.5, "easeOut");
    expect(z).toContain("on/90");
    expect(z).toContain("1+(0.5)"); // v0 + (v1-v0)
    expect(z).toContain("1-pow"); // easeOut
  });
  it("frames<1 防除零", () => {
    expect(interpolate("on", 0, 1, 2, "linear")).toContain("on/1");
  });
  it("缺省 linear", () => {
    expect(interpolate("on", 10, 0, 1)).toContain("(on/10)");
  });
});

describe("MOTIONS 已用缓动（非匀速）", () => {
  it("zoom_in_slow / ken_burns 用 easeOut，不再硬编码匀速增量", () => {
    const zin = MOTIONS.zoom_in_slow.getFilter(1080, 1920, 3);
    expect(zin).toContain("1-pow"); // 缓动
    expect(zin).not.toContain("min(zoom+0.002"); // 旧匀速已替掉
    expect(zin).toContain("zoompan");
    expect(MOTIONS.ken_burns.getFilter(1080, 1920, 3)).toContain("1-pow");
  });
});
