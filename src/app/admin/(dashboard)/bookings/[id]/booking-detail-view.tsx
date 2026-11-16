"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  LogIn,
  LogOut,
  Ban,
  CreditCard,
  User,
  Phone,
  Mail,
  IndianRupee,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
  FileText,
  X,
} from "lucide-react";
import {
  checkInBookingAction,
  checkOutBookingAction,
  cancelBookingAction,
  recordManualPaymentAction,
  updateGuestDetailsAction,
  addInternalNoteAction,
} from "../booking-actions";

export interface BookingDetailProps {
  booking: {
    id: string;
    bookingReference: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    specialRequests: string | null;
    status: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    guestCount: number;
    adultCount: number;
    childCount: number;
    currency: string;
    baseAmount: number;
    taxesAmount: number;
    discountAmount: number;
    totalAmount: number;
    paidAmount: number;
    refundAmount?: number | null;
    checkedInAt?: string | null;
    checkedOutAt?: string | null;
    checkInNotes?: string | null;
    checkOutNotes?: string | null;
    internalNotes?: string | null;
    cancellationReason?: string | null;
    cancelledAt?: string | null;
    createdAt: string;
    property: {
      id: string;
      name: string;
      city: string;
      slug: string;
      address: string;
    };
    listingOption: {
      id: string;
      title: string;
      slug: string;
      maxGuests: number;
    };
    payments: Array<{
      id: string;
      razorpayOrderId?: string | null;
      razorpayPaymentId?: string | null;
      amount: number;
      currency: string;
      status: string;
      method?: string | null;
      verifiedAt?: string | null;
      createdAt: string;
    }>;
    refunds: Array<{
      id: string;
      razorpayRefundId?: string | null;
      amount: number;
      status: string;
      reason?: string | null;
      processedAt?: string | null;
      createdAt: string;
    }>;
    cancellationPolicy: {
      hoursUntilCheckIn: number;
      policyName: string;
      policyDescription: string;
      refundPercentage: number;
      recommendedRefundAmount: number;
      nonRefundableAmount: number;
      isEligibleForRefund: boolean;
    };
    activityTimeline: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      actor: string;
      timestamp: string;
    }>;
  };
}

