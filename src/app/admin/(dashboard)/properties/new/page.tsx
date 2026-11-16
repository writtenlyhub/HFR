"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Clock,
  Layers,
  IndianRupee,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createNewProperty, CreatePropertyInput } from "../create-actions";

const POPULAR_AMENITIES = [
  "High-Speed Wi-Fi",
  "Air Conditioning (All Rooms)",
  "24/7 Hot Water",
  "Full Kitchen & Gas Stove",
  "RO Drinking Water Purifier",
  "Dedicated Gated Parking",
  "Private Garden Veranda",
  "Pet Friendly",
  "On-Site Food Ordering Menu",
  "Power Backup",
  "Daily Housekeeping",
];

export default function NewPropertyPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Jaipur");
  const [state, setState] = useState("Rajasthan");
  const [country, setCountry] = useState("India");
  const [postalCode, setPostalCode] = useState("");
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [houseRules, setHouseRules] = useState(
    "Check-in after 14:00 · Checkout before 11:00. Quiet residential lane. Pet friendly."
  );
  const [cancellationPolicy, setCancellationPolicy] = useState(
    "Full refund up to 7 days before check-in. 50% refund between 7 days and 48 hours prior to check-in."
  );
  const [isActive, setIsActive] = useState(false); // Default to DRAFT for safety

  // Initial Configuration
  const [configTitle, setConfigTitle] = useState("Whole Villa Buyout");
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(3);
  const [maxGuests, setMaxGuests] = useState(8);
  const [basePrice, setBasePrice] = useState(25000);

  // Selected Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "High-Speed Wi-Fi",
    "Air Conditioning (All Rooms)",
    "24/7 Hot Water",
    "Full Kitchen & Gas Stove",
    "RO Drinking Water Purifier",
    "Dedicated Gated Parking",
  ]);

  // Handle Name change and auto-slug
  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    setSlug(generatedSlug);
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleSubmit = (publishImmediately: boolean) => {
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter a property name.");
      return;
    }

    if (!slug.trim()) {
      setErrorMessage("Please specify a URL slug.");
      return;
    }

    if (!address.trim() || !postalCode.trim()) {
      setErrorMessage("Street address and postal code are required.");
      return;
    }

    if (basePrice <= 0) {
      setErrorMessage("Base nightly price must be greater than zero.");
      return;
    }

    const input: CreatePropertyInput = {
      name,
      slug,
      headline,
      description,
      address,
      city,
      state,
      country,
      postalCode,
      checkInTime,
      checkOutTime,
      houseRules,
      cancellationPolicy,
      isActive: publishImmediately,
      initialConfigTitle: configTitle,
      initialBedrooms: Number(bedrooms),
      initialBathrooms: Number(bathrooms),
      initialMaxGuests: Number(maxGuests),
      initialBasePrice: Number(basePrice),
      selectedAmenities,
    };

    startTransition(async () => {
      const res = await createNewProperty(input);
      if (res.success && res.propertyId) {
        router.push(`/admin/properties/${res.propertyId}`);
        router.refresh();
      } else {
        setErrorMessage(res.error || "Failed to create property.");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Header & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/properties"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Properties</span>
        </Link>

        <span className="text-[11px] font-mono font-semibold text-neutral-400">
          Step 1: Property Definition &amp; Inventory Isolation
        </span>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-extrabold tracking-tight text-neutral-900">
          Add New Estate Property
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 font-normal">
          Define a new physical property. An isolated inventory group and primary room configuration will be created automatically.
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Cards */}
      <div className="space-y-6">
        {/* Card 1: Property Identity */}
        <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
            <Building2 className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              1. Property Identity &amp; Web Presentation
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Property Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Dev Stays Heritage Villa"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                URL Slug * (Unique identifier)
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
                  placeholder="dev-stays-heritage-villa"
                  className="w-full pl-24 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Marketing Headline
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Your own private 3BHK sanctuary in Jaipur"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Detailed Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the architectural history, private spaces, courtyard, decor, and unique guest experience..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Location & Address */}
        <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
            <MapPin className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              2. Location &amp; Address
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Lane 4, Raja Park"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                City *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                State *
              </label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Postal Code *
              </label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="302004"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Isolated Physical Inventory & Primary Configuration */}
        <div className="p-6 rounded-2xl bg-amber-50/40 border border-amber-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-800" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
                3. Physical Inventory &amp; Primary Room Configuration
              </h2>
            </div>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-md border border-amber-300/50">
              Guaranteed Inventory Isolation
            </span>
          </div>

          <p className="text-xs text-neutral-600 leading-relaxed">
            This creates an independent physical inventory group (`{slug ? slug.toUpperCase() : "PROPERTY"}-ESTATE`) with 1 physical unit, ensuring it will never conflict with other DevStay estates.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Configuration Title *
              </label>
              <input
                type="text"
                required
                value={configTitle}
                onChange={(e) => setConfigTitle(e.target.value)}
                placeholder="e.g. Whole Villa Buyout"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Bedrooms
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={bedrooms}
                onChange={(e) => setBedrooms(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Bathrooms
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={bathrooms}
                onChange={(e) => setBathrooms(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Max Guests
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxGuests}
                onChange={(e) => setMaxGuests(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Base Nightly Price (INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                  ₹
                </span>
                <input
                  type="number"
                  min={1}
                  step={100}
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(Number(e.target.value))}
                  placeholder="25000"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Operating Times & Policies */}
        <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
            <Clock className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              4. Operational Hours &amp; Guest Policies
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Standard Check-In Time
              </label>
              <input
                type="text"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                placeholder="14:00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Standard Check-Out Time
              </label>
              <input
                type="text"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                placeholder="11:00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                House Rules &amp; Noise Guidelines
              </label>
              <textarea
                rows={2}
                value={houseRules}
                onChange={(e) => setHouseRules(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Card 5: Core Amenities Checklist */}
        <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
            <Sparkles className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              5. Featured Amenities
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {POPULAR_AMENITIES.map((item) => {
              const isChecked = selectedAmenities.includes(item);
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => toggleAmenity(item)}
                  className={`p-2.5 rounded-xl text-xs font-medium text-left flex items-center justify-between border transition ${
                    isChecked
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                      : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200/70"
                  }`}
                >
                  <span>{item}</span>
                  {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-neutral-500">
          Draft properties remain private. Only published properties appear on the public website.
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSubmit(false)}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-xs font-bold text-neutral-700 transition disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save as Draft"}
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSubmit(true)}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {isPending ? "Creating Property..." : "Create & Publish Live"}
          </button>
        </div>
      </div>
    </div>
  );
}
