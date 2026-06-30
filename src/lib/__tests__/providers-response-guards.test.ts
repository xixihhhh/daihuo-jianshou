import { describe, it, expect, vi } from "vitest";
import { SiliconFlowProvider } from "@/lib/providers/siliconflow";
import { AlibabaProvider } from "@/lib/providers/alibaba";
import { FalAIProvider } from "@/lib/providers/fal-ai";
import { ProviderError } from "@/lib/providers/base";

/**
 * Second-round audit fix regressions: providers did not guard API responses before calling .map or
 * accessing nested fields, so malformed responses (HTTP 200 but missing images/output/request_id)
 * would crash with TypeError instead of a clear error.
 * Now unified to throw ProviderError — mock request returns an empty response and we assert
 * ProviderError is thrown rather than a bare TypeError.
 */
const cfg = (name: string) => ({ name, apiKey: "test", baseUrl: "https://example.com" });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRequest = (p: any, value: unknown) => vi.spyOn(p, "request").mockResolvedValue(value);

describe("provider 响应守卫（审计修复，malformed 响应抛 ProviderError 而非崩溃）", () => {
  it("SiliconFlow generateImage：images 缺失 → ProviderError 而非 TypeError", async () => {
    const p = new SiliconFlowProvider(cfg("siliconflow"));
    mockRequest(p, {}); // no images
    await expect(p.generateImage({ modelId: "m", mode: "text-to-image", prompt: "x" })).rejects.toThrow(ProviderError);
  });

  it("Alibaba generateImage：output 缺失 → ProviderError 而非 TypeError", async () => {
    const p = new AlibabaProvider(cfg("alibaba"));
    mockRequest(p, {}); // no output.task_id
    await expect(p.generateImage({ modelId: "m", mode: "text-to-image", prompt: "x" })).rejects.toThrow(ProviderError);
  });

  it("FalAI generateImage：request_id 缺失 → ProviderError 而非生成 'm::undefined' 任务", async () => {
    const p = new FalAIProvider(cfg("fal"));
    mockRequest(p, {}); // no request_id
    await expect(p.generateImage({ modelId: "m", mode: "text-to-image", prompt: "x" })).rejects.toThrow(ProviderError);
  });
});
