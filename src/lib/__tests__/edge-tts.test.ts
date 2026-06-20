import { describe, it, expect } from "vitest";
import { escapeSsml, FREE_TTS_VOICES, DEFAULT_FREE_VOICE } from "@/lib/edge-tts";

describe("escapeSsml（SSML 特殊字符转义）", () => {
  it("转义全部 5 个 XML 特殊字符", () => {
    expect(escapeSsml(`a & b < c > d " e ' f`)).toBe(
      "a &amp; b &lt; c &gt; d &quot; e &apos; f"
    );
  });
  it("& 必须先转义，避免二次转义出错", () => {
    // 若顺序错误（先转 < 再转 &），&lt; 会被二次转义成 &amp;lt;
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
  it("均为 zh-CN 短名且含性别", () => {
    for (const v of FREE_TTS_VOICES) {
      expect(v.value).toMatch(/^zh-CN-.+Neural$/);
      expect(["female", "male"]).toContain(v.gender);
      expect(v.label.length).toBeGreaterThan(0);
    }
  });
  it("默认是温柔女声晓晓", () => {
    expect(DEFAULT_FREE_VOICE).toBe("zh-CN-XiaoxiaoNeural");
  });
});