export function BookingDetailView({ booking: initialBooking }: BookingDetailProps) {
  const [booking, setBooking] = useState(initialBooking);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [manualPayModalOpen, setManualPayModalOpen] = useState(false);
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);

  // Form states
  const [opNotes, setOpNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [refundAmount, setRefundAmount] = useState<number>(
    booking.cancellationPolicy.recommendedRefundAmount
  );
  const [overridePolicy, setOverridePolicy] = useState(false);
  const [newInternalNote, setNewInternalNote] = useState("");

  const [manualPayMethod, setManualPayMethod] = useState<
    "BANK_TRANSFER" | "UPI_DIRECT" | "CASH" | "POS_TERMINAL"
  >("BANK_TRANSFER");
  const [manualPayRef, setManualPayRef] = useState("");
  const [manualPayAmount, setManualPayAmount] = useState<number>(booking.totalAmount);

  const [alertBanner, setAlertBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            Confirmed
          </span>
        );
      case "CHECKED_IN":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            In-House (Checked In)
          </span>
        );
      case "CHECKED_OUT":
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
            Checked Out
          </span>
        );
      case "PENDING_HOLD":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending Hold
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      case "REFUND_PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Refund Pending
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200">
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
            {status}
          </span>
        );
    }
  };

  // Check In Handler
  const handleCheckIn = async () => {
    startTransition(async () => {
      const res = await checkInBookingAction(booking.id, opNotes);
      if (res.success) {
        setAlertBanner({ type: "success", message: res.message || "Guest checked in." });
        setCheckInModalOpen(false);
        setOpNotes("");
        setBooking((prev) => ({
          ...prev,
          status: "CHECKED_IN",
          checkedInAt: new Date().toISOString(),
          checkInNotes: opNotes || prev.checkInNotes,
        }));
      } else {
        setAlertBanner({ type: "error", message: res.error || "Check-in failed." });
      }
    });
  };

  // Check Out Handler
  const handleCheckOut = async () => {
    startTransition(async () => {
      const res = await checkOutBookingAction(booking.id, opNotes);
      if (res.success) {
        setAlertBanner({ type: "success", message: res.message || "Guest checked out." });
        setCheckOutModalOpen(false);
        setOpNotes("");
        setBooking((prev) => ({
          ...prev,
          status: "CHECKED_OUT",
          checkedOutAt: new Date().toISOString(),
          checkOutNotes: opNotes || prev.checkOutNotes,
        }));
      } else {
        setAlertBanner({ type: "error", message: res.error || "Check-out failed." });
      }
    });
  };

  // Cancellation Handler
  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setAlertBanner({ type: "error", message: "Cancellation reason is required." });
      return;
    }

    startTransition(async () => {
      const res = await cancelBookingAction({
        bookingId: booking.id,
        reason: cancelReason.trim(),
        refundAmount,
        overridePolicy,
      });

      if (res.success) {
        setAlertBanner({ type: "success", message: res.message || "Reservation cancelled." });
        setCancelModalOpen(false);
        setBooking((prev) => ({
          ...prev,
          status: refundAmount > 0 ? "REFUND_PENDING" : "CANCELLED",
          cancellationReason: cancelReason.trim(),
          cancelledAt: new Date().toISOString(),
        }));
      } else {
        setAlertBanner({ type: "error", message: res.error || "Cancellation failed." });
      }
    });
  };

  // Manual Payment Handler
  const handleManualPayment = async () => {
    if (!manualPayRef.trim() || manualPayRef.trim().length < 4) {
      setAlertBanner({
        type: "error",
        message: "Payment transaction reference (UTR/receipt, min 4 chars) is required.",
      });
      return;
    }

    startTransition(async () => {
      const res = await recordManualPaymentAction({
        bookingId: booking.id,
        paymentMethod: manualPayMethod,
        referenceNumber: manualPayRef.trim(),
        amount: manualPayAmount,
        notes: opNotes,
      });

      if (res.success) {
        setAlertBanner({ type: "success", message: res.message || "Payment verified." });
        setManualPayModalOpen(false);
        setBooking((prev) => ({
          ...prev,
          status: "CONFIRMED",
          paidAmount: manualPayAmount,
        }));
      } else {
        setAlertBanner({ type: "error", message: res.error || "Manual payment failed." });
      }
    });
  };

  // Add Note Handler
  const handleAddNote = async () => {
    if (!newInternalNote.trim()) return;

    startTransition(async () => {
      const res = await addInternalNoteAction(booking.id, newInternalNote.trim());
      if (res.success) {
        setAlertBanner({ type: "success", message: "Internal note recorded." });
        setAddNoteModalOpen(false);
        setNewInternalNote("");
        setBooking((prev) => ({
          ...prev,
          internalNotes: prev.internalNotes
            ? `${prev.internalNotes}\n\n[Staff Note]: ${newInternalNote.trim()}`
            : `[Staff Note]: ${newInternalNote.trim()}`,
        }));
      } else {
        setAlertBanner({ type: "error", message: res.error || "Failed to add note." });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Back button and Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/bookings"
            className="w-9 h-9 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 flex items-center justify-center text-neutral-600 transition shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-serif font-extrabold tracking-tight text-neutral-900 font-mono">
                {booking.bookingReference}
              </h1>
              {renderStatusBadge(booking.status)}
            </div>
            <p className="text-xs text-neutral-500">
              Reserved on{" "}
              {new Date(booking.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {booking.property.name}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {booking.status === "CONFIRMED" && (
            <button
              onClick={() => setCheckInModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Check In</span>
            </button>
          )}

          {booking.status === "CHECKED_IN" && (
            <button
              onClick={() => setCheckOutModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Check Out</span>
            </button>
          )}

          {(booking.status === "PENDING_HOLD" || booking.status === "PAYMENT_PENDING") && (
            <button
              onClick={() => setManualPayModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          {booking.status !== "CANCELLED" &&
            booking.status !== "CHECKED_IN" &&
            booking.status !== "CHECKED_OUT" &&
            booking.status !== "COMPLETED" && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}

          <button
            onClick={() => setAddNoteModalOpen(true)}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition"
          >
            Add Note
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertBanner && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            alertBanner.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {alertBanner.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{alertBanner.message}</span>
          </div>
          <button onClick={() => setAlertBanner(null)}>
            <X className="w-4 h-4 text-neutral-400 hover:text-neutral-600" />
          </button>
        </div>
      )}

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Guest, Stay, Financial, Razorpay */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Guest Contact & Stay Information */}
          <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 font-mono">
              Guest &amp; Accommodation Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-100 space-y-2">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Guest Information
                </span>
                <div className="font-bold text-neutral-900 text-sm">{booking.customerName}</div>
                <div className="text-neutral-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{booking.customerEmail}</span>
                </div>
                <div className="text-neutral-600 flex items-center gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{booking.customerPhone || "Not provided"}</span>
                </div>
                <div className="text-neutral-500 text-[11px]">
                  Party: {booking.guestCount} Total ({booking.adultCount} Adults, {booking.childCount} Children)
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-100 space-y-2">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Accommodation
                </span>
                <div className="font-bold text-neutral-900 text-sm">{booking.property.name}</div>
                <div className="text-neutral-600 font-semibold">{booking.listingOption.title}</div>
                <p className="text-neutral-400 text-[11px]">{booking.property.address}</p>
                <div className="text-neutral-600 text-[11px] pt-1">
                  Stay:{" "}
                  <span className="font-bold text-neutral-900">
                    {new Date(booking.checkInDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    –{" "}
                    {new Date(booking.checkOutDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>{" "}
                  ({booking.nights} nights)
                </div>
              </div>
            </div>

            {booking.specialRequests && (
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900">
                <span className="font-bold block text-[10px] uppercase">Special Guest Request:</span>
                {booking.specialRequests}
              </div>
            )}
          </div>

          {/* Card 2: Financial Snapshot & Pricing Breakdown */}
          <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 font-mono">
              Immutable Price Snapshot &amp; Financial Breakdown
            </h2>

            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Base Accommodation ({booking.nights} nights):</span>
                <span className="font-mono">₹{Number(booking.baseAmount).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Applicable GST &amp; Hospitality Taxes:</span>
                <span className="font-mono">₹{Number(booking.taxesAmount).toLocaleString("en-IN")}</span>
              </div>
              {Number(booking.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Promotional Discount:</span>
                  <span className="font-mono">-₹{Number(booking.discountAmount).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-neutral-900 pt-2 border-t border-neutral-200">
                <span>Total Amount Due:</span>
                <span className="font-mono">₹{Number(booking.totalAmount).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Payment Transactions */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Razorpay Payment Transactions ({booking.payments.length})
              </span>

              {booking.payments.length === 0 ? (
                <p className="text-xs text-neutral-400 py-2">No payment captured yet.</p>
              ) : (
                booking.payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-neutral-900">
                        ₹{Number(p.amount).toLocaleString("en-IN")} ({p.method || "Razorpay"})
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {p.status}
                      </span>
                    </div>
                    {p.razorpayPaymentId && (
                      <div className="text-[11px] font-mono text-neutral-500">
                        Payment ID: {p.razorpayPaymentId}
                      </div>
                    )}
                    {p.razorpayOrderId && (
                      <div className="text-[11px] font-mono text-neutral-400">
                        Order ID: {p.razorpayOrderId}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Refunds */}
              {booking.refunds.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] uppercase font-bold text-purple-600 block">
                    Refund Transactions ({booking.refunds.length})
                  </span>
                  {booking.refunds.map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 space-y-0.5"
                    >
                      <div className="flex justify-between font-bold">
                        <span>₹{Number(r.amount).toLocaleString("en-IN")}</span>
                        <span className="text-[10px] uppercase">{r.status}</span>
                      </div>
                      {r.razorpayRefundId && (
                        <div className="text-[11px] font-mono">Razorpay Refund: {r.razorpayRefundId}</div>
                      )}
                      {r.reason && <div className="text-[11px] text-purple-800">{r.reason}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Policy, Notes, Activity Timeline */}
        <div className="lg:col-span-4 space-y-6">
          {/* Cancellation Policy Snapshot */}
          <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-2.5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono">
              Cancellation Policy Evaluation
            </span>
            <div className="space-y-1 text-xs">
              <div className="font-bold text-neutral-900">{booking.cancellationPolicy.policyName}</div>
              <p className="text-neutral-500 text-[11px] leading-relaxed">
                {booking.cancellationPolicy.policyDescription}
              </p>
              <div className="pt-2 border-t border-neutral-100 flex justify-between text-neutral-700">
                <span>Recommended Refund:</span>
                <span className="font-bold font-mono">
                  ₹{booking.cancellationPolicy.recommendedRefundAmount.toLocaleString("en-IN")} (
                  {booking.cancellationPolicy.refundPercentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-neutral-400 font-mono">
                Internal Staff Notes
              </span>
              <button
                onClick={() => setAddNoteModalOpen(true)}
                className="text-[11px] font-bold text-neutral-700 hover:underline"
              >
                + Add Note
              </button>
            </div>
            <p className="text-xs text-neutral-700 whitespace-pre-wrap bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              {booking.internalNotes || "No internal staff notes recorded."}
            </p>
          </div>

          {/* Chronological Activity Timeline */}
          <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-3">
            <span className="text-[10px] uppercase font-bold text-neutral-400 font-mono block">
              Activity History &amp; Audit Trail
            </span>

            <div className="space-y-3 text-xs">
              {booking.activityTimeline.map((item) => (
                <div key={item.id} className="relative pl-4 border-l-2 border-neutral-200 space-y-0.5">
                  <div className="font-bold text-neutral-900 text-[11px]">{item.title}</div>
                  <div className="text-neutral-600 text-[11px]">{item.description}</div>
                  <div className="text-[10px] text-neutral-400">
                    {new Date(item.timestamp).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {item.actor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Check In Modal */}
      {checkInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 font-serif">
              Confirm Guest Check-In
            </h3>
            <p className="text-xs text-neutral-500">
              Mark reservation <span className="font-mono font-bold">{booking.bookingReference}</span> as checked in.
            </p>
            <textarea
              value={opNotes}
              onChange={(e) => setOpNotes(e.target.value)}
              placeholder="Check-in notes, key hand-off, ID verified..."
              rows={3}
              className="w-full p-2.5 text-xs rounded-xl border border-neutral-200"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCheckInModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckIn}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isPending ? "Confirming..." : "Confirm Check-In"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check Out Modal */}
      {checkOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 font-serif">
              Confirm Guest Check-Out
            </h3>
            <p className="text-xs text-neutral-500">
              Complete guest departure for <span className="font-mono font-bold">{booking.bookingReference}</span>.
            </p>
            <textarea
              value={opNotes}
              onChange={(e) => setOpNotes(e.target.value)}
              placeholder="Check-out notes, minibar check, key returned..."
              rows={3}
              className="w-full p-2.5 text-xs rounded-xl border border-neutral-200"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCheckOutModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckOut}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isPending ? "Processing..." : "Confirm Check-Out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 font-serif">
              Cancel Reservation: {booking.bookingReference}
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 block">Reason (Mandatory)</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full p-2.5 text-xs rounded-xl border border-neutral-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700 block">Authorized Refund Amount (₹)</label>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
                className="w-full p-2.5 text-xs rounded-xl border border-neutral-200 font-mono"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="ovr"
                checked={overridePolicy}
                onChange={(e) => setOverridePolicy(e.target.checked)}
              />
              <label htmlFor="ovr" className="text-xs text-neutral-600">
                Confirm inventory release and refund
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Go Back
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending || !cancelReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isPending ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Modal */}
      {manualPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 font-serif">
              Record Audited Manual Payment
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Method</label>
                <select
                  value={manualPayMethod}
                  onChange={(e) =>
                    setManualPayMethod(e.target.value as "BANK_TRANSFER" | "UPI_DIRECT" | "CASH" | "POS_TERMINAL")
                  }
                  className="w-full p-2 text-xs rounded-xl border border-neutral-200"
                >
                  <option value="BANK_TRANSFER">Direct Bank Wire / NEFT</option>
                  <option value="UPI_DIRECT">Direct UPI / QR</option>
                  <option value="POS_TERMINAL">Reception POS</option>
                  <option value="CASH">Reception Cash</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Reference / UTR</label>
                <input
                  type="text"
                  value={manualPayRef}
                  onChange={(e) => setManualPayRef(e.target.value)}
                  placeholder="UTR / Receipt number"
                  className="w-full p-2 text-xs rounded-xl border border-neutral-200 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={manualPayAmount}
                  onChange={(e) => setManualPayAmount(Number(e.target.value))}
                  className="w-full p-2 text-xs rounded-xl border border-neutral-200 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setManualPayModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleManualPayment}
                disabled={isPending || !manualPayRef.trim()}
                className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isPending ? "Verifying..." : "Verify & Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {addNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 font-serif">
              Add Internal Staff Note
            </h3>
            <textarea
              value={newInternalNote}
              onChange={(e) => setNewInternalNote(e.target.value)}
              placeholder="Record operational note, dietary requirements, housekeeping instructions..."
              rows={4}
              className="w-full p-2.5 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAddNoteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={isPending || !newInternalNote.trim()}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
