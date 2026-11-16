"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Building2,
  Layers,
  RefreshCw,
  Info,
  ShieldAlert,
  ExternalLink,
  Wrench,
  Ban,
  Lock,
  Copy,
  Check,
  CalendarCheck2,
  CalendarX2,
} from "lucide-react";
import {
  createDateBlock,
  removeDateBlock,
  triggerExternalCalendarSync,
  ActionResult,
} from "./availability-actions";
import {
  MonthAvailabilitySummary,
  DayAvailabilityDetail,
} from "@/lib/availability/availability-service";

export interface SerializedProperty {
  id: string;
  name: string;
  slug: string;
  inventoryGroups: Array<{ id: string; name: string; code: string }>;
  listingOptions: Array<{ id: string; slug: string; title: string; maxGuests: number }>;
}

export interface SerializedCalendarConnection {
  id: string;
  connectionName: string;
  platform: string;
  importUrl: string | null;
  exportToken: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
}

export interface SerializedConflict {
  id: string;
  action: string;
  createdAt: string;
  metadata: {
    connectionName?: string;
    platform?: string;
    summary?: string;
    conflictingBookings?: Array<{
      bookingReference: string;
      customerName: string;
      checkInDate: string;
      checkOutDate: string;
    }>;
  };
}

interface AvailabilityCalendarViewProps {
  properties: SerializedProperty[];
  initialAvailability: MonthAvailabilitySummary;
  connections: SerializedCalendarConnection[];
  conflicts: SerializedConflict[];
  currentYear: number;
  currentMonth: number;
}

