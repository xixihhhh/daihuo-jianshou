"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { useT } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";

/** storyboard card data */
interface StoryboardCard {
  id: number;
  title: string;
  description: string;
  duration: string;
}

/** product image data */
interface ProductImage {
  id: string;
  file: File;
  previewUrl: string;
}

export default function ClonePage() {
  const t = useT("clone");
  const router = useRouter();
  const { llm } = useSettingsStore();

  // video URL and analysis state
  const [videoUrl, setVideoUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [storyboards, setStoryboards] = useState<StoryboardCard[]>([]);

  // product information
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productName, setProductName] = useState("");
  const [productFeatures, setProductFeatures] = useState("");

  // generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // drag-and-drop upload state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Load the generic viral video structure reference.
   * Note: parsing specific video content is not yet supported (requires a video download + ASR pipeline).
   * What is displayed here is the general shot structure of high-converting commerce videos; the AI will
   * combine this structure with your product information to generate a real script when "Start Cloning" is clicked.
   */
  const handleAnalyze = useCallback(async () => {
    if (!videoUrl.trim()) return;
    setIsAnalyzing(true);
    setStoryboards([]);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setStoryboards([
      { id: 1, title: t("shot1Title"), description: t("shot1Desc"), duration: "0-3s" },
      { id: 2, title: t("shot2Title"), description: t("shot2Desc"), duration: "3-8s" },
      { id: 3, title: t("shot3Title"), description: t("shot3Desc"), duration: "8-15s" },
      { id: 4, title: t("shot4Title"), description: t("shot4Desc"), duration: "15-25s" },
      { id: 5, title: t("shot5Title"), description: t("shot5Desc"), duration: "25-35s" },
      { id: 6, title: t("shot6Title"), description: t("shot6Desc"), duration: "35-40s" },
    ]);
    setIsAnalyzing(false);
  }, [videoUrl, t]);

  /** start clone generation: create the clone project + generate a real script, then navigate */
  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;
    if (!llm.apiKey) {
      setGenError(t("errorNoLlm"));
      return;
    }
    setGenError("");
    setIsGenerating(true);
    try {
      // 1) create the clone project (record the source video URL)
      const projRes = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: t("projectNameSuffix", { name: productName }),
          productName,
          productDescription: productFeatures,
          productImages: [],
          sourceType: "clone",
          sourceVideoUrl: videoUrl,
        }),
      });
      if (!projRes.ok) throw new Error(t("errorProjectCreate"));
      const project = await projRes.json();

      // 2) upload the user's product images (with projectId) — fix: previously hardcoded [] discarded all product images,
      //    causing product_closeup shots to have no product visuals and the compose step to fail with "no available asset".
      const formData = new FormData();
      productImages.forEach((img) => formData.append("files", img.file));
      formData.append("projectId", project.id);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const e = await uploadRes.json().catch(() => ({}));
        throw new Error(e.error || t("errorCloneFailed"));
      }
      const { paths } = await uploadRes.json();
      // 2.5) write back the product image paths to the project
      await fetch(`/api/project/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productImages: paths }),
      });

      // 3) generate the script (based on the viral video structure + product info + uploaded product images)
      const scriptRes = await fetch("/api/llm/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          productName,
          productDescription: productFeatures,
          targetDuration: 40,
          styleType: "auto",
          videoMode: "product_closeup",
          productImages: paths,
          referenceUrl: videoUrl,
          llmConfig: {
            baseUrl: llm.baseUrl,
            apiKey: llm.apiKey,
            model: llm.model,
            visionModel: llm.visionModel,
          },
        }),
      });
      if (!scriptRes.ok) {
        const e = await scriptRes.json().catch(() => ({}));
        throw new Error(e.error || t("errorScriptGen"));
      }

      // 4) navigate to the script page
      router.push(`/project/${project.id}/script`);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : t("errorCloneFailed"));
      setIsGenerating(false);
    }
  }, [isGenerating, llm, productName, productFeatures, videoUrl, router, t]);

  /** handle file selection / upload */
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = 5 - productImages.length;
      if (remaining <= 0) return;

      const newImages: ProductImage[] = [];
      for (let i = 0; i < Math.min(files.length, remaining); i++) {
        const file = files[i];
        if (!file.type.startsWith("image/")) continue;
        newImages.push({
          id: `${Date.now()}-${i}`,
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }
      setProductImages((prev) => [...prev, ...newImages]);
    },
    [productImages.length]
  );

  /** remove an uploaded image */
  const removeImage = useCallback((id: string) => {
    setProductImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  /** drag event handlers */
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

  /** whether analysis has been completed */
  const hasAnalysis = storyboards.length > 0;
  /** whether generation can be started */
  const canGenerate =
    hasAnalysis &&
    productImages.length > 0 &&
    productName.trim() !== "" &&
    productFeatures.trim() !== "";

  return (
    <div className="min-h-screen grid-bg">
      {/* top navigation bar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {/* back button */}
            <Link href="/">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
              </Button>
            </Link>
            {/* logo */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg brand-gradient">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">ClipForge</span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* page title */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            <span className="brand-gradient-text">{t("heroTitle")}</span>
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            {t("heroSubtitle")}
          </p>
        </div>

        {/* Step 1 - enter viral video URL */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full brand-gradient text-sm font-bold text-white">
              1
            </div>
            <h2 className="text-lg font-semibold">{t("step1Title")}</h2>
          </div>

          <Card className="glass-card card-hover">
            <CardContent className="p-6 space-y-5">
              {/* video URL input */}
              <div className="space-y-2">
                <Label htmlFor="video-url">{t("videoUrlLabel")}</Label>
                <div className="flex gap-3">
                  <Input
                    id="video-url"
                    placeholder={t("videoUrlPlaceholder")}
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    className="brand-gradient text-white shrink-0"
                    disabled={!videoUrl.trim() || isAnalyzing}
                    onClick={handleAnalyze}
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center gap-2">
                        {/* loading spinner */}
                        <svg
                          className="animate-spin h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        {t("analyzing")}
                      </span>
                    ) : (
                      t("analyze")
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("videoUrlHint")}
                </p>
              </div>

              {/* analysis results display area */}
              {hasAnalysis && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">
                      {t("structureTitle")}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {t("storyboardCount", { n: storyboards.length })}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-1">
                    {t("structureHint")}
                  </p>

                  {/* storyboard card list */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {storyboards.map((card) => (
                      <div
                        key={card.id}
                        className="rounded-lg border border-border/60 bg-background/40 p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {card.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs font-mono"
                          >
                            {card.duration}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Step 2 - upload your product */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                hasAnalysis
                  ? "brand-gradient"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2
            </div>
            <h2
              className={`text-lg font-semibold ${
                hasAnalysis ? "" : "text-muted-foreground"
              }`}
            >
              {t("step2Title")}
            </h2>
          </div>

          <Card
            className={`glass-card card-hover ${
              !hasAnalysis ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <CardContent className="p-6 space-y-6">
              {/* product image drag-and-drop upload */}
              <div className="space-y-2">
                <Label>
                  {t("productImageLabel")}{" "}
                  <span className="text-muted-foreground font-normal">
                    {t("productImageRange")}
                  </span>
                </Label>
                <div
                  className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-primary/50"
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
                    onChange={(e) => handleFiles(e.target.files)}
                  />

                  {productImages.length === 0 ? (
                    // empty state - upload prompt
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-muted-foreground"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {t("uploadHint")}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {t("uploadFormatHint")}
                      </p>
                    </div>
                  ) : (
                    // uploaded image preview
                    <div className="p-4">
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {productImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative group aspect-square rounded-lg overflow-hidden bg-muted/30"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.previewUrl}
                              alt={t("productImageAlt")}
                              className="h-full w-full object-cover"
                            />
                            {/* delete button */}
                            <button
                              type="button"
                              className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage(img.id);
                              }}
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        {/* add more button */}
                        {productImages.length < 5 && (
                          <div className="aspect-square rounded-lg border border-dashed border-border/60 flex items-center justify-center hover:border-primary/50 transition-colors">
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="text-muted-foreground"
                            >
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* product name */}
              <div className="space-y-2">
                <Label htmlFor="product-name">{t("productNameLabel")}</Label>
                <Input
                  id="product-name"
                  placeholder={t("productNamePlaceholder")}
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              {/* product selling points */}
              <div className="space-y-2">
                <Label htmlFor="product-features">{t("productFeaturesLabel")}</Label>
                <Textarea
                  id="product-features"
                  placeholder={t("productFeaturesPlaceholder")}
                  rows={4}
                  value={productFeatures}
                  onChange={(e) => setProductFeatures(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* bottom action buttons */}
        <div className="flex flex-col items-center pb-10 gap-3">
          {genError && (
            <p className="text-sm text-destructive">{genError}</p>
          )}
          <Button
            size="lg"
            className="brand-gradient text-white px-10 text-base font-semibold"
            disabled={!canGenerate || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("cloning")}
              </>
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                {t("startClone")}
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
