"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  Upload,
  Search,
  Check,
  Film,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { uploadMediaAction } from "@/app/admin/(dashboard)/media/media-actions";

export interface SelectedMedia {
  url: string;
  title?: string;
  altText?: string;
  mediaType?: "IMAGE" | "VIDEO";
  fileName?: string;
}

interface MediaAssetItem {
  id: string;
  url: string;
  fileName: string;
  originalFilename: string;
  title?: string | null;
  altText?: string | null;
  mediaType: "IMAGE" | "VIDEO";
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  createdAt: Date | string;
}

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: SelectedMedia) => void;
  initialSelectedUrl?: string | null;
  filterType?: "ALL" | "IMAGE" | "VIDEO";
  title?: string;
}

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  initialSelectedUrl,
  filterType = "ALL",
  title = "Select Media Asset",
}: MediaPickerModalProps) {
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");
  const [assets, setAssets] = useState<MediaAssetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "IMAGE" | "VIDEO">(filterType);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetItem | null>(null);

  // Upload Tab States
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAltText, setUploadAltText] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUploadTransition] = useTransition();

  // Load assets when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen, typeFilter]);

  async function fetchAssets() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/media?type=${typeFilter === "ALL" ? "" : typeFilter}&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
        if (initialSelectedUrl) {
          const match = (data.assets || []).find(
            (a: MediaAssetItem) => a.url === initialSelectedUrl
          );
          if (match) setSelectedAsset(match);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch assets for picker:", err);
    } finally {
      setLoading(false);
    }
  }

  // Trigger search on enter or when search changes with debounce
  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      fetchAssets();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  if (!isOpen) return null;

  function handleSelectCurrent() {
    if (selectedAsset) {
      onSelect({
        url: selectedAsset.url,
        title: selectedAsset.title || undefined,
        altText: selectedAsset.altText || undefined,
        mediaType: selectedAsset.mediaType,
        fileName: selectedAsset.fileName,
      });
      onClose();
    }
  }

  function handleDirectUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError("Please choose a file to upload.");
      return;
    }

    setUploadError(null);
    startUploadTransition(async () => {
      const fd = new FormData();
      fd.append("file", uploadFile);
      if (uploadTitle) fd.append("title", uploadTitle);
      if (uploadAltText) fd.append("altText", uploadAltText);

      const res = await uploadMediaAction(fd);
      if (res.success && res.data) {
        onSelect({
          url: res.data.url,
          title: uploadTitle || res.data.fileName,
          altText: uploadAltText,
          fileName: res.data.fileName,
        });
        onClose();
      } else {
        setUploadError(res.error || "Failed to upload file");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[85vh] max-h-[800px] flex flex-col bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0B132B]/60">
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select existing media or upload new high-resolution assets
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-[#0B132B]/30">
          <button
            onClick={() => setActiveTab("library")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 ${
              activeTab === "library"
                ? "border-[#D4AF37] text-[#D4AF37] bg-slate-800/50"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Media Library ({assets.length})
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 ${
              activeTab === "upload"
                ? "border-[#D4AF37] text-[#D4AF37] bg-slate-800/50"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload New Asset
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0B132B]/10">
          {activeTab === "library" ? (
            <div className="flex flex-col h-full space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by filename or title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setTypeFilter("ALL")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      typeFilter === "ALL"
                        ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]"
                        : "border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setTypeFilter("IMAGE")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      typeFilter === "IMAGE"
                        ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]"
                        : "border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    Images
                  </button>
                  <button
                    onClick={() => setTypeFilter("VIDEO")}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      typeFilter === "VIDEO"
                        ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]"
                        : "border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    Videos
                  </button>
                </div>
              </div>

              {/* Grid Content */}
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mb-2" />
                  <p className="text-sm">Loading media assets...</p>
                </div>
              ) : assets.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 text-center">
                  <ImageIcon className="w-12 h-12 text-slate-600 mb-3" />
                  <p className="text-base font-semibold text-slate-300">No media assets found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try adjusting your search criteria or switch to the Upload tab to add new files.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 overflow-y-auto max-h-[500px] pr-1">
                  {assets.map((asset) => {
                    const isSelected = selectedAsset?.id === asset.id;
                    const isVideo = asset.mediaType === "VIDEO";

                    return (
                      <div
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        onDoubleClick={() => {
                          setSelectedAsset(asset);
                          onSelect({
                            url: asset.url,
                            title: asset.title || undefined,
                            altText: asset.altText || undefined,
                            mediaType: asset.mediaType,
                            fileName: asset.fileName,
                          });
                          onClose();
                        }}
                        className={`group relative rounded-xl overflow-hidden cursor-pointer border transition-all ${
                          isSelected
                            ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/40 shadow-lg bg-slate-800"
                            : "border-slate-800 hover:border-slate-600 bg-slate-900/60"
                        }`}
                      >
                        {/* Thumbnail View */}
                        <div className="relative aspect-video bg-black/40 overflow-hidden flex items-center justify-center">
                          {isVideo ? (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                              <Film className="w-8 h-8 text-[#D4AF37] mb-1" />
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

                          {/* Selected Check Badge */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#D4AF37] text-slate-950 flex items-center justify-center shadow-md">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          )}

                          {/* Type indicator pill */}
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-slate-300 font-mono">
                            {isVideo ? "MP4/WebM" : asset.mimeType.replace("image/", "").toUpperCase()}
                          </div>
                        </div>

                        {/* Title and metadata */}
                        <div className="p-2.5">
                          <p className="text-xs font-semibold text-slate-200 truncate" title={asset.title || asset.fileName}>
                            {asset.title || asset.fileName}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                            {asset.width && asset.height ? `${asset.width}×${asset.height} • ` : ""}
                            {(asset.fileSize / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Upload New Tab */
            <form onSubmit={handleDirectUpload} className="max-w-xl mx-auto space-y-5 py-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-[#D4AF37]/60 rounded-2xl p-8 text-center bg-slate-900/40 transition">
                <input
                  type="file"
                  id="media-modal-upload"
                  accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadFile(f);
                      if (!uploadTitle) {
                        setUploadTitle(f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
                      }
                    }
                  }}
                  className="hidden"
                />
                <label
                  htmlFor="media-modal-upload"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center mb-3 group-hover:scale-110 transition">
                    <Upload className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {uploadFile ? uploadFile.name : "Click to select or drag and drop"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    JPEG, PNG, WebP, AVIF, MP4 or WebM (Max 8 MB)
                  </p>
                  {uploadFile && (
                    <span className="mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                      {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB selected
                    </span>
                  )}
                </label>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Display Title</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Master Suite Ocean View"
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Alt Text (Accessibility & SEO)
                  </label>
                  <input
                    type="text"
                    value={uploadAltText}
                    onChange={(e) => setUploadAltText(e.target.value)}
                    placeholder="Describe image for screen readers and search engines..."
                    className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("library")}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-[#D4AF37] hover:bg-[#e0be4a] disabled:opacity-50 rounded-lg transition flex items-center gap-2 shadow-lg"
                >
                  {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Upload & Select
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {activeTab === "library" && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#0B132B]/80">
            <div className="text-xs text-slate-400 truncate max-w-md">
              {selectedAsset ? (
                <span>
                  Selected: <strong className="text-white">{selectedAsset.title || selectedAsset.fileName}</strong> (
                  {selectedAsset.url})
                </span>
              ) : (
                <span>No media item selected</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedAsset}
                onClick={handleSelectCurrent}
                className="px-5 py-2 text-xs font-bold text-slate-950 bg-[#D4AF37] hover:bg-[#e0be4a] disabled:opacity-50 disabled:pointer-events-none rounded-lg transition flex items-center gap-2 shadow-lg"
              >
                <Check className="w-4 h-4" />
                Select Media
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
