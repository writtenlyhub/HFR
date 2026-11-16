"use client";

import React, { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Layers,
  Sparkles,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Trash2,
  ExternalLink,
  Shield,
  Save,
  Globe,
  Images,
  Upload,
  Star,
  Archive,
  RotateCcw,
  MoveUp,
  MoveDown,
  Info,
  FolderOpen,
} from "lucide-react";
import { MediaPickerModal } from "@/components/admin/media-picker-modal";
import {
  updatePropertyGeneral,
  updatePropertyPolicies,
  updateListingConfiguration,
  addPropertyAmenity,
  removePropertyAmenity,
} from "./edit-actions";
import {
  updatePropertySEO,
  uploadPropertyImages,
  attachMediaAssetToProperty,
  setCoverImage,
  deletePropertyImage,
  updateImageDetails,
  reorderPropertyImages,
  validatePropertyForPublish,
  publishPropertyWithValidation,
  archiveProperty,
  restoreProperty,
} from "../phase3-actions";
import { togglePropertyPublish } from "../actions";

export interface PropertyEditorProps {
  property: {
    id: string;
    slug: string;
    name: string;
    headline: string | null;
    description: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude: number | null;
    longitude: number | null;
    checkInTime: string;
    checkOutTime: string;
    houseRules: string | null;
    cancellationPolicy: string | null;
    isActive: boolean;
    isArchived: boolean;
    archivedReason: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    canonicalUrl: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImageUrl: string | null;
    previousSlugs: string[];
    inventoryGroups: Array<{
      id: string;
      code: string;
      name: string;
      totalPhysicalUnits: number;
    }>;
    listingOptions: Array<{
      id: string;
      slug: string;
      title: string;
      bedroomCount: number;
      bathroomCount: number;
      maxGuests: number;
      basePricePerNight: number;
      weekendPricePerNight: number | null;
      cleaningFee: number;
      taxPercentage: number;
      summary: string | null;
      description: string;
      isActive: boolean;
    }>;
    amenities: Array<{
      id: string;
      name: string;
      isFeatured: boolean;
    }>;
    images: Array<{
      id: string;
      url: string;
      caption: string | null;
      altText: string | null;
      category: string | null;
      sortOrder: number;
      isCover: boolean;
    }>;
  };
}

