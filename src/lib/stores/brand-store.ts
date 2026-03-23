import { create } from "zustand";
import { persist } from "zustand/middleware";

// 品牌配置
export interface BrandConfig {
  id: string;
  name: string; // 品牌/店铺名
  logoUrl?: string; // logo 图片 URL
  primaryColor: string; // 主色（hex）
  secondaryColor: string; // 辅色（hex）
  fontFamily: string; // 字体
  watermark: {
    enabled: boolean;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    opacity: number; // 0.1-1.0
    scale: number; // 0.1-0.5
  };
  introEnabled: boolean; // 是否启用片头
  outroEnabled: boolean; // 是否启用片尾
  outroText?: string; // 片尾文字（如"关注我们获取更多好物推荐"）
}

interface BrandState {
  brand: BrandConfig;
  updateBrand: (updates: Partial<BrandConfig>) => void;
  updateWatermark: (updates: Partial<BrandConfig["watermark"]>) => void;
}

export const useBrandStore = create<BrandState>()(
  persist(
    (set) => ({
      brand: {
        id: crypto.randomUUID(),
        name: "我的店铺",
        primaryColor: "#6366f1",
        secondaryColor: "#8b5cf6",
        fontFamily: "默认字体",
        watermark: {
          enabled: false,
          position: "bottom-right",
          opacity: 0.3,
          scale: 0.15,
        },
        introEnabled: false,
        outroEnabled: false,
      },
      // 更新品牌配置（浅合并）
      updateBrand: (updates) =>
        set((state) => ({
          brand: { ...state.brand, ...updates },
        })),
      // 更新水印配置（浅合并）
      updateWatermark: (updates) =>
        set((state) => ({
          brand: {
            ...state.brand,
            watermark: { ...state.brand.watermark, ...updates },
          },
        })),
    }),
    {
      name: "daihuo-jianshou-brand",
    }
  )
);
