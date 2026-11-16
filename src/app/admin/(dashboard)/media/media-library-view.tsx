"use client";

import React, { useState, useTransition, useId } from "react";
import {
  Upload,
  Search,
  Filter,
  Grid,
  List as ListIcon,
  Trash2,
  Copy,
  ExternalLink,
  Info,
  Check,
  AlertTriangle,
  Film,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  X,
  FileCheck,
  ArrowUpDown,
  Calendar,
  Layers,
  Database,
} from "lucide-react";
import {
  uploadMediaAction,
  updateMediaMetadataAction,
  deleteMediaAction,
  getMediaUsageAction,
  syncMediaCatalogAction,
} from "./media-actions";
import { AssetUsageResult } from "@/lib/media/media-service";

export interface MediaAssetDTO {
  id: string;
  url: string;
  fileName: string;
  originalFilename: string;
  title: string | null;
  altText: string | null;
  caption: string | null;
  description: string | null;
  mediaType: "IMAGE" | "VIDEO";
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  uploadedBy: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface MediaLibraryViewProps {
  initialAssets: MediaAssetDTO[];
  total: number;
  currentPage: number;
  totalPages: number;
  stats: {
    totalCount: number;
    imageCount: number;
    videoCount: number;
    totalSizeBytes: number;
  };
}

export function MediaLibraryView({
  initialAssets,
  total,
  currentPage,
  totalPages,
  stats,
}: MediaLibraryViewProps) {
  const [assets, setAssets] = useState<MediaAssetDTO[]>(initialAssets);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"ALL" | "IMAGE" | "VIDEO">("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "filename" | "size_desc">("newest");

  // Selection & Details Drawer
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetDTO | null>(null);
  const [usageData, setUsageData] = useState<AssetUsageResult | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Edit metadata form in drawer
  const [editTitle, setEditTitle] = useState("");
  const [editAltText, setEditAltText] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  // Deletion state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  // Upload States
  const [isUploading, startUploadTransition] = useTransition();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Sync state
  const [isSyncing, startSyncTransition] = useTransition();

  // Quick helper to format bytes
  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Handle asset drawer open
  async function openAssetDetails(asset: MediaAssetDTO) {
    setSelectedAsset(asset);
    setEditTitle(asset.title || "");
    setEditAltText(asset.altText || "");
    setEditCaption(asset.caption || "");
    setEditDescription(asset.description || "");
    setSaveSuccess(false);
    setSaveError(null);
    setDeleteError(null);

    // Fetch live usage
    setLoadingUsage(true);
    try {
      const res = await getMediaUsageAction(asset.url);
      if (res.success && res.data) {
        setUsageData(res.data);
      } else {
        setUsageData(null);
      }
    } catch {
      setUsageData(null);
    } finally {
      setLoadingUsage(false);
    }
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  }

  // Handle Save Metadata
  function handleSaveMetadata(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAsset) return;

    setSaveError(null);
    setSaveSuccess(false);

    startSaveTransition(async () => {
      const res = await updateMediaMetadataAction(selectedAsset.id, {
        title: editTitle,
        altText: editAltText,
        caption: editCaption,
        description: editDescription,
      });

      if (res.success) {
        setSaveSuccess(true);
        // update local list
        setAssets((prev) =>
          prev.map((a) =>
            a.id === selectedAsset.id
              ? {
                  ...a,
                  title: editTitle,
                  altText: editAltText,
                  caption: editCaption,
                  description: editDescription,
                }
              : a
          )
        );
        setSelectedAsset((prev) =>
          prev
            ? {
                ...prev,
                title: editTitle,
                altText: editAltText,
                caption: editCaption,
                description: editDescription,
              }
            : null
        );
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(res.error || "Failed to update metadata");
      }
    });
  }

  // Handle Delete Asset
  function confirmDelete() {
    if (!selectedAsset) return;
    setDeleteError(null);

    startDeleteTransition(async () => {
      const res = await deleteMediaAction(selectedAsset.id);
      if (res.success) {
        setAssets((prev) => prev.filter((a) => a.id !== selectedAsset.id));
        setDeleteModalOpen(false);
        setSelectedAsset(null);
      } else {
        setDeleteError(res.error || "Failed to delete asset");
      }
    });
  }

  // Handle File Upload
  async function handleFilesUpload(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploadFeedback(null);
    startUploadTransition(async () => {
      let successCount = 0;
      let lastError: string | null = null;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));

        const fd = new FormData();
        fd.append("file", file);

        const res = await uploadMediaAction(fd);
        if (res.success) {
          successCount++;
        } else {
          lastError = res.error || "Upload failed";
        }
      }

      setUploadProgress(null);
      if (successCount > 0) {
        setUploadFeedback({
          type: "success",
          text: `Successfully uploaded ${successCount} file(s). Reloading gallery...`,
        });
        window.location.reload();
      } else if (lastError) {
        setUploadFeedback({
          type: "error",
          text: lastError,
        });
      }
    });
  }

  // Filter & Sort Logic Client-side for instantaneous responsiveness
  const filteredAssets = assets
    .filter((a) => {
      if (mediaTypeFilter !== "ALL" && a.mediaType !== mediaTypeFilter) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesName = a.fileName.toLowerCase().includes(q);
        const matchesOriginal = a.originalFilename.toLowerCase().includes(q);
        const matchesTitle = (a.title || "").toLowerCase().includes(q);
        const matchesAlt = (a.altText || "").toLowerCase().includes(q);
        const matchesCaption = (a.caption || "").toLowerCase().includes(q);
        if (!matchesName && !matchesOriginal && !matchesTitle && !matchesAlt && !matchesCaption) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "filename") {
        return a.fileName.localeCompare(b.fileName);
      }
      if (sortBy === "size_desc") {
        return b.fileSize - a.fileSize;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-6">
      {/* Header & Quick Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white">Media & Asset Library</h1>
            <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
              Phase 7 Complete
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Centralized hub to upload, inspect, organize, and reuse images and videos across DevStay properties and CMS.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              startSyncTransition(async () => {
                const res = await syncMediaCatalogAction();
                if (res.success) {
                  window.location.reload();
                }
              });
            }}
            disabled={isSyncing}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            title="Scan database and public folder for untracked assets"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-[#D4AF37]" : ""}`} />
            Sync Asset Catalog
          </button>

          <label
            htmlFor="direct-media-upload-input"
            className="cursor-pointer px-5 py-2.5 text-xs font-bold text-slate-950 bg-[#D4AF37] hover:bg-[#e0be4a] rounded-xl transition flex items-center gap-2 shadow-lg hover:shadow-[#D4AF37]/20 active:scale-95"
          >
            <Upload className="w-4 h-4" />
            Upload Media
          </label>
          <input
            id="direct-media-upload-input"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
            onChange={(e) => e.target.files && handleFilesUpload(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {/* Metrics Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Assets</p>
            <p className="text-xl font-bold text-white">{stats.totalCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Images</p>
            <p className="text-xl font-bold text-white">{stats.imageCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Videos</p>
            <p className="text-xl font-bold text-white">{stats.videoCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Size</p>
            <p className="text-xl font-bold text-white">{formatBytes(stats.totalSizeBytes)}</p>
          </div>
        </div>
      </div>

      {/* Drag & Drop Upload Banner */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files) {
            handleFilesUpload(e.dataTransfer.files);
          }
        }}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition ${
          dragActive
            ? "border-[#D4AF37] bg-[#D4AF37]/5"
            : "border-slate-800 hover:border-slate-700 bg-slate-900/30"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-[#D4AF37] flex items-center justify-center shrink-0">
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold text-white">
              {isUploading
                ? `Uploading assets... ${uploadProgress ? `${uploadProgress}%` : ""}`
                : "Drag & drop high-resolution images or videos here"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Supports JPEG, PNG, WebP, AVIF, MP4, WebM up to 8 MB per file. Persistent volume storage backed.
            </p>
          </div>
        </div>

        {uploadFeedback && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs font-medium inline-flex items-center gap-2 ${
              uploadFeedback.type === "success"
                ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800"
                : "bg-rose-950/60 text-rose-300 border border-rose-800"
            }`}
          >
            {uploadFeedback.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{uploadFeedback.text}</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, filename, or alt text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-950/80 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters & Sorters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Media Type Toggle */}
          <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setMediaTypeFilter("ALL")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                mediaTypeFilter === "ALL"
                  ? "bg-[#D4AF37] text-slate-950 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All ({assets.length})
            </button>
            <button
              onClick={() => setMediaTypeFilter("IMAGE")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                mediaTypeFilter === "IMAGE"
                  ? "bg-[#D4AF37] text-slate-950 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Images ({stats.imageCount})
            </button>
            <button
              onClick={() => setMediaTypeFilter("VIDEO")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                mediaTypeFilter === "VIDEO"
                  ? "bg-[#D4AF37] text-slate-950 font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Videos ({stats.videoCount})
            </button>
          </div>

          {/* Sort By Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="filename">Filename (A-Z)</option>
              <option value="size_desc">File Size (Largest)</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              aria-label="Grid View"
              className={`p-1.5 rounded-md transition ${
                viewMode === "grid"
                  ? "bg-slate-800 text-[#D4AF37]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              aria-label="List View"
              className={`p-1.5 rounded-md transition ${
                viewMode === "list"
                  ? "bg-slate-800 text-[#D4AF37]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Assets Presentation */}
      {filteredAssets.length === 0 ? (
        <div className="p-16 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
          <ImageIcon className="w-14 h-14 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No media assets match your query</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Try clearing filters or search terms, or drag and drop new files into the upload zone above.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredAssets.map((asset) => {
            const isVideo = asset.mediaType === "VIDEO";
            const isSelected = selectedAsset?.id === asset.id;

            return (
              <div
                key={asset.id}
                onClick={() => openAssetDetails(asset)}
                className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/50 bg-slate-800"
                    : "border-slate-800 hover:border-slate-600 bg-slate-900/60"
                }`}
              >
                {/* Visual Thumbnail */}
                <div className="relative aspect-square bg-black/40 overflow-hidden flex items-center justify-center">
                  {isVideo ? (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Film className="w-10 h-10 text-[#D4AF37] mb-1" />
                      <span className="text-[10px] uppercase font-mono tracking-wider">Video</span>
                    </div>
                  ) : (
                    <img
                      src={asset.url}
                      alt={asset.altText || asset.title || asset.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-slate-300 font-mono">
                    {isVideo ? "MP4" : asset.mimeType.replace("image/", "").toUpperCase()}
                  </div>

                  {/* Hover Overlay with Copy */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(asset.url);
                      }}
                      title="Copy Public URL"
                      className="p-2 rounded-lg bg-slate-800/90 text-white hover:text-[#D4AF37] transition"
                    >
                      {copiedUrl === asset.url ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAssetDetails(asset);
                      }}
                      title="View Details & Usage"
                      className="p-2 rounded-lg bg-slate-800/90 text-white hover:text-[#D4AF37] transition"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Information Footer */}
                <div className="p-3">
                  <p className="text-xs font-semibold text-slate-200 truncate" title={asset.title || asset.fileName}>
                    {asset.title || asset.fileName}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                    <span>{formatBytes(asset.fileSize)}</span>
                    {asset.width && asset.height && (
                      <span>
                        {asset.width}×{asset.height}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Preview</th>
                  <th className="py-3 px-4">Title / Filename</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Dimensions</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredAssets.map((asset) => {
                  const isVideo = asset.mediaType === "VIDEO";
                  const isSelected = selectedAsset?.id === asset.id;

                  return (
                    <tr
                      key={asset.id}
                      onClick={() => openAssetDetails(asset)}
                      className={`cursor-pointer transition hover:bg-slate-800/50 ${
                        isSelected ? "bg-slate-800/70" : ""
                      }`}
                    >
                      <td className="py-3 px-4 w-16">
                        <div className="w-12 h-10 rounded-lg bg-black/40 overflow-hidden flex items-center justify-center">
                          {isVideo ? (
                            <Film className="w-5 h-5 text-[#D4AF37]" />
                          ) : (
                            <img
                              src={asset.url}
                              alt={asset.altText || asset.title || asset.fileName}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-white truncate max-w-xs">{asset.title || asset.fileName}</p>
                        <p className="text-[11px] text-slate-500 font-mono truncate max-w-xs">{asset.fileName}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          {asset.mimeType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {asset.width && asset.height ? `${asset.width} × ${asset.height} px` : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{formatBytes(asset.fileSize)}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(asset.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleCopy(asset.url)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Copy Public URL"
                          >
                            {copiedUrl === asset.url ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => openAssetDetails(asset)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Inspect Details"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ASSET DETAILS DRAWER / SLIDE-OVER */}
      {selectedAsset && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#0c1322] border-l border-slate-800 shadow-2xl flex flex-col animate-slideLeft">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0B132B]">
            <div>
              <h3 className="text-lg font-bold text-white">Asset Details & Usage</h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-sm">{selectedAsset.fileName}</p>
            </div>
            <button
              onClick={() => setSelectedAsset(null)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Visual Preview */}
            <div className="rounded-xl overflow-hidden bg-black/60 border border-slate-800 flex items-center justify-center p-2 min-h-[220px]">
              {selectedAsset.mediaType === "VIDEO" ? (
                <video
                  src={selectedAsset.url}
                  controls
                  className="max-h-56 w-auto rounded-lg shadow-md"
                />
              ) : (
                <img
                  src={selectedAsset.url}
                  alt={selectedAsset.altText || selectedAsset.title || selectedAsset.fileName}
                  className="max-h-56 w-auto object-contain rounded-lg shadow-md"
                />
              )}
            </div>

            {/* Quick URL Copy Bar */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <input
                type="text"
                readOnly
                value={selectedAsset.url}
                className="flex-1 bg-transparent text-xs font-mono text-slate-300 focus:outline-none"
              />
              <button
                onClick={() => handleCopy(selectedAsset.url)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1.5"
              >
                {copiedUrl === selectedAsset.url ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy URL</span>
                  </>
                )}
              </button>
            </div>

            {/* Technical Metadata Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Technical Metadata</h4>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Media Type</span>
                  <span className="font-semibold text-white uppercase">{selectedAsset.mediaType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">MIME Type</span>
                  <span className="font-mono text-slate-300">{selectedAsset.mimeType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">File Size</span>
                  <span className="font-mono text-slate-300">{formatBytes(selectedAsset.fileSize)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Dimensions</span>
                  <span className="font-mono text-slate-300">
                    {selectedAsset.width && selectedAsset.height
                      ? `${selectedAsset.width} × ${selectedAsset.height} px`
                      : "Not available"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Uploaded On</span>
                  <span className="text-slate-300">{new Date(selectedAsset.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Uploaded By</span>
                  <span className="text-slate-300">{selectedAsset.uploadedBy || "Staff Administrator"}</span>
                </div>
              </div>
            </div>

            {/* Live Usage Inspector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Website References & Usage</h4>
                {loadingUsage && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />}
              </div>

              {loadingUsage ? (
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 text-center text-xs text-slate-500">
                  Scanning property models and website content sections...
                </div>
              ) : usageData && usageData.inUse ? (
                <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>In Active Use ({usageData.totalReferences} reference{usageData.totalReferences > 1 ? "s" : ""})</span>
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    This asset is actively referenced on the website. Deletion is safely locked until references are updated.
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {usageData.references.map((ref, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-950/60 border border-slate-800 text-[11px] flex flex-col"
                      >
                        <span className="font-semibold text-slate-200">
                          {ref.type}: <span className="text-[#D4AF37]">{ref.title}</span>
                        </span>
                        <span className="text-slate-400 text-[10px] mt-0.5">{ref.location}</span>
                        {ref.details && <span className="text-slate-500 text-[10px]">{ref.details}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Unused Asset — Not currently referenced in any property or CMS section. Safe to delete.</span>
                </div>
              )}
            </div>

            {/* Editable Metadata Form */}
            <form onSubmit={handleSaveMetadata} className="space-y-4 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Edit Asset Metadata</h4>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Display Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Mountain View Villa Master Bedroom"
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Alt Text (SEO & Accessibility)
                </label>
                <input
                  type="text"
                  value={editAltText}
                  onChange={(e) => setEditAltText(e.target.value)}
                  placeholder="Descriptive text for search engine crawlers..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Caption</label>
                <input
                  type="text"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="Optional display caption shown on image galleries..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Internal Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Internal notes, location tags, or photographer credits..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {saveSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Metadata saved successfully.</span>
                </div>
              )}

              {saveError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 rounded-lg transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Asset
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-[#D4AF37] hover:bg-[#e0be4a] disabled:opacity-50 rounded-lg transition flex items-center gap-2 shadow-md"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Metadata
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAFE DELETION CONFIRMATION MODAL */}
      {deleteModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0c1322] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-800 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Media Asset</h3>
                <p className="text-xs text-slate-400 font-mono truncate max-w-xs">{selectedAsset.fileName}</p>
              </div>
            </div>

            {usageData?.inUse ? (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800 space-y-2 text-xs text-rose-200">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Deletion Safeguard Triggered</span>
                </div>
                <p>
                  This media asset is currently referenced in <strong>{usageData.totalReferences} place(s)</strong> across
                  DevStay properties or website content.
                </p>
                <p className="text-rose-300/80">
                  To protect website integrity, please reassign or remove the asset from those locations before deleting.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-300">
                Are you sure you want to permanently delete this media asset? This action will remove the physical storage
                file and purge the database record. This action cannot be undone.
              </p>
            )}

            {deleteError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(usageData?.inUse) || isDeleting}
                onClick={confirmDelete}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition flex items-center gap-2 shadow-lg"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {usageData?.inUse ? "Deletion Blocked" : "Confirm Permanent Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
