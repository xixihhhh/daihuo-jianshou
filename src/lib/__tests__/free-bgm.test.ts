import { describe, it, expect } from "vitest";
import { moodQueryForCategory } from "@/lib/free-bgm";

describe("moodQueryForCategory（品类→配乐情绪检索词）", () => {
  it("各品类映射到不同情绪", () => {
    expect(moodQueryForCategory("beauty")).toBe("upbeat fashion pop instrumental");
    expect(moodQueryForCategory("food")).toBe("warm cozy acoustic background");
    expect(moodQueryForCategory("home")).toBe("calm relaxing acoustic background");
    expect(moodQueryForCategory("fashion")).toBe("upbeat trendy pop instrumental");
  });

  it("digital 与 tech 同义（都映射科技感）", () => {
    expect(moodQueryForCategory("digital")).toBe("energetic electronic tech background");
    expect(moodQueryForCategory("tech")).toBe(moodQueryForCategory("digital"));
  });

  it("大小写不敏感、去空白", () => {
    expect(moodQueryForCategory("BEAUTY")).toBe("upbeat fashion pop instrumental");
    expect(moodQueryForCategory("  Food  ")).toBe("warm cozy acoustic background");
  });

  it("未知 / 空 / null / undefined 回退通用 ambient", () => {
    expect(moodQueryForCategory("不存在")).toBe("ambient background music");
    expect(moodQueryForCategory("")).toBe("ambient background music");
    expect(moodQueryForCategory(null)).toBe("ambient background music");
    expect(moodQueryForCategory(undefined)).toBe("ambient background music");
    expect(moodQueryForCategory("other")).toBe("ambient background music");
  });
});