export function AvailabilityCalendarView({
  properties,
  initialAvailability,
  connections,
  conflicts,
  currentYear: defaultYear,
  currentMonth: defaultMonth,
}: AvailabilityCalendarViewProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    properties[0]?.id || ""
  );

  const currentProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) || properties[0],
    [properties, selectedPropertyId]
  );

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Calendar Navigation
  const [calendarYear, setCalendarYear] = useState<number>(defaultYear);
  const [calendarMonth, setCalendarMonth] = useState<number>(defaultMonth); // 1..12
  const [availability, setAvailability] = useState<MonthAvailabilitySummary>(
    initialAvailability
  );

  // Inspector & Modal State
  const [selectedDay, setSelectedDay] = useState<DayAvailabilityDetail | null>(null);
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [showSyncDrawer, setShowSyncDrawer] = useState<boolean>(false);

  // New Block Form State
  const [blockStartDate, setBlockStartDate] = useState<string>("");
  const [blockEndDate, setBlockEndDate] = useState<string>("");
  const [blockReason, setBlockReason] = useState<
    "ADMIN_MAINTENANCE" | "SEASONAL_CLOSURE" | "ADMIN_BLOCKED"
  >("ADMIN_MAINTENANCE");
  const [blockNotes, setBlockNotes] = useState<string>("");

  // Status & Feedback
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Navigate Month
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
    if (currentProperty) {
      refreshAvailability(currentProperty.id, selectedOptionId, newYear, newMonth);
    }
  };

  const refreshAvailability = async (
    propertyId: string,
    optionId: string | null,
    year: number,
    month: number
  ) => {
    startTransition(async () => {
      try {
        const url = `/api/admin/calendar/month?propertyId=${propertyId}${
          optionId ? `&listingOptionId=${optionId}` : ""
        }&year=${year}&month=${month}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.data) setAvailability(json.data);
        }
      } catch {
        // Fallback
      }
    });
  };

  // Create Availability Block
  const handleCreateBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProperty) return;
    setStatusMessage(null);

    startTransition(async () => {
      const res = await createDateBlock({
        propertyId: currentProperty.id,
        startDate: blockStartDate,
        endDate: blockEndDate,
        reason: blockReason,
        notes: blockNotes,
      });

      if (res.success) {
        setStatusMessage({ type: "success", text: res.message || "Block applied." });
        setShowBlockModal(false);
        refreshAvailability(currentProperty.id, selectedOptionId, calendarYear, calendarMonth);
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to block dates." });
      }
    });
  };

  // Remove Availability Block
  const handleRemoveBlock = (blockId: string) => {
    if (!confirm("Are you sure you want to remove this availability block and restore dates to available inventory?")) {
      return;
    }

    startTransition(async () => {
      const res = await removeDateBlock(blockId);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message || "Block removed." });
        setSelectedDay(null);
        refreshAvailability(currentProperty.id, selectedOptionId, calendarYear, calendarMonth);
      } else {
        setStatusMessage({ type: "error", text: res.error || "Failed to remove block." });
      }
    });
  };

  // Trigger External Sync
  const handleSyncConnection = (connectionId: string) => {
    setSyncingId(connectionId);
    startTransition(async () => {
      const res = await triggerExternalCalendarSync(connectionId);
      setSyncingId(null);
      if (res.success) {
        setStatusMessage({ type: "success", text: res.message || "Synced successfully." });
        refreshAvailability(currentProperty.id, selectedOptionId, calendarYear, calendarMonth);
      } else {
        setStatusMessage({ type: "error", text: res.error || "Sync failed." });
      }
    });
  };

  const copyExportUrl = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://devstaysjaipur.com";
    const exportUrl = `${origin}/api/calendar/export/${token}`;
    navigator.clipboard.writeText(exportUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  // Calendar title
  const monthName = new Date(Date.UTC(calendarYear, calendarMonth - 1, 1)).toLocaleString(
    "en-IN",
    { month: "long", year: "numeric", timeZone: "UTC" }
  );

  const daysInMonth = availability.totalDays || 30;
  const firstDayOffset = new Date(Date.UTC(calendarYear, calendarMonth - 1, 1)).getUTCDay();

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header & Selectors Bar */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold tracking-wider uppercase mb-2">
              <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>AVAILABILITY & INVENTORY DISCOVERY</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-neutral-900 tracking-tight">
              Property Availability & Calendar
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Hierarchical shared inventory management, reservation visibility, manual maintenance holds, and two-way iCal synchronization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Property Selector */}
            <div className="relative">
              <Building2 className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedPropertyId}
                onChange={(e) => {
                  setSelectedPropertyId(e.target.value);
                  setSelectedOptionId(null);
                  refreshAvailability(e.target.value, null, calendarYear, calendarMonth);
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

            {/* Quick Actions */}
            <button
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                setBlockStartDate(today);
                setBlockEndDate(tomorrow);
                setShowBlockModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Block Dates</span>
            </button>

            <button
              onClick={() => setShowSyncDrawer(true)}
              className="px-3.5 py-2 rounded-xl border border-stone-200 text-neutral-700 hover:bg-neutral-50 text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-neutral-500" />
              <span>Channels ({connections.length})</span>
            </button>
          </div>
        </div>

        {/* Configuration Selector Pills */}
        <div className="mt-6 pt-5 border-t border-stone-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mr-1">
              Configuration:
            </span>
            <button
              onClick={() => {
                setSelectedOptionId(null);
                refreshAvailability(currentProperty.id, null, calendarYear, calendarMonth);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                selectedOptionId === null
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              Entire Physical Footprint (Shared)
            </button>
            {currentProperty?.listingOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setSelectedOptionId(opt.id);
                  refreshAvailability(currentProperty.id, opt.id, calendarYear, calendarMonth);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  selectedOptionId === opt.id
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {opt.title}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-neutral-400 font-mono">
            Inventory Group: {currentProperty?.inventoryGroups[0]?.code}
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
      {/* 3. Availability Stats Ribbon */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/20 p-3.5">
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
            Available Nights
          </p>
          <p className="text-xl font-serif font-black text-emerald-950 mt-0.5">
            {availability.availableDays}{" "}
            <span className="text-xs font-normal text-emerald-700">
              / {availability.totalDays}
            </span>
          </p>
          <p className="text-[10px] text-emerald-600">
            {Math.round((availability.availableDays / (availability.totalDays || 1)) * 100)}% available
          </p>
        </div>

        <div className="bg-white rounded-xl border border-indigo-200 bg-indigo-50/20 p-3.5">
          <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
            Confirmed Booked
          </p>
          <p className="text-xl font-serif font-black text-indigo-950 mt-0.5">
            {availability.bookedDays} <span className="text-xs font-normal text-indigo-700">nights</span>
          </p>
          <p className="text-[10px] text-indigo-600">Direct website guests</p>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/20 p-3.5">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
            Pending Holds
          </p>
          <p className="text-xl font-serif font-black text-amber-950 mt-0.5">
            {availability.heldDays} <span className="text-xs font-normal text-amber-700">nights</span>
          </p>
          <p className="text-[10px] text-amber-600">15m checkout holds</p>
        </div>

        <div className="bg-white rounded-xl border border-rose-200 bg-rose-50/20 p-3.5">
          <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
            Maintenance & Blocks
          </p>
          <p className="text-xl font-serif font-black text-rose-950 mt-0.5">
            {availability.blockedDays} <span className="text-xs font-normal text-rose-700">nights</span>
          </p>
          <p className="text-[10px] text-rose-600">Administrative blocks</p>
        </div>

        <div className="bg-white rounded-xl border border-blue-200 bg-blue-50/20 p-3.5">
          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
            External iCal OTA
          </p>
          <p className="text-xl font-serif font-black text-blue-950 mt-0.5">
            {availability.externalDays} <span className="text-xs font-normal text-blue-700">nights</span>
          </p>
          <p className="text-[10px] text-blue-600">Airbnb / VRBO / Booking</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Monthly Availability Grid */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6">
        {/* Month Navigation & Visual Legend */}
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

          <div className="flex items-center gap-3 flex-wrap text-[11px] font-semibold text-neutral-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Confirmed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" /> Hold
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Maintenance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> External iCal
            </span>
          </div>
        </div>

        {/* 7-column calendar grid */}
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

          {/* Empty offset cells before day 1 */}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="h-28 bg-stone-50/50 rounded-xl border border-dashed border-stone-200/50"
            />
          ))}

          {/* Calendar Days */}
          {availability.days.map((day, idx) => {
            const dayNum = idx + 1;
            const isAvailable = day.status === "AVAILABLE";
            const isBooked = day.status === "BOOKED";
            const isHold = day.status === "PENDING_HOLD";
            const isMaintenance = day.status === "ADMIN_MAINTENANCE";
            const isSeasonal = day.status === "SEASONAL_CLOSURE";
            const isExternal = day.status === "EXTERNAL_RESERVATION";
            const isBlocked = day.status === "ADMIN_BLOCKED";

            const cellBg = isAvailable
              ? "bg-emerald-50/30 border-emerald-200/70 hover:border-emerald-400 hover:bg-emerald-50/60"
              : isBooked
              ? "bg-indigo-950 text-white border-indigo-900 hover:bg-indigo-900"
              : isHold
              ? "bg-amber-50 border-amber-300 hover:border-amber-400"
              : isMaintenance
              ? "bg-rose-50 border-rose-300 hover:border-rose-400"
              : isSeasonal
              ? "bg-slate-50 border-slate-300 hover:border-slate-400"
              : isExternal
              ? "bg-blue-50 border-blue-300 hover:border-blue-400"
              : "bg-stone-100 border-stone-300 hover:border-stone-400";

            return (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day)}
                className={`h-28 p-2.5 rounded-xl border text-left flex flex-col justify-between transition group relative shadow-2xs ${cellBg}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-bold ${isBooked ? "text-white" : "text-neutral-800"}`}>
                    {dayNum}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      isAvailable
                        ? "bg-emerald-100 text-emerald-800"
                        : isBooked
                        ? "bg-indigo-800 text-indigo-200"
                        : isHold
                        ? "bg-amber-200 text-amber-900"
                        : isMaintenance
                        ? "bg-rose-200 text-rose-900"
                        : isSeasonal
                        ? "bg-slate-200 text-slate-800"
                        : isExternal
                        ? "bg-blue-200 text-blue-900"
                        : "bg-stone-200 text-stone-800"
                    }`}
                  >
                    {isAvailable
                      ? "Open"
                      : isBooked
                      ? "Booked"
                      : isHold
                      ? "Hold"
                      : isMaintenance
                      ? "Maint"
                      : isExternal
                      ? "OTA"
                      : "Blocked"}
                  </span>
                </div>

                <div className="overflow-hidden">
                  {isBooked && (
                    <div className="text-[11px] leading-tight font-mono text-indigo-200 truncate">
                      {day.bookingReference}
                      {day.customerName && (
                        <div className="text-[10px] font-sans text-white font-semibold truncate">
                          {day.customerName}
                        </div>
                      )}
                    </div>
                  )}

                  {isHold && (
                    <div className="text-[10px] leading-tight font-mono text-amber-800 truncate">
                      {day.bookingReference}
                      <div className="text-[9px] text-amber-600 animate-pulse font-sans">
                        Expiring hold
                      </div>
                    </div>
                  )}

                  {isMaintenance && (
                    <div className="text-[10px] leading-tight text-rose-900 truncate">
                      <span className="font-bold">Maintenance</span>
                      {day.notes && <div className="text-[9px] text-rose-600 truncate">{day.notes}</div>}
                    </div>
                  )}

                  {isExternal && (
                    <div className="text-[10px] leading-tight text-blue-900 truncate">
                      <span className="font-bold">{day.externalPlatform || "External"}</span>
                      {day.externalSummary && (
                        <div className="text-[9px] text-blue-600 truncate">{day.externalSummary}</div>
                      )}
                    </div>
                  )}

                  {isBlocked && (
                    <div className="text-[10px] text-neutral-600 font-medium truncate">
                      {day.notes || "Staff hold"}
                    </div>
                  )}

                  {isAvailable && (
                    <div className="text-[10px] text-emerald-700/80 font-medium opacity-0 group-hover:opacity-100 transition">
                      + Block date
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. Date Inspector Modal / Drawer */}
      {/* ------------------------------------------------------------- */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Date Inspection
                </span>
                <h3 className="font-serif font-bold text-lg text-neutral-900">
                  {selectedDay.date} ({selectedDay.dayOfWeek})
                </h3>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Content for Booked Dates */}
            {selectedDay.status === "BOOKED" && (
              <div className="space-y-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs">
                <div className="flex items-center justify-between font-bold text-indigo-950">
                  <span>Confirmed Website Reservation</span>
                  <span className="font-mono text-[11px] bg-indigo-100 px-2 py-0.5 rounded">
                    {selectedDay.bookingReference}
                  </span>
                </div>
                <div className="space-y-1 text-neutral-600 pt-2 border-t border-indigo-100">
                  <div className="flex justify-between">
                    <span>Guest Name:</span>
                    <span className="font-bold text-neutral-900">{selectedDay.customerName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Party Size:</span>
                    <span>{selectedDay.guestCount} guests</span>
                  </div>
                  {selectedDay.totalAmount && (
                    <div className="flex justify-between font-bold text-neutral-900 pt-1">
                      <span>Total Paid:</span>
                      <span>₹{selectedDay.totalAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-indigo-200 text-[11px] text-indigo-700 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Protected: Confirmed reservations cannot be unblocked manually here. Cancellations must be performed through Booking Management.
                  </span>
                </div>
              </div>
            )}

            {/* Content for Temporary Holds */}
            {selectedDay.status === "PENDING_HOLD" && (
              <div className="space-y-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-200 text-xs">
                <div className="flex items-center justify-between font-bold text-amber-950">
                  <span>15-Minute Guest Checkout Hold</span>
                  <span className="font-mono text-[11px] bg-amber-100 px-2 py-0.5 rounded">
                    {selectedDay.bookingReference}
                  </span>
                </div>
                <p className="text-neutral-600 text-[11px]">
                  A prospective customer is currently on the checkout step. If payment is not completed within 15 minutes, inventory automatically releases.
                </p>
              </div>
            )}

            {/* Content for Maintenance / Blocks */}
            {(selectedDay.status === "ADMIN_MAINTENANCE" ||
              selectedDay.status === "ADMIN_BLOCKED" ||
              selectedDay.status === "SEASONAL_CLOSURE") && (
              <div className="space-y-4">
                <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-rose-950">
                    <span>
                      {selectedDay.status === "ADMIN_MAINTENANCE"
                        ? "Maintenance Block"
                        : selectedDay.status === "SEASONAL_CLOSURE"
                        ? "Seasonal Closure"
                        : "Administrative Block"}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                      Blocked
                    </span>
                  </div>
                  {selectedDay.notes && (
                    <p className="text-neutral-700 text-xs italic bg-white p-2.5 rounded-xl border border-rose-100">
                      "{selectedDay.notes}"
                    </p>
                  )}
                </div>

                {selectedDay.blockId && (
                  <button
                    onClick={() => selectedDay.blockId && handleRemoveBlock(selectedDay.blockId)}
                    disabled={isPending}
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Block & Restore Availability</span>
                  </button>
                )}
              </div>
            )}

            {/* Content for External iCal Bookings */}
            {selectedDay.status === "EXTERNAL_RESERVATION" && (
              <div className="space-y-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-200 text-xs">
                <div className="flex items-center justify-between font-bold text-blue-950">
                  <span>External OTA Reservation</span>
                  <span className="font-bold text-[10px] uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {selectedDay.externalPlatform || "iCal"}
                  </span>
                </div>
                {selectedDay.externalSummary && (
                  <p className="text-neutral-700 font-semibold">{selectedDay.externalSummary}</p>
                )}
                <p className="text-[11px] text-neutral-500 font-mono">UID: {selectedDay.externalUid || "—"}</p>
              </div>
            )}

            {/* Content for Available Date */}
            {selectedDay.status === "AVAILABLE" && (
              <div className="space-y-3">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
                  <p className="font-bold">This date is 100% available for booking.</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    No conflicting reservations, maintenance holds, or external blocks exist.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const nextDay = new Date(new Date(selectedDay.date).getTime() + 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0];
                    setBlockStartDate(selectedDay.date);
                    setBlockEndDate(nextDay);
                    setSelectedDay(null);
                    setShowBlockModal(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Block This Date</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL: Create Date Block Dialog */}
      {/* ------------------------------------------------------------- */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Shared Inventory Protection
                </span>
                <h3 className="font-serif font-bold text-base text-neutral-900">
                  Block Dates on {currentProperty?.name}
                </h3>
              </div>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBlock} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={blockStartDate}
                    onChange={(e) => setBlockStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    End Date (Departure)
                  </label>
                  <input
                    type="date"
                    required
                    value={blockEndDate}
                    onChange={(e) => setBlockEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Reason for Block
                </label>
                <select
                  value={blockReason}
                  onChange={(e) =>
                    setBlockReason(e.target.value as "ADMIN_MAINTENANCE" | "SEASONAL_CLOSURE" | "ADMIN_BLOCKED")
                  }
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 bg-white"
                >
                  <option value="ADMIN_MAINTENANCE">Estate Maintenance / Deep Clean</option>
                  <option value="SEASONAL_CLOSURE">Seasonal Closure</option>
                  <option value="ADMIN_BLOCKED">Administrative / Private Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Internal Administrative Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={blockNotes}
                  onChange={(e) => setBlockNotes(e.target.value)}
                  placeholder="e.g. Annual pool waterproofing and courtyard heritage restoration."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  The system will automatically prevent collisions: if any confirmed reservation overlaps these dates, the block will be safely rejected.
                </span>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBlockModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-neutral-600 text-xs font-bold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {isPending ? "Applying Block..." : "Confirm Date Block"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. DRAWER: Connected iCal Feeds & Conflict Review */}
      {/* ------------------------------------------------------------- */}
      {showSyncDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white max-w-lg w-full h-full p-6 shadow-2xl border-l border-stone-200 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-neutral-900">
                  External Channels & iCal Feeds
                </h3>
                <p className="text-xs text-neutral-500">
                  Two-way availability synchronization with Airbnb, Booking.com, and VRBO.
                </p>
              </div>
              <button
                onClick={() => setShowSyncDrawer(false)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Channel List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Connected Feeds ({connections.length})
              </h4>
              {connections.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-stone-200 text-center text-xs text-neutral-500">
                  No active external calendar connections.
                </div>
              ) : (
                connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-neutral-900">
                          {conn.connectionName}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-blue-100 text-blue-800">
                          {conn.platform}
                        </span>
                      </div>
                      <button
                        onClick={() => handleSyncConnection(conn.id)}
                        disabled={syncingId === conn.id || isPending}
                        className="px-3 py-1 rounded-lg bg-neutral-900 text-white text-[11px] font-bold hover:bg-black transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${syncingId === conn.id ? "animate-spin" : ""}`}
                        />
                        <span>{syncingId === conn.id ? "Syncing..." : "Sync Now"}</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-neutral-500 space-y-1">
                      <div>
                        Last Synced:{" "}
                        <span className="font-mono text-neutral-700">
                          {conn.lastSyncedAt ? new Date(conn.lastSyncedAt).toLocaleString("en-IN") : "Never"}
                        </span>
                      </div>
                      {conn.lastSyncError && (
                        <div className="text-red-600 font-semibold text-[10px]">
                          Error: {conn.lastSyncError}
                        </div>
                      )}
                    </div>

                    {/* Export Feed URL */}
                    <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase">
                        Export Token
                      </span>
                      <button
                        onClick={() => copyExportUrl(conn.exportToken)}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
                      >
                        {copiedToken === conn.exportToken ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied iCal Link!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Export Feed URL</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Conflicts Review Section */}
            <div className="space-y-3 pt-4 border-t border-stone-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>External Conflict Review</span>
              </h4>

              {conflicts.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  ✓ Zero active external calendar conflicts. All internal reservations are safely intact.
                </div>
              ) : (
                conflicts.map((conf) => (
                  <div
                    key={conf.id}
                    className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-bold text-amber-900">
                      <span>Conflict: {conf.metadata.connectionName || "External Channel"}</span>
                      <span className="text-[10px] text-amber-700">
                        {new Date(conf.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    {conf.metadata.summary && (
                      <p className="text-neutral-700 text-[11px]">Event: {conf.metadata.summary}</p>
                    )}
                    {conf.metadata.conflictingBookings?.map((b) => (
                      <div key={b.bookingReference} className="p-2 bg-white rounded-lg border border-amber-200 text-[11px]">
                        <strong>Internal Confirmed Booking:</strong> {b.bookingReference} ({b.customerName})
                        <p className="text-neutral-500 mt-0.5">
                          DevStay has protected this internal guest reservation. Please verify your external channel listing calendar.
                        </p>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
