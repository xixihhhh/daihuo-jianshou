import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Shot, CharacterVoiceProfile } from "@/lib/db/schema";

// ==================== 人物/角色 ====================

export interface Character {
  id: string;
  name: string;
  description?: string;
  /** 外貌特征描述（英文，用于注入 AI prompt） */
  appearance?: string;
  /** 参考图 URL 列表 */
  referenceImages: string[];
  /** 声音偏好 */
  voiceProfile?: CharacterVoiceProfile;
  /** 是否为默认出镜人物 */
  isDefault?: boolean;
}

// ==================== 项目 ====================

export type Step = "upload" | "script" | "assets" | "video" | "export";

export interface Project {
  id: string;
  name: string;
  status: string;
  productName?: string;
  productCategory?: string;
  productDescription?: string;
  productImages: string[];
  productAnalysis?: string;
  /** 项目绑定的出镜人物 */
  characterId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Script {
  id: string;
  projectId: string;
  version: number;
  styleType: string;
  title?: string;
  totalDuration?: number;
  shots: Shot[];
  selected: boolean;
}

// ==================== Store ====================

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  currentStep: Step;
  /** 当前项目使用的人物 */
  currentCharacter: Character | null;

  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setCurrentStep: (step: Step) => void;
  updateProject: (updates: Partial<Project>) => void;
  setCurrentCharacter: (character: Character | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  projects: [],
  currentStep: "upload",
  currentCharacter: null,

  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects }),
  setCurrentStep: (step) => set({ currentStep: step }),
  updateProject: (updates) =>
    set((state) => ({
      currentProject: state.currentProject
        ? { ...state.currentProject, ...updates }
        : null,
      // 同步更新 projects 数组中对应的项目
      projects: state.currentProject
        ? state.projects.map((p) =>
            p.id === state.currentProject!.id
              ? { ...p, ...updates }
              : p
          )
        : state.projects,
    })),
  setCurrentCharacter: (character) => set({ currentCharacter: character }),
}));

// ==================== 人物库 Store（持久化） ====================

interface CharacterState {
  characters: Character[];
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
  getDefault: () => Character | undefined;
  /** 将指定人物设为默认，同时取消其他人物的默认状态 */
  setDefault: (id: string) => void;
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set, get) => ({
      characters: [],

      addCharacter: (character) =>
        set((state) => ({ characters: [...state.characters, character] })),

      updateCharacter: (id, updates) =>
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      removeCharacter: (id) =>
        set((state) => ({
          characters: state.characters.filter((c) => c.id !== id),
        })),

      getDefault: () => get().characters.find((c) => c.isDefault),

      setDefault: (id) =>
        set((state) => ({
          characters: state.characters.map((c) =>
            c.id === id
              ? { ...c, isDefault: true }
              : { ...c, isDefault: false }
          ),
        })),
    }),
    { name: "daihuo-jianshou-characters" }
  )
);
