import { describe, it, expect } from "vitest";
import { buildCardVf } from "@/lib/video-composer/carousel";

describe("buildCardVf", () => {
  it("wrapped centered drawtext (reuses wrapCaption + buildDrawtext escaping)", () => {
    const vf = buildCardVf({ text: "这是一段比较长的卡片正文用于测试自动换行效果是否正常显示在卡片上", width: 1080 });
    expect(vf).toContain("drawtext=");
    expect(vf).toContain("expansion=none");
    expect(vf).toContain("x=(w-text_w)/2");
    expect(vf).toContain("(h-text_h)/2");
    expect(vf).toContain("line_spacing="); // multi-line spacing set
  });
  it("explicit fontSize/color flow through", () => {
    const vf = buildCardVf({ text: "x", width: 1080, fontSize: 90, fontColor: "yellow" });
    expect(vf).toContain("fontsize=90");
    expect(vf).toContain("fontcolor=yellow");
  });
});
