"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/lib/stores/settings-store";

// 内置数字人形象
const PRESET_AVATARS = [
  { id: "female-pro", name: "职场女性", gender: "female", style: "professional", emoji: "👩‍💼", desc: "商务/职场类带货" },
  { id: "male-casual", name: "阳光男生", gender: "male", style: "casual", emoji: "👨‍💻", desc: "数码/运动类带货" },
  { id: "female-cute", name: "甜美主播", gender: "female", style: "cute", emoji: "👩‍🎤", desc: "美妆/食品类带货" },
  { id: "male-mature", name: "成熟男士", gender: "male", style: "mature", emoji: "👨‍💼", desc: "家居/金融类带货" },
  { id: "female-elegant", name: "优雅女士", gender: "female", style: "elegant", emoji: "👩", desc: "服饰/珠宝类带货" },
  { id: "male-tech", name: "科技达人", gender: "male", style: "tech", emoji: "🧑‍🔬", desc: "3C/数码类带货" },
];

const MOTION_STYLES = [
  { id: "talking", name: "自然口播", desc: "自然说话表情+轻微手势" },
  { id: "gesturing", name: "手势讲解", desc: "丰富手势+产品展示" },
  { id: "presenting", name: "专业展示", desc: "自信站姿+产品演示" },
];

// 品类脚本模板
const CATEGORY_TEMPLATES = [
  { id: "beauty", name: "美妆护肤", emoji: "💄", text: "姐妹们！这款真的绝了，用了一周皮肤状态好到爆！成分超安全，敏感肌也能放心用。现在下单还有限时优惠，手慢无！" },
  { id: "food", name: "食品饮料", emoji: "🍜", text: "吃货们注意了！这个真的好吃到停不下来，0添加防腐剂，配料表超干净。回购了5次的宝藏好物，赶紧囤起来！" },
  { id: "digital", name: "数码3C", emoji: "📱", text: "科技党看过来！这款性能直接拉满，跑分吊打同价位。续航一整天不充电，学生党上班族必入！" },
  { id: "home", name: "家居日用", emoji: "🏠", text: "家里有这个真的太方便了！颜值高又实用，用过的都说好。提升幸福感的好物，趁活动赶紧入手！" },
  { id: "fashion", name: "服饰鞋包", emoji: "👗", text: "这条裤子我穿了一个月了，显瘦效果绝了！面料舒服不起球，百搭又时髦。姐妹们冲就对了！" },
];

