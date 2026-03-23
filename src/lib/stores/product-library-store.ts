import { create } from "zustand";
import { persist } from "zustand/middleware";

// 商品条目
export interface ProductItem {
  id: string;
  name: string;
  category: "beauty" | "food" | "home" | "fashion" | "tech" | "other";
  description?: string;
  images: string[]; // 本地 blob URL 或服务器 URL
  price?: string;
  targetAudience?: string;
  videoCount: number;
  createdAt: Date;
}

// 商品库状态
interface ProductLibraryState {
  products: ProductItem[];
  addProduct: (product: ProductItem) => void;
  updateProduct: (id: string, updates: Partial<ProductItem>) => void;
  removeProduct: (id: string) => void;
  incrementVideoCount: (id: string) => void;
}

export const useProductLibraryStore = create<ProductLibraryState>()(
  persist(
    (set) => ({
      products: [],

      // 添加商品
      addProduct: (product) =>
        set((state) => ({ products: [...state.products, product] })),

      // 更新商品
      updateProduct: (id, updates) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      // 删除商品
      removeProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        })),

      // 递增视频生成计数
      incrementVideoCount: (id) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, videoCount: p.videoCount + 1 } : p
          ),
        })),
    }),
    {
      name: "daihuo-jianshou-products",
      // JSON 序列化会将 Date 转为字符串，读取时需要还原
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          if (parsed?.state?.products) {
            parsed.state.products = parsed.state.products.map(
              (p: Record<string, unknown>) => ({
                ...p,
                createdAt: new Date(p.createdAt as string),
              })
            );
          }
          return parsed;
        },
        setItem: (name, value) => localStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
