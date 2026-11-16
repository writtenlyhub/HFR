"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  Edit,
  Eye,
  CheckCircle2,
  Layers,
  MapPin,
  AlertCircle,
  Archive,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { togglePropertyPublish } from "./actions";
import {
  archiveProperty,
  restoreProperty,
  publishPropertyWithValidation,
} from "./phase3-actions";

export interface SerializedProperty {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isActive: boolean;
  isArchived: boolean;
  archivedReason?: string | null;
  createdAt: string;
  inventoryGroupCode?: string;
  configurationsCount: number;
  startingPrice: number;
  coverImage: string;
}

export function PropertyListView({
  properties: initialProperties,
}: {
  properties: SerializedProperty[];
}) {
  const [properties, setProperties] = useState<SerializedProperty[]>(initialProperties);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PUBLISHED" | "DRAFT" | "ARCHIVED">("ALL");
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
    errors?: string[];
  } | null>(null);

  // Archival modal state
  const [archiveModalTarget, setArchiveModalTarget] = useState<SerializedProperty | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const handlePublishWithValidation = (propertyId: string) => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await publishPropertyWithValidation(propertyId);
      if (res.success) {
        setProperties((prev) =>
          prev.map((p) =>
            p.id === propertyId ? { ...p, isActive: true, isArchived: false } : p
          )
        );
        setStatusMessage({ type: "success", text: res.message || "Published live." });
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Cannot publish property.",
          errors: res.errors,
        });
      }
    });
  };

  const handleUnpublishToDraft = (propertyId: string) => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await togglePropertyPublish(propertyId, true);
      if (res.success) {
        setProperties((prev) =>
          prev.map((p) =>
            p.id === propertyId ? { ...p, isActive: false } : p
          )
        );
        setStatusMessage({ type: "success", text: res.message || "Moved to Draft." });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to unpublish." });
      }
    });
  };

  const handleConfirmArchive = () => {
    if (!archiveModalTarget) return;
    setStatusMessage(null);
    const targetId = archiveModalTarget.id;

    startTransition(async () => {
      const res = await archiveProperty(targetId, archiveReason);
      setArchiveModalTarget(null);
      setArchiveReason("");

      if (res.success) {
        setProperties((prev) =>
          prev.map((p) =>
            p.id === targetId ? { ...p, isArchived: true, isActive: false } : p
          )
        );
        setStatusMessage({ type: "success", text: res.message || "Archived." });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Cannot archive property." });
      }
    });
  };

  const handleRestore = (propertyId: string) => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await restoreProperty(propertyId);
      if (res.success) {
        setProperties((prev) =>
          prev.map((p) =>
            p.id === propertyId ? { ...p, isArchived: false, isActive: false } : p
          )
        );
        setStatusMessage({ type: "success", text: res.message || "Restored as Draft." });
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to restore." });
      }
    });
  };

  const publishedCount = properties.filter((p) => !p.isArchived && p.isActive).length;
  const draftCount = properties.filter((p) => !p.isArchived && !p.isActive).length;
  const archivedCount = properties.filter((p) => p.isArchived).length;

  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === "PUBLISHED") return !p.isArchived && p.isActive;
    if (filterStatus === "DRAFT") return !p.isArchived && !p.isActive;
    if (filterStatus === "ARCHIVED") return p.isArchived;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-extrabold tracking-tight text-neutral-900">
            Property Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-normal">
            Manage your estate properties, room configurations, SEO metadata, and publication status.
          </p>
        </div>

        <Link
          href="/admin/properties/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition shadow-xs hover:shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Property</span>
        </Link>
      </div>

      {/* Alert Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs space-y-2 transition ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-[11px] font-bold uppercase tracking-wider hover:underline"
            >
              Dismiss
            </button>
          </div>

          {statusMessage.errors && statusMessage.errors.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-red-700 text-xs font-medium pt-1">
              {statusMessage.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, city, or slug..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterStatus("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
              filterStatus === "ALL"
                ? "bg-white text-neutral-900 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            All ({properties.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("PUBLISHED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
              filterStatus === "PUBLISHED"
                ? "bg-white text-neutral-900 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Active ({publishedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("DRAFT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
              filterStatus === "DRAFT"
                ? "bg-white text-neutral-900 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Drafts ({draftCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("ARCHIVED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
              filterStatus === "ARCHIVED"
                ? "bg-white text-neutral-900 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Archived ({archivedCount})
          </button>
        </div>
      </div>

      {/* Property Cards / Grid */}
      {filteredProperties.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200/80 p-8 space-y-4">
          <Building2 className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-base font-bold text-neutral-900">
            No properties found
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {searchTerm || filterStatus !== "ALL"
              ? "Try adjusting your search query or filter selection."
              : "Get started by adding your first estate property."}
          </p>
          <Link
            href="/admin/properties/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-black transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Property</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((prop) => (
            <div
              key={prop.id}
              className={`group rounded-2xl bg-white border shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between ${
                prop.isArchived
                  ? "border-neutral-300/60 opacity-80 bg-neutral-50/50"
                  : "border-neutral-200/80 hover:border-neutral-300"
              }`}
            >
              <div>
                {/* Image & Badges Container */}
                <div className="relative aspect-16/10 bg-neutral-100 overflow-hidden">
                  <img
                    src={prop.coverImage}
                    alt={prop.name}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      prop.isArchived ? "grayscale-30" : "group-hover:scale-102"
                    }`}
                  />
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs border ${
                        prop.isArchived
                          ? "bg-neutral-900/80 text-neutral-300 border-neutral-600/40"
                          : prop.isActive
                          ? "bg-emerald-900/80 text-emerald-200 border-emerald-500/30"
                          : "bg-amber-900/80 text-amber-200 border-amber-500/30"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          prop.isArchived
                            ? "bg-neutral-400"
                            : prop.isActive
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                        }`}
                      />
                      <span>
                        {prop.isArchived
                          ? "Archived"
                          : prop.isActive
                          ? "Published"
                          : "Draft"}
                      </span>
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono backdrop-blur-md">
                      {prop.inventoryGroupCode || "ESTATE"}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-bold text-base text-neutral-900 line-clamp-1">
                      {prop.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="line-clamp-1">
                        {prop.address}, {prop.city}
                      </span>
                    </div>
                  </div>

                  {prop.headline && (
                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                      {prop.headline}
                    </p>
                  )}

                  {/* Metadata Pills */}
                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{prop.configurationsCount} Configurations</span>
                    </div>

                    <div className="font-bold text-neutral-900">
                      from ₹{prop.startingPrice.toLocaleString("en-IN")}/nt
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between gap-2">
                {prop.isArchived ? (
                  /* Archived State: Restore Button */
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRestore(prop.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-100 text-xs font-semibold text-neutral-800 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Restore Property</span>
                  </button>
                ) : (
                  /* Active/Draft State: Publish or Unpublish */
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      prop.isActive
                        ? handleUnpublishToDraft(prop.id)
                        : handlePublishWithValidation(prop.id)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                      prop.isActive
                        ? "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                    }`}
                  >
                    {prop.isActive ? "Unpublish to Draft" : "Publish Live"}
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  {/* Preview / Live Link */}
                  {!prop.isArchived && (
                    <Link
                      href={`/properties/${prop.slug}`}
                      target="_blank"
                      className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-white border border-transparent hover:border-neutral-200 transition"
                      title={prop.isActive ? "View live on website" : "Preview draft property"}
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  )}

                  {/* Archive trigger */}
                  {!prop.isArchived && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setArchiveModalTarget(prop)}
                      className="p-2 rounded-lg text-neutral-400 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100 transition"
                      title="Safely archive property"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}

                  {/* Manage / Edit */}
                  <Link
                    href={`/admin/properties/${prop.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-black text-white text-xs font-semibold transition shadow-2xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Manage</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Safety Archival Confirmation Modal */}
      {archiveModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 bg-white rounded-3xl border border-neutral-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  Archive Property
                </h3>
                <p className="text-xs text-neutral-500">
                  {archiveModalTarget.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              Archiving this property hides it from all public routes and disables future booking creation. 
              <strong> Historical bookings and inventory data will be permanently preserved.</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Archival Reason (Optional)
              </label>
              <input
                type="text"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                placeholder="e.g. Seasonal renovation or property decommissioning..."
                className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setArchiveModalTarget(null);
                  setArchiveReason("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmArchive}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
              >
                {isPending ? "Checking & Archiving..." : "Confirm Archival"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