export default function DigitalHumanPage() {
  const settings = useSettingsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 状态
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].id);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [motionStyle, setMotionStyle] = useState("talking");
  const [duration, setDuration] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskId, setTaskId] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [resultVideoUrl, setResultVideoUrl] = useState("");
  const [error, setError] = useState("");

  // 获取当前 avatar URL
  const getAvatarUrl = useCallback(() => {
    if (customAvatarUrl) return customAvatarUrl;
    // 使用预设形象时，用 placeholder
    return `https://placehold.co/512x512/1a1a2e/e8e8ef?text=${encodeURIComponent(PRESET_AVATARS.find(a => a.id === selectedAvatar)?.name || "数字人")}`;
  }, [customAvatarUrl, selectedAvatar]);

  // 上传形象图片
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomAvatarUrl(url);
  };

  // 使用脚本模板
  const useTemplate = (text: string) => {
    setScriptText(text);
  };

  // 生成数字人视频
  const handleGenerate = async () => {
    if (!scriptText.trim()) {
      setError("请输入口播脚本");
      return;
    }
    if (!settings.providers.siliconflow?.apiKey) {
      setError("请先在设置中配置硅基流动 API Key");
      return;
    }

    setError("");
    setIsGenerating(true);
    setResultVideoUrl("");
    setTaskStatus("提交中...");

    try {
      // 1. 提交数字人生成任务
      const res = await fetch("/api/ai/digital-human", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl: getAvatarUrl(),
          text: scriptText,
          duration,
          motionStyle,
          config: {
            apiKey: settings.providers.siliconflow?.apiKey,
            apiEndpoint: settings.providers.siliconflow?.baseUrl || "https://api.siliconflow.cn/v1",
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");

      setTaskId(data.taskId);
      setTaskStatus("生成中...");

      // 2. 轮询任务状态
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/ai/digital-human?action=status&taskId=${data.taskId}&apiKey=${encodeURIComponent(settings.providers.siliconflow?.apiKey || "")}`);
          const statusData = await statusRes.json();

          setTaskStatus(statusData.status === "completed" ? "完成！" : statusData.status === "failed" ? "失败" : "生成中...");

          if (statusData.status === "completed" && statusData.result?.videoUrl) {
            clearInterval(pollInterval);
            setResultVideoUrl(statusData.result.videoUrl);
            setIsGenerating(false);
          }
          if (statusData.status === "failed") {
            clearInterval(pollInterval);
            setError(statusData.error || "生成失败");
            setIsGenerating(false);
          }
        } catch {
          // 继续轮询
        }
      }, 5000);

      // 5分钟超时
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isGenerating) {
          setError("生成超时，请重试");
          setIsGenerating(false);
        }
      }, 300000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← 返回</Link>
            <h1 className="text-lg font-bold">🤖 AI 数字人口播</h1>
          </div>
          <Link href="/settings">
            <Button variant="ghost" size="sm">⚙️ 设置</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl flex-1 px-4 py-6">
        {/* API 配置检查 */}
        {!settings.providers.siliconflow?.apiKey && (
          <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm">⚠️ 请先 <Link href="/settings" className="underline font-medium">配置硅基流动 API Key</Link> 才能使用数字人功能</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：配置区 */}
          <div className="space-y-6">
            {/* 1. 选择数字人形象 */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold">👤 选择数字人形象</h3>
                <div className="grid grid-cols-3 gap-3">
                  {PRESET_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => { setSelectedAvatar(avatar.id); setCustomAvatarUrl(""); }}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        selectedAvatar === avatar.id && !customAvatarUrl
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-3xl mb-1">{avatar.emoji}</div>
                      <div className="text-xs font-medium">{avatar.name}</div>
                      <div className="text-[10px] text-muted-foreground">{avatar.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">或上传自定义形象：</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    📷 上传图片
                  </Button>
                  {customAvatarUrl && (
                    <Badge variant="secondary" className="text-xs">✅ 已上传</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2. 口播脚本 */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold">📝 口播脚本</h3>

                {/* 品类模板 */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">快速填充模板：</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => useTemplate(tpl.text)}
                        className="px-3 py-1.5 rounded-full border text-xs hover:bg-primary/10 transition-colors"
                      >
                        {tpl.emoji} {tpl.name}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="输入数字人要说的话...&#10;&#10;例如：姐妹们！这款真的绝了，用了一周皮肤状态好到爆！"
                  className="w-full h-32 rounded-lg border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{scriptText.length} 字</span>
                  <span>预计 {Math.max(3, Math.ceil(scriptText.length * 0.15))} 秒</span>
                </div>
              </CardContent>
            </Card>

            {/* 3. 动作风格 + 时长 */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold">🎬 动作风格</h3>
                <div className="grid grid-cols-3 gap-2">
                  {MOTION_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setMotionStyle(style.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        motionStyle === style.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-sm font-medium">{style.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{style.desc}</div>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-sm font-medium">视频时长：{duration}秒</label>
                  <input
                    type="range"
                    min={3}
                    max={15}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 生成按钮 */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                ⚠️ {error}
              </div>
            )}

            <Button
              className="w-full py-6 text-base font-semibold"
              onClick={handleGenerate}
              disabled={isGenerating || !scriptText.trim()}
            >
              {isGenerating ? `⏳ ${taskStatus}` : "🚀 生成数字人口播视频"}
            </Button>
          </div>

          {/* 右侧：预览区 */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold">📺 预览</h3>

                {resultVideoUrl ? (
                  <div className="rounded-lg overflow-hidden border">
                    <video
                      src={resultVideoUrl}
                      controls
                      autoPlay
                      className="w-full"
                    />
                  </div>
                ) : isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="text-4xl mb-4 animate-pulse">🎬</div>
                    <p className="text-sm">{taskStatus}</p>
                    <p className="text-xs mt-1">预计需要 30-120 秒，请耐心等待</p>
                    <div className="w-48 h-1.5 rounded-full bg-border mt-4 overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="text-5xl mb-4">🤖</div>
                    <p className="text-sm">配置左侧参数后，点击生成</p>
                    <p className="text-xs mt-1">AI 将自动生成数字人口播视频</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 使用说明 */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold">💡 使用技巧</h3>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li>• <strong>上传高质量正面照</strong>效果最佳，建议 512×512 以上</li>
                  <li>• <strong>脚本控制在 50-200 字</strong>，太长会被截断</li>
                  <li>• <strong>「手势讲解」模式</strong>适合产品展示类带货</li>
                  <li>• <strong>搭配配音使用</strong>：先生成 TTS 音频，再生成数字人视频，口型更同步</li>
                  <li>• 生成的视频可直接用于<strong>抖音/快手/小红书</strong>投放</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
