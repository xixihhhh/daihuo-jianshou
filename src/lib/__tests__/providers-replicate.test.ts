import { describe, it, expect, vi } from "vitest";
import { ReplicateProvider } from "@/lib/providers/replicate";

/**
 * ReplicateProvider 回归测试：getTaskStatus 只有 taskId、无从得知模型，故把 result.modelId 置空串；
 * generateImage/generateVideo 必须在返回前回填 options.modelId（与 alibaba/volcengine/siliconflow 一致），
 * 否则 `/api/ai/image|video` 直接 NextResponse.json(result) 会把空 modelId 返给前端。
 */
describe("ReplicateProvider modelId 回填（审计修复）", () => {
  // mock HTTP：createPrediction(/models/...) 返回 starting；getTaskStatus(/predictions/...) 返回 succeeded
  function mockProvider(output: string[]) {
    const p = new ReplicateProvider({ name: "replicate", apiKey: "test-token", baseUrl: "https://api.replicate.com/v1" });
    vi.spyOn(p as unknown as { request: (path: string) => Promise<unknown> }, "request").mockImplementation(
      async (path: string) => {
        if (path.startsWith("/models/")) return { id: "p1", status: "starting" };
        return { id: "p1", status: "succeeded", output };
      }
    );
    return p;
  }

  it("generateImage 回填 modelId（修复前为空串、丢模型信息）", async () => {
    const p = mockProvider(["https://example.com/i.png"]);
    const r = await p.generateImage({ modelId: "black-forest-labs/flux-1.1-pro", mode: "text-to-image", prompt: "x" });
    expect(r.modelId).toBe("black-forest-labs/flux-1.1-pro");
    expect(r.imageUrls).toEqual(["https://example.com/i.png"]);
  });

  it("generateVideo 回填 modelId", async () => {
    const p = mockProvider(["https://example.com/v.mp4"]);
    const r = await p.generateVideo({ modelId: "owner/video-model", mode: "image-to-video", prompt: "x" });
    expect(r.modelId).toBe("owner/video-model");
    expect(r.videoUrls).toEqual(["https://example.com/v.mp4"]);
  });
});
