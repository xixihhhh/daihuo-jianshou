"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { LuPlus, LuTrash2, LuPencil, LuPackage, LuArrowLeft, LuImage, LuX, LuVideo, LuCircleAlert } from "react-icons/lu";
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
import {
  useProductLibraryStore,
  type ProductItem,
} from "@/lib/stores/product-library-store";
import { getExampleProducts } from "@/lib/examples";
import { useT, useLocale } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";

// Category options (label uses an i18n key; resolved at runtime via t())
const categoryOptions = [
  { value: "beauty", labelKey: "categoryBeauty" },
  { value: "food", labelKey: "categoryFood" },
  { value: "home", labelKey: "categoryHome" },
  { value: "fashion", labelKey: "categoryFashion" },
  { value: "tech", labelKey: "categoryTech" },
  { value: "other", labelKey: "categoryOther" },
] as const;

// Category color mapping
const categoryColorMap: Record<string, string> = {
  beauty: "bg-pink-500/20 text-pink-400",
  food: "bg-amber-500/20 text-amber-400",
  home: "bg-blue-500/20 text-blue-400",
  fashion: "bg-purple-500/20 text-purple-400",
  tech: "bg-cyan-500/20 text-cyan-400",
  other: "bg-zinc-500/20 text-zinc-400",
};

// Category value → i18n key mapping
const categoryLabelKeyMap: Record<string, string> = Object.fromEntries(
  categoryOptions.map((opt) => [opt.value, opt.labelKey])
);

