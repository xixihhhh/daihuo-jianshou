import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Shot } from "@/lib/db/schema";

/** 脚本模板 */
export interface ScriptTemplate {
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description?: string;
  /** 适用品类 */
  category?: string;
  /** 适用视频模式 */
  videoMode?: string;
  /** 脚本风格 */
  styleType?: string;
  /** 脚本结构 */
  shots: Shot[];
  /** 总时长 */
  totalDuration?: number;
  /** 来源项目ID */
  sourceProjectId?: string;
  /** 使用次数 */
  useCount: number;
  /** 创建时间 */
  createdAt: Date;
}

interface TemplateState {
  /** 已保存的模板列表 */
  templates: ScriptTemplate[];
  /** 添加模板 */
  addTemplate: (template: ScriptTemplate) => void;
  /** 删除模板 */
  removeTemplate: (id: string) => void;
  /** 递增使用次数 */
  incrementUseCount: (id: string) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      templates: [],

      addTemplate: (template) =>
        set((state) => ({
          templates: [...state.templates, template],
        })),

      removeTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),

      incrementUseCount: (id) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, useCount: t.useCount + 1 } : t
          ),
        })),
    }),
    {
      name: "daihuo-jianshou-templates",
      // JSON 序列化会将 Date 转为字符串，读取时需要还原
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          if (parsed?.state?.templates) {
            parsed.state.templates = parsed.state.templates.map(
              (t: Record<string, unknown>) => ({
                ...t,
                createdAt: new Date(t.createdAt as string),
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
