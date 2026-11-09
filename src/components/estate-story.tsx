"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

interface AmenityData {
  id: string;
  name: string;
  description: string | null;
  iconName: string | null;
}

interface ListingConfigBrief {
  id: string;
  slug: string;
  title: string;
  basePricePerNight: number;
}

interface EstateStoryProps {
  amenities: AmenityData[];
  listingOptions: ListingConfigBrief[];
}

interface ConfirmedBookingDetails {
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

export function EstateStory({ amenities, listingOptions }: EstateStoryProps) {
  // Initial default dates: 14 days out for 3 nights
  const today = new Date();
  const defaultCheckIn = new Date(today.getTime() + 14 * 86400000)
    .toISOString()
    .split("T")[0];
  const defaultCheckOut = new Date(today.getTime() + 17 * 86400000)
    .toISOString()
    .split("T")[0];

  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [selectedConfigSlug, setSelectedConfigSlug] = useState(
    listingOptions[2]?.slug || "full-estate-buyout"
  );
  const [guestCount, setGuestCount] = useState(2);
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

  // Hold state
  const [showHoldModal, setShowHoldModal] = useState(false);
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
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBookingDetails | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Listen for selection events from accommodation cards
  useEffect(() => {
    const handleConfigSelect = (e: Event) => {
      const customEvent = e as CustomEvent<{ slug: string }>;
      if (customEvent.detail?.slug) {
        setSelectedConfigSlug(customEvent.detail.slug);
      }
    };
    window.addEventListener("select-configuration", handleConfigSelect);
    return () => window.removeEventListener("select-configuration", handleConfigSelect);
  }, []);

  // Live availability check effect
  useEffect(() => {
    let ignore = false;
    async function fetchAvailability() {
      if (!checkIn || !checkOut || checkIn >= checkOut) return;
      setIsChecking(true);
      try {
        const res = await fetch(
          `/api/bookings/check-availability?listingOptionSlug=${selectedConfigSlug}&checkIn=${checkIn}&checkOut=${checkOut}&guestCount=${guestCount}`
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
  }, [checkIn, checkOut, selectedConfigSlug, guestCount, refreshKey]);

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
          listingOptionSlug: selectedConfigSlug,
          checkIn,
          checkOut,
          guestCount,
          customerName: guestName,
          customerEmail: guestEmail,
          customerPhone: guestPhone,
          idempotencyKey: `hold-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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
      setShowHoldModal(false);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "Network error. Please try again.";
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
        throw new Error(verifyData.error || verifyData.message || "Payment verification failed.");
      }

      // Success! Set confirmed booking state
      const targetOption = listingOptions.find((o) => o.slug === selectedConfigSlug);
      setConfirmedBooking({
        bookingReference: verifyData.bookingReference || activeHold?.bookingReference || "",
        customerName: verifyData.booking?.customerName || guestName,
        totalAmount: activeHold?.totalAmount || 0,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        listingTitle: targetOption?.title || "Dev Stays Jaipur",
        nights: availabilityData?.pricing?.nights || 1,
        guestCount,
        paymentId: params.razorpayPaymentId,
      });

      setActiveHold(null);
      setRefreshKey((k) => k + 1);
    } catch (verErr: unknown) {
      const msg = verErr instanceof Error ? verErr.message : "Verification error.";
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
        console.warn("Razorpay script unavailable. Triggering test verification fallback.");
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
      razorpayInstance.on("payment.failed", function (failResponse: { error?: { description?: string } }) {
        setIsPaying(false);
        setPaymentError(failResponse.error?.description || "Payment failed. Please try again.");
      });

      razorpayInstance.open();
    } catch (err: unknown) {
      console.error("Payment execution error:", err);
      const msg = err instanceof Error ? err.message : "Payment failed. Please retry.";
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

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-16 border-t border-neutral-200"
      data-purpose="property-story"
      id="estate-story"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Estate Story & Amenities */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-500 uppercase">
              Heritage Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight text-neutral-900 mt-1 font-sans">
              AN ARCHITECTURAL HAVEN IN THE PINK CITY
            </h2>
          </div>

          <div className="text-neutral-700 text-sm sm:text-base leading-relaxed space-y-4">
            <p>
              Crafted with locally quarried, hand-chiseled Dholpur sandstone,{" "}
              <strong>Dev Stays</strong> is conceived as a serene residential
              sanctuary in Jaipur’s coveted Civil Lines and Raja Park belt.
              Designed around classic Rajasthani haveli geometry, every sunlit
              corner frames internal courtyards, bougainvillea verandas, and
              peaceful water features.
            </p>
            <p>
              Whether visiting as a solo creative needing quiet desk space, a
              couple seeking an authentic Jaipur retreat, or a multigenerational
              family reserving the entire estate, Dev Stays strikes the balance
              between discrete boutique luxury and genuine warmth.
            </p>
          </div>

          {/* Amenities Grid */}
          <div className="pt-6 border-t border-neutral-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-4">
              Estate Amenities & Services
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-800">
              {amenities.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-neutral-200 shadow-xs"
                >
                  <span className="material-symbols-outlined text-xl text-neutral-700">
                    {item.iconName || "stars"}
                  </span>
                  <div>
                    <span className="font-bold block text-neutral-900">
                      {item.name}
                    </span>
                    <span className="text-neutral-500 text-[11px]">
                      {item.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Fast Reservation Card */}
        <div
          className="lg:col-span-5 bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-md lg:sticky lg:top-24"
          id="sidebar-booking-card"
        >
          {/* Confirmed Booking State */}
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

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800 block">
                  Booking Reference
                </span>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono font-extrabold text-2xl text-emerald-950 tracking-tight">
                    {confirmedBooking.bookingReference}
                  </span>
                  <button
                    onClick={copyBookingRef}
                    title="Copy Booking Reference"
                    className="p-1 rounded-md hover:bg-emerald-100 text-emerald-800 transition-colors"
                  >
                    {copiedRef ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <span className="text-[10px] text-emerald-700 block">
                  Keep this code for concierge check-in
                </span>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-neutral-500">
                  <span>Guest:</span>
                  <span className="font-semibold text-neutral-900">{confirmedBooking.customerName}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>Configuration:</span>
                  <span className="font-semibold text-neutral-900">{confirmedBooking.listingTitle}</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>Dates:</span>
                  <span className="font-semibold text-neutral-900">
                    {confirmedBooking.checkInDate} to {confirmedBooking.checkOutDate} ({confirmedBooking.nights} {confirmedBooking.nights === 1 ? "night" : "nights"})
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-500">
                  <span>Party Size:</span>
                  <span className="font-semibold text-neutral-900">{confirmedBooking.guestCount} Guests</span>
                </div>
                <div className="flex justify-between items-center text-neutral-500 pt-2 border-t border-neutral-200">
                  <span>Amount Paid:</span>
                  <span className="font-extrabold text-emerald-900 text-sm">
                    ₹{confirmedBooking.totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center text-neutral-400 text-[10px]">
                  <span>Payment Receipt:</span>
                  <span className="font-mono">{confirmedBooking.paymentId}</span>
                </div>
              </div>

              <div className="p-3 bg-stone-100 rounded-xl text-[11px] text-neutral-600 space-y-1">
                <p className="font-semibold text-neutral-900">Arrival Instructions:</p>
                <p>• Check-in from 14:00 PM | Check-out by 11:00 AM</p>
                <p>• Host Apurva will contact you prior to arrival for arrival coordination.</p>
              </div>

              <button
                onClick={() => {
                  setConfirmedBooking(null);
                  setRefreshKey((k) => k + 1);
                }}
                className="w-full py-3.5 bg-black hover:bg-neutral-800 text-white text-xs uppercase tracking-wider font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Make Another Reservation</span>
              </button>
            </div>
          ) : activeHold ? (
            /* Active Hold Countdown State */
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
                    {listingOptions.find((o) => o.slug === selectedConfigSlug)?.title}
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
                  All configurations for these dates have been locked in PostgreSQL.
                  Complete checkout before the timer expires to secure your reservation.
                </p>
              </div>

              {paymentError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{paymentError}</span>
                </div>
              )}

              <button
                onClick={handleProceedToPayment}
                disabled={isPaying}
                className="w-full py-4 bg-black hover:bg-neutral-800 disabled:bg-neutral-500 text-white text-xs uppercase tracking-wider font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
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
                onClick={() => {
                  setActiveHold(null);
                  setRefreshKey((k) => k + 1);
                }}
                disabled={isPaying}
                className="w-full text-center text-xs text-neutral-500 hover:text-black hover:underline disabled:opacity-50"
              >
                Release Hold & Choose Different Dates
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                    Fast Reservation
                  </span>
                  <h4 className="text-lg font-bold text-neutral-900">
                    Check Date Availability
                  </h4>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/50">
                  Guaranteed Rate
                </span>
              </div>

              <div className="space-y-4 pt-5">
                {/* Dates Inputs */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-[#FCFCFC] rounded-xl border border-neutral-200 focus-within:border-black transition-colors">
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-neutral-600">
                      CHECK-IN
                    </label>
                    <input
                      type="date"
                      value={checkIn}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setCheckIn(e.target.value)}
                      className="w-full text-xs font-semibold bg-transparent border-0 p-0 text-neutral-900 focus:ring-0 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="p-2.5 bg-[#FCFCFC] rounded-xl border border-neutral-200 focus-within:border-black transition-colors">
                    <label className="block text-[9px] font-extrabold uppercase tracking-wider text-neutral-600">
                      CHECKOUT
                    </label>
                    <input
                      type="date"
                      value={checkOut}
                      min={checkIn}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full text-xs font-semibold bg-transparent border-0 p-0 text-neutral-900 focus:ring-0 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Configuration Selector */}
                <div className="p-2.5 bg-[#FCFCFC] rounded-xl border border-neutral-200 focus-within:border-black transition-colors">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-neutral-600">
                    CONFIGURATION PREFERENCE
                  </label>
                  <select
                    value={selectedConfigSlug}
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

                {/* Guests Counter */}
                <div className="p-2.5 bg-[#FCFCFC] rounded-xl border border-neutral-200 focus-within:border-black transition-colors">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-neutral-600">
                    GUESTS
                  </label>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-neutral-900">
                      {guestCount} {guestCount === 1 ? "Guest" : "Guests"}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                        disabled={guestCount <= 1}
                        className="w-6 h-6 rounded-md bg-neutral-200 disabled:opacity-40 hover:bg-neutral-300 font-bold text-xs flex items-center justify-center transition-colors"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuestCount((c) => Math.min(10, c + 1))}
                        disabled={guestCount >= 10}
                        className="w-6 h-6 rounded-md bg-neutral-200 disabled:opacity-40 hover:bg-neutral-300 font-bold text-xs flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

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
                              ₹{availabilityData.pricing.basePricePerNight.toLocaleString("en-IN")} × {availabilityData.pricing.nights} {availabilityData.pricing.nights === 1 ? "night" : "nights"}
                            </span>
                            <span>₹{availabilityData.pricing.baseAmount.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>Taxes & GST (12%)</span>
                            <span>₹{availabilityData.pricing.taxesAmount.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold pt-1 border-t border-emerald-200 text-neutral-900">
                            <span>Estimated Total</span>
                            <span>₹{availabilityData.pricing.totalAmount.toLocaleString("en-IN")}</span>
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
                        {availabilityData.reason || "These dates are booked or held by another reservation."}
                      </p>
                    </div>
                  )
                ) : null}

                {/* Action Button: Lock 15-Minute Hold */}
                <button
                  type="button"
                  disabled={isChecking || !availabilityData?.available}
                  onClick={() => setShowHoldModal(true)}
                  className="w-full py-4 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-xs uppercase tracking-wider font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Clock size={14} />
                  <span>Lock 15-Min Hold & Reserve</span>
                  <span>→</span>
                </button>

                <p className="text-[10px] text-center text-neutral-500 flex items-center justify-center gap-1">
                  <ShieldCheck size={12} className="text-neutral-400" />
                  <span>No immediate charge. Locks property exclusively for 15 minutes.</span>
                </p>
              </div>
            </>
          )}

          {/* 15-Minute Hold Guest Modal */}
          {showHoldModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-scale-up">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">
                      Lock Reservation
                    </h3>
                    <p className="text-xs text-neutral-500">
                      15-minute temporary exclusive inventory hold
                    </p>
                  </div>
                  <button
                    onClick={() => setShowHoldModal(false)}
                    className="text-neutral-400 hover:text-black text-xl font-light"
                  >
                    ✕
                  </button>
                </div>

                {holdError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
                    {holdError}
                  </div>
                )}

                <form onSubmit={handleCreateHold} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikramaditya Rathore"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-neutral-200 focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. guest@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-neutral-200 focus:border-black focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Phone Number / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-neutral-200 focus:border-black focus:outline-none"
                    />
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Dates:</span>
                      <span className="font-semibold text-neutral-800">
                        {checkIn} to {checkOut}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Guests:</span>
                      <span className="font-semibold text-neutral-800">
                        {guestCount} {guestCount === 1 ? "Guest" : "Guests"}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-neutral-200 font-bold">
                      <span>Total:</span>
                      <span className="text-neutral-900">
                        ₹{availabilityData?.pricing?.totalAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isHolding}
                    className="w-full py-3.5 bg-black hover:bg-neutral-800 disabled:bg-neutral-500 text-white text-xs uppercase tracking-wider font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isHolding ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Acquiring PostgreSQL Lock...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm 15-Min Hold</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
