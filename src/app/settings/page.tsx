"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LuPlus, LuTrash2, LuUser, LuStar, LuUpload, LuPalette } from "react-icons/lu";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useCharacterStore, type Character } from "@/lib/stores/project-store";
import { useBrandStore } from "@/lib/stores/brand-store";

// AI 平台配置信息
const AI_PROVIDERS = [
  {
    key: "atlas-cloud",
    name: "Atlas Cloud",
    description: "高质量图像和视频生成平台，支持多种 AI 模型",
    tip: "推荐首选，模型最全最便宜",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    ),
    iconBg: "from-blue-500 to-cyan-500",
  },
  {
    key: "fal-ai",
    name: "fal.ai",
    description: "快速推理平台，支持 Flux、SDXL 等主流图像生成模型",
    tip: "支持 Kling 3.0、Veo 3 等最新模型",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    iconBg: "from-purple-500 to-pink-500",
  },
  {
    key: "volcengine",
    name: "火山引擎",
    description: "字节跳动旗下云服务，提供豆包大模型和视频生成能力",
    tip: "字节系模型 Seedance/Seedream，中文优化好",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    ),
    iconBg: "from-orange-500 to-red-500",
  },
  {
    key: "alibaba",
    name: "阿里百炼",
    description: "阿里云大模型服务平台，支持通义系列模型和图像生成",
    tip: "万相系列，商品图生视频效果佳",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    iconBg: "from-amber-500 to-orange-500",
  },
  {
    key: "siliconflow",
    name: "硅基流动",
    description: "国产 AI 推理平台，提供高性价比的模型推理服务",
    tip: "国产高性价比推理平台",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <path d="M15 2v2" />
        <path d="M15 20v2" />
        <path d="M2 15h2" />
        <path d="M2 9h2" />
        <path d="M20 15h2" />
        <path d="M20 9h2" />
        <path d="M9 2v2" />
        <path d="M9 20v2" />
      </svg>
    ),
    iconBg: "from-emerald-500 to-teal-500",
  },
];

