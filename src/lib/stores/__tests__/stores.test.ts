import { describe, it, expect, beforeEach } from "vitest";
import { useProductLibraryStore } from "../product-library-store";
import { useTemplateStore } from "../template-store";
import { useBrandStore } from "../brand-store";
import { useCharacterStore, useProjectStore } from "../project-store";
import type { ProductItem } from "../product-library-store";
import type { ScriptTemplate } from "../template-store";
import type { Character } from "../project-store";
import type { Shot } from "@/lib/db/schema";

// ==================== 商品库 Store 测试 ====================

describe("ProductLibraryStore", () => {
  beforeEach(() => {
    // 每个测试前重置 store 状态
    useProductLibraryStore.setState({ products: [] });
  });

  /** 创建测试用商品数据 */
  function createProduct(overrides?: Partial<ProductItem>): ProductItem {
    return {
      id: "product-1",
      name: "测试商品",
      category: "beauty",
      description: "这是一个测试商品",
      images: ["https://example.com/img.jpg"],
      price: "99.9元",
      targetAudience: "年轻女性",
      videoCount: 0,
      createdAt: new Date("2026-01-01"),
      ...overrides,
    };
  }

  it("添加商品", () => {
    const product = createProduct();
    useProductLibraryStore.getState().addProduct(product);

    const { products } = useProductLibraryStore.getState();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe("测试商品");
    expect(products[0].category).toBe("beauty");
    expect(products[0].videoCount).toBe(0);
  });

  it("添加多个商品", () => {
    useProductLibraryStore.getState().addProduct(createProduct({ id: "p1", name: "商品A" }));
    useProductLibraryStore.getState().addProduct(createProduct({ id: "p2", name: "商品B" }));

    const { products } = useProductLibraryStore.getState();
    expect(products).toHaveLength(2);
    expect(products[0].name).toBe("商品A");
    expect(products[1].name).toBe("商品B");
  });

  it("更新商品", () => {
    const product = createProduct();
    useProductLibraryStore.getState().addProduct(product);
    useProductLibraryStore.getState().updateProduct("product-1", {
      name: "更新后的商品",
      price: "199元",
    });

    const { products } = useProductLibraryStore.getState();
    expect(products[0].name).toBe("更新后的商品");
    expect(products[0].price).toBe("199元");
    // 其他字段保持不变
    expect(products[0].category).toBe("beauty");
  });

  it("更新不存在的商品不应报错且不改变数据", () => {
    const product = createProduct();
    useProductLibraryStore.getState().addProduct(product);
    useProductLibraryStore.getState().updateProduct("non-existent-id", {
      name: "不应生效",
    });

    const { products } = useProductLibraryStore.getState();
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe("测试商品");
  });

  it("删除商品", () => {
    useProductLibraryStore.getState().addProduct(createProduct({ id: "p1" }));
    useProductLibraryStore.getState().addProduct(createProduct({ id: "p2" }));
    useProductLibraryStore.getState().removeProduct("p1");

    const { products } = useProductLibraryStore.getState();
    expect(products).toHaveLength(1);
    expect(products[0].id).toBe("p2");
  });

  it("删除不存在的商品不应报错", () => {
    useProductLibraryStore.getState().addProduct(createProduct());
    // 删除不存在的 id，不应抛出异常
    expect(() => {
      useProductLibraryStore.getState().removeProduct("non-existent-id");
    }).not.toThrow();

    const { products } = useProductLibraryStore.getState();
    expect(products).toHaveLength(1);
  });

  it("递增视频计数", () => {
    useProductLibraryStore.getState().addProduct(createProduct({ id: "p1", videoCount: 0 }));
    useProductLibraryStore.getState().incrementVideoCount("p1");
    useProductLibraryStore.getState().incrementVideoCount("p1");

    const { products } = useProductLibraryStore.getState();
    expect(products[0].videoCount).toBe(2);
  });

  it("递增不存在的商品的视频计数不应报错", () => {
    useProductLibraryStore.getState().addProduct(createProduct());
    expect(() => {
      useProductLibraryStore.getState().incrementVideoCount("non-existent-id");
    }).not.toThrow();

    // 原有数据不受影响
    const { products } = useProductLibraryStore.getState();
    expect(products[0].videoCount).toBe(0);
  });

  it("createdAt 应为 Date 类型", () => {
    const product = createProduct({ createdAt: new Date("2026-03-01T10:00:00Z") });
    useProductLibraryStore.getState().addProduct(product);

    const { products } = useProductLibraryStore.getState();
    expect(products[0].createdAt).toBeInstanceOf(Date);
    expect(products[0].createdAt.toISOString()).toBe("2026-03-01T10:00:00.000Z");
  });
});

