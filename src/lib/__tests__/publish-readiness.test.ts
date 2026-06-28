import { describe, it, expect } from "vitest";
import { checkPublishReadiness } from "@/lib/publish-readiness";
import type { Shot } from "@/lib/db/schema";

const mk = (o: Partial<Shot>): Shot => ({
  shotId: 1,
  type: "demo",
  duration: 5,
  description: "",
  camera: "",
  visualSource: "ai_generate",
  transition: "direct_concat",
  voiceover: "",
  ...o,
});

const item = (r: ReturnType<typeof checkPublishReadiness>, key: string) => r.items.find((i) => i.key === key);

describe("checkPublishReadiness", () => {
  const good: Shot[] = [
    mk({ shotId: 1, type: "hook", duration: 3, voiceover: "你还在为脸出油发愁吗" }),
    mk({ shotId: 2, type: "product_reveal", duration: 12, voiceover: "这款氨基酸洁面温和不刺激" }),
    mk({ shotId: 3, type: "cta", duration: 6, voiceover: "点下方小黄车带走它" }),
  ];

  it("健康脚本 → ready，无 warn/fail", () => {
    const r = checkPublishReadiness(good, 30, { aigcLabel: true });
    expect(r.overall).toBe("ready");
    expect(r.fail).toBe(0);
    expect(r.warn).toBe(0);
    expect(item(r, "aigc")?.status).toBe("pass");
  });

  it("广告法风险词 → compliance fail → needsWork（含命中词）", () => {
    const r = checkPublishReadiness([mk({ type: "hook", duration: 3, voiceover: "这是最好的面膜全网最低" })], 20);
    expect(item(r, "compliance")?.status).toBe("fail");
    expect(item(r, "compliance")?.message).toContain("最好");
    expect(r.overall).toBe("needsWork");
  });

  it("开场钩子偏长(>4s) → hook warn", () => {
    const r = checkPublishReadiness([mk({ type: "hook", duration: 6, voiceover: "你还在发愁吗" }), ...good.slice(1)], 30);
    expect(item(r, "hook")?.status).toBe("warn");
  });

  it("开场钩子偏平(无疑问/数字/痛点) → hook warn", () => {
    const r = checkPublishReadiness([mk({ type: "hook", duration: 3, voiceover: "今天给大家介绍一款面膜" }), ...good.slice(1)], 30);
    expect(item(r, "hook")?.status).toBe("warn");
  });

  it("钩子含「还在」痛点信号 → hook pass", () => {
    const r = checkPublishReadiness(good, 30);
    expect(item(r, "hook")?.status).toBe("pass");
  });

  it("时长太短/太长 → duration warn", () => {
    expect(item(checkPublishReadiness(good, 10), "duration")?.status).toBe("warn");
    expect(item(checkPublishReadiness(good, 70), "duration")?.status).toBe("warn");
    expect(item(checkPublishReadiness(good, 30), "duration")?.status).toBe("pass");
  });

  it("字幕过密(字/秒超阈值) → caption warn，点名分镜", () => {
    const dense = mk({ shotId: 2, type: "demo", duration: 2, voiceover: "这是一段非常非常长的字幕根本读不完真的真的" });
    const r = checkPublishReadiness([good[0], dense, good[2]], 30);
    expect(item(r, "caption")?.status).toBe("warn");
    expect(item(r, "caption")?.message).toContain("2");
  });

  it("无行动号召 → cta warn", () => {
    const r = checkPublishReadiness([mk({ type: "hook", voiceover: "还在发愁" }), mk({ type: "demo", voiceover: "产品很好用" })], 25);
    expect(item(r, "cta")?.status).toBe("warn");
  });

  it("结构缺段(只有 hook) → structure warn", () => {
    const r = checkPublishReadiness([mk({ type: "hook", voiceover: "还在发愁" })], 25);
    expect(item(r, "structure")?.status).toBe("warn");
  });

  it("AIGC 标签：false→warn，true→pass，未传→不出该项", () => {
    expect(item(checkPublishReadiness(good, 30, { aigcLabel: false }), "aigc")?.status).toBe("warn");
    expect(item(checkPublishReadiness(good, 30, { aigcLabel: true }), "aigc")?.status).toBe("pass");
    expect(item(checkPublishReadiness(good, 30, {}), "aigc")).toBeUndefined();
  });

  it("locale=en → 英文文案", () => {
    const r = checkPublishReadiness([mk({ type: "hook", voiceover: "最好" })], 30, { locale: "en" });
    expect(item(r, "compliance")?.message).toMatch(/ad-law/);
  });

  it("overall 优先级：有 fail 即 needsWork（即便也有 pass）", () => {
    const r = checkPublishReadiness([mk({ type: "hook", duration: 3, voiceover: "最好的产品还在等什么" }), ...good.slice(1)], 30, { aigcLabel: true });
    expect(r.fail).toBeGreaterThan(0);
    expect(r.overall).toBe("needsWork");
  });
});
