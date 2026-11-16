"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Sparkles,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Plus,
  ChevronLeft,
  ChevronRight,
  Tag,
  Building2,
  Layers,
  ArrowRight,
  RefreshCw,
  Info,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import {
  updateListingPricingSettings,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  togglePricingRule,
  quickDateOverride,
  previewPricingCalculation,
  ActionResult,
} from "./pricing-actions";
import { NightlyRateDetail, ReservationPricingCalculation } from "@/lib/pricing/pricing-engine";

export interface SerializedListingOption {
  id: string;
  propertyId: string;
  slug: string;
  title: string;
  maxGuests: number;
  bedroomCount: number;
  bathroomCount: number;
  basePricePerNight: number;
  weekendPricePerNight: number | null;
  cleaningFee: number;
  taxPercentage: number;
  minStayNights: number;
  extraGuestCharge: number;
  standardGuests: number | null;
}

export interface SerializedProperty {
  id: string;
  name: string;
  slug: string;
  listingOptions: SerializedListingOption[];
}

export interface SerializedPricingRule {
  id: string;
  propertyId: string;
  listingOptionId: string | null;
  name: string;
  ruleType: string;
  description: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  pricePerNight: number | null;
  multiplier: number | null;
  minStayNights: number;
  isActive: boolean;
  createdAt: string;
}

interface PricingDashboardViewProps {
  properties: SerializedProperty[];
  initialRules: SerializedPricingRule[];
  initialCalendarPricing: NightlyRateDetail[];
  currentYear: number;
  currentMonth: number;
}

