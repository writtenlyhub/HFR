"use client";

import React, { useState, useTransition } from "react";
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
} from "lucide-react";
import {
  updatePropertyGeneral,
  updatePropertyPolicies,
  updateListingConfiguration,
  addPropertyAmenity,
  removePropertyAmenity,
} from "./edit-actions";
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
      isCover: boolean;
    }>;
  };
}

export function PropertyEditorTabs({ property: initialProperty }: PropertyEditorProps) {
  const [activeTab, setActiveTab] = useState<
    "general" | "configurations" | "amenities" | "policies" | "publish"
  >("general");

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
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

  // Publication state
  const [isActive, setIsActive] = useState(initialProperty.isActive);

  // Amenities state
  const [amenities, setAmenities] = useState(initialProperty.amenities);
  const [newAmenityName, setNewAmenityName] = useState("");

  // Configurations state
  const [configurations, setConfigurations] = useState(initialProperty.listingOptions);

  // Handlers
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

  const handleTogglePublish = () => {
    setFeedback(null);
    startTransition(async () => {
      const res = await togglePropertyPublish(initialProperty.id, isActive);
      if (res.success) {
        setIsActive(!isActive);
        setFeedback({ type: "success", text: res.message || "Updated status." });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to toggle status." });
      }
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
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
                isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {isActive ? "Published" : "Draft"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isActive && (
            <Link
              href={`/properties/${initialProperty.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition shadow-2xs"
            >
              <span>Live Page</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            </Link>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={handleTogglePublish}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition border shadow-xs ${
              isActive
                ? "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                : "bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
            }`}
          >
            {isActive ? "Unpublish to Draft" : "Publish Live"}
          </button>
        </div>
      </div>

      {/* Status Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between transition ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
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
            className="text-[10px] font-bold uppercase tracking-wider hover:underline"
          >
            Dismiss
          </button>
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
          <span>General &amp; Location</span>
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
          onClick={() => setActiveTab("publish")}
          className={`pb-3 px-3 border-b-2 transition flex items-center gap-2 shrink-0 ${
            activeTab === "publish"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Publication &amp; Metadata</span>
        </button>
      </div>

      {/* Tab 1: General & Location */}
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

      {/* Tab 2: Room Configurations (Hierarchical Shared Inventory) */}
      {activeTab === "configurations" && (
        <div className="space-y-6">
          {/* Shared Inventory Anchor Banner */}
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

          {/* Configuration Cards List */}
          <div className="space-y-4">
            {configurations.map((config) => (
              <div
                key={config.id}
                className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-neutral-400">
                      /properties/{initialProperty.slug}/{config.slug}
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

      {/* Tab 3: Amenities Management */}
      {activeTab === "amenities" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Manage Estate Amenities
            </h3>

            {/* Add Amenity Form */}
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

            {/* Existing Amenities Grid */}
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

      {/* Tab 4: Policies & Hours */}
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

      {/* Tab 5: Publication & Metadata */}
      {activeTab === "publish" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Visibility Status
            </h3>

            <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-200/80">
              <div className="space-y-0.5">
                <span className="font-bold text-xs text-neutral-900 block">
                  Current Status: {isActive ? "Published Live" : "Draft (Hidden)"}
                </span>
                <span className="text-xs text-neutral-500 block">
                  {isActive
                    ? "This property is visible to the public and accepting direct reservations."
                    : "This property is hidden from guests and search engines."}
                </span>
              </div>

              <button
                type="button"
                disabled={isPending}
                onClick={handleTogglePublish}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? "bg-amber-100 hover:bg-amber-200 text-amber-900"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {isActive ? "Unpublish to Draft" : "Publish Live"}
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Database Metadata &amp; System Identifiers
            </h3>

            <div className="divide-y divide-neutral-100 text-xs font-mono">
              <div className="py-2 flex justify-between">
                <span className="text-neutral-400">Database ID:</span>
                <span className="text-neutral-800">{initialProperty.id}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-neutral-400">URL Slug:</span>
                <span className="text-neutral-800">{initialProperty.slug}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-neutral-400">Physical Inventory Group:</span>
                <span className="text-neutral-800">{primaryInventoryGroup?.code || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
