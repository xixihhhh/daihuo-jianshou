import { describe, it, expect } from "vitest";
import { buildTranslatePrompt, parseTranslations, langName, defaultVoiceForLang } from "@/lib/script-engine/translate";

describe("langName / defaultVoiceForLang", () => {
  it("code → 语种名（带区域 code 退化到主码）", () => {
    expect(langName("en")).toBe("English");
    expect(langName("ja-JP")).toBe("Japanese");
    expect(langName("xx")).toBe("xx");
  });
  it("目标语种 → 免费音色（lang 前缀匹配 FREE_TTS_VOICES）", () => {
    expect(defaultVoiceForLang("en")).toBe("en-US-AriaNeural");
    expect(defaultVoiceForLang("ja")).toBe("ja-JP-NanamiNeural");
    expect(defaultVoiceForLang("ko")).toBe("ko-KR-SunHiNeural");
    expect(defaultVoiceForLang("zh")).toBe("zh-CN-XiaoxiaoNeural");
    expect(defaultVoiceForLang("xx")).toBeNull();
  });
});

describe("buildTranslatePrompt", () => {
  it("含目标语种名、条数、JSON 要求、逐条编号", () => {
    const p = buildTranslatePrompt(["你好", "买它"], "en");
    expect(p).toContain("English");
    expect(p).toContain("2");
    expect(p).toContain("JSON array");
    expect(p).toContain("1. 你好");
    expect(p).toContain("2. 买它");
  });
});

describe("parseTranslations", () => {
  it("原始 JSON 数组", () => {
    expect(parseTranslations('["Hi","Buy it"]', 2)).toEqual(["Hi", "Buy it"]);
  });
  it("```json 围栏 + 周围文字", () => {
    expect(parseTranslations('Sure:\n```json\n["a","b","c"]\n```', 3)).toEqual(["a", "b", "c"]);
  });
  it("数量不符 → null", () => {
    expect(parseTranslations('["a"]', 2)).toBeNull();
  });
  it("非字符串数组 → null", () => {
    expect(parseTranslations("[1,2]", 2)).toBeNull();
  });
  it("非法文本 → null", () => {
    expect(parseTranslations("not json", 1)).toBeNull();
  });
});
