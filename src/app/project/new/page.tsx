"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LuArrowLeft, LuUpload, LuX, LuCircleAlert, LuZap, LuUser, LuUserX, LuBox, LuLayoutGrid, LuEye, LuVideo, LuBookmark, LuLink2, LuLoader } from "react-icons/lu";
import { useCharacterStore } from "@/lib/stores/project-store";
import { useTemplateStore } from "@/lib/stores/template-store";
import { useProductLibraryStore, type ProductItem } from "@/lib/stores/product-library-store";
import { getExampleProducts, type ExampleProduct } from "@/lib/examples";
import { useSettingsStore } from "@/lib/stores/settings-store";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT, useLocale } from "@/lib/i18n";
import { friendlyError } from "@/lib/friendly-error";
import { LanguageToggle } from "@/components/language-toggle";

// product category options (label changed to i18n key, converted via t() at render time)
const categoryOptions = [
  { value: "beauty", labelKey: "categoryBeauty" },
  { value: "food", labelKey: "categoryFood" },
  { value: "home", labelKey: "categoryHome" },
  { value: "fashion", labelKey: "categoryFashion" },
  { value: "digital", labelKey: "categoryDigital" },
  { value: "other", labelKey: "categoryOther" },
];

// target duration options (label is a plain unit string, no translation needed)
const durationOptions = [
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
  { value: "60", label: "60s" },
];

