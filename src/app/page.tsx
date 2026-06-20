"use client";

import { useState, useEffect } from "react";
import { LuSettings, LuPlus, LuZap, LuVideo, LuFilm, LuPackage, LuTriangleAlert, LuLoaderCircle, LuSparkles } from "react-icons/lu";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { exampleShowcase } from "@/lib/examples";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";

// 首页项目列表项（来自 GET /api/project，updatedAt 经 JSON 序列化为字符串）
interface ProjectItem {
  id: string;
  name: string;
  productName: string | null;
  status: string;
  updatedAt: string | null;
}

// 状态 → 颜色 + common 命名空间的词条 key（标签按语言取）
const statusMeta: Record<string, { key: string; color: string }> = {
  draft: { key: "statusDraft", color: "bg-zinc-500/20 text-zinc-400" },
  scripting: { key: "statusScripting", color: "bg-blue-500/20 text-blue-400" },
  assets: { key: "statusAssets", color: "bg-purple-500/20 text-purple-400" },
  video: { key: "statusVideo", color: "bg-amber-500/20 text-amber-400" },
  composing: { key: "statusComposing", color: "bg-cyan-500/20 text-cyan-400" },
  done: { key: "statusDone", color: "bg-emerald-500/20 text-emerald-400" },
};

export default function HomePage() {
  const t = useT("home");
  const tc = useT("common");
  // 拉取真实项目列表（修复 issue #3：旧版写死 mock，用户创建后回首页永远找不到自己的项目）
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/project");
        const data = res.ok ? await res.json() : [];
        if (!cancelled) setProjects(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 检查是否已配置 API 服务
  const { llm, providers } = useSettingsStore();
  const isConfigured = llm.apiKey.length > 0;
  const hasAnyProvider = Object.values(providers).some(p => p.enabled && p.apiKey.length > 0);

  return (
    <div className="min-h-screen grid-bg">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg brand-gradient">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">ClipForge</span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <Link href="/products">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <LuPackage className="w-4 h-4" />
                <span className="ml-1.5">{tc("products")}</span>
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <LuSettings className="w-4 h-4" />
                <span className="ml-1.5">{tc("settings")}</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            <span className="brand-gradient-text">{t("heroTitleAccent")}</span>{t("heroTitleRest")}
          </h1>
          <p className="text-muted-foreground text-base">
            {t("heroSubtitle")}
          </p>
        </div>

        {/* 未配置 API 时的引导横幅 */}
        {!isConfigured && (
          <Link href="/settings">
            <div className="mb-8 p-5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-4 cursor-pointer hover:bg-amber-100 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <LuTriangleAlert className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 text-sm">{t("setupBannerTitle")}</h3>
                <p className="text-xs text-amber-700 mt-1">
                  {t("setupBannerDesc")}
                  <span className="underline ml-1">{t("setupBannerCta")}</span>
                </p>
              </div>
            </div>
          </Link>
        )}

        {/* 核心入口 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {/* 卡片0：一句话主题成片（无需商品，新手最低门槛入口） */}
          <Link href="/project/topic">
            <Card className="card-hover glass-card cursor-pointer group h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg group-hover:scale-105 transition-transform">
                    <LuSparkles className="w-[22px] h-[22px] text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{t("cardTopicTitle")}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("cardTopicDesc")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Badge variant="secondary" className="text-xs">{t("cardTopicTag1")}</Badge>
                  <Badge variant="secondary" className="text-xs">{t("cardTopicTag2")}</Badge>
                  <Badge variant="secondary" className="text-xs">{t("cardTopicTag3")}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 卡片1：新建带货视频 */}
          <Link href="/project/new">
            <Card className="card-hover glass-card cursor-pointer group h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl brand-gradient shadow-lg group-hover:scale-105 transition-transform">
                    <LuPlus className="w-[22px] h-[22px] text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{t("cardNewTitle")}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("cardNewDesc")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Badge variant="secondary" className="text-xs">{t("cardNewTag1")}</Badge>
                  <Badge variant="secondary" className="text-xs">{t("cardNewTag2")}</Badge>
                  <Badge variant="secondary" className="text-xs">{t("cardNewTag3")}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 卡片2：商品库 */}
          <Link href="/products">
            <Card className="card-hover glass-card cursor-pointer group h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg group-hover:scale-105 transition-transform">
                    <LuPackage className="w-[22px] h-[22px] text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{t("cardProductsTitle")}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("cardProductsDesc")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Badge variant="secondary" className="text-xs">{t("cardProductsTag1")}</Badge>
                  <Badge variant="secondary" className="text-xs">{t("cardProductsTag2")}</Badge>
                  <Badge variant="secondary" className="text-xs">{t("cardProductsTag3")}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 卡片3：爆款复刻 */}
          <Link href="/project/clone">
            <Card className="card-hover glass-card cursor-pointer group h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg group-hover:scale-105 transition-transform">
                    <LuZap className="w-[22px] h-[22px] text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{t("cardCloneTitle")}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t("cardCloneDesc")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Badge variant="secondary" className="text-xs">{t("cardCloneTag1")}</Badge>
                  <Badge variant="secondary" className="text-xs">{t("cardCloneTag2")}</Badge>
                  <Badge variant="secondary" className="text-xs">{t("cardCloneTag3")}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 快速了解：使用流程步骤条 */}
        <div className="mb-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">1</span>{t("flowStep1")}</span>
          <span className="text-border">→</span>
          <span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">2</span>{t("flowStep2")}</span>
          <span className="text-border">→</span>
          <span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">3</span>{t("flowStep3")}</span>
          <span className="text-border">→</span>
          <span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">4</span>{t("flowStep4")}</span>
          <span className="text-border">→</span>
          <span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">5</span>{t("flowStep5")}</span>
        </div>

        {/* 项目列表 */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">{t("myProjects")}</h2>
            <span className="text-sm text-muted-foreground">{t("projectCount", { n: projects.length })}</span>
          </div>

          {loadingProjects ? (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <LuLoaderCircle className="w-7 h-7 text-muted-foreground animate-spin mb-3" />
                <p className="text-muted-foreground text-sm">{t("loadingProjects")}</p>
              </CardContent>
            </Card>
          ) : projects.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <LuVideo className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">{t("emptyProjects")}</p>
                <Link href="/project/new">
                  <Button className="brand-gradient text-white">{t("createProject")}</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const status = statusMeta[project.status] ?? statusMeta.draft;
                const dateStr = project.updatedAt
                  ? new Date(project.updatedAt).toLocaleDateString()
                  : "";
                return (
                  <Link key={project.id} href={`/project/${project.id}/script`}>
                    <Card className="card-hover glass-card cursor-pointer group">
                      <CardContent className="p-0">
                        <div className="relative aspect-video bg-muted/30 rounded-t-lg overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <LuFilm className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                          <div className="absolute top-2 right-2">
                            <Badge className={`${status.color} border-0 text-xs`}>
                              {tc(status.key)}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {project.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {project.productName || t("unnamedProduct")}{dateStr ? ` · ${dateStr}` : ""}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* 示例作品（与「我的项目」分离，明确标注示例，帮助新手理解能做出什么） */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{t("examplesTitle")}</h2>
              <Badge variant="secondary" className="text-[10px]">{t("exampleBadge")}</Badge>
            </div>
            <span className="text-sm text-muted-foreground">{t("examplesHint")}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/examples/showcase">
              <Card className="card-hover glass-card cursor-pointer group">
                <CardContent className="p-0">
                  <div className="relative aspect-video bg-muted/30 rounded-t-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={exampleShowcase.cover} alt={exampleShowcase.title} className="h-full w-full object-cover" />
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-black/60 text-white border-0 text-xs">{t("exampleBadge")}</Badge>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="ml-0.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {exampleShowcase.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("showcaseSubtitle", { style: exampleShowcase.styleLabel, shots: exampleShowcase.shots.length, duration: exampleShowcase.totalDuration })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
