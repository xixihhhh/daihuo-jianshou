import { describe, it, expect } from "vitest";
import {
  ATLAS_BASE_URL,
  ATLAS_ONEKEY_MODELS,
  fillAtlasModelDefaults,
} from "@/lib/atlas-onekey";

describe("fillAtlasModelDefaults", () => {
  it("两者都为空时填 Atlas 默认模型", () => {
    expect(fillAtlasModelDefaults({})).toEqual({
      image: ATLAS_ONEKEY_MODELS.image,
      video: ATLAS_ONEKEY_MODELS.video,
    });
  });

  it("用户已选则保留，不被覆盖", () => {
    expect(
      fillAtlasModelDefaults({ image: "my/custom-image", video: "my/custom-video" })
    ).toEqual({ image: "my/custom-image", video: "my/custom-video" });
  });

  it("只缺一个时只补缺的那个", () => {
    expect(fillAtlasModelDefaults({ image: "keep/this" })).toEqual({
      image: "keep/this",
      video: ATLAS_ONEKEY_MODELS.video,
    });
  });

  it("空白字符串视为未选，回退默认", () => {
    expect(fillAtlasModelDefaults({ image: "   ", video: "" })).toEqual({
      image: ATLAS_ONEKEY_MODELS.image,
      video: ATLAS_ONEKEY_MODELS.video,
    });
  });
});

describe("Atlas 一键接入预设常量", () => {
  it("baseUrl 与各档模型 id 均已配置", () => {
    expect(ATLAS_BASE_URL).toMatch(/^https:\/\/api\.atlascloud\.ai/);
    for (const id of Object.values(ATLAS_ONEKEY_MODELS)) {
      expect(id.length).toBeGreaterThan(0);
    }
  });
});
