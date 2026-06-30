"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { LuChartNoAxesColumn, LuCheck } from "react-icons/lu";
import type { StyleInsight, HookInsight } from "@/lib/performance-insights";

// style key → display name (aggregation returns the styleType key)
const STYLE_LABEL: Record<string, { zh: string; en: string }> = {
  pain_point: { zh: "痛点种草", en: "Pain-point" },
  scene: { zh: "场景安利", en: "Scene" },
  comparison: { zh: "对比测评", en: "Comparison" },
  story: { zh: "故事种草", en: "Story" },
  custom: { zh: "自定义", en: "Custom" },
};

// hook mechanism id → display name (corresponds to HOOK_PATTERNS in hook-patterns)
const HOOK_LABEL: Record<string, { zh: string; en: string }> = {
  visual_shock: { zh: "视觉冲击", en: "Visual shock" },
  suspense_question: { zh: "悬念提问", en: "Suspense" },
  contrast: { zh: "反差对比", en: "Contrast" },
  pain_strike: { zh: "痛点直击", en: "Pain-point" },
  before_after: { zh: "前后对比", en: "Before-after" },
  sound_hook: { zh: "声音钩子", en: "Sound hook" },
  challenge_doubt: { zh: "挑战质疑", en: "Challenge" },
  identity: { zh: "身份共鸣", en: "Identity" },
  number_benefit: { zh: "数字利益", en: "Number" },
  unexpected: { zh: "反常识意外", en: "Unexpected" },
};

const NUM_FIELDS = [
  { key: "views", zh: "播放", en: "Views" },
  { key: "likes", zh: "点赞", en: "Likes" },
  { key: "comments", zh: "评论", en: "Comments" },
  { key: "shares", zh: "转发", en: "Shares" },
  { key: "orders", zh: "成交", en: "Orders" },
] as const;

type FormState = { platform: string; hookId: string; views: string; likes: string; comments: string; shares: string; orders: string; note: string };
const EMPTY: FormState = { platform: "douyin", hookId: "", views: "", likes: "", comments: "", shares: "", orders: "", note: "" };

export function PerformanceFeedback({ projectId }: { projectId: string }) {
  const locale = useLocale();
  const en = locale === "en";
  const [form, setForm] = useState<FormState>(EMPTY);
  const [insights, setInsights] = useState<StyleInsight[]>([]);
  const [hookInsights, setHookInsights] = useState<HookInsight[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadInsights = useCallback(async () => {
    try {
      const r = await fetch("/api/insights/styles");
      const j = await r.json();
      setInsights(Array.isArray(j.insights) ? j.insights : []);
      setHookInsights(Array.isArray(j.hookInsights) ? j.hookInsights : []);
    } catch {
      /* silent: an empty insights section is acceptable */
    }
  }, []);
  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/project/${projectId}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setForm({ ...EMPTY, platform: form.platform });
      loadInsights();
    } finally {
      setSaving(false);
    }
  };

  const fmtPct = (x: number) => (x * 100).toFixed(2) + "%";
  const styleName = (s: string) => STYLE_LABEL[s]?.[en ? "en" : "zh"] ?? s;
  const hookName = (h: string) => HOOK_LABEL[h]?.[en ? "en" : "zh"] ?? h;
  const canSave = Number(form.views) > 0;

  return (
    <Card className="glass-card">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <LuChartNoAxesColumn className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{en ? "Performance feedback" : "效果回流"}</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {en
            ? "After publishing, log this video's numbers → learn which script style actually sells, and let it feed back into future scripts."
            : "发布后回填这条数据 → 学出哪种脚本风格更能卖，反哺后续脚本生成。"}
        </p>

        {/* data entry form */}
        <div className="flex flex-wrap items-end gap-2 mb-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">{en ? "Platform" : "平台"}</span>
            <select
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="douyin">{en ? "Douyin" : "抖音"}</option>
              <option value="tiktok">TikTok</option>
              <option value="kuaishou">{en ? "Kuaishou" : "快手"}</option>
              <option value="xiaohongshu">{en ? "Xiaohongshu" : "小红书"}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">{en ? "Hook" : "钩子"}</span>
            <select
              value={form.hookId}
              onChange={(e) => setForm({ ...form, hookId: e.target.value })}
              title={en ? "Which hook mechanism this video used (for hook A/B)" : "这条用的哪种钩子机制（用于钩子 A/B）"}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">{en ? "— hook —" : "— 钩子 —"}</option>
              {Object.entries(HOOK_LABEL).map(([id, l]) => (
                <option key={id} value={id}>
                  {en ? l.en : l.zh}
                </option>
              ))}
            </select>
          </label>
          {NUM_FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">{en ? f.en : f.zh}</span>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="h-9 w-20"
                placeholder="0"
              />
            </label>
          ))}
          <Button onClick={submit} disabled={!canSave || saving} size="sm" className="brand-gradient text-white h-9">
            {saved ? <LuCheck className="w-4 h-4 mr-1" /> : null}
            {saving ? (en ? "Saving…" : "保存中…") : saved ? (en ? "Saved" : "已保存") : en ? "Save" : "保存"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mb-4">
          {en ? "Tip: views is required; the script style is captured automatically." : "提示：「播放」必填；脚本风格会自动定格，无需手填。"}
        </p>

        {/* aggregated insight: which style sells best */}
        {insights.length > 0 && (
          <div className="border-t border-border/50 pt-3">
            <p className="text-xs font-medium mb-2">
              {en ? "Which style sells best (all projects)" : "哪种风格更能卖（全部项目）"}
            </p>
            <div className="space-y-1.5">
              {insights.map((it, i) => (
                <div key={it.style} className="flex items-center gap-3 text-xs">
                  <span className={`w-16 shrink-0 ${i === 0 ? "text-emerald-500 font-medium" : ""}`}>
                    {i === 0 ? "🏆 " : ""}
                    {styleName(it.style)}
                  </span>
                  <span className="text-muted-foreground">
                    {en ? "conv." : "转化"} <b className={i === 0 ? "text-emerald-500" : ""}>{fmtPct(it.conversionRate)}</b>
                  </span>
                  <span className="text-muted-foreground">
                    {en ? "eng." : "互动"} {fmtPct(it.engagementRate)}
                  </span>
                  <span className="text-muted-foreground/70">
                    {en ? `${it.samples} sample(s)` : `${it.samples} 条样本`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* aggregated insight: which hook mechanism sells best */}
        {hookInsights.length > 0 && (
          <div className="border-t border-border/50 pt-3 mt-3">
            <p className="text-xs font-medium mb-2">
              {en ? "Which hook sells best (all projects)" : "哪个钩子更能卖（全部项目）"}
            </p>
            <div className="space-y-1.5">
              {hookInsights.map((it, i) => (
                <div key={it.hookId} className="flex items-center gap-3 text-xs">
                  <span className={`w-16 shrink-0 ${i === 0 ? "text-emerald-500 font-medium" : ""}`}>
                    {i === 0 ? "🏆 " : ""}
                    {hookName(it.hookId)}
                  </span>
                  <span className="text-muted-foreground">
                    {en ? "conv." : "转化"} <b className={i === 0 ? "text-emerald-500" : ""}>{fmtPct(it.conversionRate)}</b>
                  </span>
                  <span className="text-muted-foreground">
                    {en ? "eng." : "互动"} {fmtPct(it.engagementRate)}
                  </span>
                  <span className="text-muted-foreground/70">
                    {en ? `${it.samples} sample(s)` : `${it.samples} 条样本`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