export function PricingDashboardView({
  properties,
  initialRules,
  initialCalendarPricing,
  currentYear: defaultYear,
  currentMonth: defaultMonth,
}: PricingDashboardViewProps) {
  // Navigation & Filter State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    properties[0]?.id || ""
  );

  const currentProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) || properties[0],
    [properties, selectedPropertyId]
  );

  const [selectedOptionId, setSelectedOptionId] = useState<string>(
    currentProperty?.listingOptions[0]?.id || ""
  );

  const currentOption = useMemo(
    () =>
      currentProperty?.listingOptions.find((o) => o.id === selectedOptionId) ||
      currentProperty?.listingOptions[0],
    [currentProperty, selectedOptionId]
  );

  // Active view tab: "calendar" | "rules" | "settings" | "calculator"
  const [activeTab, setActiveTab] = useState<"calendar" | "rules" | "settings" | "calculator">(
    "calendar"
  );

  // Calendar navigation state
  const [calendarYear, setCalendarYear] = useState<number>(defaultYear);
  const [calendarMonth, setCalendarMonth] = useState<number>(defaultMonth); // 1..12
  const [calendarPricing, setCalendarPricing] = useState<NightlyRateDetail[]>(
    initialCalendarPricing
  );

  // Rules list state
  const [rules, setRules] = useState<SerializedPricingRule[]>(initialRules);

  // Status / Feedback messages
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  // -------------------------------------------------------------
  // Modals & Drawers State
  // -------------------------------------------------------------
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<SerializedPricingRule | null>(null);

  // Quick Override State
  const [overrideDate, setOverrideDate] = useState<string>("");
  const [overridePrice, setOverridePrice] = useState<number>(
    currentOption ? currentOption.basePricePerNight : 8500
  );
  const [overrideLabel, setOverrideLabel] = useState<string>("");
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);

  // Calculator State
  const [calcCheckIn, setCalcCheckIn] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [calcCheckOut, setCalcCheckOut] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split("T")[0];
  });
  const [calcGuestCount, setCalcGuestCount] = useState<number>(2);
  const [calcResult, setCalcResult] = useState<ReservationPricingCalculation | null>(null);

  // Base Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    basePricePerNight: currentOption?.basePricePerNight || 8500,
    weekendPricePerNight: currentOption?.weekendPricePerNight || 9500,
    cleaningFee: currentOption?.cleaningFee || 500,
    taxPercentage: currentOption?.taxPercentage || 12,
    minStayNights: currentOption?.minStayNights || 1,
    extraGuestCharge: currentOption?.extraGuestCharge || 1500,
    standardGuests: currentOption?.standardGuests || 2,
  });

  // Keep settings form in sync when changing selected room
  const handleOptionChange = (optionId: string) => {
    setSelectedOptionId(optionId);
    const opt = currentProperty?.listingOptions.find((o) => o.id === optionId);
    if (opt) {
      setSettingsForm({
        basePricePerNight: opt.basePricePerNight,
        weekendPricePerNight: opt.weekendPricePerNight || opt.basePricePerNight,
        cleaningFee: opt.cleaningFee,
        taxPercentage: opt.taxPercentage,
        minStayNights: opt.minStayNights,
        extraGuestCharge: opt.extraGuestCharge,
        standardGuests: opt.standardGuests || opt.bedroomCount * 2,
      });
      // Refresh calendar for the newly selected option
      refreshCalendar(calendarYear, calendarMonth, currentProperty.id, opt.id);
    }
  };

  // Month navigation
  const navigateMonth = (direction: "prev" | "next") => {
    let newMonth = direction === "prev" ? calendarMonth - 1 : calendarMonth + 1;
    let newYear = calendarYear;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    setCalendarYear(newYear);
    setCalendarMonth(newMonth);
    if (currentProperty && currentOption) {
      refreshCalendar(newYear, newMonth, currentProperty.id, currentOption.id);
    }
  };

  const refreshCalendar = async (
    year: number,
    month: number,
    propertyId: string,
    optionId: string
  ) => {
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/pricing/calendar?propertyId=${propertyId}&listingOptionId=${optionId}&year=${year}&month=${month}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.data) setCalendarPricing(json.data);
        }
      } catch {
        // Fallback calculation preview
      }
    });
  };

  // Run live price preview calculation
  const runPricePreview = async () => {
    if (!currentProperty || !currentOption) return;
    startTransition(async () => {
      const res = await previewPricingCalculation({
        propertyId: currentProperty.id,
        listingOptionId: currentOption.id,
        checkInDate: calcCheckIn,
        checkOutDate: calcCheckOut,
        guestCount: calcGuestCount,
      });
      if (res.success && res.data) {
        setCalcResult(res.data);
      } else {
        setStatusMessage({ type: "error", text: res.error || "Calculation failed." });
      }
    });
  };

  // Save Base & Weekend Settings
  const handleSaveSettings = () => {
    if (!currentOption) return;
    setStatusMessage(null);

    startTransition(async () => {
      const res = await updateListingPricingSettings({
        listingOptionId: currentOption.id,
        basePricePerNight: Number(settingsForm.basePricePerNight),
        weekendPricePerNight: Number(settingsForm.weekendPricePerNight) || null,
        cleaningFee: Number(settingsForm.cleaningFee),
        taxPercentage: Number(settingsForm.taxPercentage),
        minStayNights: Number(settingsForm.minStayNights),
        extraGuestCharge: Number(settingsForm.extraGuestCharge),
        standardGuests: Number(settingsForm.standardGuests) || null,
      });

      if (res.success) {
        setStatusMessage({ type: "success", text: res.message || "Settings updated." });
        if (currentProperty && currentOption) {
          refreshCalendar(calendarYear, calendarMonth, currentProperty.id, currentOption.id);
        }
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to save settings." });
      }
    });
  };

  // Rule Deletion
  const handleDeleteRule = (ruleId: string, ruleName: string) => {
    if (!confirm(`Are you sure you want to permanently delete rule "${ruleName}"?`)) return;
    startTransition(async () => {
      const res = await deletePricingRule(ruleId);
      if (res.success) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
        setStatusMessage({ type: "success", text: `Deleted "${ruleName}".` });
        if (currentProperty && currentOption) {
          refreshCalendar(calendarYear, calendarMonth, currentProperty.id, currentOption.id);
        }
      } else {
        setStatusMessage({ type: "error", text: res.error || "Delete failed." });
      }
    });
  };

  // Rule Active Toggle
  const handleToggleRule = (ruleId: string, currentActive: boolean) => {
    startTransition(async () => {
      const res = await togglePricingRule(ruleId, currentActive);
      if (res.success) {
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, isActive: !currentActive } : r))
        );
        if (currentProperty && currentOption) {
          refreshCalendar(calendarYear, calendarMonth, currentProperty.id, currentOption.id);
        }
      }
    });
  };

  // Open Quick Date Override Modal
  const handleDateClick = (detail: NightlyRateDetail) => {
    setOverrideDate(detail.date);
    setOverridePrice(detail.appliedRate);
    setOverrideLabel(`Override for ${detail.date}`);
    setShowOverrideModal(true);
  };

  // Save Quick Date Override
  const handleSaveQuickOverride = () => {
    if (!currentProperty || !currentOption) return;
    startTransition(async () => {
      const res = await quickDateOverride({
        propertyId: currentProperty.id,
        listingOptionId: currentOption.id,
        startDate: overrideDate,
        endDate: overrideDate,
        pricePerNight: Number(overridePrice),
        label: overrideLabel || `Date Override ${overrideDate}`,
        minStayNights: 1,
      });

      if (res.success) {
        setStatusMessage({ type: "success", text: res.message || "Override saved." });
        setShowOverrideModal(false);
        refreshCalendar(calendarYear, calendarMonth, currentProperty.id, currentOption.id);
      } else {
        setStatusMessage({ type: "error", text: res.error || "Override failed." });
      }
    });
  };

  // Calendar month title
  const monthName = new Date(Date.UTC(calendarYear, calendarMonth - 1, 1)).toLocaleString(
    "en-IN",
    { month: "long", year: "numeric", timeZone: "UTC" }
  );

  // Days in month calculation for the grid
  const daysInMonth = new Date(Date.UTC(calendarYear, calendarMonth, 0)).getUTCDate();
  const firstDayOffset = new Date(Date.UTC(calendarYear, calendarMonth - 1, 1)).getUTCDay();

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header & Property / Configuration Selector */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold tracking-wider uppercase mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              <span>DYNAMIC PRICING & RATE CONTROL</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-neutral-900 tracking-tight">
              Hospitality Rate Management
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Configure base prices, Friday/Saturday weekend rates, seasonal multipliers, and holiday premiums with atomic booking snapshot protection.
            </p>
          </div>

          {/* Property Selector */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Building2 className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedPropertyId}
                onChange={(e) => {
                  setSelectedPropertyId(e.target.value);
                  const p = properties.find((prop) => prop.id === e.target.value);
                  if (p && p.listingOptions[0]) {
                    handleOptionChange(p.listingOptions[0].id);
                  }
                }}
                className="pl-9 pr-8 py-2 rounded-xl border border-neutral-300 bg-white text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Room / Configuration Pills */}
        <div className="mt-6 pt-5 border-t border-stone-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mr-1">
              Configuration:
            </span>
            {currentProperty?.listingOptions.map((opt) => {
              const isSelected = opt.id === selectedOptionId;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleOptionChange(opt.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    isSelected
                      ? "bg-neutral-900 text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  <span>{opt.title}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                      isSelected
                        ? "bg-neutral-800 text-amber-300"
                        : "bg-white text-neutral-500 border border-neutral-200"
                    }`}
                  >
                    ₹{opt.basePricePerNight.toLocaleString("en-IN")}/nt
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingRule(null);
                setShowRuleModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Seasonal Rule</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Notification / Alert Banner */}
      {/* ------------------------------------------------------------- */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between animate-in fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. Live Stats Ribbon */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 p-3.5">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Standard Base
          </p>
          <p className="text-lg font-serif font-extrabold text-neutral-900 mt-0.5">
            ₹{currentOption?.basePricePerNight.toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-neutral-500">Per night Sunday–Thursday</p>
        </div>

        <div className="bg-white rounded-xl border border-indigo-200 bg-indigo-50/20 p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
              Weekend Rate
            </p>
            <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded">
              Fri & Sat
            </span>
          </div>
          <p className="text-lg font-serif font-extrabold text-indigo-950 mt-0.5">
            ₹
            {Number(
              currentOption?.weekendPricePerNight || currentOption?.basePricePerNight || 0
            ).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-indigo-600">Configured weekend premium</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-3.5">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Cleaning Fee
          </p>
          <p className="text-lg font-serif font-extrabold text-neutral-900 mt-0.5">
            ₹{Number(currentOption?.cleaningFee || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-neutral-500">Per stay fixed fee</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-3.5">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Applicable Tax
          </p>
          <p className="text-lg font-serif font-extrabold text-neutral-900 mt-0.5">
            {Number(currentOption?.taxPercentage || 12)}%
          </p>
          <p className="text-[10px] text-neutral-500">GST on taxable amount</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-3.5">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Extra Guest Fee
          </p>
          <p className="text-lg font-serif font-extrabold text-neutral-900 mt-0.5">
            ₹{Number(currentOption?.extraGuestCharge || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-[10px] text-neutral-500">
            Above {currentOption?.standardGuests || 2} guests/night
          </p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-3.5">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Minimum Stay
          </p>
          <p className="text-lg font-serif font-extrabold text-neutral-900 mt-0.5">
            {currentOption?.minStayNights || 1}{" "}
            <span className="text-xs font-normal text-neutral-500">
              {currentOption?.minStayNights === 1 ? "night" : "nights"}
            </span>
          </p>
          <p className="text-[10px] text-neutral-500">Standard length requirement</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Tab Navigation */}
      {/* ------------------------------------------------------------- */}
      <div className="flex border-b border-stone-200 gap-6">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "calendar"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Interactive Pricing Calendar</span>
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "rules"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Seasonal & Holiday Rules ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "settings"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Base & Weekend Rate Settings</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("calculator");
            runPricePreview();
          }}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === "calculator"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Price Breakdown Calculator</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. TAB: Interactive Monthly Pricing Calendar */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "calendar" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          {/* Calendar Header with Month Controls & Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateMonth("prev")}
                className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-lg font-serif font-bold text-neutral-900">{monthName}</h2>
              <button
                onClick={() => navigateMonth("next")}
                className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Rate Badges Legend */}
            <div className="flex items-center gap-3 flex-wrap text-[11px] font-semibold text-neutral-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-300" /> Base
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Weekend
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Seasonal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Holiday
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Override
              </span>
            </div>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
              <div
                key={day}
                className={`text-center text-[11px] font-bold uppercase tracking-wider py-1.5 ${
                  idx === 5 || idx === 6 ? "text-indigo-600" : "text-neutral-400"
                }`}
              >
                {day}
              </div>
            ))}

            {/* Empty Offset cells before day 1 */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-stone-50/50 rounded-xl border border-dashed border-stone-200/50" />
            ))}

            {/* Calendar Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(
                dayNum
              ).padStart(2, "0")}`;

              // Find evaluated rate for this day
              const rateDetail = calendarPricing.find((d) => d.date === dateStr);
              const appliedRate = rateDetail
                ? rateDetail.appliedRate
                : currentOption?.basePricePerNight || 8500;
              const rateType = rateDetail ? rateDetail.rateType : "BASE";
              const isWeekend = rateDetail ? rateDetail.isWeekend : false;

              // Color styles based on rate type
              const cardBg =
                rateType === "OVERRIDE"
                  ? "bg-amber-50/70 border-amber-300 hover:border-amber-400"
                  : rateType === "HOLIDAY"
                  ? "bg-purple-50/70 border-purple-300 hover:border-purple-400"
                  : rateType === "SEASONAL"
                  ? "bg-emerald-50/70 border-emerald-300 hover:border-emerald-400"
                  : isWeekend
                  ? "bg-indigo-50/40 border-indigo-200 hover:border-indigo-300"
                  : "bg-white border-stone-200 hover:border-stone-300";

              return (
                <button
                  key={dateStr}
                  onClick={() =>
                    rateDetail &&
                    handleDateClick({
                      ...rateDetail,
                      date: dateStr,
                    })
                  }
                  className={`h-24 p-2.5 rounded-xl border text-left flex flex-col justify-between transition group relative shadow-2xs ${cardBg}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold ${
                        isWeekend ? "text-indigo-900" : "text-neutral-800"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {rateDetail?.minStayNights && rateDetail.minStayNights > 1 && (
                      <span className="text-[9px] font-extrabold px-1 bg-neutral-900 text-white rounded">
                        {rateDetail.minStayNights}N min
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-xs sm:text-sm font-serif font-black text-neutral-900 tracking-tight">
                      ₹{appliedRate.toLocaleString("en-IN")}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span
                        className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wider ${
                          rateType === "OVERRIDE"
                            ? "bg-amber-200 text-amber-900"
                            : rateType === "HOLIDAY"
                            ? "bg-purple-200 text-purple-900"
                            : rateType === "SEASONAL"
                            ? "bg-emerald-200 text-emerald-900"
                            : isWeekend
                            ? "bg-indigo-100 text-indigo-800"
                            : "text-neutral-400 font-medium"
                        }`}
                      >
                        {rateType}
                      </span>
                      <span className="text-[9px] text-neutral-400 opacity-0 group-hover:opacity-100 transition">
                        Edit
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-neutral-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>
              Tip: Click any day cell in the calendar to set a direct price override for that date. Rate changes take effect immediately for future bookings and holds.
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. TAB: Seasonal & Holiday Rules List */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "rules" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-serif font-bold text-neutral-900">
                Seasonal & Promotional Pricing Rules
              </h2>
              <p className="text-xs text-neutral-500">
                Rules apply to specified date windows. When rules overlap, DevStay applies the tested precedence hierarchy: Override &gt; Holiday &gt; Seasonal &gt; Weekend &gt; Base.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingRule(null);
                setShowRuleModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Rule</span>
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-stone-200 rounded-2xl">
              <Tag className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-neutral-700">No active pricing rules yet</p>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                Create seasonal multipliers, holiday premiums, or date overrides to automatically adjust pricing during peak travel windows.
              </p>
              <button
                onClick={() => {
                  setEditingRule(null);
                  setShowRuleModal(true);
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-black transition"
              >
                Create Your First Rule
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    <th className="pb-3">Rule Name & Type</th>
                    <th className="pb-3">Target Scope</th>
                    <th className="pb-3">Date Window</th>
                    <th className="pb-3">Rate / Multiplier</th>
                    <th className="pb-3">Min Stay</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {rules.map((rule) => {
                    const ruleBadge =
                      rule.ruleType === "HOLIDAY"
                        ? "bg-purple-100 text-purple-900"
                        : rule.ruleType === "OVERRIDE"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-900";

                    const targetOptionTitle = rule.listingOptionId
                      ? currentProperty?.listingOptions.find((o) => o.id === rule.listingOptionId)?.title || "Specific Option"
                      : "Entire Property (All Configurations)";

                    return (
                      <tr key={rule.id} className="hover:bg-stone-50/50 transition">
                        <td className="py-3.5 pr-4">
                          <div className="font-bold text-neutral-900">{rule.name}</div>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${ruleBadge}`}>
                            {rule.ruleType}
                          </span>
                        </td>

                        <td className="py-3.5 pr-4 text-neutral-600">
                          <span className="font-medium">{targetOptionTitle}</span>
                        </td>

                        <td className="py-3.5 pr-4 font-mono text-[11px] text-neutral-700">
                          {rule.startDate} to {rule.endDate}
                        </td>

                        <td className="py-3.5 pr-4 font-bold text-neutral-900">
                          {rule.pricePerNight ? (
                            <span>₹{rule.pricePerNight.toLocaleString("en-IN")}/nt</span>
                          ) : rule.multiplier ? (
                            <span>{rule.multiplier}x base</span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>

                        <td className="py-3.5 pr-4 text-neutral-700">
                          {rule.minStayNights > 1 ? (
                            <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                              {rule.minStayNights} nights
                            </span>
                          ) : (
                            <span className="text-neutral-400">1 night</span>
                          )}
                        </td>

                        <td className="py-3.5 pr-4">
                          <button
                            onClick={() => handleToggleRule(rule.id, rule.isActive)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                              rule.isActive
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                            }`}
                          >
                            {rule.isActive ? "Active" : "Disabled"}
                          </button>
                        </td>

                        <td className="py-3.5 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingRule(rule);
                              setShowRuleModal(true);
                            }}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition"
                            title="Edit rule"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id, rule.name)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                            title="Delete rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. TAB: Base & Weekend Rate Settings Form */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs max-w-3xl space-y-6">
          <div>
            <h2 className="text-lg font-serif font-bold text-neutral-900">
              Pricing & Fee Controls for {currentOption?.title}
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Changes saved here apply immediately to standard calendar days and upcoming booking hold calculations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Standard Base Nightly Price (₹)
              </label>
              <input
                type="number"
                min="1"
                value={settingsForm.basePricePerNight}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, basePricePerNight: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-bold focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Sunday through Thursday standard rate.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Weekend Nightly Rate (₹)
              </label>
              <input
                type="number"
                min="1"
                value={settingsForm.weekendPricePerNight}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, weekendPricePerNight: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-bold focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Friday and Saturday prime nights.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Cleaning Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                value={settingsForm.cleaningFee}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, cleaningFee: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              />
              <p className="text-[10px] text-neutral-400 mt-1">One-time per stay departure charge.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Applicable Tax Percentage (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={settingsForm.taxPercentage}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, taxPercentage: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              />
              <p className="text-[10px] text-neutral-400 mt-1">Indian GST rate (12% or 18%).</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Standard Capacity (Included Guests)
              </label>
              <input
                type="number"
                min="1"
                max={currentOption?.maxGuests || 15}
                value={settingsForm.standardGuests}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, standardGuests: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Included in base price without surcharge.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Extra Guest Charge Per Night (₹)
              </label>
              <input
                type="number"
                min="0"
                value={settingsForm.extraGuestCharge}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, extraGuestCharge: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                Charged for each guest above standard capacity.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Default Minimum Stay (Nights)
              </label>
              <input
                type="number"
                min="1"
                value={settingsForm.minStayNights}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, minStayNights: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:ring-2 focus:ring-neutral-900 focus:outline-none"
              />
              <p className="text-[10px] text-neutral-400 mt-1">Standard length-of-stay threshold.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={isPending}
              className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
            >
              {isPending ? "Saving Pricing Changes..." : "Save Pricing Controls"}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. TAB: Price Breakdown Calculator */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "calculator" && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs max-w-3xl space-y-6">
          <div>
            <h2 className="text-lg font-serif font-bold text-neutral-900">
              Live Rate Calculation & Simulator
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Test how rates, weekend surges, seasonal rules, and guest surcharges combine in real booking scenarios.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Check-In Date
              </label>
              <input
                type="date"
                value={calcCheckIn}
                onChange={(e) => setCalcCheckIn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Check-Out Date
              </label>
              <input
                type="date"
                value={calcCheckOut}
                onChange={(e) => setCalcCheckOut(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Guest Count
              </label>
              <input
                type="number"
                min="1"
                max={currentOption?.maxGuests || 15}
                value={calcGuestCount}
                onChange={(e) => setCalcGuestCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900"
              />
            </div>
          </div>

          <button
            onClick={runPricePreview}
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-black transition flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>Recalculate Price Breakdown</span>
          </button>

          {/* Detailed Calculation Results */}
          {calcResult && (
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div>
                  <span className="text-xs font-bold text-neutral-800">
                    {calcResult.nights} Nights Total
                  </span>
                  <p className="text-[11px] text-neutral-500">
                    Average ₹{calcResult.averageNightlyRate.toLocaleString("en-IN")} / night
                  </p>
                </div>
                {!calcResult.meetsMinStay ? (
                  <span className="text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-lg">
                    {calcResult.minStayError}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                    ✓ Meets {calcResult.requiredMinStay}N Min Stay
                  </span>
                )}
              </div>

              {/* Day-by-Day Breakdown */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Nightly Breakdown:
                </p>
                {calcResult.nightlyRates.map((night) => (
                  <div
                    key={night.date}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white border border-stone-200/60"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-neutral-600">{night.date}</span>
                      <span className="text-neutral-400">({night.dayOfWeek})</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          night.rateType === "WEEKEND"
                            ? "bg-indigo-100 text-indigo-800"
                            : night.rateType === "HOLIDAY"
                            ? "bg-purple-100 text-purple-800"
                            : night.rateType === "SEASONAL"
                            ? "bg-emerald-100 text-emerald-800"
                            : night.rateType === "OVERRIDE"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {night.rateType}
                        {night.ruleName ? ` — ${night.ruleName}` : ""}
                      </span>
                    </div>
                    <span className="font-bold text-neutral-900">
                      ₹{night.appliedRate.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cost Summary Table */}
              <div className="pt-3 border-t border-stone-200 space-y-1.5 text-xs text-neutral-600">
                <div className="flex justify-between">
                  <span>Base Nightly Accommodation</span>
                  <span>₹{calcResult.baseNightlyTotal.toLocaleString("en-IN")}</span>
                </div>
                {calcResult.extraGuestTotal > 0 && (
                  <div className="flex justify-between text-amber-900">
                    <span>
                      Extra Guests ({calcResult.extraGuestCount} guest(s) @ ₹
                      {calcResult.extraGuestChargePerNight}/nt)
                    </span>
                    <span>₹{calcResult.extraGuestTotal.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {calcResult.cleaningFee > 0 && (
                  <div className="flex justify-between">
                    <span>Departure Cleaning Fee</span>
                    <span>₹{calcResult.cleaningFee.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Applicable GST ({calcResult.taxPercentage}%)</span>
                  <span>₹{calcResult.taxesAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-serif font-black text-base text-neutral-950 pt-2 border-t border-stone-200">
                  <span>Total Calculated Amount</span>
                  <span>₹{calcResult.totalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. MODAL: Create / Edit Rule Dialog */}
      {/* ------------------------------------------------------------- */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-base text-neutral-900">
                {editingRule ? `Edit Rule: ${editingRule.name}` : "Create New Pricing Rule"}
              </h3>
              <button
                onClick={() => setShowRuleModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get("name") as string;
                const ruleType = formData.get("ruleType") as "SEASONAL" | "HOLIDAY" | "OVERRIDE";
                const startDate = formData.get("startDate") as string;
                const endDate = formData.get("endDate") as string;
                const pricePerNightStr = formData.get("pricePerNight") as string;
                const multiplierStr = formData.get("multiplier") as string;
                const minStayNights = Number(formData.get("minStayNights") || 1);
                const targetOption = formData.get("listingOptionId") as string;

                startTransition(async () => {
                  let res: ActionResult;
                  if (editingRule) {
                    res = await updatePricingRule({
                      ruleId: editingRule.id,
                      name,
                      ruleType,
                      startDate,
                      endDate,
                      pricePerNight: pricePerNightStr ? Number(pricePerNightStr) : null,
                      multiplier: multiplierStr ? Number(multiplierStr) : null,
                      minStayNights,
                    });
                  } else {
                    res = await createPricingRule({
                      propertyId: currentProperty.id,
                      listingOptionId: targetOption === "ALL" ? null : targetOption,
                      name,
                      ruleType,
                      startDate,
                      endDate,
                      pricePerNight: pricePerNightStr ? Number(pricePerNightStr) : null,
                      multiplier: multiplierStr ? Number(multiplierStr) : null,
                      minStayNights,
                      isActive: true,
                    });
                  }

                  if (res.success) {
                    setShowRuleModal(false);
                    setStatusMessage({ type: "success", text: res.message || "Rule saved." });
                    // Refresh
                    if (currentProperty && currentOption) {
                      refreshCalendar(calendarYear, calendarMonth, currentProperty.id, currentOption.id);
                    }
                  } else {
                    setStatusMessage({ type: "error", text: res.error || "Failed to save rule." });
                  }
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Rule Name
                </label>
                <input
                  name="name"
                  required
                  defaultValue={editingRule?.name || ""}
                  placeholder="e.g. Diwali Festive Peak 2026"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Rule Category
                  </label>
                  <select
                    name="ruleType"
                    defaultValue={editingRule?.ruleType || "SEASONAL"}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 bg-white"
                  >
                    <option value="SEASONAL">Seasonal Rule</option>
                    <option value="HOLIDAY">Holiday Premium</option>
                    <option value="OVERRIDE">Date Override</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Target Configuration
                  </label>
                  <select
                    name="listingOptionId"
                    defaultValue={editingRule?.listingOptionId || "ALL"}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 bg-white"
                  >
                    <option value="ALL">Entire Property (All Rooms)</option>
                    {currentProperty?.listingOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    defaultValue={editingRule?.startDate || ""}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    required
                    defaultValue={editingRule?.endDate || ""}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Fixed Nightly Rate (₹)
                  </label>
                  <input
                    type="number"
                    name="pricePerNight"
                    placeholder="e.g. 35000"
                    defaultValue={editingRule?.pricePerNight || ""}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900"
                  />
                  <p className="text-[10px] text-neutral-400 mt-0.5">Overrides base price.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    OR Rate Multiplier
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    name="multiplier"
                    placeholder="e.g. 1.25 for +25%"
                    defaultValue={editingRule?.multiplier || ""}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900"
                  />
                  <p className="text-[10px] text-neutral-400 mt-0.5">Applied to current rates.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Required Minimum Stay (Nights)
                </label>
                <input
                  type="number"
                  min="1"
                  name="minStayNights"
                  defaultValue={editingRule?.minStayNights || 1}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-neutral-600 text-xs font-bold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {isPending ? "Saving..." : editingRule ? "Save Changes" : "Create Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 10. MODAL: Quick Date Override Dialog */}
      {/* ------------------------------------------------------------- */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h3 className="font-serif font-bold text-sm text-neutral-900">
                Set Price for {overrideDate}
              </h3>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Set a date-specific override for <strong>{currentOption?.title}</strong> on this date.
            </p>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Nightly Price (₹)
              </label>
              <input
                type="number"
                min="1"
                value={overridePrice}
                onChange={(e) => setOverridePrice(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Label / Note (Optional)
              </label>
              <input
                type="text"
                value={overrideLabel}
                onChange={(e) => setOverrideLabel(e.target.value)}
                placeholder="e.g. Special Corporate Event"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900"
              />
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-stone-200 text-neutral-600 text-xs font-bold hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickOverride}
                disabled={isPending}
                className="px-4 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Apply Override"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