export default function ProductsPage() {
  const t = useT("products");
  const locale = useLocale();
  const { products, addProduct, updateProduct, removeProduct } =
    useProductLibraryStore();

  // One-click import of example products (lets new users quickly try batch rendering / viral-clip replication)
  const importExamples = useCallback(() => {
    const existingNames = new Set(products.map((p) => p.name));
    getExampleProducts(locale).forEach((ex) => {
      if (existingNames.has(ex.name)) return;
      addProduct({
        id: crypto.randomUUID(),
        name: ex.name,
        category: ex.category,
        description: ex.sellingPoints,
        images: [ex.image],
        price: ex.price,
        targetAudience: "",
        videoCount: 0,
        createdAt: new Date(),
      });
    });
  }, [products, addProduct, locale]);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductItem["category"]>("other");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  // Image upload state
  const [images, setImages] = useState<{ id: string; url: string; file?: File }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save state (uploading product images requires server-side persistence, so save is async)
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset form
  const resetForm = () => {
    setName("");
    setCategory("other");
    setDescription("");
    setPrice("");
    setTargetAudience("");
    // Revoke preview-only blob URLs to avoid memory leaks
    setImages((prev) => {
      prev.forEach((img) => {
        if (img.file) URL.revokeObjectURL(img.url);
      });
      return [];
    });
    setSaveError(null);
    setIsFormOpen(false);
    setEditingId(null);
  };

  // Handle image file selection
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

  // Drag-and-drop event handlers
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

  // Remove image
  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target?.file) URL.revokeObjectURL(target.url);
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  // Open the edit form
  const startEdit = (product: ProductItem) => {
    setEditingId(product.id);
    setName(product.name);
    setCategory(product.category);
    setDescription(product.description || "");
    setPrice(product.price || "");
    setTargetAudience(product.targetAudience || "");
    // Convert existing image URLs to display format
    setImages(
      product.images.map((url) => ({
        id: crypto.randomUUID(),
        url,
      }))
    );
    setIsFormOpen(true);
  };

  // Save product: newly added images (with a file object) are uploaded to the server first to get
  // a persistent /api/files URL — avoids storing blob: URLs directly, which break after a refresh
  // or when navigating to the "make video" page (broken images / can't pass URL to new-project page)
  const handleSave = async () => {
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Reuse existing id when editing; generate a new id when adding (used as the image storage directory name)
      const productId = editingId ?? crypto.randomUUID();

      // Only items with a file object are newly selected — those need uploading; existing server/example URLs stay as-is
      const filesToUpload = images.filter((img) => img.file);
      let uploadedPaths: string[] = [];
      if (filesToUpload.length > 0) {
        const formData = new FormData();
        filesToUpload.forEach((img) => formData.append("files", img.file!));
        formData.append("productId", productId);
        const res = await fetch("/api/products/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || t("uploadFailed"));
        }
        const data = await res.json();
        uploadedPaths = data.paths as string[];
      }

      // Assemble final URLs in original order: new images use the uploaded server path, old images keep their existing URL
      let cursor = 0;
      const imageUrls = images.map((img) =>
        img.file ? uploadedPaths[cursor++] : img.url
      );

      if (editingId) {
        // Edit mode
        updateProduct(editingId, {
          name: name.trim(),
          category,
          description: description.trim() || undefined,
          images: imageUrls,
          price: price.trim() || undefined,
          targetAudience: targetAudience.trim() || undefined,
        });
      } else {
        // Add mode
        const newProduct: ProductItem = {
          id: productId,
          name: name.trim(),
          category,
          description: description.trim() || undefined,
          images: imageUrls,
          price: price.trim() || undefined,
          targetAudience: targetAudience.trim() || undefined,
          videoCount: 0,
          createdAt: new Date(),
        };
        addProduct(newProduct);
      }

      resetForm();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("uploadFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete product
  const handleDelete = (id: string) => {
    removeProduct(id);
    // If the deleted product is currently being edited, close the form
    if (editingId === id) resetForm();
  };

  return (
    <div className="min-h-screen grid-bg">
      {/* Top navigation */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {/* Logo */}
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
            <span className="text-lg font-bold tracking-tight">{t("navTitle")}</span>
          </div>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <LuArrowLeft className="w-4 h-4" />
                <span className="ml-1.5">{t("backHome")}</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Page title + add button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="brand-gradient-text">{t("pageTitleAccent")}</span>{t("pageTitleRest")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("pageSubtitle")}
            </p>
          </div>
          {!isFormOpen && (
            <Button
              className="brand-gradient text-white"
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
            >
              <LuPlus className="w-4 h-4 mr-1.5" />
              {t("addProduct")}
            </Button>
          )}
        </div>

        {/* Add / edit form */}
        {isFormOpen && (
          <Card className="glass-card ring-1 ring-primary/30 mb-8">
            <CardContent className="p-5 space-y-5">
              <h3 className="text-sm font-semibold">
                {editingId ? t("formEditTitle") : t("formAddTitle")}
              </h3>

              {/* Product name */}
              <div className="space-y-2">
                <Label htmlFor="productName" className="text-sm font-medium">
                  {t("fieldName")}
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="productName"
                  placeholder={t("namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-muted/30 border-border/50 focus:border-primary"
                />
              </div>

              {/* Category selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("fieldCategory")}</Label>
                <Select
                  value={category}
                  onValueChange={(val) =>
                    setCategory((val ?? "other") as ProductItem["category"])
                  }
                >
                  <SelectTrigger className="w-full bg-muted/30 border-border/50">
                    {/* Base UI's Select.Value shows the raw value by default — use a function child to map it to a localized label */}
                    <SelectValue>
                      {(value: string) =>
                        categoryLabelKeyMap[value]
                          ? t(categoryLabelKeyMap[value])
                          : t("categoryPlaceholder")
                      }
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

              {/* Selling-point description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-sm font-medium">
                    {t("fieldDescription")}
                  </Label>
                  <span className="text-xs text-muted-foreground">{t("optional")}</span>
                </div>
                <Textarea
                  id="description"
                  placeholder={t("descriptionPlaceholder")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bg-muted/30 border-border/50 focus:border-primary resize-none"
                />
              </div>

              {/* Product image upload */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">{t("fieldImages")}</Label>
                  <span className="text-xs text-muted-foreground">
                    {t("imageCount", { n: images.length })}
                  </span>
                </div>

                {/* Drag-and-drop upload area */}
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
                        <LuImage className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {t("dropHintPrefix")}
                          <span className="brand-gradient-text font-semibold">
                            {t("dropHintClick")}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("dropHintFormats")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Uploaded image preview grid */}
                {images.length > 0 && (
                  <div
                    className={`grid grid-cols-3 sm:grid-cols-5 gap-3 ${
                      images.length < 5 ? "mt-4" : ""
                    }`}
                  >
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
                        {/* Delete button */}
                        <button
                          onClick={() => removeImage(img.id)}
                          className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                          <LuX className="w-3 h-3" />
                        </button>
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Price info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="price" className="text-sm font-medium">
                      {t("fieldPrice")}
                    </Label>
                    <span className="text-xs text-muted-foreground">{t("optional")}</span>
                  </div>
                  <Input
                    id="price"
                    placeholder={t("pricePlaceholder")}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="bg-muted/30 border-border/50 focus:border-primary"
                  />
                </div>

                {/* Target audience */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="targetAudience"
                      className="text-sm font-medium"
                    >
                      {t("fieldAudience")}
                    </Label>
                    <span className="text-xs text-muted-foreground">{t("optional")}</span>
                  </div>
                  <Input
                    id="targetAudience"
                    placeholder={t("audiencePlaceholder")}
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="bg-muted/30 border-border/50 focus:border-primary"
                  />
                </div>
              </div>

              {/* Upload / save error message */}
              {saveError && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <LuCircleAlert className="w-4 h-4 shrink-0" />
                  {saveError}
                </p>
              )}

              {/* Save / cancel buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={resetForm} disabled={isSaving}>
                  {t("cancel")}
                </Button>
                <Button
                  size="sm"
                  className="brand-gradient text-white"
                  onClick={handleSave}
                  disabled={!name.trim() || isSaving}
                >
                  {isSaving ? t("saving") : editingId ? t("saveEdit") : t("addProduct")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product list */}
        {products.length === 0 && !isFormOpen ? (
          // Empty state
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                <LuPackage className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">
                {t("emptyText")}
              </p>
              <div className="flex items-center gap-3">
                <Button
                  className="brand-gradient text-white"
                  onClick={() => {
                    resetForm();
                    setIsFormOpen(true);
                  }}
                >
                  <LuPlus className="w-4 h-4 mr-1.5" />
                  {t("addProduct")}
                </Button>
                <Button variant="outline" onClick={importExamples}>
                  {t("importExamples")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{t("emptyHint")}</p>
            </CardContent>
          </Card>
        ) : (
          products.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold">{t("allProducts")}</h2>
                <span className="text-sm text-muted-foreground">
                  {t("productCount", { n: products.length })}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="card-hover glass-card group"
                  >
                    <CardContent className="p-0">
                      {/* Product thumbnail */}
                      <div className="relative aspect-video bg-muted/30 rounded-t-lg overflow-hidden">
                        {product.images.length > 0 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <LuImage className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                        )}
                        {/* Category badge */}
                        <div className="absolute top-2 left-2">
                          <Badge
                            className={`${
                              categoryColorMap[product.category] || categoryColorMap.other
                            } border-0 text-xs`}
                          >
                            {t(categoryLabelKeyMap[product.category] || "categoryOther")}
                          </Badge>
                        </div>
                        {/* Floating action buttons */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(product);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-primary transition-colors"
                          >
                            <LuPencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(product.id);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors"
                          >
                            <LuTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {/* Product info */}
                      <div className="p-4">
                        <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between mt-2">
                          {product.price && (
                            <span className="text-xs text-primary font-medium">
                              {product.price}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {t("videoCount", { n: product.videoCount })}
                          </span>
                        </div>
                        {/* Make video: navigate to new-project page with productId so product info is pre-filled (core purpose of the product library) */}
                        <Link href={`/project/new?productId=${product.id}`} className="block mt-3">
                          <Button size="sm" className="w-full brand-gradient text-white border-0">
                            <LuVideo className="w-3.5 h-3.5 mr-1.5" />
                            {t("makeVideo")}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}
