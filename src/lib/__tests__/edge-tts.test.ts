import { describe, it, expect } from "vitest";
import { escapeSsml, FREE_TTS_VOICES, DEFAULT_FREE_VOICE } from "@/lib/edge-tts";

describe("escapeSsml（SSML 特殊字符转义）", () => {
  it("转义全部 5 个 XML 特殊字符", () => {
    expect(escapeSsml(`a & b < c > d " e ' f`)).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &apos; f"
    );
  });
  it("& 必须先转义，避免二次转义出错", () => {
    // if order is wrong (< escaped before &), &lt; would be double-escaped to &amp;lt;
    expect(escapeSsml("<")).toBe("&lt;");
    expect(escapeSsml("&lt;")).toBe("&amp;lt;");
  });
  it("普通中文不受影响", () => {
    expect(escapeSsml("慢下来，享受这一刻")).toBe("慢下来，享受这一刻");
  });
  it("空串返回空串", () => {
    expect(escapeSsml("")).toBe("");
  });
});

describe("免费音色清单", () => {
  it("默认音色在清单内", () => {
    expect(FREE_TTS_VOICES.some((v) => v.value === DEFAULT_FREE_VOICE)).toBe(true);
  });
  it("每个音色含合法 Edge 短名 + 性别 + 语言（value 与 lang 前缀一致）", () => {
    for (const v of FREE_TTS_VOICES) {
      expect(v.value).toMatch(/^[a-z]{2}-[A-Z]{2}-.+Neural$/); // language-region-nameNeural
      expect(["female", "male"]).toContain(v.gender);
      expect(v.label.length).toBeGreaterThan(0);
      expect(v.value.startsWith(v.lang)).toBe(true);
    }
  });
  it("含中文+英文+多语言音色（全球化定位：外文脚本要外文原生发音）", () => {
    const langs = new Set(FREE_TTS_VOICES.map((v) => v.lang));
    expect(langs.has("zh-CN")).toBe(true);
    expect(langs.has("en-US")).toBe(true); // primary language for overseas distribution
    expect(langs.size).toBeGreaterThanOrEqual(4); // at least 4 languages
  });
  it("默认是温柔女声晓晓", () => {
    expect(DEFAULT_FREE_VOICE).toBe("zh-CN-XiaoxiaoNeural");
  });
});
