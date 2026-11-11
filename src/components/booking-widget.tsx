"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  CreditCard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCcw,
} from "lucide-react";

export interface ListingOptionBrief {
  id: string;
  slug: string;
  title: string;
  basePricePerNight: number;
  maxGuests?: number;
  bedroomCount?: number;
  bathroomCount?: number;
}

export interface ConfirmedBookingDetails {
  bookingReference: string;
  customerName: string;
  totalAmount: number;
  checkInDate: string;
  checkOutDate: string;
  listingTitle: string;
  nights: number;
  guestCount: number;
  paymentId: string;
}

export interface BookingWidgetProps {
  listingOptions: ListingOptionBrief[];
  initialConfigSlug?: string;
  lockConfiguration?: boolean;
  className?: string;
  id?: string;
  onBookingConfirmed?: (details: ConfirmedBookingDetails) => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function BookingWidget({
  listingOptions,
  initialConfigSlug,
  lockConfiguration = false,
  className = "",
  id = "sidebar-booking-card",
  onBookingConfirmed,
}: BookingWidgetProps) {
  // Default dates: 14 days out for 3 nights
  const today = new Date();
  const defaultCheckIn = new Date(today.getTime() + 14 * 86400000)
    .toISOString()
    .split("T")[0];
  const defaultCheckOut = new Date(today.getTime() + 17 * 86400000)
    .toISOString()
    .split("T")[0];

  const defaultSlug =
    initialConfigSlug ||
    (listingOptions.length > 0 ? listingOptions[0].slug : "royal-suite");

  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [selectedConfigSlug, setSelectedConfigSlug] = useState(defaultSlug);

  // If locked, always use initialConfigSlug; otherwise use selectedConfigSlug
  const effectiveConfigSlug =
    lockConfiguration && initialConfigSlug
      ? initialConfigSlug
      : selectedConfigSlug;

  const activeOption =
    listingOptions.find((o) => o.slug === effectiveConfigSlug) ||
    listingOptions[0];

  const maxGuestsForOption = activeOption?.maxGuests || 10;
  const [guestCount, setGuestCount] = useState(2);
  const effectiveGuestCount = Math.max(1, Math.min(guestCount, maxGuestsForOption));

  const [refreshKey, setRefreshKey] = useState(0);

  // Availability query state
  const [isChecking, setIsChecking] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<{
    available: boolean;
    reason?: string;
    pricing?: {
      nights: number;
      basePricePerNight: number;
      baseAmount: number;
      taxesAmount: number;
      totalAmount: number;
    };
  } | null>(null);

  // Inline calendar & collapsible date picker state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const initDate = defaultCheckIn ? new Date(`${defaultCheckIn}T00:00:00`) : new Date();
    return new Date(initDate.getFullYear(), initDate.getMonth(), 1);
  });
  const [activePicker, setActivePicker] = useState<"checkIn" | "checkOut">("checkIn");
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Inline Hold Form state (no popup modal!)
  const [showInlineHoldForm, setShowInlineHoldForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [isHolding, setIsHolding] = useState(false);
  const [holdError, setHoldError] = useState<string | null>(null);

  // Active Hold Result & Countdown
  const [activeHold, setActiveHold] = useState<{
    holdId: string;
    holdToken?: string;
    bookingReference: string;
    holdExpiresAt: string;
    expiresInSeconds: number;
    totalAmount: number;
  } | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Payment State
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] =
    useState<ConfirmedBookingDetails | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Listen for selection events from accommodation cards if not locked
  useEffect(() => {
    if (lockConfiguration) return;

    const handleConfigSelect = (e: Event) => {
      const customEvent = e as CustomEvent<{ slug: string }>;
      if (customEvent.detail?.slug) {
        setSelectedConfigSlug(customEvent.detail.slug);
      }
    };
    window.addEventListener("select-configuration", handleConfigSelect);
    return () =>
      window.removeEventListener("select-configuration", handleConfigSelect);
  }, [lockConfiguration]);

  // Live availability check effect
  useEffect(() => {
    let ignore = false;
    async function fetchAvailability() {
      if (!checkIn || !checkOut || checkIn >= checkOut) return;
      setIsChecking(true);
      try {
        const res = await fetch(
          `/api/bookings/check-availability?listingOptionSlug=${effectiveConfigSlug}&checkIn=${checkIn}&checkOut=${checkOut}&guestCount=${effectiveGuestCount}`
        );
        const json = await res.json();
        if (!ignore && json.success) {
          setAvailabilityData(json.data);
        }
      } catch (e) {
        console.error("Availability check failed:", e);
      } finally {
        if (!ignore) setIsChecking(false);
      }
    }

    fetchAvailability();
    return () => {
      ignore = true;
    };
  }, [checkIn, checkOut, effectiveConfigSlug, effectiveGuestCount, refreshKey]);

  // Hold countdown timer
  useEffect(() => {
    if (!activeHold || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setActiveHold(null);
          setRefreshKey((k) => k + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeHold, secondsRemaining]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleCreateHold = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsHolding(true);
    setHoldError(null);

    try {
      const res = await fetch("/api/bookings/create-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingOptionSlug: effectiveConfigSlug,
          checkIn,
          checkOut,
          guestCount: effectiveGuestCount,
          customerName: guestName,
          customerEmail: guestEmail,
          customerPhone: guestPhone,
          idempotencyKey: `hold-${Date.now()}-${Math.random()
            .toString(36)
            .substring(7)}`,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setHoldError(json.error || "Failed to create hold.");
        return;
      }

      setActiveHold({
        holdId: json.data.holdId,
        holdToken: json.data.holdToken,
        bookingReference: json.data.bookingReference,
        holdExpiresAt: json.data.holdExpiresAt,
        expiresInSeconds: json.data.expiresInSeconds,
        totalAmount: json.data.pricing.totalAmount,
      });
      setSecondsRemaining(json.data.expiresInSeconds);
      setShowInlineHoldForm(false);
    } catch (e: unknown) {
      const errorMsg =
        e instanceof Error ? e.message : "Network error. Please try again.";
      setHoldError(errorMsg);
    } finally {
      setIsHolding(false);
    }
  };

  const executeVerification = async (params: {
    bookingId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) => {
    try {
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: params.bookingId,
          holdToken: activeHold?.holdToken,
          razorpayOrderId: params.razorpayOrderId,
          razorpayPaymentId: params.razorpayPaymentId,
          razorpaySignature: params.razorpaySignature,
          paymentMethod: "razorpay_checkout",
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(
          verifyData.error ||
            verifyData.message ||
            "Payment verification failed."
        );
      }

      // Success! Set confirmed booking state
      const targetOption = listingOptions.find(
        (o) => o.slug === effectiveConfigSlug
      );
      const confirmedDetails: ConfirmedBookingDetails = {
        bookingReference:
          verifyData.bookingReference || activeHold?.bookingReference || "",
        customerName: verifyData.booking?.customerName || guestName,
        totalAmount: activeHold?.totalAmount || 0,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        listingTitle: targetOption?.title || "Dev Stays Jaipur",
        nights: availabilityData?.pricing?.nights || 1,
        guestCount,
        paymentId: params.razorpayPaymentId,
      };

      setConfirmedBooking(confirmedDetails);
      if (onBookingConfirmed) {
        onBookingConfirmed(confirmedDetails);
      }

      setActiveHold(null);
      setRefreshKey((k) => k + 1);
    } catch (verErr: unknown) {
      const msg =
        verErr instanceof Error ? verErr.message : "Verification error.";
      setPaymentError(msg);
    } finally {
      setIsPaying(false);
    }
  };

  // Razorpay Checkout Trigger
  const handleProceedToPayment = async () => {
    if (!activeHold) return;
    setIsPaying(true);
    setPaymentError(null);

    try {
      // 1. Create Razorpay order on server
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: activeHold.holdId,
          holdToken: activeHold.holdToken,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || "Could not initialize payment order.");
      }

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        // Fallback for offline development or sandbox script block:
        console.warn(
          "Razorpay script unavailable. Triggering test verification fallback."
        );
        await executeVerification({
          bookingId: activeHold.holdId,
          razorpayOrderId: orderData.orderId,
          razorpayPaymentId: `pay_test_${Date.now()}`,
          razorpaySignature: "simulated_local_test_signature",
        });
        return;
      }

      // 3. Launch official Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Dev Stays Jaipur",
        description: `Reservation: ${orderData.bookingReference}`,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.customerName,
          email: orderData.customerEmail,
          contact: orderData.customerPhone || "",
        },
        theme: {
          color: "#000000",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async function (response: any) {
          await executeVerification({
            bookingId: activeHold.holdId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: function () {
            setIsPaying(false);
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on(
        "payment.failed",
        function (failResponse: { error?: { description?: string } }) {
          setIsPaying(false);
          setPaymentError(
            failResponse.error?.description ||
              "Payment failed. Please try again."
          );
        }
      );

      razorpayInstance.open();
    } catch (err: unknown) {
      console.error("Payment execution error:", err);
      const msg =
        err instanceof Error ? err.message : "Payment failed. Please retry.";
      setPaymentError(msg);
      setIsPaying(false);
    }
  };

  const copyBookingRef = () => {
    if (!confirmedBooking) return;
    navigator.clipboard.writeText(confirmedBooking.bookingReference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Inline Calendar calculation & state helpers
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const monthName = calendarMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1);
  const startingDayIndex = (firstDay.getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysArray: (string | null)[] = [];
  for (let i = 0; i < startingDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    const mStr = String(month + 1).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");
    daysArray.push(`${year}-${mStr}-${dStr}`);
  }
  const todayStr = new Date().toISOString().split("T")[0];

  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return "Select date";
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const selectedNights =
    checkIn && checkOut && checkOut > checkIn
      ? Math.ceil(
          (new Date(`${checkOut}T00:00:00`).getTime() -
            new Date(`${checkIn}T00:00:00`).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  const prevMonth = () => {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };
  const nextMonth = () => {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const handleDateClick = (dateStr: string) => {
    if (activePicker === "checkIn") {
      setCheckIn(dateStr);
      // If checkOut exists and is strictly after the new checkIn, keep it!
      if (checkOut && checkOut > dateStr) {
        setActivePicker("checkOut");
      } else {
        // Automatically set checkout to next day so user immediately has a valid preview
        const [y, m, d] = dateStr.split("-").map(Number);
        const nextD = new Date(y, m - 1, d + 1);
        const nextStr = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, "0")}-${String(nextD.getDate()).padStart(2, "0")}`;
        setCheckOut(nextStr);
        setActivePicker("checkOut");
      }
    } else {
      // activePicker === 'checkOut'
      if (!checkIn) {
        setCheckIn(dateStr);
        const [y, m, d] = dateStr.split("-").map(Number);
        const nextD = new Date(y, m - 1, d + 1);
        const nextStr = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, "0")}-${String(nextD.getDate()).padStart(2, "0")}`;
        setCheckOut(nextStr);
        setActivePicker("checkOut");
      } else if (dateStr <= checkIn) {
        // Comfortably treat as new checkIn and adjust checkout to next day
        setCheckIn(dateStr);
        const [y, m, d] = dateStr.split("-").map(Number);
        const nextD = new Date(y, m - 1, d + 1);
        const nextStr = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, "0")}-${String(nextD.getDate()).padStart(2, "0")}`;
        setCheckOut(nextStr);
        setActivePicker("checkOut");
      } else {
        setCheckOut(dateStr);
        // Automatically close calendar once date selection is completed
        setIsCalendarOpen(false);
      }
    }
  };

  return (
    <div
      id={id}
      className={`bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-md ${className}`}
    >
      {/* 1. Confirmed Booking State */}
      {confirmedBooking ? (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <Sparkles size={18} className="text-amber-500" />
              <span>Reservation Confirmed</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase tracking-wide">
              Guaranteed
            </span>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700">
              <Check size={24} />
            </div>
            <h5 className="font-extrabold text-neutral-900 text-base">
              Thank You, {confirmedBooking.customerName}!
            </h5>
            <p className="text-xs text-neutral-600">
              Your reservation for{" "}
              <strong className="text-neutral-900">
                {confirmedBooking.listingTitle}
              </strong>{" "}
              is confirmed and paid.
            </p>
          </div>

          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-neutral-500">
              <span>Booking Reference:</span>
              <button
                type="button"
                onClick={copyBookingRef}
                className="font-mono font-bold text-neutral-900 flex items-center gap-1.5 hover:text-amber-700 transition-colors"
                title="Copy reference code"
              >
                <span>{confirmedBooking.bookingReference}</span>
                {copiedRef ? (
                  <Check size={12} className="text-emerald-600" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
            <div className="flex justify-between items-center text-neutral-500">
              <span>Check-in:</span>
              <span className="font-semibold text-neutral-900">
                {confirmedBooking.checkInDate} (From 14:00 PM)
              </span>
            </div>
            <div className="flex justify-between items-center text-neutral-500">
              <span>Check-out:</span>
              <span className="font-semibold text-neutral-900">
                {confirmedBooking.checkOutDate} (By 11:00 AM)
              </span>
            </div>
            <div className="flex justify-between items-center text-neutral-500">
              <span>Guests:</span>
              <span className="font-semibold text-neutral-900">
                {confirmedBooking.guestCount}{" "}
                {confirmedBooking.guestCount === 1 ? "Guest" : "Guests"}
              </span>
            </div>
            <div className="flex justify-between items-center text-neutral-500 pt-2 border-t border-neutral-200">
              <span>Paid Amount:</span>
              <span className="font-extrabold text-neutral-900 text-sm">
                ₹{confirmedBooking.totalAmount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-neutral-400">
              <span>Payment Receipt:</span>
              <span className="font-mono">{confirmedBooking.paymentId}</span>
            </div>
          </div>

          <div className="p-3 bg-stone-100 rounded-xl text-[11px] text-neutral-600 space-y-1">
            <p className="font-semibold text-neutral-900">Arrival Instructions:</p>
            <p>• Check-in from 14:00 PM | Check-out by 11:00 AM</p>
            <p>
              • Host Aparna & Saksham will contact you via WhatsApp/Email for arrival coordination.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setConfirmedBooking(null);
              setRefreshKey((k) => k + 1);
            }}
            className="w-full py-3.5 bg-black hover:bg-neutral-800 text-white text-xs uppercase tracking-wider font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Make Another Reservation</span>
          </button>
        </div>
      ) : activeHold ? (
        /* 2. Active Hold Countdown State */
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <CheckCircle2 size={18} />
              <span>Temporary Inventory Hold</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs font-bold">
              <Clock size={13} className="animate-spin" />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center text-neutral-500">
              <span>Booking Reference:</span>
              <span className="font-mono font-bold text-neutral-900 text-sm">
                {activeHold.bookingReference}
              </span>
            </div>
            <div className="flex justify-between items-center text-neutral-500">
              <span>Reserved Configuration:</span>
              <span className="font-semibold text-neutral-900">
                {activeOption?.title}
              </span>
            </div>
            <div className="flex justify-between items-center text-neutral-500">
              <span>Dates:</span>
              <span className="font-semibold text-neutral-900">
                {checkIn} to {checkOut}
              </span>
            </div>
            <div className="flex justify-between items-center text-neutral-500 pt-2 border-t border-neutral-200">
              <span>Total Lock Price:</span>
              <span className="font-extrabold text-neutral-900 text-base">
                ₹{activeHold.totalAmount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <ShieldCheck size={14} />
              <span>Exclusive Sanctuary Protected</span>
            </p>
            <p>
              All configurations on the physical estate have been locked in PostgreSQL. Complete checkout before the timer expires to secure your stay.
            </p>
          </div>

          {paymentError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{paymentError}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleProceedToPayment}
            disabled={isPaying}
            className="w-full py-4 bg-black hover:bg-neutral-800 disabled:bg-neutral-500 text-white text-xs uppercase tracking-wider font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPaying ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Launching Razorpay Secure Gateway...</span>
              </>
            ) : (
              <>
                <CreditCard size={15} />
                <span>Pay with Razorpay & Confirm</span>
                <span>→</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveHold(null);
              setRefreshKey((k) => k + 1);
            }}
            disabled={isPaying}
            className="w-full text-center text-xs text-neutral-500 hover:text-black hover:underline disabled:opacity-50 cursor-pointer"
          >
            Release Hold & Choose Different Dates
          </button>
        </div>
      ) : (
        /* 3. Availability Check & Hold Form */
        <>
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                {lockConfiguration ? "SELECTED ACCOMMODATION" : "AVAILABILITY CHECK"}
              </span>
              <h4 className="text-lg font-bold text-neutral-900">
                {lockConfiguration
                  ? activeOption?.title || "Check Dates"
                  : "Check Property Availability"}
              </h4>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/50 block">
                ₹{Number(activeOption?.basePricePerNight || 8500).toLocaleString("en-IN")}/nt
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            {/* Configuration Selector: Render only if NOT locked */}
            {!lockConfiguration && (
              <div className="p-2.5 bg-[#FCFCFC] rounded-xl border border-neutral-200 focus-within:border-black transition-colors">
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-neutral-600">
                  CONFIGURATION PREFERENCE
                </label>
                <select
                  value={effectiveConfigSlug}
                  onChange={(e) => setSelectedConfigSlug(e.target.value)}
                  className="w-full text-xs font-semibold bg-transparent border-0 p-0 text-neutral-900 focus:ring-0 focus:outline-none cursor-pointer"
                >
                  {listingOptions.map((opt) => (
                    <option key={opt.id} value={opt.slug}>
                      {opt.title} (₹{Number(opt.basePricePerNight).toLocaleString("en-IN")}/nt)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Guests Counter */}
            <div className="p-2.5 bg-[#FCFCFC] rounded-xl border border-neutral-200 focus-within:border-black transition-colors">
              <div className="flex items-center justify-between">
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-neutral-600">
                  GUESTS
                </label>
                <span className="text-[10px] text-neutral-500">
                  Max {maxGuestsForOption} guests
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-neutral-900">
                  {effectiveGuestCount} {effectiveGuestCount === 1 ? "Guest" : "Guests"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                    disabled={effectiveGuestCount <= 1}
                    className="w-6 h-6 rounded-md bg-neutral-200 disabled:opacity-40 hover:bg-neutral-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setGuestCount((c) => Math.min(maxGuestsForOption, c + 1))
                    }
                    disabled={effectiveGuestCount >= maxGuestsForOption}
                    className="w-6 h-6 rounded-md bg-neutral-200 disabled:opacity-40 hover:bg-neutral-300 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Dual Interactive Date Cards: CHECK-IN & CHECKOUT */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Check-In Card */}
              <button
                type="button"
                onClick={() => {
                  if (isCalendarOpen && activePicker === "checkIn") {
                    setIsCalendarOpen(false);
                  } else {
                    setIsCalendarOpen(true);
                    setActivePicker("checkIn");
                    if (checkIn) {
                      const [y, m] = checkIn.split("-").map(Number);
                      setCalendarMonth(new Date(y, m - 1, 1));
                    }
                  }
                }}
                className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  isCalendarOpen && activePicker === "checkIn"
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-neutral-900/30"
                    : "bg-[#FCFCFC] hover:bg-neutral-50 text-neutral-900 border-neutral-200 hover:border-neutral-400"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[9px] font-extrabold uppercase tracking-wider ${
                      isCalendarOpen && activePicker === "checkIn"
                        ? "text-neutral-300"
                        : "text-neutral-500"
                    }`}
                  >
                    CHECK-IN
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isCalendarOpen && activePicker === "checkIn"
                        ? "bg-amber-400 text-black"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    <span>{isCalendarOpen && activePicker === "checkIn" ? "Selecting" : "In"}</span>
                    <Calendar size={10} />
                  </span>
                </div>
                <div className="pt-2">
                  <p className="text-xs sm:text-sm font-bold truncate">
                    {checkIn ? formatFullDate(checkIn) : "Select date"}
                  </p>
                  <p
                    className={`text-[10px] mt-0.5 ${
                      isCalendarOpen && activePicker === "checkIn"
                        ? "text-neutral-300"
                        : "text-neutral-500"
                    }`}
                  >
                    From 14:00 PM
                  </p>
                </div>
              </button>

              {/* Checkout Card */}
              <button
                type="button"
                onClick={() => {
                  if (isCalendarOpen && activePicker === "checkOut") {
                    setIsCalendarOpen(false);
                  } else {
                    setIsCalendarOpen(true);
                    setActivePicker("checkOut");
                    if (checkOut) {
                      const [y, m] = checkOut.split("-").map(Number);
                      setCalendarMonth(new Date(y, m - 1, 1));
                    } else if (checkIn) {
                      const [y, m] = checkIn.split("-").map(Number);
                      setCalendarMonth(new Date(y, m - 1, 1));
                    }
                  }
                }}
                className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  isCalendarOpen && activePicker === "checkOut"
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-md ring-2 ring-neutral-900/30"
                    : "bg-[#FCFCFC] hover:bg-neutral-50 text-neutral-900 border-neutral-200 hover:border-neutral-400"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[9px] font-extrabold uppercase tracking-wider ${
                      isCalendarOpen && activePicker === "checkOut"
                        ? "text-neutral-300"
                        : "text-neutral-500"
                    }`}
                  >
                    CHECKOUT
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isCalendarOpen && activePicker === "checkOut"
                        ? "bg-amber-400 text-black"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    <span>{isCalendarOpen && activePicker === "checkOut" ? "Selecting" : "Out"}</span>
                    <Calendar size={10} />
                  </span>
                </div>
                <div className="pt-2">
                  <p className="text-xs sm:text-sm font-bold truncate">
                    {checkOut ? formatFullDate(checkOut) : "Select date"}
                  </p>
                  <p
                    className={`text-[10px] mt-0.5 ${
                      isCalendarOpen && activePicker === "checkOut"
                        ? "text-neutral-300"
                        : "text-neutral-500"
                    }`}
                  >
                    By 11:00 AM
                  </p>
                </div>
              </button>
            </div>

            {/* Interactive Collapsible Calendar: Only visible when clicked on date */}
            {isCalendarOpen && (
              <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-md space-y-3 animate-fade-in transition-all">
                {/* Active Selection Mode & Nights Pill */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        activePicker === "checkIn"
                          ? "bg-amber-500 animate-pulse"
                          : "bg-emerald-500"
                      }`}
                    />
                    <span>
                      {activePicker === "checkIn"
                        ? "Click arrival date below"
                        : "Click departure date below"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedNights > 0 && (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 shrink-0">
                        {selectedNights} {selectedNights === 1 ? "Night" : "Nights"} Stay
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(false)}
                      className="text-[11px] font-bold text-neutral-600 hover:text-black px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer"
                      title="Done selecting"
                    >
                      Done ✕
                    </button>
                  </div>
                </div>

                {/* Month Stepper Header */}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    disabled={
                      calendarMonth <=
                      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    }
                    className="w-7 h-7 rounded-lg hover:bg-neutral-100 disabled:opacity-25 disabled:hover:bg-transparent flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                    title="Previous month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                    <Calendar size={13} className="text-neutral-500" />
                    <span>{monthName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="w-7 h-7 rounded-lg hover:bg-neutral-100 flex items-center justify-center transition-colors cursor-pointer"
                    title="Next month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Weekday Labels (Monday to Sunday) */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <span
                      key={i}
                      className={`text-[10px] font-bold py-0.5 ${
                        i >= 5 ? "text-amber-800/80" : "text-neutral-400"
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </div>

                {/* Calendar Days Matrix */}
                <div className="grid grid-cols-7 gap-y-1 gap-x-0 text-center">
                  {daysArray.map((dateStr, idx) => {
                    if (!dateStr) {
                      return <div key={`empty-${idx}`} className="h-8" />;
                    }
                    const dayNumber = Number(dateStr.split("-")[2]);
                    const isPast = dateStr < todayStr;
                    const isStart = dateStr === checkIn;
                    const isEnd = dateStr === checkOut;
                    const isBetween =
                      checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;
                    const isHovered =
                      activePicker === "checkOut" &&
                      checkIn &&
                      hoverDate &&
                      hoverDate > checkIn &&
                      dateStr > checkIn &&
                      dateStr <= hoverDate;

                    return (
                      <div
                        key={dateStr}
                        className={`h-8 sm:h-9 flex items-center justify-center relative ${
                          isBetween
                            ? "bg-amber-100/70"
                            : isHovered
                            ? "bg-amber-50"
                            : ""
                        } ${
                          isStart && (checkOut || isHovered)
                            ? "bg-gradient-to-r from-transparent to-amber-100/70 rounded-l-full"
                            : ""
                        } ${
                          isEnd
                            ? "bg-gradient-to-l from-transparent to-amber-100/70 rounded-r-full"
                            : ""
                        }`}
                      >
                        <button
                          type="button"
                          disabled={isPast}
                          onClick={() => handleDateClick(dateStr)}
                          onMouseEnter={() => setHoverDate(dateStr)}
                          onMouseLeave={() => setHoverDate(null)}
                          className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs transition-all ${
                            isStart || isEnd
                              ? "bg-neutral-950 text-white font-bold rounded-full shadow-sm scale-105 z-10"
                              : isBetween
                              ? "text-amber-950 font-semibold"
                              : isHovered
                              ? "text-amber-900 font-semibold"
                              : isPast
                              ? "text-neutral-300 line-through cursor-not-allowed"
                              : "text-neutral-800 hover:bg-neutral-100 rounded-full cursor-pointer font-medium"
                          }`}
                        >
                          {dayNumber}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Footer with Clear Dates & Close */}
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                  <button
                    type="button"
                    onClick={() => {
                      setCheckIn("");
                      setCheckOut("");
                      setActivePicker("checkIn");
                      setAvailabilityData(null);
                    }}
                    className="text-neutral-500 hover:text-red-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw size={10} />
                    <span>Clear Dates</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCalendarOpen(false)}
                    className="font-bold text-neutral-900 hover:underline cursor-pointer"
                  >
                    Done selecting ✓
                  </button>
                </div>
              </div>
            )}

            {/* Live Availability Status */}
            {isChecking ? (
              <div className="p-3 bg-neutral-50 rounded-xl text-neutral-500 text-xs flex items-center justify-center gap-2 animate-pulse">
                <span className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin"></span>
                <span>Checking live availability...</span>
              </div>
            ) : availabilityData ? (
              availabilityData.available ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 size={16} />
                    <span>Dates Available for Exclusive Stay</span>
                  </div>
                  {availabilityData.pricing && (
                    <div className="space-y-1 pt-1 border-t border-emerald-200/60 text-emerald-900">
                      <div className="flex justify-between text-[11px]">
                        <span>
                          ₹{availabilityData.pricing.basePricePerNight.toLocaleString("en-IN")}{" "}
                          × {availabilityData.pricing.nights}{" "}
                          {availabilityData.pricing.nights === 1 ? "night" : "nights"}
                        </span>
                        <span>
                          ₹{availabilityData.pricing.baseAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Taxes & GST</span>
                        <span>
                          ₹{availabilityData.pricing.taxesAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-bold pt-1 border-t border-emerald-200 text-neutral-900">
                        <span>Total Stay Price</span>
                        <span>
                          ₹{availabilityData.pricing.totalAmount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                    <AlertCircle size={16} />
                    <span>Dates Unavailable</span>
                  </div>
                  <p className="text-rose-700 text-[11px] leading-relaxed">
                    {availabilityData.reason ||
                      "These dates are booked or held by another reservation."}
                  </p>
                </div>
              )
            ) : null}

            {/* Inline Hold / Reservation Expansion (Zero Popup Modals!) */}
            {showInlineHoldForm ? (
              <div className="p-4 bg-white rounded-2xl border border-neutral-300 shadow-sm space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                  <div>
                    <h5 className="text-xs font-bold text-neutral-900">
                      Guest Details for 15-Min Hold
                    </h5>
                    <p className="text-[10px] text-neutral-500">
                      Lock property exclusively without payment
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInlineHoldForm(false)}
                    className="text-neutral-400 hover:text-black text-xs font-bold px-2 py-1 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                {holdError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
                    {holdError}
                  </div>
                )}

                <form onSubmit={handleCreateHold} className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikramaditya Rathore"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-neutral-200 focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. guest@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-neutral-200 focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                      Phone Number / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-neutral-200 focus:border-black focus:outline-none"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isHolding}
                      className="w-full py-3 bg-black hover:bg-neutral-800 disabled:bg-neutral-500 text-white text-xs uppercase tracking-wider font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isHolding ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          <span>Acquiring Reservation Hold...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm 15-Min Hold</span>
                          <span>→</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <button
                type="button"
                disabled={isChecking || !availabilityData?.available}
                onClick={() => setShowInlineHoldForm(true)}
                className="w-full py-4 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-xs uppercase tracking-wider font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Clock size={14} />
                <span>Lock 15-Min Hold &amp; Reserve</span>
                <span>→</span>
              </button>
            )}

            <p className="text-[10px] text-center text-neutral-500 flex items-center justify-center gap-1">
              <ShieldCheck size={12} className="text-neutral-400" />
              <span>No immediate charge. Locks property exclusively for 15 minutes.</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}

