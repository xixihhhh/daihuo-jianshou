import { describe, it, expect } from "vitest";
import { buildAigcMetadataArgs } from "@/lib/compliance-metadata";

describe("buildAigcMetadataArgs（GB 45438-2025 隐式标识）", () => {
  it("含三要素：生成合成标签 + 服务提供者 + 内容制作编号", () => {
    const s = buildAigcMetadataArgs({ contentId: "proj-123" });
    expect(s).toContain("AIGC=1");
    expect(s).toContain("AI生成合成");
    expect(s).toContain("ClipForge"); // default service provider
    expect(s).toContain("proj-123"); // content production id
    expect(s).toContain("-metadata comment=");
    expect(s).toContain("-metadata copyright=");
    expect(s).toContain("-metadata description=");
  });

  it("确定性：同输入同输出", () => {
    expect(buildAigcMetadataArgs({ contentId: "x" })).toBe(buildAigcMetadataArgs({ contentId: "x" }));
  });

  it("自定义服务提供者生效", () => {
    expect(buildAigcMetadataArgs({ contentId: "x", serviceProvider: "我的品牌" })).toContain("我的品牌");
  });

  it("净化 shell 注入字符（双引号/$/反斜杠/反引号/换行被剥离）", () => {
    const s = buildAigcMetadataArgs({ contentId: 'a"b$c`d\\e\nf', serviceProvider: 'p$q' });
    expect(s).toContain("abcdef"); // remaining characters after dangerous chars are stripped
    expect(s).not.toContain("$");
    expect(s).not.toContain("`");
    expect(s).not.toContain("\\");
  });

  it("空 / 缺省 contentId 兜底为 unknown", () => {
    expect(buildAigcMetadataArgs({ contentId: "" })).toContain("unknown");
  });
});
