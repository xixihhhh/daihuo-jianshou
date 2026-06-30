import { create } from "zustand";
import { persist } from "zustand/middleware";

// product entry
export interface ProductItem {
  id: string;
  name: string;
  category: "beauty" | "food" | "home" | "fashion" | "tech" | "other";
  description?: string;
  images: string[]; // local blob URLs or server URLs
  price?: string;
  targetAudience?: string;
  videoCount: number;
  createdAt: Date;
}

// product library state
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

      // add a product
      addProduct: (product) =>
        set((state) => ({ products: [...state.products, product] })),

      // update a product
      updateProduct: (id, updates) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      // remove a product
      removeProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        })),

      // increment video generation count
      incrementVideoCount: (id) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, videoCount: p.videoCount + 1 } : p
          ),
        })),
    }),
    {
      name: "daihuo-jianshou-products",
      // JSON serialization converts Date to string; restore it when reading back
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
