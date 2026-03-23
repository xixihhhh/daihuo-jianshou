import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// 项目表
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  status: text("status", { enum: ["draft", "scripting", "assets", "video", "composing", "done"] }).notNull().default("draft"),
  productName: text("product_name"),
  productCategory: text("product_category"),
  productDescription: text("product_description"),
  productImages: text("product_images", { mode: "json" }).$type<string[]>().default([]),
  productAnalysis: text("product_analysis"), // LLM 视觉分析结果
  productId: text("product_id"), // 关联商品库（可选，也可直接填写）
  brandId: text("brand_id"), // 关联品牌设置
  templateId: text("template_id"), // 使用的脚本模板
  videoMode: text("video_mode", { enum: ["product_closeup", "graphic_montage", "scene_demo", "live_presenter"] }).default("product_closeup"), // 视频模式
  sourceType: text("source_type", { enum: ["manual", "clone"] }).default("manual"), // manual=手动创建, clone=爆款复刻
  sourceVideoUrl: text("source_video_url"), // 爆款复刻来源视频 URL
  characterId: text("character_id"), // 项目绑定的出镜人物（仅 live_presenter 模式）
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// 脚本表
export const scripts = sqliteTable("scripts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  styleType: text("style_type", { enum: ["pain_point", "scene", "comparison", "story", "custom"] }).notNull(),
  title: text("title"),
  totalDuration: integer("total_duration"), // 总时长（秒）
  shots: text("shots", { mode: "json" }).$type<Shot[]>().default([]),
  selected: integer("selected", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// 素材表
export const assets = sqliteTable("assets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotId: integer("shot_id").notNull(), // 对应分镜序号
  type: text("type", { enum: ["ai_generated", "product_image", "user_upload"] }).notNull(),
  filePath: text("file_path"),
  thumbnailPath: text("thumbnail_path"),
  provider: text("provider"),
  model: text("model"),
  prompt: text("prompt"),
  status: text("status", { enum: ["pending", "generating", "done", "failed"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// 视频片段表
export const videoClips = sqliteTable("video_clips", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  shotId: integer("shot_id").notNull(),
  assetId: text("asset_id").references(() => assets.id),
  filePath: text("file_path"),
  duration: integer("duration"), // 毫秒
  provider: text("provider"),
  model: text("model"),
  transitionType: text("transition_type", { enum: ["ai_start_end", "ai_reference", "direct_concat", "ffmpeg_fade"] }).default("ai_start_end"),
  status: text("status", { enum: ["pending", "generating", "done", "failed"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// 合成输出表
export const compositions = sqliteTable("compositions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  outputPath: text("output_path"),
  resolution: text("resolution", { enum: ["720p", "1080p"] }).default("1080p"),
  aspectRatio: text("aspect_ratio", { enum: ["9:16", "16:9", "1:1"] }).default("9:16"), // 竖屏为主
  duration: integer("duration"), // 毫秒
  bgmPath: text("bgm_path"),
  ttsEnabled: integer("tts_enabled", { mode: "boolean" }).default(false),
  subtitleStyle: text("subtitle_style", { mode: "json" }).$type<SubtitleStyle>(),
  status: text("status", { enum: ["pending", "composing", "done", "failed"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// 商品库表 — 跨项目复用的商品信息
export const products = sqliteTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(), // 商品名称
  category: text("category", { enum: ["beauty", "food", "home", "fashion", "tech", "other"] }).notNull(),
  description: text("description"), // 卖点描述
  images: text("images", { mode: "json" }).$type<string[]>().default([]), // 商品图 URL 列表
  price: text("price"), // 价格信息（如"59.9元"、"199-299元"）
  targetAudience: text("target_audience"), // 目标人群
  analysis: text("analysis"), // LLM 视觉分析结果（缓存）
  videoCount: integer("video_count").default(0), // 已生成的视频数量
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// 品牌设置表 — 统一的品牌视觉标识
export const brandSettings = sqliteTable("brand_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(), // 品牌/店铺名
  logoPath: text("logo_path"), // logo 图片路径
  primaryColor: text("primary_color"), // 品牌主色（hex）
  secondaryColor: text("secondary_color"), // 品牌辅色
  fontFamily: text("font_family"), // 首选字体
  watermark: text("watermark", { mode: "json" }).$type<WatermarkConfig>(), // 水印配置
  introTemplatePath: text("intro_template_path"), // 片头模板路径
  outroTemplatePath: text("outro_template_path"), // 片尾模板路径
  isDefault: integer("is_default", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// 脚本模板表 — 用户保存的成功脚本模板
export const scriptTemplates = sqliteTable("script_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(), // 模板名称
  description: text("description"), // 模板描述
  category: text("category"), // 适用品类
  videoMode: text("video_mode"), // 适用视频模式
  styleType: text("style_type"), // 脚本风格
  shots: text("shots", { mode: "json" }).$type<Shot[]>().default([]), // 脚本结构（shot 的 prompt 会被替换）
  sourceProjectId: text("source_project_id"), // 来源项目
  useCount: integer("use_count").default(0), // 被使用次数
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// 人物/角色表 — 跨项目复用的出镜人物
export const characters = sqliteTable("characters", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(), // 人物名称，如"小美"
  description: text("description"), // 简短描述，如"25岁女生，活泼开朗"
  appearance: text("appearance"), // 外貌特征（用于注入 AI prompt）
  referenceImages: text("reference_images", { mode: "json" }).$type<string[]>().default([]), // 参考图 URL 列表
  voiceProfile: text("voice_profile", { mode: "json" }).$type<CharacterVoiceProfile>(), // 声音偏好
  isDefault: integer("is_default", { mode: "boolean" }).default(false), // 是否为默认出镜人物
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// 设置表
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ===== 类型定义 =====

/** 视频模式：决定素材生成策略 */
export type VideoMode =
  | "product_closeup"   // 产品特写：商品原图 + 运动特效，真实感最高
  | "graphic_montage"   // 图文混剪：商品图 + 文字卡片 + 转场动画
  | "scene_demo"        // 场景演示：AI 生成使用场景（不含人脸）
  | "live_presenter";   // 真人出镜：人物出镜讲解（需要角色或用户上传素材）

export interface Shot {
  shotId: number;
  type: "hook" | "pain_point" | "product_reveal" | "demo" | "social_proof" | "cta";
  duration: number; // 秒
  description: string; // 画面描述
  camera: string; // 镜头运动
  visualSource: "ai_generate" | "product_image" | "user_upload";
  transition: "ai_start_end" | "ai_reference" | "direct_concat" | "ffmpeg_fade";
  voiceover: string; // 配音文案
  prompt?: string; // AI 生图/生视频 prompt
  /** 出镜人物 ID，关联 characters 表（可选） */
  characterId?: string;
  /** 运动效果，仅 product_image 类型使用 */
  motion?: "zoom_in_slow" | "pan_left" | "pan_right" | "ken_burns" | "static";
  /** 文字叠加层（图文混剪模式） */
  textOverlay?: {
    text: string;
    style: "title" | "subtitle" | "highlight" | "price";
  };
}

/** 人物声音偏好 */
export interface CharacterVoiceProfile {
  /** 声音风格描述，如"温柔女声"、"专业男声" */
  style: string;
  /** 语速偏好 0.8-1.5 */
  speed?: number;
  /** 情感倾向 */
  emotion?: "neutral" | "happy" | "serious" | "energetic";
}

/** 水印配置 */
export interface WatermarkConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 位置 */
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** 透明度 0-1 */
  opacity: number;
  /** 缩放比例 0.1-0.5 */
  scale: number;
}

export interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  position: "bottom" | "center" | "top";
}