// ==================== 模板 Store 测试 ====================

describe("TemplateStore", () => {
  beforeEach(() => {
    useTemplateStore.setState({ templates: [] });
  });

  /** 创建测试用模板数据 */
  function createTemplate(overrides?: Partial<ScriptTemplate>): ScriptTemplate {
    const defaultShot: Shot = {
      shotId: 1,
      type: "hook",
      duration: 3,
      description: "吸引注意力的开场",
      camera: "zoom_in",
      visualSource: "ai_generate",
      transition: "ai_start_end",
      voiceover: "你是否遇到过这样的问题？",
    };
    return {
      id: "template-1",
      name: "测试模板",
      description: "痛点式脚本模板",
      category: "beauty",
      videoMode: "product_closeup",
      styleType: "pain_point",
      shots: [defaultShot],
      totalDuration: 30,
      sourceProjectId: "project-1",
      useCount: 0,
      createdAt: new Date("2026-01-01"),
      ...overrides,
    };
  }

  it("添加模板", () => {
    const template = createTemplate();
    useTemplateStore.getState().addTemplate(template);

    const { templates } = useTemplateStore.getState();
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe("测试模板");
    expect(templates[0].shots).toHaveLength(1);
    expect(templates[0].useCount).toBe(0);
  });

  it("删除模板", () => {
    useTemplateStore.getState().addTemplate(createTemplate({ id: "t1" }));
    useTemplateStore.getState().addTemplate(createTemplate({ id: "t2" }));
    useTemplateStore.getState().removeTemplate("t1");

    const { templates } = useTemplateStore.getState();
    expect(templates).toHaveLength(1);
    expect(templates[0].id).toBe("t2");
  });

  it("删除不存在的模板不应报错", () => {
    useTemplateStore.getState().addTemplate(createTemplate());
    expect(() => {
      useTemplateStore.getState().removeTemplate("non-existent-id");
    }).not.toThrow();

    const { templates } = useTemplateStore.getState();
    expect(templates).toHaveLength(1);
  });

  it("递增使用次数", () => {
    useTemplateStore.getState().addTemplate(createTemplate({ id: "t1", useCount: 0 }));
    useTemplateStore.getState().incrementUseCount("t1");
    useTemplateStore.getState().incrementUseCount("t1");
    useTemplateStore.getState().incrementUseCount("t1");

    const { templates } = useTemplateStore.getState();
    expect(templates[0].useCount).toBe(3);
  });

  it("递增不存在模板的使用次数不应报错", () => {
    useTemplateStore.getState().addTemplate(createTemplate());
    expect(() => {
      useTemplateStore.getState().incrementUseCount("non-existent-id");
    }).not.toThrow();

    const { templates } = useTemplateStore.getState();
    expect(templates[0].useCount).toBe(0);
  });

  it("createdAt 应为 Date 类型", () => {
    const template = createTemplate({ createdAt: new Date("2026-06-15T08:00:00Z") });
    useTemplateStore.getState().addTemplate(template);

    const { templates } = useTemplateStore.getState();
    expect(templates[0].createdAt).toBeInstanceOf(Date);
  });
});

// ==================== 品牌 Store 测试 ====================

