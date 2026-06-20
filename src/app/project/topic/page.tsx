"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LuArrowLeft, LuSparkles, LuCircleAlert, LuLoaderCircle, LuWandSparkles } from "react-icons/lu";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 旁白风格（与后端 TopicNarrationStyle 一一对应）
const narrationOptions = [
  { value: "knowledge", label: "知识科普", desc: "讲清一个主题，长知识" },
  { value: "story", label: "情感故事", desc: "有代入感的叙事，引共鸣" },
  { value: "lifestyle", label: "生活方式", desc: "精致 vlog 旁白，有质感" },
  { value: "inspiration", label: "励志金句", desc: "节奏明快，适合点赞收藏" },
  { value: "travel", label: "旅行风光", desc: "目的地 + 风景，想出发" },
];

// 时长选项
const durationOptions = [
  { value: "15", label: "15s" },
  { value: "25", label: "25s" },
  { value: "40", label: "40s" },
];

// 主题灵感示例（新手零门槛试用）
const exampleTopics = [
  "在家如何泡一杯手冲咖啡",
  "城市夜景为什么这么治愈",
  "三个让早晨更高效的小习惯",
  "雨天适合做的五件小事",
  "为什么我们总是怀念童年",
];

export default function TopicProjectPage() {
  const router = useRouter();
  const { llm } = useSettingsStore();
  const isLLMConfigured = llm.apiKey.length > 0;

  const [topic, setTopic] = useState("");
  const [narrationStyle, setNarrationStyle] = useState("knowledge");
  const [duration, setDuration] = useState("25");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = topic.trim().length >= 2;

  const handleGenerate = async () => {
    if (!isValid || isSubmitting) return;
    if (!isLLMConfigured) {
      setError("尚未配置 LLM，请先到「设置」填写 API Key");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/topic/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          narrationStyle,
          targetDuration: Number(duration),
          llmConfig: {
            baseUrl: llm.baseUrl,
            apiKey: llm.apiKey,
            model: llm.model,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 即便生成失败，后端也可能已建好草稿项目并回传 projectId，便于跳转后重试
        if (data.projectId) {
          router.push(`/project/${data.projectId}/script`);
          return;
        }
        throw new Error(data.error || "脚本生成失败，请检查 LLM 设置");
      }
      // 成功：跳到脚本页查看多套方案，再走素材自动配齐 → 合成
      router.push(`/project/${data.projectId}/script`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "脚本生成失败");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid-bg">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2">
                <LuArrowLeft className="w-4 h-4" />
                <span className="ml-1">返回</span>
              </Button>
            </Link>
            <div className="h-5 w-px bg-border/50" />
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md brand-gradient">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight">ClipForge</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-500">
            <LuSparkles className="w-3.5 h-3.5" />
            无需商品 · 一句话成片
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">一句话主题成片</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            输入一句话主题，AI 自动写旁白脚本，并从免费素材库自动配齐画面，
            下一步「素材」「合成」即可一键产出竖屏短视频。任何主题都能做，不局限于带货。
          </p>
        </div>

        {/* 未配置 LLM 引导 */}
        {!isLLMConfigured && (
          <Link href="/settings">
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 cursor-pointer hover:bg-amber-100 transition-colors">
              <LuCircleAlert className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 text-sm">先配置 LLM 才能生成脚本</h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  需要在「设置」里填写用于写脚本的 LLM（baseUrl / API Key / 模型）。
                  <span className="underline ml-1">点击前往设置 →</span>
                </p>
              </div>
            </div>
          </Link>
        )}

        <Card className="glass-card">
          <CardContent className="p-6 space-y-6">
            {/* 主题输入 */}
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-sm font-medium">
                一句话主题 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="例如：在家如何泡一杯手冲咖啡"
                rows={3}
                className="resize-none"
              />
              {/* 灵感示例 */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground self-center">试试：</span>
                {exampleTopics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* 旁白风格 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">旁白风格</Label>
              <Select value={narrationStyle} onValueChange={(val) => setNarrationStyle(val ?? "knowledge")}>
                <SelectTrigger>
                  {/* Base UI 的 Select.Value 默认显示原始 value，用函数子节点映射为中文标签 */}
                  <SelectValue>
                    {(value: string) => narrationOptions.find((o) => o.value === value)?.label ?? "知识科普"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {narrationOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* 选中风格的说明（放在 Select 外，避免触发器显示原始 value） */}
              <p className="text-xs text-muted-foreground">
                {narrationOptions.find((o) => o.value === narrationStyle)?.desc}
              </p>
            </div>

            {/* 时长 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">目标时长</Label>
              <div className="flex gap-2">
                {durationOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setDuration(o.value)}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      duration === o.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <LuCircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* 生成按钮 */}
            <Button
              onClick={handleGenerate}
              disabled={!isValid || isSubmitting}
              className="w-full brand-gradient text-white"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <LuLoaderCircle className="w-4 h-4 animate-spin" />
                  <span className="ml-1.5">AI 正在写脚本…</span>
                </>
              ) : (
                <>
                  <LuWandSparkles className="w-4 h-4" />
                  <span className="ml-1.5">生成脚本</span>
                </>
              )}
            </Button>

            {/* 流程提示 */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
              <Badge variant="secondary" className="text-[10px]">1 写脚本</Badge>
              <span className="text-border">→</span>
              <Badge variant="secondary" className="text-[10px]">2 自动配画面</Badge>
              <span className="text-border">→</span>
              <Badge variant="secondary" className="text-[10px]">3 合成成片</Badge>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