// 密码输入框（可切换显示/隐藏）
function PasswordInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${className ?? ""}`}>
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10 font-mono text-xs"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {visible ? (
          // 隐藏图标
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          </svg>
        ) : (
          // 显示图标
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

// 自定义开关组件
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  // 从 store 读取设置
  const {
    providers,
    llm,
    defaultResolution,
    defaultAspectRatio,
    setProvider,
    setLLM,
    setDefaultResolution,
    setDefaultAspectRatio,
  } = useSettingsStore();

  // 保存时的提示状态
  const [saved, setSaved] = useState(false);

  // LLM 连接测试状态
  const [llmTestStatus, setLlmTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  // 测试 LLM 连接
  const testLLMConnection = async () => {
    setLlmTestStatus("testing");
    try {
      const res = await fetch(llm.baseUrl + "/models", {
        headers: { Authorization: `Bearer ${llm.apiKey}` },
      });
      setLlmTestStatus(res.ok ? "success" : "error");
    } catch {
      setLlmTestStatus("error");
    }
    setTimeout(() => setLlmTestStatus("idle"), 3000);
  };

  // 计算 AI 平台配置状态
  const hasAnyProvider = Object.values(providers).some(p => p.enabled && p.apiKey);
  const enabledCount = Object.values(providers).filter(p => p.enabled && p.apiKey).length;

  // 处理保存（zustand persist 会自动保存，这里主要做 UI 反馈）
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen grid-bg">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg brand-gradient">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">带货剪手</span>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span className="ml-1.5">返回首页</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">设置</h1>
          <p className="text-sm text-muted-foreground mt-1">
            配置 AI 服务后即可开始生成带货视频。需要配置 LLM（生成脚本）+ 至少一个 AI 平台（生成图片/视频）。
          </p>
        </div>

        {/* 标签页 */}
        <Tabs defaultValue={0}>
          <TabsList className="mb-6">
            <TabsTrigger value={0}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <rect x="9" y="9" width="6" height="6" />
                <path d="M15 2v2" />
                <path d="M15 20v2" />
                <path d="M2 15h2" />
                <path d="M2 9h2" />
                <path d="M20 15h2" />
                <path d="M20 9h2" />
                <path d="M9 2v2" />
                <path d="M9 20v2" />
              </svg>
              AI 平台
            </TabsTrigger>
            <TabsTrigger value={1}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              LLM 配置
            </TabsTrigger>
            <TabsTrigger value={2}>
              <LuUser className="w-3.5 h-3.5" />
              出镜人物
            </TabsTrigger>
            <TabsTrigger value={3}>
              <LuPalette className="w-3.5 h-3.5" />
              品牌设置
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: AI 平台配置 */}
          <TabsContent value={0}>
            <div className="space-y-4">
              {AI_PROVIDERS.map((platform) => {
                const provider = providers[platform.key] ?? {
                  enabled: false,
                  apiKey: "",
                };

                return (
                  <Card key={platform.key} className="glass-card">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        {/* 平台信息 */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${platform.iconBg} text-white shadow-lg`}
                          >
                            {platform.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm">
                                {platform.name}
                              </h3>
                              {provider.enabled && (
                                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                                  已启用
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {platform.description}
                            </p>
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5">{platform.tip}</p>
                          </div>
                        </div>

                        {/* 启用开关 */}
                        <Toggle
                          checked={provider.enabled}
                          onChange={(enabled) =>
                            setProvider(platform.key, {
                              ...provider,
                              enabled,
                            })
                          }
                        />
                      </div>

                      {/* API Key 输入 */}
                      <div className="mt-4">
                        <Label className="text-xs text-muted-foreground mb-1.5">
                          API Key
                        </Label>
                        <PasswordInput
                          value={provider.apiKey}
                          onChange={(apiKey) =>
                            setProvider(platform.key, {
                              ...provider,
                              apiKey,
                            })
                          }
                          placeholder={`输入 ${platform.name} 的 API Key`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Tab 2: LLM 配置 */}
          <TabsContent value={1}>
            <div className="space-y-6">
              {/* LLM Provider 配置 */}
              <Card className="glass-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-sm">LLM Provider</h3>
                  </div>

                  {/* 快捷预设 */}
                  <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">快捷预设（点击自动填入 baseUrl 和模型，还需填写 API Key）：</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Atlas Cloud", baseUrl: "https://api.atlascloud.ai/v1", model: "claude-sonnet-4-20250514", tip: "推荐！LLM+生图生视频共用一个 Key" },
                        { label: "DeepSeek", baseUrl: "https://api.deepseek.com", model: "deepseek-v3.2", tip: "V3.2 推理+对话统一模型" },
                        { label: "Kimi", baseUrl: "https://api.moonshot.cn/v1", model: "kimi-k2.5", tip: "K2.5 支持 Agent Swarm" },
                        { label: "智谱 GLM", baseUrl: "https://open.bigmodel.cn/api/paas/v4", model: "glm-5-turbo", tip: "GLM-5 旗舰级" },
                        { label: "MiniMax", baseUrl: "https://api.minimax.chat/v1", model: "MiniMax-M2.7", tip: "M2.7 兼容 OpenAI 协议" },
                        { label: "豆包", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", model: "doubao-seed-2.0-pro", tip: "Seed 2.0 对标 GPT-5.2" },
                        { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-5.4", tip: "" },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => setLLM({ ...llm, baseUrl: preset.baseUrl, model: preset.model, visionModel: preset.model })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border border-border/50 bg-background hover:border-primary/40 hover:text-primary transition-colors"
                        >
                          {preset.label}
                          {preset.tip && <span className="text-[10px] text-muted-foreground/70">({preset.tip})</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {/* API 地址 */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        API 地址（baseUrl）
                      </Label>
                      <Input
                        value={llm.baseUrl}
                        onChange={(e) =>
                          setLLM({ ...llm, baseUrl: e.target.value })
                        }
                        placeholder="https://api.openai.com/v1"
                        className="font-mono text-xs"
                      />
                    </div>

                    {/* API Key */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        API Key
                      </Label>
                      <PasswordInput
                        value={llm.apiKey}
                        onChange={(apiKey) => setLLM({ ...llm, apiKey })}
                        placeholder="输入 LLM API Key"
                      />
                    </div>

                    {/* 模型名称 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          文本模型
                        </Label>
                        <Input
                          value={llm.model}
                          onChange={(e) =>
                            setLLM({ ...llm, model: e.target.value })
                          }
                          placeholder="gpt-4o"
                          className="font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          视觉模型
                        </Label>
                        <Input
                          value={llm.visionModel ?? ""}
                          onChange={(e) =>
                            setLLM({
                              ...llm,
                              visionModel: e.target.value || undefined,
                            })
                          }
                          placeholder="gpt-4o"
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>

                    {/* 测试连接按钮 */}
                    <div className="pt-3 mt-3 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={testLLMConnection}
                        disabled={!llm.apiKey || !llm.baseUrl || llmTestStatus === "testing"}
                        className={`text-xs ${
                          llmTestStatus === "success"
                            ? "text-emerald-600"
                            : llmTestStatus === "error"
                            ? "text-destructive"
                            : ""
                        }`}
                      >
                        {llmTestStatus === "testing" ? "测试中..."
                         : llmTestStatus === "success" ? "连接成功 ✓"
                         : llmTestStatus === "error" ? "连接失败 ✗"
                         : "测试连接"}
                      </Button>
                      {!llm.apiKey && (
                        <span className="text-xs text-muted-foreground ml-2">请先填写 API Key</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* 默认设置 */}
              <Card className="glass-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-sm">默认设置</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 默认分辨率 */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        默认分辨率
                      </Label>
                      <Select
                        value={defaultResolution}
                        onValueChange={(val) =>
                          setDefaultResolution(val as "720p" | "1080p")
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="720p">720p (1280x720)</SelectItem>
                          <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 默认画面比例 */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        默认画面比例
                      </Label>
                      <Select
                        value={defaultAspectRatio}
                        onValueChange={(val) =>
                          setDefaultAspectRatio(
                            val as "9:16" | "16:9" | "1:1"
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9:16">9:16 竖屏</SelectItem>
                          <SelectItem value="16:9">16:9 横屏</SelectItem>
                          <SelectItem value="1:1">1:1 方形</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          {/* Tab 3: 出镜人物管理 */}
          <TabsContent value={2}>
            <CharacterManager />
          </TabsContent>
          {/* Tab 4: 品牌设置 */}
          <TabsContent value={3}>
            <BrandSettings />
          </TabsContent>
        </Tabs>

        {/* 底部保存按钮 */}
        <div className="mt-8 flex items-center justify-between gap-3">
          {/* 配置状态摘要 */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className={llm.apiKey ? "text-emerald-600" : "text-amber-600"}>
              {llm.apiKey ? "✓ LLM 已配置" : "⚠ LLM 未配置（脚本生成需要）"}
            </p>
            <p className={hasAnyProvider ? "text-emerald-600" : "text-amber-600"}>
              {hasAnyProvider ? `✓ ${enabledCount} 个 AI 平台已启用` : "⚠ 无 AI 平台启用（素材生成需要）"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sm text-emerald-400 animate-in fade-in slide-in-from-right-2">
                设置已保存
              </span>
            )}
            <Button
              onClick={handleSave}
              className="brand-gradient text-white px-6"
              size="lg"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              保存设置
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ==================== 出镜人物管理组件 ====================

function CharacterManager() {
  const { characters, addCharacter, updateCharacter, removeCharacter } = useCharacterStore();
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", appearance: "", voiceStyle: "" });

  const resetForm = () => {
    setForm({ name: "", description: "", appearance: "", voiceStyle: "" });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateCharacter(editingId, {
        name: form.name,
        description: form.description,
        appearance: form.appearance,
        voiceProfile: form.voiceStyle ? { style: form.voiceStyle } : undefined,
      });
    } else {
      addCharacter({
        id: crypto.randomUUID(),
        name: form.name,
        description: form.description,
        appearance: form.appearance,
        referenceImages: [],
        voiceProfile: form.voiceStyle ? { style: form.voiceStyle } : undefined,
        isDefault: characters.length === 0,
      });
    }
    resetForm();
  };

  const startEdit = (char: Character) => {
    setEditingId(char.id);
    setIsCreating(true);
    setForm({
      name: char.name,
      description: char.description || "",
      appearance: char.appearance || "",
      voiceStyle: char.voiceProfile?.style || "",
    });
  };

  const setAsDefault = (id: string) => {
    characters.forEach((c) => updateCharacter(c.id, { isDefault: c.id === id }));
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            添加出镜人物后，AI 生成脚本和素材时会自动注入人物外貌描述，确保不同分镜中人物形象保持一致。
          </p>
        </CardContent>
      </Card>

      {characters.length > 0 && (
        <div className="space-y-3">
          {characters.map((char) => (
            <Card key={char.id} className={`glass-card ${char.isDefault ? "ring-1 ring-primary/50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <LuUser className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{char.name}</h3>
                        {char.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                            <LuStar className="w-3 h-3" />
                            默认
                          </span>
                        )}
                      </div>
                      {char.description && <p className="text-xs text-muted-foreground mb-1">{char.description}</p>}
                      {char.appearance && <p className="text-xs text-muted-foreground/70 line-clamp-1">外貌: {char.appearance}</p>}
                      {char.voiceProfile?.style && <p className="text-xs text-muted-foreground/70 mt-0.5">声音: {char.voiceProfile.style}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!char.isDefault && (
                      <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setAsDefault(char.id)}>
                        <LuStar className="w-3 h-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => startEdit(char)}>编辑</Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-destructive hover:text-destructive" onClick={() => removeCharacter(char.id)}>
                      <LuTrash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isCreating ? (
        <Card className="glass-card ring-1 ring-primary/30">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-sm font-semibold">{editingId ? "编辑人物" : "添加人物"}</h3>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">人物名称 *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="如：小美、张老师" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">简短描述</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="如：25岁护肤博主，活泼开朗" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">外貌特征（英文，用于 AI 生图 prompt）</Label>
              <Textarea value={form.appearance} onChange={(e) => setForm((f) => ({ ...f, appearance: e.target.value }))} placeholder="如：Young Asian woman, 25 years old, long black hair, oval face, fair skin, bright smile" rows={3} className="text-sm resize-none" />
              <p className="text-[11px] text-muted-foreground/60">描述越具体，不同分镜中人物的一致性越好</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">声音风格</Label>
              <Input value={form.voiceStyle} onChange={(e) => setForm((f) => ({ ...f, voiceStyle: e.target.value }))} placeholder="如：温柔女声、活力女声、专业男声" className="text-sm" />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={resetForm}>取消</Button>
              <Button size="sm" className="brand-gradient text-white" onClick={handleSave} disabled={!form.name.trim()}>
                {editingId ? "保存修改" : "添加人物"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="w-full h-12 border-dashed" onClick={() => setIsCreating(true)}>
          <LuPlus className="w-4 h-4 mr-2" />
          添加出镜人物
        </Button>
      )}
    </div>
  );
}

// ==================== 品牌设置组件 ====================

// 水印位置选项
const WATERMARK_POSITIONS = [
  { value: "top-left" as const, label: "左上" },
  { value: "top-right" as const, label: "右上" },
  { value: "bottom-left" as const, label: "左下" },
  { value: "bottom-right" as const, label: "右下" },
] as const;

function BrandSettings() {
  const { brand, updateBrand, updateWatermark } = useBrandStore();

  return (
    <div className="space-y-6">
      {/* 店铺基本信息 */}
      <Card className="glass-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h3 className="font-semibold text-sm">店铺信息</h3>
          </div>

          <div className="grid gap-4">
            {/* 店铺名称 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">店铺名称</Label>
              <Input
                value={brand.name}
                onChange={(e) => updateBrand({ name: e.target.value })}
                placeholder="输入品牌或店铺名称"
                className="text-sm"
              />
            </div>

            {/* Logo 上传区 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Logo</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 overflow-hidden">
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt="品牌 Logo"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // 将选择的图片转为 Data URL 存储
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            updateBrand({ logoUrl: ev.target?.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
                      <LuUpload className="w-3 h-3" />
                      上传 Logo
                    </span>
                  </label>
                  {brand.logoUrl && (
                    <button
                      onClick={() => updateBrand({ logoUrl: undefined })}
                      className="text-xs text-destructive hover:underline text-left"
                    >
                      移除
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 品牌色设置 */}
      <Card className="glass-card">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 text-white">
              <LuPalette className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-sm">品牌色</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 主色 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">主色</Label>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="color"
                    value={brand.primaryColor}
                    onChange={(e) => updateBrand({ primaryColor: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="h-9 w-9 rounded-lg border border-border shadow-sm"
                    style={{ backgroundColor: brand.primaryColor }}
                  />
                </div>
                <Input
                  value={brand.primaryColor}
                  onChange={(e) => updateBrand({ primaryColor: e.target.value })}
                  className="font-mono text-xs uppercase flex-1"
                  maxLength={7}
                />
              </div>
            </div>

            {/* 辅色 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">辅色</Label>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="color"
                    value={brand.secondaryColor}
                    onChange={(e) => updateBrand({ secondaryColor: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div
                    className="h-9 w-9 rounded-lg border border-border shadow-sm"
                    style={{ backgroundColor: brand.secondaryColor }}
                  />
                </div>
                <Input
                  value={brand.secondaryColor}
                  onChange={(e) => updateBrand({ secondaryColor: e.target.value })}
                  className="font-mono text-xs uppercase flex-1"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 水印设置 */}
      <Card className="glass-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm">水印设置</h3>
            </div>
            <Toggle
              checked={brand.watermark.enabled}
              onChange={(enabled) => updateWatermark({ enabled })}
            />
          </div>

          {brand.watermark.enabled && (
            <div className="space-y-4 pt-2">
              {/* 水印位置 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">水印位置</Label>
                <div className="grid grid-cols-4 gap-2">
                  {WATERMARK_POSITIONS.map((pos) => (
                    <button
                      key={pos.value}
                      onClick={() => updateWatermark({ position: pos.value })}
                      className={`h-9 rounded-lg border text-xs font-medium transition-colors ${
                        brand.watermark.position === pos.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 透明度 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">透明度</Label>
                  <span className="text-xs text-muted-foreground font-mono">
                    {Math.round(brand.watermark.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={Math.round(brand.watermark.opacity * 100)}
                  onChange={(e) =>
                    updateWatermark({ opacity: Number(e.target.value) / 100 })
                  }
                  className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/50">
                  <span>10%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 片尾设置 */}
      <Card className="glass-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <h3 className="font-semibold text-sm">片尾设置</h3>
            </div>
            <Toggle
              checked={brand.outroEnabled}
              onChange={(enabled) => updateBrand({ outroEnabled: enabled })}
            />
          </div>

          {brand.outroEnabled && (
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs text-muted-foreground">片尾文字</Label>
              <Textarea
                value={brand.outroText ?? ""}
                onChange={(e) => updateBrand({ outroText: e.target.value })}
                placeholder="如：关注我们获取更多好物推荐"
                rows={2}
                className="text-sm resize-none"
              />
              <p className="text-[11px] text-muted-foreground/60">
                片尾文字会叠加在品牌色背景上展示
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