describe("BrandStore", () => {
  beforeEach(() => {
    // 重置为默认值
    useBrandStore.setState({
      brand: {
        id: "test-brand-id",
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
    });
  });

  it("默认值正确", () => {
    const { brand } = useBrandStore.getState();
    expect(brand.name).toBe("我的店铺");
    expect(brand.primaryColor).toBe("#6366f1");
    expect(brand.secondaryColor).toBe("#8b5cf6");
    expect(brand.fontFamily).toBe("默认字体");
    expect(brand.introEnabled).toBe(false);
    expect(brand.outroEnabled).toBe(false);
  });

  it("默认水印配置正确", () => {
    const { brand } = useBrandStore.getState();
    expect(brand.watermark.enabled).toBe(false);
    expect(brand.watermark.position).toBe("bottom-right");
    expect(brand.watermark.opacity).toBe(0.3);
    expect(brand.watermark.scale).toBe(0.15);
  });

  it("更新品牌信息（浅合并）", () => {
    useBrandStore.getState().updateBrand({
      name: "新店铺名称",
      primaryColor: "#ff0000",
      outroEnabled: true,
      outroText: "感谢观看",
    });

    const { brand } = useBrandStore.getState();
    expect(brand.name).toBe("新店铺名称");
    expect(brand.primaryColor).toBe("#ff0000");
    expect(brand.outroEnabled).toBe(true);
    expect(brand.outroText).toBe("感谢观看");
    // 未更新的字段保持不变
    expect(brand.secondaryColor).toBe("#8b5cf6");
    expect(brand.fontFamily).toBe("默认字体");
  });

  it("更新品牌信息不应覆盖水印配置", () => {
    useBrandStore.getState().updateBrand({ name: "新名称" });

    const { brand } = useBrandStore.getState();
    // 水印配置应该保持完整
    expect(brand.watermark.enabled).toBe(false);
    expect(brand.watermark.position).toBe("bottom-right");
  });

  it("更新水印配置（浅合并）", () => {
    useBrandStore.getState().updateWatermark({
      enabled: true,
      opacity: 0.8,
    });

    const { brand } = useBrandStore.getState();
    expect(brand.watermark.enabled).toBe(true);
    expect(brand.watermark.opacity).toBe(0.8);
    // 未更新的水印字段保持不变
    expect(brand.watermark.position).toBe("bottom-right");
    expect(brand.watermark.scale).toBe(0.15);
  });

  it("更新水印位置", () => {
    useBrandStore.getState().updateWatermark({ position: "top-left" });

    const { brand } = useBrandStore.getState();
    expect(brand.watermark.position).toBe("top-left");
  });

  it("设置 logo", () => {
    useBrandStore.getState().updateBrand({
      logoUrl: "https://example.com/logo.png",
    });

    const { brand } = useBrandStore.getState();
    expect(brand.logoUrl).toBe("https://example.com/logo.png");
  });
});

// ==================== 人物/角色 Store 测试 ====================

describe("CharacterStore", () => {
  beforeEach(() => {
    useCharacterStore.setState({ characters: [] });
  });

  /** 创建测试用人物数据 */
  function createCharacter(overrides?: Partial<Character>): Character {
    return {
      id: "char-1",
      name: "小美",
      description: "25岁女生，活泼开朗",
      appearance: "young woman with long black hair",
      referenceImages: ["https://example.com/ref1.jpg"],
      voiceProfile: { style: "温柔女声", speed: 1.0, emotion: "happy" },
      isDefault: false,
      ...overrides,
    };
  }

  it("添加人物", () => {
    const char = createCharacter();
    useCharacterStore.getState().addCharacter(char);

    const { characters } = useCharacterStore.getState();
    expect(characters).toHaveLength(1);
    expect(characters[0].name).toBe("小美");
    expect(characters[0].referenceImages).toHaveLength(1);
  });

  it("添加多个人物", () => {
    useCharacterStore.getState().addCharacter(createCharacter({ id: "c1", name: "小美" }));
    useCharacterStore.getState().addCharacter(createCharacter({ id: "c2", name: "小强" }));

    const { characters } = useCharacterStore.getState();
    expect(characters).toHaveLength(2);
  });

  it("更新人物", () => {
    useCharacterStore.getState().addCharacter(createCharacter());
    useCharacterStore.getState().updateCharacter("char-1", {
      name: "小美（更新）",
      appearance: "young woman with short hair",
    });

    const { characters } = useCharacterStore.getState();
    expect(characters[0].name).toBe("小美（更新）");
    expect(characters[0].appearance).toBe("young woman with short hair");
    // 未更新的字段保持不变
    expect(characters[0].description).toBe("25岁女生，活泼开朗");
  });

  it("更新不存在的人物不应报错", () => {
    useCharacterStore.getState().addCharacter(createCharacter());
    expect(() => {
      useCharacterStore.getState().updateCharacter("non-existent-id", { name: "不存在" });
    }).not.toThrow();

    const { characters } = useCharacterStore.getState();
    expect(characters[0].name).toBe("小美");
  });

  it("删除人物", () => {
    useCharacterStore.getState().addCharacter(createCharacter({ id: "c1" }));
    useCharacterStore.getState().addCharacter(createCharacter({ id: "c2" }));
    useCharacterStore.getState().removeCharacter("c1");

    const { characters } = useCharacterStore.getState();
    expect(characters).toHaveLength(1);
    expect(characters[0].id).toBe("c2");
  });

  it("删除不存在的人物不应报错", () => {
    useCharacterStore.getState().addCharacter(createCharacter());
    expect(() => {
      useCharacterStore.getState().removeCharacter("non-existent-id");
    }).not.toThrow();

    const { characters } = useCharacterStore.getState();
    expect(characters).toHaveLength(1);
  });

  it("获取默认人物", () => {
    useCharacterStore.getState().addCharacter(createCharacter({ id: "c1", isDefault: false }));
    useCharacterStore.getState().addCharacter(createCharacter({ id: "c2", isDefault: true }));

    const defaultChar = useCharacterStore.getState().getDefault();
    expect(defaultChar).toBeDefined();
    expect(defaultChar!.id).toBe("c2");
  });

  it("没有默认人物时返回 undefined", () => {
    useCharacterStore.getState().addCharacter(createCharacter({ isDefault: false }));

    const defaultChar = useCharacterStore.getState().getDefault();
    expect(defaultChar).toBeUndefined();
  });

  it("设为默认（取消其他默认）", () => {
    useCharacterStore.getState().addCharacter(createCharacter({ id: "c1", isDefault: true }));
    useCharacterStore.getState().addCharacter(createCharacter({ id: "c2", isDefault: false }));
    useCharacterStore.getState().addCharacter(createCharacter({ id: "c3", isDefault: false }));

    // 将 c2 设为默认
    useCharacterStore.getState().setDefault("c2");

    const { characters } = useCharacterStore.getState();
    expect(characters.find((c) => c.id === "c1")!.isDefault).toBe(false);
    expect(characters.find((c) => c.id === "c2")!.isDefault).toBe(true);
    expect(characters.find((c) => c.id === "c3")!.isDefault).toBe(false);

    // getDefault 也应返回 c2
    const defaultChar = useCharacterStore.getState().getDefault();
    expect(defaultChar!.id).toBe("c2");
  });

  it("设为默认：对不存在的 id 调用不应报错", () => {
    useCharacterStore.getState().addCharacter(createCharacter({ id: "c1", isDefault: true }));

    expect(() => {
      useCharacterStore.getState().setDefault("non-existent-id");
    }).not.toThrow();

    // 所有人物的 isDefault 都会被设为 false（因为没有匹配的 id）
    const { characters } = useCharacterStore.getState();
    expect(characters[0].isDefault).toBe(false);
  });
});

// ==================== 项目 Store 测试 ====================

describe("ProjectStore", () => {
  beforeEach(() => {
    useProjectStore.setState({
      currentProject: null,
      projects: [],
      currentStep: "upload",
      currentCharacter: null,
    });
  });

  it("设置当前项目", () => {
    const project = {
      id: "proj-1",
      name: "测试项目",
      status: "draft",
      productImages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    useProjectStore.getState().setCurrentProject(project);

    const { currentProject } = useProjectStore.getState();
    expect(currentProject).not.toBeNull();
    expect(currentProject!.name).toBe("测试项目");
  });

  it("设置当前步骤", () => {
    useProjectStore.getState().setCurrentStep("script");
    expect(useProjectStore.getState().currentStep).toBe("script");

    useProjectStore.getState().setCurrentStep("assets");
    expect(useProjectStore.getState().currentStep).toBe("assets");
  });

  it("更新项目同时同步 projects 数组", () => {
    const project = {
      id: "proj-1",
      name: "原始名称",
      status: "draft",
      productImages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 同时设置 currentProject 和 projects
    useProjectStore.setState({
      currentProject: project,
      projects: [project],
    });

    useProjectStore.getState().updateProject({ name: "更新后名称" });

    const { currentProject, projects } = useProjectStore.getState();
    // currentProject 应该被更新
    expect(currentProject!.name).toBe("更新后名称");
    // projects 数组中对应的项目也应该被更新
    expect(projects[0].name).toBe("更新后名称");
  });

  it("没有 currentProject 时 updateProject 不应报错", () => {
    expect(() => {
      useProjectStore.getState().updateProject({ name: "不应生效" });
    }).not.toThrow();

    expect(useProjectStore.getState().currentProject).toBeNull();
  });

  it("设置当前人物", () => {
    const character: Character = {
      id: "char-1",
      name: "小美",
      referenceImages: [],
    };
    useProjectStore.getState().setCurrentCharacter(character);

    expect(useProjectStore.getState().currentCharacter).not.toBeNull();
    expect(useProjectStore.getState().currentCharacter!.name).toBe("小美");
  });

  it("清空当前人物", () => {
    useProjectStore.getState().setCurrentCharacter({
      id: "char-1",
      name: "小美",
      referenceImages: [],
    });
    useProjectStore.getState().setCurrentCharacter(null);

    expect(useProjectStore.getState().currentCharacter).toBeNull();
  });

  it("setProjects 替换整个列表", () => {
    const projects = [
      { id: "p1", name: "项目1", status: "draft", productImages: [] as string[], createdAt: new Date(), updatedAt: new Date() },
      { id: "p2", name: "项目2", status: "draft", productImages: [] as string[], createdAt: new Date(), updatedAt: new Date() },
    ];
    useProjectStore.getState().setProjects(projects);

    expect(useProjectStore.getState().projects).toHaveLength(2);

    // 替换为空列表
    useProjectStore.getState().setProjects([]);
    expect(useProjectStore.getState().projects).toHaveLength(0);
  });
});