// script style options (label/desc changed to i18n keys, converted via t() at render time)
const styleOptions = [
  { value: "pain-point", labelKey: "stylePainPointLabel", descKey: "stylePainPointDesc" },
  { value: "scenario", labelKey: "styleScenarioLabel", descKey: "styleScenarioDesc" },
  { value: "comparison", labelKey: "styleComparisonLabel", descKey: "styleComparisonDesc" },
  { value: "story", labelKey: "styleStoryLabel", descKey: "styleStoryDesc" },
  { value: "auto", labelKey: "styleAutoLabel", descKey: "styleAutoDesc" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const t = useT("newProject");
  const tc = useT("common");
  const locale = useLocale();

  // check LLM API configuration status
  const { llm, providers } = useSettingsStore();
  const isLLMConfigured = llm.apiKey.length > 0;
  const hasProvider = Object.values(providers).some((p: { enabled: boolean; apiKey: string }) => p.enabled && p.apiKey.length > 0);

  // form state
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [duration, setDuration] = useState("30");
  const [scriptStyle, setScriptStyle] = useState("auto");
  const [videoMode, setVideoMode] = useState<string>("product_closeup");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  // additional field state
  const [priceRange, setPriceRange] = useState<string>("");
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>(["douyin"]);
  const [usageAdvantage, setUsageAdvantage] = useState("");

  // multi-select toggle helpers
  const toggleAudience = (tag: string) => {
    setTargetAudience(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  // template library
  const { templates, incrementUseCount } = useTemplateStore();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // character library
  const { characters } = useCharacterStore();

  // product library (used to pre-fill from the library when "make video" is triggered)
  const { products: libraryProducts } = useProductLibraryStore();

  // image upload state (local)
  const [images, setImages] = useState<{ id: string; url: string; file: File }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // paste product link for one-click import (standard 2026 commerce entry point)
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState("");
  const [progress, setProgress] = useState<{
    step: string;
    percent: number;
    message: string;
  } | null>(null);

  // handle image selection
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = 5 - images.length;
      if (remaining <= 0) return;

      const newImages = Array.from(files)
        .slice(0, remaining)
        .filter((f) => f.type.startsWith("image/"))
        .map((file) => ({
          id: crypto.randomUUID(),
          url: URL.createObjectURL(file),
          file,
        }));

      setImages((prev) => [...prev, ...newImages]);
    },
    [images.length]
  );

  // drag event handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  // remove an image
  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  // one-click fill with example product (including a real sample image) to let beginners try without any setup
  const fillExample = useCallback(async (ex: ExampleProduct) => {
    setProductName(ex.name);
    setCategory(ex.category);
    setSellingPoints(ex.sellingPoints);
    try {
      const res = await fetch(ex.image);
      const blob = await res.blob();
      const file = new File([blob], `${ex.id}.png`, { type: blob.type || "image/png" });
      // revoke old preview URLs to avoid memory leaks
      setImages((prev) => {
        prev.forEach((img) => URL.revokeObjectURL(img.url));
        return [{ id: crypto.randomUUID(), url: URL.createObjectURL(file), file }];
      });
    } catch {
      // fetching the example image is non-fatal; the text fields are already filled and the user can upload manually
    }
  }, []);

  // product library "make video" pre-fill: populate product name / category / selling points by productId, and attempt to fetch product images as File objects
  const prefillFromProduct = useCallback(async (product: ProductItem) => {
    setProductName(product.name);
    // the product library's "tech" category maps to "digital" on this page; all other values are the same
    setCategory(product.category === "tech" ? "digital" : product.category);
    if (product.description) setSellingPoints(product.description);
    // fetch product images as File objects: works for example/server images; local blob URLs expire across pages so skip those (text is already filled, user can upload manually)
    const files: { id: string; url: string; file: File }[] = [];
    for (const [i, src] of product.images.slice(0, 5).entries()) {
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        const file = new File([blob], `product-${i}.png`, { type: blob.type || "image/png" });
        files.push({ id: crypto.randomUUID(), url: URL.createObjectURL(file), file });
      } catch {
        // non-fatal if the image cannot be fetched
      }
    }
    if (files.length) {
      setImages((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return files;
      });
    }
  }, []);

  // on mount, if ?productId is present, pre-fill once from the product library (products are only available after the store hydrates, hence the dependency)
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current) return;
    const productId = new URLSearchParams(window.location.search).get("productId");
    if (!productId) return;
    const product = libraryProducts.find((p) => p.id === productId);
    if (product) {
      prefilledRef.current = true;
      void prefillFromProduct(product);
    }
  }, [libraryProducts, prefillFromProduct]);

  // form validation
  const isValid = productName.trim().length > 0 && images.length >= 1;

  // submission handler
  // paste product link → backend scrapes and parses (title / price / images) + creates a commerce project → navigate directly to the script page
  const handleIngest = async () => {
    const url = ingestUrl.trim();
    if (!/^https?:\/\/.+/i.test(url)) {
      setIngestError(t("ingestErrorUrl"));
      return;
    }
    setIngestError("");
    setIngesting(true);
    try {
      const res = await fetch("/api/ingest/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, createProject: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.projectId) throw new Error(data.error || t("ingestErrorFail"));
      router.push(`/project/${data.projectId}/script`);
    } catch (e) {
      setIngestError(friendlyError(e, locale));
      setIngesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // step 1: create the project (get projectId first)
      setProgress({ step: "creating", percent: 15, message: t("progressCreating") });
      const projectRes = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${productName} 推广`,
          productName,
          productCategory: category,
          productDescription: sellingPoints,
          productImages: [],
        }),
      });
      if (!projectRes.ok) throw new Error(t("errorCreateFailed"));
      const project = await projectRes.json();

      // step 2: upload images (with projectId)
      setProgress({ step: "uploading", percent: 35, message: t("progressUploading") });
      const formData = new FormData();
      images.forEach((img) => formData.append("files", img.file));
      formData.append("projectId", project.id);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || t("errorUploadFailed"));
      }
      const { paths } = await uploadRes.json();

      // step 2.5: update the project's image paths
      await fetch(`/api/project/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productImages: paths }),
      });

      // step 3: generate the script
      setProgress({ step: "generating", percent: 60, message: t("progressGenerating") });
      // if a presenter character was selected, include their info
      const selectedCharacter = selectedCharacterId
        ? characters.find((c) => c.id === selectedCharacterId)
        : null;

      // apply template: serialize the selected template's shot structure as a reference for the AI to follow (actually consuming the template, not just decorative)
      const selectedTemplate = selectedTemplateId
        ? templates.find((t) => t.id === selectedTemplateId)
        : null;
      const referenceStructure = selectedTemplate
        ? selectedTemplate.shots
            .map((s, i) => `${i + 1}. [${s.type}] ${s.duration}s ${s.camera ?? ""} 口播参考：「${s.voiceover ?? ""}」`)
            .join("\n")
        : undefined;

      const scriptRes = await fetch("/api/llm/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          productName,
          category,
          productDescription: sellingPoints,
          targetDuration: parseInt(duration),
          styleType: scriptStyle,
          videoMode,
          productImages: paths,
          llmConfig: {
            baseUrl: llm.baseUrl,
            apiKey: llm.apiKey,
            model: llm.model,
            visionModel: llm.visionModel,
          },
          priceRange,
          targetAudience: targetAudience.join(","),
          platforms: platforms.join(","),
          usageAdvantage,
          // pass the selected template ID + structure (so the AI genuinely follows the template rhythm)
          ...(selectedTemplateId && { templateId: selectedTemplateId }),
          ...(referenceStructure && { referenceStructure }),
          ...(selectedCharacter && {
            character: {
              id: selectedCharacter.id,
              name: selectedCharacter.name,
              appearance: selectedCharacter.appearance || "",
              voiceStyle: selectedCharacter.voiceProfile?.style,
            },
          }),
        }),
      });

      // increment use count when a template was applied
      if (selectedTemplateId) {
        incrementUseCount(selectedTemplateId);
      }
      if (!scriptRes.ok) throw new Error(t("errorScriptFailed"));

      // step 4: done
      setProgress({ step: "done", percent: 100, message: t("progressDone") });
      await new Promise((r) => setTimeout(r, 800));
      router.push(`/project/${project.id}/script`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorGeneric"));
      setIsSubmitting(false);
      setProgress(null);
    }
  };

  return (
    <div className="min-h-screen grid-bg">
      {/* top navigation */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {/* back button */}
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2">
                <LuArrowLeft className="w-4 h-4" />
                <span className="ml-1">{tc("back")}</span>
              </Button>
            </Link>
            <div className="h-5 w-px bg-border/50" />
            {/* logo */}
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
          <LanguageToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        {/* page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("pageTitlePrefix")}<span className="brand-gradient-text">{t("pageTitleAccent")}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {t("pageSubtitle")}
          </p>
        </div>

        {/* LLM not configured warning */}
        {!isLLMConfigured && (
          <Link href="/settings">
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 cursor-pointer hover:bg-amber-100 transition-colors">
              <LuCircleAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">{t("llmWarnTitle")}</p>
                <p className="text-xs text-amber-700 mt-0.5">{t("llmWarnDesc")}<span className="underline">{t("llmWarnCta")}</span></p>
              </div>
            </div>
          </Link>
        )}

        <div className="space-y-6">
          {/* quick start: one-click fill with example product (zero-barrier trial for beginners) */}
          <Card className="glass-card border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <LuZap className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{t("quickStartTitle")}</span>
                <Badge variant="secondary" className="text-[10px]">{t("exampleBadge")}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{t("quickStartDesc")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {getExampleProducts(locale).map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => fillExample(ex)}
                    className="group flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-muted/10 text-left hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ex.image} alt={ex.name} className="h-12 w-12 shrink-0 rounded-md object-cover border border-border/30" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{ex.name}</p>
                      <p className="text-xs text-muted-foreground">¥{ex.price}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* paste product link for one-click import (standard 2026 commerce entry: paste link → auto-scrape title/price/images → create project) */}
          <Card className="glass-card border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <LuLink2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{t("ingestTitle")}</span>
                <Badge variant="secondary" className="text-[10px]">{t("ingestBadge")}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{t("ingestDesc")}</p>
              <div className="flex gap-2">
                <Input
                  value={ingestUrl}
                  onChange={(e) => setIngestUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleIngest();
                  }}
                  placeholder={t("ingestPlaceholder")}
                  disabled={ingesting}
                />
                <Button type="button" onClick={handleIngest} disabled={ingesting || !ingestUrl.trim()} className="shrink-0">
                  {ingesting ? <LuLoader className="w-4 h-4 animate-spin" /> : t("ingestBtn")}
                </Button>
              </div>
              {ingestError && <p className="text-xs text-destructive mt-2">{ingestError}</p>}
            </CardContent>
          </Card>

          {/* product image upload area */}
          <Card className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span className="text-sm font-semibold">{t("stepUploadTitle")}</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-medium">
                  {t("imageLabel")}
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                <span className="text-xs text-muted-foreground">
                  {t("imageCount", { n: images.length })}
                </span>
              </div>

              {/* drag-and-drop upload zone */}
              {images.length < 5 && (
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-primary/50 hover:bg-muted/20"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
                      <LuUpload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t("dropHintPrefix")}
                        <span className="brand-gradient-text font-semibold">{t("dropHintClick")}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("dropHintFormats")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* uploaded image preview grid */}
              {images.length > 0 && (
                <div className={`grid grid-cols-3 sm:grid-cols-5 gap-3 ${images.length < 5 ? "mt-4" : ""}`}>
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/20"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={t("imageAlt")}
                        className="h-full w-full object-cover"
                      />
                      {/* delete button */}
                      <button
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <LuX className="w-3 h-3" />
                      </button>
                      {/* hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* product info form */}
          <Card className="glass-card">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <span className="text-sm font-semibold">{t("stepInfoTitle")}</span>
              </div>
              {/* product name */}
              <div className="space-y-2">
                <Label htmlFor="productName" className="text-sm font-medium">
                  {t("productNameLabel")}
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="productName"
                  placeholder={t("productNamePlaceholder")}
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="bg-muted/30 border-border/50 focus:border-primary"
                />
              </div>

              {/* product category */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("categoryLabel")}</Label>
                <Select value={category} onValueChange={(val) => setCategory(val ?? "")}>
                  <SelectTrigger className="w-full bg-muted/30 border-border/50">
                    {/* Base UI's Select.Value shows the raw value by default; use a function child to map it to the translated label */}
                    <SelectValue>
                      {(value: string) => {
                        const opt = categoryOptions.find((o) => o.value === value);
                        return opt ? t(opt.labelKey) : t("categoryPlaceholder");
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* product selling points */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sellingPoints" className="text-sm font-medium">
                    {t("sellingPointsLabel")}
                  </Label>
                  <span className="text-xs text-muted-foreground">{t("optional")}</span>
                </div>
                <Textarea
                  id="sellingPoints"
                  placeholder={t("sellingPointsPlaceholder")}
                  value={sellingPoints}
                  onChange={(e) => setSellingPoints(e.target.value)}
                  rows={3}
                  className="bg-muted/30 border-border/50 focus:border-primary resize-none"
                />
              </div>

              {/* price range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("priceLabel")}</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: "0-50", labelKey: "priceUnder50" },
                    { value: "50-200", labelKey: "price50to200" },
                    { value: "200-500", labelKey: "price200to500" },
                    { value: "500+", labelKey: "price500plus" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPriceRange(opt.value)}
                      className={`relative flex items-center justify-center h-11 rounded-lg border text-sm font-medium transition-all ${
                        priceRange === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* target audience (multi-select tags) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("audienceLabel")}</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    // value is the raw tag sent to the API (not translated); labelKey is used only for display
                    { value: "学生党", labelKey: "audienceStudent" },
                    { value: "上班族", labelKey: "audienceWorker" },
                    { value: "宝妈", labelKey: "audienceMom" },
                    { value: "精致白领", labelKey: "audienceWhiteCollar" },
                    { value: "中年群体", labelKey: "audienceMiddleAge" },
                    { value: "男性用户", labelKey: "audienceMale" },
                    { value: "健身人群", labelKey: "audienceFitness" },
                    { value: "数码爱好者", labelKey: "audienceTechFan" },
                  ].map((tag) => (
                    <button
                      key={tag.value}
                      onClick={() => toggleAudience(tag.value)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        targetAudience.includes(tag.value)
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-muted/20 text-muted-foreground border-border/50 hover:border-primary/30"
                      }`}
                    >
                      {t(tag.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* target platforms (multi-select) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("platformLabel")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "douyin", labelKey: "platformDouyin" },
                    { value: "kuaishou", labelKey: "platformKuaishou" },
                    { value: "xiaohongshu", labelKey: "platformXiaohongshu" },
                    { value: "tiktok", labelKey: "platformTiktok" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => togglePlatform(opt.value)}
                      className={`relative flex items-center justify-center h-11 rounded-lg border text-sm font-medium transition-all ${
                        platforms.includes(opt.value)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* usage and advantages */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="usageAdvantage" className="text-sm font-medium">{t("usageLabel")}</Label>
                  <span className="text-xs text-muted-foreground">{t("optional")}</span>
                </div>
                <Textarea
                  id="usageAdvantage"
                  placeholder={t("usagePlaceholder")}
                  value={usageAdvantage}
                  onChange={(e) => setUsageAdvantage(e.target.value)}
                  rows={3}
                  className="bg-muted/30 border-border/50 focus:border-primary resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* video configuration (target duration + video mode) */}
          <Card className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <span className="text-sm font-semibold">{t("stepConfigTitle")}</span>
              </div>

              {/* target duration */}
              <Label className="text-sm font-medium mb-3 block">{t("durationLabel")}</Label>
              <div className="grid grid-cols-3 gap-3">
                {durationOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    className={`relative flex items-center justify-center h-11 rounded-lg border text-sm font-medium transition-all ${
                      duration === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                    {/* selected indicator */}
                    {duration === opt.value && (
                      <div className="absolute -top-px -right-px h-4 w-4 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full brand-gradient" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* divider */}
              <div className="my-5 border-t border-border/40" />

              {/* video mode */}
              <Label className="text-sm font-medium mb-3 block">{t("videoModeLabel")}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { value: "product_closeup", labelKey: "modeCloseupLabel", descKey: "modeCloseupDesc", icon: LuBox },
                  { value: "graphic_montage", labelKey: "modeMontageLabel", descKey: "modeMontageDesc", icon: LuLayoutGrid },
                  { value: "scene_demo", labelKey: "modeSceneLabel", descKey: "modeSceneDesc", icon: LuEye },
                  { value: "live_presenter", labelKey: "modePresenterLabel", descKey: "modePresenterDesc", icon: LuVideo },
                ].map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setVideoMode(opt.value);
                        // non-presenter mode: clear the character selection
                        if (opt.value !== "live_presenter") {
                          setSelectedCharacterId(null);
                        }
                      }}
                      className={`relative flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                        videoMode === opt.value
                          ? "border-primary bg-primary/10"
                          : "border-border/50 bg-muted/20 hover:border-primary/40"
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${videoMode === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <span className={`text-sm font-medium ${videoMode === opt.value ? "text-primary" : "text-foreground"}`}>
                          {t(opt.labelKey)}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5 block">{t(opt.descKey)}</span>
                      </div>
                      {videoMode === opt.value && (
                        <div className="absolute top-2.5 right-2.5">
                          <div className="h-2 w-2 rounded-full brand-gradient" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* use a viral template (shown only when templates exist) */}
          {templates.length > 0 && (
            <Card className="glass-card">
              <CardContent className="p-5">
                <div className="mb-3">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <LuBookmark className="w-4 h-4 text-primary" />
                    {t("templateTitle")}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("templateDesc")}
                  </p>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {/* no template */}
                  <button
                    onClick={() => setSelectedTemplateId(null)}
                    className={`shrink-0 flex flex-col items-start p-3 rounded-lg border text-left transition-all min-w-[140px] ${
                      selectedTemplateId === null
                        ? "border-primary bg-primary/10"
                        : "border-border/50 bg-muted/20 hover:border-primary/40"
                    }`}
                  >
                    <span className={`text-sm font-medium ${selectedTemplateId === null ? "text-primary" : "text-foreground"}`}>
                      {t("templateNone")}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">{t("templateNoneDesc")}</span>
                  </button>
                  {/* template list */}
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`shrink-0 flex flex-col items-start p-3 rounded-lg border text-left transition-all min-w-[140px] ${
                        selectedTemplateId === tpl.id
                          ? "border-primary bg-primary/10"
                          : "border-border/50 bg-muted/20 hover:border-primary/40"
                      }`}
                    >
                      <span className={`text-sm font-medium truncate max-w-[120px] ${selectedTemplateId === tpl.id ? "text-primary" : "text-foreground"}`}>
                        {tpl.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        {tpl.category || tpl.styleType || t("templateGeneric")} · {t("templateUsedCount", { n: tpl.useCount })}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* script style */}
          <Card className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
                <span className="text-sm font-semibold">{t("stepStyleTitle")}</span>
              </div>
              <Label className="text-sm font-medium mb-3 block">{t("scriptStyleLabel")}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {styleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setScriptStyle(opt.value)}
                    className={`relative flex flex-col items-start p-3.5 rounded-lg border text-left transition-all ${
                      scriptStyle === opt.value
                        ? "border-primary bg-primary/10"
                        : "border-border/50 bg-muted/20 hover:border-primary/40"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        scriptStyle === opt.value ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {t(opt.labelKey)}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {t(opt.descKey)}
                    </span>
                    {/* selected indicator */}
                    {scriptStyle === opt.value && (
                      <div className="absolute top-2.5 right-2.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary">
                          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
                          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* presenter character (only shown in live presenter mode) */}
          {videoMode === "live_presenter" && characters.length > 0 && (
            <Card className="glass-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">{t("characterTitle")}</Label>
                  <span className="text-xs text-muted-foreground">{t("characterOptional")}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* no character */}
                  <button
                    onClick={() => setSelectedCharacterId(null)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                      selectedCharacterId === null
                        ? "border-primary bg-primary/10"
                        : "border-border/50 bg-muted/20 hover:border-primary/40"
                    }`}
                  >
                    <LuUserX className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-sm font-medium block">{t("characterNone")}</span>
                      <span className="text-[11px] text-muted-foreground">{t("characterNoneDesc")}</span>
                    </div>
                  </button>

                  {/* existing characters */}
                  {characters.map((char) => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedCharacterId(char.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                        selectedCharacterId === char.id
                          ? "border-primary bg-primary/10"
                          : "border-border/50 bg-muted/20 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <LuUser className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium block truncate">{char.name}</span>
                        {char.description && (
                          <span className="text-[11px] text-muted-foreground truncate block">{char.description}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* submit button */}
          <div className="pt-2 pb-10">
            {/* error message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive flex items-center gap-2">
                  <LuCircleAlert className="w-4 h-4 shrink-0" />
                  {error}
                </p>
              </div>
            )}

            {/* progress bar */}
            {progress && (
              <div className="mb-4">
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full brand-gradient transition-all duration-500 rounded-full"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {progress.message}
                </p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting || !isLLMConfigured}
              className="w-full h-12 brand-gradient text-white font-semibold text-base shadow-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {progress?.message || t("submitProcessing")}
                </>
              ) : (
                <>
                  <LuZap className="w-5 h-5 mr-2" />
                  {t("submitGenerate")}
                </>
              )}
            </Button>
            {!isSubmitting && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                {!isLLMConfigured
                  ? t("hintNeedLlm")
                  : !isValid
                    ? t("hintNeedInput")
                    : t("hintReady")}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