export function PropertyEditorTabs({ property: initialProperty }: PropertyEditorProps) {
  const [activeTab, setActiveTab] = useState<
    "general" | "configurations" | "gallery" | "amenities" | "policies" | "seo" | "publish"
  >("general");

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
    errors?: string[];
  } | null>(null);

  // General tab state
  const [name, setName] = useState(initialProperty.name);
  const [headline, setHeadline] = useState(initialProperty.headline || "");
  const [description, setDescription] = useState(initialProperty.description);
  const [address, setAddress] = useState(initialProperty.address);
  const [city, setCity] = useState(initialProperty.city);
  const [state, setState] = useState(initialProperty.state);
  const [country, setCountry] = useState(initialProperty.country);
  const [postalCode, setPostalCode] = useState(initialProperty.postalCode);
  const [latitude, setLatitude] = useState(initialProperty.latitude?.toString() || "");
  const [longitude, setLongitude] = useState(initialProperty.longitude?.toString() || "");

  // Policies tab state
  const [checkInTime, setCheckInTime] = useState(initialProperty.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(initialProperty.checkOutTime);
  const [houseRules, setHouseRules] = useState(initialProperty.houseRules || "");
  const [cancellationPolicy, setCancellationPolicy] = useState(
    initialProperty.cancellationPolicy || ""
  );

  // SEO tab state
  const [slug, setSlug] = useState(initialProperty.slug);
  const [seoTitle, setSeoTitle] = useState(initialProperty.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(initialProperty.seoDescription || "");
  const [canonicalUrl, setCanonicalUrl] = useState(initialProperty.canonicalUrl || "");
  const [ogTitle, setOgTitle] = useState(initialProperty.ogTitle || "");
  const [ogDescription, setOgDescription] = useState(initialProperty.ogDescription || "");
  const [ogImageUrl, setOgImageUrl] = useState(initialProperty.ogImageUrl || "");
  const [previousSlugs, setPreviousSlugs] = useState(initialProperty.previousSlugs || []);

  // Publication & Archival state
  const [isActive, setIsActive] = useState(initialProperty.isActive);
  const [isArchived, setIsArchived] = useState(initialProperty.isArchived);
  const [archivedReason, setArchivedReason] = useState(initialProperty.archivedReason || "");
  const [validationChecklist, setValidationChecklist] = useState<string[]>([]);
  const [validationChecked, setValidationChecked] = useState(false);

  // Gallery state
  const [images, setImages] = useState(initialProperty.images);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMediaPicker, setShowMediaPicker] = useState<"gallery" | "ogImage" | null>(null);

  // Amenities state
  const [amenities, setAmenities] = useState(initialProperty.amenities);
  const [newAmenityName, setNewAmenityName] = useState("");

  // Configurations state
  const [configurations, setConfigurations] = useState(initialProperty.listingOptions);

  // -------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------

  const handleSaveGeneral = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updatePropertyGeneral(initialProperty.id, {
        name,
        headline,
        description,
        address,
        city,
        state,
        country,
        postalCode,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      });

      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Updated successfully." });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update." });
      }
    });
  };

  const handleSavePolicies = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updatePropertyPolicies(initialProperty.id, {
        checkInTime,
        checkOutTime,
        houseRules,
        cancellationPolicy,
      });

      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Updated policies." });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update policies." });
      }
    });
  };

  const handleSaveSEO = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updatePropertySEO(initialProperty.id, {
        slug,
        seoTitle,
        seoDescription,
        canonicalUrl,
        ogTitle,
        ogDescription,
        ogImageUrl,
      });

      if (res.success) {
        if (slug !== initialProperty.slug && !previousSlugs.includes(initialProperty.slug)) {
          setPreviousSlugs((prev) => [...prev, initialProperty.slug]);
        }
        setFeedback({ type: "success", text: res.message || "SEO metadata updated." });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update SEO." });
      }
    });
  };

  const handleRunValidationCheck = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await validatePropertyForPublish(initialProperty.id);
      setValidationChecked(true);
      setValidationChecklist(result.errors);
      if (result.valid) {
        setFeedback({ type: "success", text: "Ready to publish: Property meets all publication requirements." });
      } else {
        setFeedback({
          type: "error",
          text: `Found ${result.errors.length} requirement(s) to resolve before publishing live.`,
          errors: result.errors,
        });
      }
    });
  };

  const handlePublishWithPreflight = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await publishPropertyWithValidation(initialProperty.id);
      if (res.success) {
        setIsActive(true);
        setIsArchived(false);
        setValidationChecklist([]);
        setFeedback({ type: "success", text: res.message || "Published live." });
      } else {
        setValidationChecked(true);
        setValidationChecklist(res.errors || []);
        setFeedback({
          type: "error",
          text: res.error || "Validation requirements missing.",
          errors: res.errors,
        });
      }
    });
  };

  const handleUnpublishToDraft = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await togglePropertyPublish(initialProperty.id, true);
      if (res.success) {
        setIsActive(false);
        setFeedback({ type: "success", text: res.message || "Moved to Draft." });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to unpublish." });
      }
    });
  };

  const handleArchiveProperty = (reason?: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await archiveProperty(initialProperty.id, reason);
      if (res.success) {
        setIsArchived(true);
        setIsActive(false);
        setFeedback({ type: "success", text: res.message || "Archived." });
      } else {
        setFeedback({ type: "error", text: res.error || "Cannot archive property." });
      }
    });
  };

  const handleRestoreProperty = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await restoreProperty(initialProperty.id);
      if (res.success) {
        setIsArchived(false);
        setIsActive(false);
        setFeedback({ type: "success", text: res.message || "Restored as Draft." });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to restore." });
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await uploadPropertyImages(initialProperty.id, formData);
      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Images uploaded." });
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setFeedback({ type: "error", text: res.error || "Upload failed." });
      }
    });
  };

  const handleSetCover = (imageId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await setCoverImage(initialProperty.id, imageId);
      if (res.success) {
        setImages((prev) =>
          prev.map((img) => ({ ...img, isCover: img.id === imageId }))
        );
        setFeedback({ type: "success", text: "Primary cover photograph updated." });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to set cover." });
      }
    });
  };

  const handleDeleteImage = (imageId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await deletePropertyImage(initialProperty.id, imageId);
      if (res.success) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        setFeedback({ type: "success", text: "Photograph removed." });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to delete image." });
      }
    });
  };

  const handleMoveImage = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const reordered = [...images];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setImages(reordered);
    const orderedIds = reordered.map((img) => img.id);

    startTransition(async () => {
      const res = await reorderPropertyImages(initialProperty.id, orderedIds);
      if (res.success) {
        setFeedback({ type: "success", text: "Gallery sequence updated." });
      }
    });
  };

  const handleUpdateImageText = (imageId: string, caption?: string, altText?: string) => {
    startTransition(async () => {
      await updateImageDetails(initialProperty.id, imageId, { caption, altText });
    });
  };

  const handleUpdateConfig = (configId: string, updatedFields: Partial<typeof configurations[0]>) => {
    setFeedback(null);
    const target = configurations.find((c) => c.id === configId);
    if (!target) return;

    const merged = { ...target, ...updatedFields };

    startTransition(async () => {
      const res = await updateListingConfiguration(initialProperty.id, configId, {
        title: merged.title,
        bedroomCount: Number(merged.bedroomCount),
        bathroomCount: Number(merged.bathroomCount),
        maxGuests: Number(merged.maxGuests),
        basePricePerNight: Number(merged.basePricePerNight),
        weekendPricePerNight: merged.weekendPricePerNight
          ? Number(merged.weekendPricePerNight)
          : null,
        cleaningFee: Number(merged.cleaningFee),
        taxPercentage: Number(merged.taxPercentage),
        summary: merged.summary || undefined,
        description: merged.description,
        isActive: merged.isActive,
      });

      if (res.success) {
        setConfigurations((prev) =>
          prev.map((c) => (c.id === configId ? merged : c))
        );
        setFeedback({ type: "success", text: `Saved "${merged.title}" configuration.` });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update configuration." });
      }
    });
  };

  const handleAddAmenity = () => {
    if (!newAmenityName.trim()) return;
    setFeedback(null);

    startTransition(async () => {
      const res = await addPropertyAmenity(initialProperty.id, newAmenityName.trim());
      if (res.success) {
        setAmenities((prev) => [
          ...prev,
          { id: `temp-${Date.now()}`, name: newAmenityName.trim(), isFeatured: true },
        ]);
        setNewAmenityName("");
        setFeedback({ type: "success", text: res.message || "Amenity added." });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to add amenity." });
      }
    });
  };

  const handleRemoveAmenity = (amenityId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await removePropertyAmenity(initialProperty.id, amenityId);
      if (res.success) {
        setAmenities((prev) => prev.filter((a) => a.id !== amenityId));
        setFeedback({ type: "success", text: "Amenity removed." });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to remove amenity." });
      }
    });
  };

  const primaryInventoryGroup = initialProperty.inventoryGroups[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/properties"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Property Portfolio</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-serif font-extrabold tracking-tight text-neutral-900">
              {name}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                isArchived
                  ? "bg-neutral-900/80 text-neutral-300 border-neutral-700"
                  : isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {isArchived ? "Archived" : isActive ? "Published" : "Draft"}
            </span>
          </div>
        </div>

        {/* Global Property Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Preview / Live Page Link */}
          {!isArchived && (
            <Link
              href={`/properties/${slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-500" />
              <span>{isActive ? "Live Page ↗" : "Preview Draft ↗"}</span>
            </Link>
          )}

          {/* Quick Publish / Unpublish / Restore */}
          {isArchived ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleRestoreProperty}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-100 text-xs font-bold text-neutral-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-600" />
              <span>Restore Property</span>
            </button>
          ) : isActive ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleUnpublishToDraft}
              className="px-4 py-2 rounded-xl text-xs font-bold transition border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700"
            >
              Unpublish to Draft
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending}
              onClick={handlePublishWithPreflight}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              {isPending ? "Validating..." : "Publish Live"}
            </button>
          )}
        </div>
      </div>

      {/* Status Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs space-y-2 transition ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-[11px] font-bold uppercase tracking-wider hover:underline"
            >
              Dismiss
            </button>
          </div>

          {feedback.errors && feedback.errors.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-red-700 text-xs font-medium pt-1">
              {feedback.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-neutral-200 flex gap-2 overflow-x-auto text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`pb-3 px-3 border-b-2 transition flex items-center gap-2 shrink-0 ${
            activeTab === "general"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>General Info</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("configurations")}
          className={`pb-3 px-3 border-b-2 transition flex items-center gap-2 shrink-0 ${
            activeTab === "configurations"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Room Configurations ({configurations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gallery")}
          className={`pb-3 px-3 border-b-2 transition flex items-center gap-2 shrink-0 ${
            activeTab === "gallery"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Images className="w-4 h-4" />
          <span>Photography ({images.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("amenities")}
          className={`pb-3 px-3 border-b-2 transition flex items-center gap-2 shrink-0 ${
            activeTab === "amenities"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Amenities ({amenities.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("policies")}
          className={`pb-3 px-3 border-b-2 transition flex items-center gap-2 shrink-0 ${
            activeTab === "policies"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Policies &amp; Hours</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("seo")}
          className={`pb-3 px-3 border-b-2 transition flex items-center gap-2 shrink-0 ${
            activeTab === "seo"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>SEO &amp; Social</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("publish")}
          className={`pb-3 px-3 border-b-2 transition flex items-center gap-2 shrink-0 ${
            activeTab === "publish"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Publish &amp; Archival</span>
        </button>
      </div>

      {/* Tab 1: General Info */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Basic Property Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Property Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Headline Subtitle
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Address &amp; Location Coordinates
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Latitude
                </label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="e.g. 26.8968"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Longitude
                </label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="e.g. 75.8271"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSaveGeneral}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isPending ? "Saving..." : "Save General Changes"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Configurations (Shared Inventory) */}
      {activeTab === "configurations" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                Physical Inventory Anchor: {primaryInventoryGroup?.code} ({primaryInventoryGroup?.totalPhysicalUnits} physical estate)
              </span>
              <span className="text-amber-800 leading-relaxed block mt-0.5">
                All configurations below share this single physical footprint. When a reservation or calendar block occurs on any configuration, the entire physical estate is blocked to prevent double-bookings.
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {configurations.map((config) => (
              <div
                key={config.id}
                className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-neutral-400">
                      /properties/{slug}/{config.slug}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        config.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {config.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateConfig(config.id, { isActive: !config.isActive })
                    }
                    className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 underline"
                  >
                    {config.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Configuration Title
                    </label>
                    <input
                      type="text"
                      value={config.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfigurations((prev) =>
                          prev.map((c) => (c.id === config.id ? { ...c, title: val } : c))
                        );
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Bedrooms
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={config.bedroomCount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setConfigurations((prev) =>
                          prev.map((c) => (c.id === config.id ? { ...c, bedroomCount: val } : c))
                        );
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Bathrooms
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={config.bathroomCount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setConfigurations((prev) =>
                          prev.map((c) => (c.id === config.id ? { ...c, bathroomCount: val } : c))
                        );
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Max Guests
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={config.maxGuests}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setConfigurations((prev) =>
                          prev.map((c) => (c.id === config.id ? { ...c, maxGuests: val } : c))
                        );
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Base Rate (INR / night)
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={100}
                      value={config.basePricePerNight}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setConfigurations((prev) =>
                          prev.map((c) => (c.id === config.id ? { ...c, basePricePerNight: val } : c))
                        );
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Weekend Rate (INR / night)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={config.weekendPricePerNight || ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setConfigurations((prev) =>
                          prev.map((c) => (c.id === config.id ? { ...c, weekendPricePerNight: val } : c))
                        );
                      }}
                      placeholder="Optional"
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Tax Percentage (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={config.taxPercentage}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setConfigurations((prev) =>
                          prev.map((c) => (c.id === config.id ? { ...c, taxPercentage: val } : c))
                        );
                      }}
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleUpdateConfig(config.id, config)}
                    className="px-4 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-bold transition shadow-xs"
                  >
                    Save Configuration
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Photography & Media Gallery */}
      {activeTab === "gallery" && (
        <div className="space-y-6">
          {/* Upload Area */}
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Upload Photography
                </h3>
                <p className="text-xs text-neutral-500">
                  Select high-resolution JPEG, PNG, or WebP images (up to 8 MB per image).
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload-input"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMediaPicker("gallery")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-bold transition shadow-2xs"
                >
                  <FolderOpen className="w-4 h-4 text-amber-600" />
                  <span>Choose from Media Library</span>
                </button>
                <label
                  htmlFor="file-upload-input"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Photos</span>
                </label>
              </div>
            </div>

            {/* Gallery Grid */}
            {images.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 text-xs space-y-2">
                <Images className="w-10 h-10 mx-auto text-neutral-300" />
                <p>No photographs uploaded yet. Upload images to display in the gallery.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className={`rounded-2xl border bg-white overflow-hidden shadow-2xs flex flex-col justify-between ${
                      img.isCover ? "border-amber-400 ring-2 ring-amber-400/20" : "border-neutral-200/80"
                    }`}
                  >
                    <div>
                      {/* Image Preview with Cover Tag */}
                      <div className="relative aspect-16/10 bg-neutral-100 overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.altText || img.caption || "Property image"}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                          {img.isCover ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-neutral-950 text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                              <Star className="w-3 h-3 fill-neutral-950" />
                              <span>Cover Photo</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono backdrop-blur-md">
                              #{idx + 1}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Caption & Alt Text */}
                      <div className="p-3.5 space-y-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
                            Caption
                          </label>
                          <input
                            type="text"
                            defaultValue={img.caption || ""}
                            onBlur={(e) => handleUpdateImageText(img.id, e.target.value, img.altText || undefined)}
                            placeholder="e.g. Master Bedroom Courtyard View"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5">
                            Alt Text (SEO &amp; Accessibility)
                          </label>
                          <input
                            type="text"
                            defaultValue={img.altText || ""}
                            onBlur={(e) => handleUpdateImageText(img.id, img.caption || undefined, e.target.value)}
                            placeholder="Descriptive alt text for screen readers..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Controls Footer */}
                    <div className="p-2.5 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-between gap-1 text-xs">
                      {/* Reorder Arrows */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0 || isPending}
                          onClick={() => handleMoveImage(idx, "up")}
                          className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 disabled:opacity-30 transition"
                          title="Move earlier in gallery"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === images.length - 1 || isPending}
                          onClick={() => handleMoveImage(idx, "down")}
                          className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 disabled:opacity-30 transition"
                          title="Move later in gallery"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!img.isCover && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleSetCover(img.id)}
                            className="px-2 py-1 rounded text-[11px] font-semibold text-neutral-700 hover:text-amber-800 hover:bg-amber-50 transition border border-transparent hover:border-amber-200"
                          >
                            Set as Cover
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDeleteImage(img.id)}
                          className="p-1.5 rounded text-neutral-400 hover:text-red-700 hover:bg-red-50 transition"
                          title="Delete photograph"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Amenities */}
      {activeTab === "amenities" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Manage Estate Amenities
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                value={newAmenityName}
                onChange={(e) => setNewAmenityName(e.target.value)}
                placeholder="Enter new amenity (e.g. Electric Kettle, Hair Dryer, Board Games)..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAmenity();
                  }
                }}
              />
              <button
                type="button"
                disabled={isPending || !newAmenityName.trim()}
                onClick={handleAddAmenity}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Amenity</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
              {amenities.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-semibold text-neutral-800">{item.name}</span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRemoveAmenity(item.id)}
                    className="p-1 rounded text-neutral-400 hover:text-red-700 hover:bg-red-50 transition"
                    title="Remove amenity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Policies & Operating Hours */}
      {activeTab === "policies" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Check-In &amp; Check-Out Operating Times
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Check-In Time
                </label>
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Check-Out Time
                </label>
                <input
                  type="text"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  House Rules
                </label>
                <textarea
                  rows={3}
                  value={houseRules}
                  onChange={(e) => setHouseRules(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Cancellation Policy
                </label>
                <textarea
                  rows={3}
                  value={cancellationPolicy}
                  onChange={(e) => setCancellationPolicy(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSavePolicies}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isPending ? "Saving..." : "Save Policies & Hours"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 6: SEO & Social Sharing Management */}
      {activeTab === "seo" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
              <Globe className="w-4 h-4 text-amber-700" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                URL Slug &amp; Permanent Redirect Tracking
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Property URL Slug
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400">
                  /properties/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full pl-24 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
              <p className="text-[11px] text-neutral-500 mt-1.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>
                  Changing the slug will automatically register the old slug as a permanent 308 redirect, preserving existing bookmarks and Google search rankings.
                </span>
              </p>
            </div>

            {previousSlugs.length > 0 && (
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/70 text-xs space-y-1">
                <span className="font-bold text-neutral-700 block text-[11px] uppercase tracking-wider">
                  Active Redirect History ({previousSlugs.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {previousSlugs.map((oldSlug, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-white border border-neutral-200 font-mono text-[11px] text-neutral-600"
                    >
                      /properties/{oldSlug} → 308
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Search Engine Optimization (SEO)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-neutral-700">
                    SEO Meta Title
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {seoTitle.length}/60 chars
                  </span>
                </div>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="e.g. Dev Stays Jaipur | Luxury 3BHK Private Villa in Raja Park"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Meta Description
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {seoDescription.length}/160 chars
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="A concise summary of the villa, central location, bedrooms, and exclusive private booking benefits..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Canonical URL (Optional override)
                </label>
                <input
                  type="text"
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="https://devstaysjaipur.com/properties/dev-stays-jaipur"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Open Graph &amp; Social Card Preview
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Social Sharing Title (OG Title)
                </label>
                <input
                  type="text"
                  value={ogTitle}
                  onChange={(e) => setOgTitle(e.target.value)}
                  placeholder="Leave empty to use SEO Title"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Social Sharing Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ogImageUrl}
                    onChange={(e) => setOgImageUrl(e.target.value)}
                    placeholder="https://... or /uploads/..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker("ogImage")}
                    className="px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-amber-700" />
                    <span>Library</span>
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Social Sharing Description (OG Description)
                </label>
                <textarea
                  rows={2}
                  value={ogDescription}
                  onChange={(e) => setOgDescription(e.target.value)}
                  placeholder="Leave empty to use Meta Description"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSaveSEO}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isPending ? "Saving..." : "Save SEO & Redirects"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 7: Publication Validation & Archival */}
      {activeTab === "publish" && (
        <div className="space-y-6">
          {/* Pre-flight Validation Card */}
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                  Pre-Flight Publishing Validation
                </h3>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={handleRunValidationCheck}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
              >
                {isPending ? "Checking..." : "Re-run Validation"}
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              DevStay enforces complete data readiness before a property can be published to the public website.
            </p>

            {validationChecked && (
              <div
                className={`p-4 rounded-xl text-xs space-y-2 border ${
                  validationChecklist.length === 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                <div className="font-bold flex items-center gap-2">
                  {validationChecklist.length === 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Ready to Publish: All requirements satisfied.</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span>
                        Validation Incomplete ({validationChecklist.length} item(s) require attention):
                      </span>
                    </>
                  )}
                </div>

                {validationChecklist.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1 font-medium text-red-700">
                    {validationChecklist.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <div className="text-xs text-neutral-500">
                Status: <strong>{isActive ? "Published Live" : isArchived ? "Archived" : "Draft"}</strong>
              </div>

              {!isArchived && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={isActive ? handleUnpublishToDraft : handlePublishWithPreflight}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-xs ${
                    isActive
                      ? "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {isActive ? "Unpublish to Draft" : "Validate & Publish Live"}
                </button>
              )}
            </div>
          </div>

          {/* Archival & Safety Decommissioning Card */}
          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-200/60">
              <Archive className="w-4 h-4 text-neutral-700" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                Property Archival &amp; Lifecycle Safety
              </h3>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Archiving hides the property from all search results, direct links, and staff availability queries. 
              <strong> The system enforces a safety policy preventing archival if any active or upcoming bookings exist.</strong> All historical booking data and inventory records remain permanently preserved.
            </p>

            {isArchived ? (
              <div className="p-4 rounded-xl bg-white border border-neutral-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-neutral-900 block">
                    Property is Currently Archived
                  </span>
                  {archivedReason && (
                    <span className="text-[11px] text-neutral-500 block">
                      Reason: {archivedReason}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleRestoreProperty}
                  className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition shadow-xs"
                >
                  Restore to Draft
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-neutral-900 block">
                    Decommission or Archive Property
                  </span>
                  <span className="text-[11px] text-neutral-500 block">
                    Safe operation. Will check for active guest reservations before proceeding.
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    const reason = prompt("Enter archival reason (e.g. Seasonal closure, Property sold):");
                    if (reason !== null) {
                      handleArchiveProperty(reason);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition shrink-0"
                >
                  Archive Property
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Central Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          isOpen={Boolean(showMediaPicker)}
          filterType="IMAGE"
          title={
            showMediaPicker === "ogImage"
              ? "Select Social Sharing Image from Central Gallery"
              : "Select Image from Central Media Gallery"
          }
          onClose={() => setShowMediaPicker(null)}
          onSelect={(selected) => {
            if (showMediaPicker === "ogImage") {
              setOgImageUrl(selected.url);
              setFeedback({ type: "success", text: "OG Image selected from library. Remember to save SEO changes." });
            } else if (showMediaPicker === "gallery") {
              startTransition(async () => {
                const res = await attachMediaAssetToProperty(
                  initialProperty.id,
                  selected.url,
                  selected.title,
                  selected.altText
                );
                if (res.success && res.data) {
                  setImages((prev) => [...prev, res.data as any]);
                  setFeedback({ type: "success", text: "Image added to property gallery." });
                } else {
                  setFeedback({ type: "error", text: res.error || "Failed to attach image." });
                }
              });
            }
            setShowMediaPicker(null);
          }}
        />
      )}
    </div>
  );
}
