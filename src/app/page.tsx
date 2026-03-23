"use client";

import { useState } from "react";
import { LuSettings, LuPlus, LuZap, LuVideo, LuFilm, LuPackage } from "react-icons/lu";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// 模拟项目数据（后续接数据库）
const mockProjects = [
  {
    id: "1",
    name: "Tempo 德宝纸巾推广",
    productName: "德宝纸巾",
    status: "video" as const,
    updatedAt: new Date("2026-03-20"),
  },
  {
    id: "2",
    name: "小米手环8测评",
    productName: "小米手环8",
    status: "done" as const,
    updatedAt: new Date("2026-03-19"),
  },
];

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "bg-zinc-500/20 text-zinc-400" },
  scripting: { label: "脚本中", color: "bg-blue-500/20 text-blue-400" },
  assets: { label: "素材中", color: "bg-purple-500/20 text-purple-400" },
  video: { label: "生成中", color: "bg-amber-500/20 text-amber-400" },
  composing: { label: "合成中", color: "bg-cyan-500/20 text-cyan-400" },
  done: { label: "已完成", color: "bg-emerald-500/20 text-emerald-400" },
};

export default function HomePage() {
  const [projects] = useState(mockProjects);

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
            <span className="text-lg font-bold tracking-tight">带货剪手</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/products">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <LuPackage className="w-4 h-4" />
                <span className="ml-1.5">商品库</span>
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <LuSettings className="w-4 h-4" />
                <span className="ml-1.5">设置</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            <span className="brand-gradient-text">AI 驱动</span>的电商带货视频
          </h1>
          <p className="text-muted-foreground text-base">
            上传商品图，AI 生成脚本，一键产出高转化带货短视频
          </p>
        </div>

        {/* 两个核心入口 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <Link href="/project/new">
            <Card className="card-hover glass-card cursor-pointer group h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl brand-gradient shadow-lg group-hover:scale-105 transition-transform">
                    <LuPlus className="w-[22px] h-[22px] text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">新建项目</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      上传商品图片，AI 分析卖点并生成多套带货脚本，逐步生成视频
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Badge variant="secondary" className="text-xs">AI 脚本</Badge>
                  <Badge variant="secondary" className="text-xs">分镜生图</Badge>
                  <Badge variant="secondary" className="text-xs">AI 生视频</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/project/clone">
            <Card className="card-hover glass-card cursor-pointer group h-full">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg group-hover:scale-105 transition-transform">
                    <LuZap className="w-[22px] h-[22px] text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">爆款复刻</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      输入爆款视频链接，AI 提取脚本逻辑，用你的商品重新生成同款视频
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Badge variant="secondary" className="text-xs">智能提取</Badge>
                  <Badge variant="secondary" className="text-xs">脚本复刻</Badge>
                  <Badge variant="secondary" className="text-xs">一键换品</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 项目列表 */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold">我的项目</h2>
            <span className="text-sm text-muted-foreground">{projects.length} 个项目</span>
          </div>

          {projects.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                  <LuVideo className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">还没有项目，开始创建你的第一个带货视频吧</p>
                <Link href="/project/new">
                  <Button className="brand-gradient text-white">创建项目</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const status = statusMap[project.status];
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
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {project.name}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {project.productName} · {project.updatedAt.toLocaleDateString("zh-CN")}
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
      </main>
    </div>
  );
}
