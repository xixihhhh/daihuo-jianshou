import { describe, it, expect } from "vitest";
import { settings } from "@/lib/i18n/messages/settings";

/**
 * 审计修复回归：settings 页此前硬编码中文厂商名（火山引擎/阿里百炼/硅基流动）和「网络异常」，
 * 英文用户原样看到中文。现改为 i18n 键，这里守卫这些键在 zh/en 都存在且 en 无中文。
 */
describe("settings i18n 厂商名/错误无中文泄漏（审计修复）", () => {
  const en = settings.en as Record<string, string>;
  const zh = settings.zh as Record<string, string>;

  it("3 个厂商名键 + connectFailed 在 zh/en 都存在", () => {
    for (const k of ["providerVolcengineName", "providerAlibabaName", "providerSiliconflowName", "connectFailed"]) {
      expect(zh[k]).toBeTruthy();
      expect(en[k]).toBeTruthy();
    }
  });

  it("en 厂商名是英文品牌、不含中文（否则英文用户仍见中文）", () => {
    expect(en.providerVolcengineName).toBe("Volcengine");
    expect(en.providerAlibabaName).toBe("Alibaba Bailian");
    expect(en.providerSiliconflowName).toBe("SiliconFlow");
    for (const k of ["providerVolcengineName", "providerAlibabaName", "providerSiliconflowName"]) {
      expect(/[一-鿿]/.test(en[k])).toBe(false);
    }
  });

  it("zh 厂商名保持中文原名", () => {
    expect(zh.providerVolcengineName).toBe("火山引擎");
    expect(zh.providerAlibabaName).toBe("阿里百炼");
    expect(zh.providerSiliconflowName).toBe("硅基流动");
  });
});
