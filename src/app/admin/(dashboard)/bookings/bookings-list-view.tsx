"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Calendar,
  User,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  LogIn,
  LogOut,
  Ban,
  FileText,
  Phone,
  Mail,
  IndianRupee,
  PlusCircle,
  ShieldCheck,
  RefreshCw,
  X,
} from "lucide-react";
import {
  checkInBookingAction,
  checkOutBookingAction,
  cancelBookingAction,
  recordManualPaymentAction,
  updateGuestDetailsAction,
  addInternalNoteAction,
} from "./booking-actions";

export interface SerializedBooking {
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
  currency: string;
  baseAmount: number;
  taxesAmount: number;
  totalAmount: number;
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
}

export interface BookingsListViewProps {
  initialBookings: SerializedBooking[];
  initialPagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  initialCounts: {
    totalAll: number;
    pendingCount: number;
    confirmedCount: number;
    checkedInCount: number;
    checkedOutCount: number;
    cancelledCount: number;
    paymentPendingCount: number;
    paymentCompletedCount: number;
    refundPendingCount: number;
    refundedCount: number;
  };
  properties: Array<{
    id: string;
    name: string;
    listingOptions: Array<{ id: string; title: string }>;
  }>;
}

export function BookingsListView({
  initialBookings,
  initialPagination,
  initialCounts,
  properties,
}: BookingsListViewProps) {
  const [bookings, setBookings] = useState<SerializedBooking[]>(initialBookings);
  const [pagination, setPagination] = useState(initialPagination);
  const [counts, setCounts] = useState(initialCounts);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [checkInFrom, setCheckInFrom] = useState("");
  const [checkInTo, setCheckInTo] = useState("");
  const [isPending, startTransition] = useTransition();

  // Active selected booking for detailed drawer / modal
  const [selectedBooking, setSelectedBooking] = useState<SerializedBooking | null>(null);

  // Operation Modals
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [manualPayModalOpen, setManualPayModalOpen] = useState(false);
  const [editGuestModalOpen, setEditGuestModalOpen] = useState(false);

  // Operation form inputs
  const [opNotes, setOpNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [customRefundAmount, setCustomRefundAmount] = useState<number>(0);
  const [overridePolicy, setOverridePolicy] = useState(false);
  const [manualPayMethod, setManualPayMethod] = useState<"BANK_TRANSFER" | "UPI_DIRECT" | "CASH" | "POS_TERMINAL">("BANK_TRANSFER");
  const [manualPayRef, setManualPayRef] = useState("");
  const [manualPayAmount, setManualPayAmount] = useState<number>(0);

  // Edit guest inputs
  const [editGuestName, setEditGuestName] = useState("");
  const [editGuestEmail, setEditGuestEmail] = useState("");
  const [editGuestPhone, setEditGuestPhone] = useState("");
  const [editSpecialReq, setEditSpecialReq] = useState("");
  const [editInternalNotes, setEditInternalNotes] = useState("");

  // Feedback notifications
  const [alertBanner, setAlertBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Apply filters / pagination
  const applyFilters = (newPage: number = 1, overrideStatus?: string) => {
    startTransition(async () => {
      try {
        const queryParams = new URLSearchParams();
        const activeStatus = overrideStatus !== undefined ? overrideStatus : statusFilter;
        if (activeStatus && activeStatus !== "ALL") queryParams.set("status", activeStatus);
        if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());
        if (propertyFilter) queryParams.set("propertyId", propertyFilter);
        if (paymentStatusFilter && paymentStatusFilter !== "ALL")
          queryParams.set("paymentStatus", paymentStatusFilter);
        if (checkInFrom) queryParams.set("checkInFrom", checkInFrom);
        if (checkInTo) queryParams.set("checkInTo", checkInTo);
        queryParams.set("page", String(newPage));
        queryParams.set("pageSize", String(pagination.pageSize));

        const res = await fetch(`/api/admin/bookings/list?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch filtered reservations.");
        const data = await res.json();

        setBookings(data.bookings);
        setPagination(data.pagination);
        setCounts(data.counts);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setAlertBanner({ type: "error", message: msg });
      }
    });
  };

  const handleStatusTabClick = (st: string) => {
    setStatusFilter(st);
    applyFilters(1, st);
  };

  // Open booking details drawer
  const openDetails = (booking: SerializedBooking) => {
    setSelectedBooking(booking);
    setEditGuestName(booking.customerName);
    setEditGuestEmail(booking.customerEmail);
    setEditGuestPhone(booking.customerPhone || "");
    setEditSpecialReq(booking.specialRequests || "");
    setEditInternalNotes(booking.internalNotes || "");
    setManualPayAmount(booking.totalAmount);
    setCustomRefundAmount(booking.totalAmount);
    setAlertBanner(null);
  };

  // Execute Check-In
  const handleCheckIn = async () => {
    if (!selectedBooking) return;
    startTransition(async () => {
      const res = await checkInBookingAction(selectedBooking.id, opNotes);
      if (res.success) {
        setAlertBanner({ type: "success", message: res.message || "Checked in successfully." });
        setCheckInModalOpen(false);
        setOpNotes("");
        applyFilters(pagination.page);
        if (res.data) {
          setSelectedBooking((prev) => (prev ? { ...prev, ...(res.data as object) } : null));
        }
      } else {
        setAlertBanner({ type: "error", message: res.error || "Check-in failed." });
      }
    });
  };

  // Execute Check-Out
  const handleCheckOut = async () => {
    if (!selectedBooking) return;
    startTransition(async () => {
      const res = await checkOutBookingAction(selectedBooking.id, opNotes);
      if (res.success) {
        setAlertBanner({ type: "success", message: res.message || "Checked out successfully." });
        setCheckOutModalOpen(false);
        setOpNotes("");
        applyFilters(pagination.page);
        if (res.data) {
          setSelectedBooking((prev) => (prev ? { ...prev, ...(res.data as object) } : null));
        }
      } else {
        setAlertBanner({ type: "error", message: res.error || "Check-out failed." });
      }
    });
  };

  // Execute Cancellation
  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    if (!cancelReason.trim()) {
      setAlertBanner({ type: "error", message: "A cancellation reason is required." });
      return;
    }

    startTransition(async () => {
      const res = await cancelBookingAction({
        bookingId: selectedBooking.id,
        reason: cancelReason.trim(),
        refundAmount: customRefundAmount,
        overridePolicy,
      });

      if (res.success) {
        setAlertBanner({ type: "success", message: res.message || "Reservation cancelled." });
        setCancelModalOpen(false);
        setCancelReason("");
        applyFilters(pagination.page);
        setSelectedBooking(null);
      } else {
        setAlertBanner({ type: "error", message: res.error || "Cancellation failed." });
      }
    });
  };

  // Execute Manual Payment
  const handleManualPayment = async () => {
    if (!selectedBooking) return;
    if (!manualPayRef.trim() || manualPayRef.trim().length < 4) {
      setAlertBanner({
        type: "error",
        message: "A valid payment reference (UTR/receipt, min 4 chars) is required.",
      });
      return;
    }

    startTransition(async () => {
      const res = await recordManualPaymentAction({
        bookingId: selectedBooking.id,
        paymentMethod: manualPayMethod,
        referenceNumber: manualPayRef.trim(),
        amount: manualPayAmount,
        notes: opNotes,
      });

      if (res.success) {
        setAlertBanner({ type: "success", message: res.message || "Payment verified." });
        setManualPayModalOpen(false);
        setManualPayRef("");
        setOpNotes("");
        applyFilters(pagination.page);
        setSelectedBooking(null);
      } else {
        setAlertBanner({ type: "error", message: res.error || "Payment recording failed." });
      }
    });
  };

  // Update Guest Details
  const handleSaveGuestDetails = async () => {
    if (!selectedBooking) return;
    startTransition(async () => {
      const res = await updateGuestDetailsAction({
        bookingId: selectedBooking.id,
        customerName: editGuestName,
        customerEmail: editGuestEmail,
        customerPhone: editGuestPhone,
        specialRequests: editSpecialReq,
        internalNotes: editInternalNotes,
      });

      if (res.success) {
        setAlertBanner({ type: "success", message: "Guest details saved successfully." });
        setEditGuestModalOpen(false);
        applyFilters(pagination.page);
        if (res.data) {
          setSelectedBooking((prev) => (prev ? { ...prev, ...(res.data as object) } : null));
        }
      } else {
        setAlertBanner({ type: "error", message: res.error || "Failed to update guest details." });
      }
    });
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Confirmed
          </span>
        );
      case "CHECKED_IN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            In-House
          </span>
        );
      case "CHECKED_OUT":
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-600 border border-neutral-200">
            Checked-Out
          </span>
        );
      case "PENDING_HOLD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending Hold
          </span>
        );
      case "PAYMENT_PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            Payment Pending
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      case "REFUND_PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Refund Pending
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
            Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">
            {status}
          </span>
        );
    }
  };

  // Payment Status Badge Helper
  const renderPaymentBadge = (booking: SerializedBooking) => {
    const payment = booking.payments[0];
    if (!payment) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-500">
          Unpaid
        </span>
      );
    }

    if (payment.status === "CAPTURED") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Paid (₹{Number(payment.amount).toLocaleString("en-IN")})
        </span>
      );
    }

    if (payment.status === "REFUNDED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
          Refunded
        </span>
      );
    }

    if (payment.status === "FAILED") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Failed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
        {payment.status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Live Counter Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-extrabold tracking-tight text-neutral-900">
            Reservations &amp; Guest Operations
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-normal">
            Manage live guest arrivals, verified Razorpay payments, check-in workflows, and safe cancellations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => applyFilters(pagination.page)}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 shadow-2xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-neutral-500 ${isPending ? "animate-spin" : ""}`} />
            <span>Refresh</span>
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
          <button onClick={() => setAlertBanner(null)} className="text-neutral-400 hover:text-neutral-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200">
        {[
          { key: "ALL", label: "All Reservations", count: counts.totalAll },
          { key: "CONFIRMED", label: "Confirmed", count: counts.confirmedCount },
          { key: "CHECKED_IN", label: "In-House (Checked In)", count: counts.checkedInCount },
          { key: "CHECKED_OUT_COMPLETED", label: "Checked Out", count: counts.checkedOutCount },
          { key: "PENDING", label: "Pending Hold", count: counts.pendingCount },
          { key: "PAYMENT_COMPLETED", label: "Payment Completed", count: counts.paymentCompletedCount },
          { key: "CANCELLED", label: "Cancelled", count: counts.cancelledCount },
          { key: "REFUND_PENDING", label: "Refund Pending", count: counts.refundPendingCount },
          { key: "REFUNDED", label: "Refunded", count: counts.refundedCount },
        ].map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleStatusTabClick(tab.key)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                isActive
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200/80"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Secondary Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
            <input
              type="text"
              placeholder="Search reference, guest name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters(1)}
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
            />
          </div>

          {/* Property Filter */}
          <div>
            <select
              value={propertyFilter}
              onChange={(e) => {
                setPropertyFilter(e.target.value);
                applyFilters(1);
              }}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 transition text-neutral-700"
            >
              <option value="">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                applyFilters(1);
              }}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 transition text-neutral-700"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="CAPTURED">Paid (Captured)</option>
              <option value="CREATED">Payment Created</option>
              <option value="FAILED">Payment Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          {/* Check-In Date Range Picker */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={checkInFrom}
              onChange={(e) => {
                setCheckInFrom(e.target.value);
                applyFilters(1);
              }}
              className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white text-neutral-700"
              title="Check-In From"
            />
            <span className="text-neutral-400 text-xs">to</span>
            <input
              type="date"
              value={checkInTo}
              onChange={(e) => {
                setCheckInTo(e.target.value);
                applyFilters(1);
              }}
              className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-neutral-200 bg-neutral-50/50 focus:bg-white text-neutral-700"
              title="Check-In To"
            />
          </div>
        </div>
      </div>

      {/* Bookings Data Table */}
      <div className="rounded-2xl bg-white border border-neutral-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-200/80 bg-neutral-50/75 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="py-3.5 px-4">Reservation Ref</th>
                <th className="py-3.5 px-4">Guest Details</th>
                <th className="py-3.5 px-4">Property &amp; Option</th>
                <th className="py-3.5 px-4">Stay Dates</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Booking Status</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400 space-y-2">
                    <Calendar className="w-8 h-8 text-neutral-300 mx-auto" />
                    <p className="font-medium text-xs">No reservations matching current search or filters.</p>
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-neutral-50/60 transition group cursor-pointer"
                    onClick={() => openDetails(b)}
                  >
                    {/* Reference */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-neutral-900 group-hover:text-black">
                        {b.bookingReference}
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        {new Date(b.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>

                    {/* Guest */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900">{b.customerName}</div>
                      <div className="text-[11px] text-neutral-500 truncate max-w-[180px]">
                        {b.customerEmail}
                      </div>
                      {b.customerPhone && (
                        <div className="text-[10px] text-neutral-400 font-mono">{b.customerPhone}</div>
                      )}
                    </td>

                    {/* Property & Option */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-800">{b.property.name}</div>
                      <div className="text-[11px] text-neutral-500">{b.listingOption.title}</div>
                      <div className="text-[10px] text-neutral-400">{b.guestCount} Guests</div>
                    </td>

                    {/* Stay Dates */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-800">
                        {new Date(b.checkInDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        –{" "}
                        {new Date(b.checkOutDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <span className="text-[10px] text-neutral-500 font-medium">
                        {b.nights} {b.nights === 1 ? "night" : "nights"}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-neutral-900 font-mono">
                        ₹{Number(b.totalAmount).toLocaleString("en-IN")}
                      </div>
                      <span className="text-[10px] text-neutral-400">Taxes inc.</span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{renderStatusBadge(b.status)}</td>

                    {/* Payment */}
                    <td className="py-3.5 px-4">{renderPaymentBadge(b)}</td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetails(b)}
                          className="px-2.5 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-[11px] font-semibold text-neutral-700 transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-neutral-500" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-neutral-200/80 bg-neutral-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <div>
            Showing{" "}
            <span className="font-bold text-neutral-800">
              {bookings.length > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-bold text-neutral-800">
              {Math.min(pagination.page * pagination.pageSize, pagination.totalRecords)}
            </span>{" "}
            of <span className="font-bold text-neutral-800">{pagination.totalRecords}</span> reservations
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => applyFilters(pagination.page - 1)}
              disabled={pagination.page <= 1 || isPending}
              className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4 text-neutral-600" />
            </button>
            <span className="px-3 py-1 font-semibold text-neutral-700 text-xs">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => applyFilters(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isPending}
              className="p-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4 text-neutral-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Reservation Drawer */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-mono text-neutral-900">
                    {selectedBooking.bookingReference}
                  </h2>
                  {renderStatusBadge(selectedBooking.status)}
                </div>
                <p className="text-xs text-neutral-500">
                  {selectedBooking.property.name} · {selectedBooking.listingOption.title}
                </p>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Ribbon */}
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center gap-2">
              {/* Check-In Action */}
              {selectedBooking.status === "CONFIRMED" && (
                <button
                  onClick={() => setCheckInModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Check In Guest</span>
                </button>
              )}

              {/* Check-Out Action */}
              {selectedBooking.status === "CHECKED_IN" && (
                <button
                  onClick={() => setCheckOutModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Check Out Guest</span>
                </button>
              )}

              {/* Record Manual Payment */}
              {(selectedBooking.status === "PENDING_HOLD" ||
                selectedBooking.status === "PAYMENT_PENDING") && (
                <button
                  onClick={() => setManualPayModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Record Verified Payment</span>
                </button>
              )}

              {/* Cancel Reservation */}
              {selectedBooking.status !== "CANCELLED" &&
                selectedBooking.status !== "CHECKED_IN" &&
                selectedBooking.status !== "CHECKED_OUT" &&
                selectedBooking.status !== "COMPLETED" && (
                  <button
                    onClick={() => setCancelModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancel Reservation</span>
                  </button>
                )}

              {/* Edit Guest Details */}
              <button
                onClick={() => setEditGuestModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition"
              >
                Edit Contact Details
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Section 1: Guest Information */}
              <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                    Primary Guest
                  </span>
                  <button
                    onClick={() => setEditGuestModalOpen(true)}
                    className="text-[11px] font-bold text-neutral-700 hover:underline"
                  >
                    Edit Info
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Full Name</span>
                    <span className="font-bold text-neutral-900">{selectedBooking.customerName}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Party Size</span>
                    <span className="font-semibold text-neutral-800">{selectedBooking.guestCount} Guests</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Email Address</span>
                    <span className="font-medium text-neutral-800">{selectedBooking.customerEmail}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">Phone Number</span>
                    <span className="font-mono text-neutral-800">{selectedBooking.customerPhone || "Not provided"}</span>
                  </div>
                </div>

                {selectedBooking.specialRequests && (
                  <div className="pt-2 border-t border-neutral-100">
                    <span className="text-neutral-400 block text-[10px] uppercase font-bold">
                      Special Guest Requests
                    </span>
                    <p className="text-xs text-neutral-700 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/60 mt-1">
                      {selectedBooking.specialRequests}
                    </p>
                  </div>
                )}
              </div>

              {/* Section 2: Stay & Room Configuration */}
              <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block border-b border-neutral-100 pb-2">
                  Stay Details
                </span>
                <div className="grid grid-cols-3 gap-3 text-xs text-center">
                  <div className="p-2.5 rounded-xl bg-neutral-50">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Check-In</span>
                    <span className="font-bold text-neutral-900">
                      {new Date(selectedBooking.checkInDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Check-Out</span>
                    <span className="font-bold text-neutral-900">
                      {new Date(selectedBooking.checkOutDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-50">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block">Duration</span>
                    <span className="font-bold text-neutral-900">
                      {selectedBooking.nights} {selectedBooking.nights === 1 ? "Night" : "Nights"}
                    </span>
                  </div>
                </div>

                {selectedBooking.checkInNotes && (
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60 text-xs text-emerald-900">
                    <span className="font-bold block text-[10px] uppercase">Check-In Notes:</span>
                    {selectedBooking.checkInNotes}
                  </div>
                )}

                {selectedBooking.checkOutNotes && (
                  <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs text-neutral-800">
                    <span className="font-bold block text-[10px] uppercase">Check-Out Notes:</span>
                    {selectedBooking.checkOutNotes}
                  </div>
                )}
              </div>

              {/* Section 3: Financial & Razorpay Payment Verification */}
              <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block border-b border-neutral-100 pb-2">
                  Payment &amp; Financial Snapshot
                </span>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Base Accommodation Rate:</span>
                    <span className="font-mono">₹{Number(selectedBooking.baseAmount).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Applicable Taxes &amp; GST:</span>
                    <span className="font-mono">₹{Number(selectedBooking.taxesAmount).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-neutral-900 pt-2 border-t border-neutral-100">
                    <span>Total Amount:</span>
                    <span className="font-mono">₹{Number(selectedBooking.totalAmount).toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Captured Payments Record */}
                <div className="pt-3 border-t border-neutral-100 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Recorded Payment Transactions
                  </span>

                  {selectedBooking.payments.length === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-800">
                      No online payment captured yet. Awaiting Razorpay gateway confirmation or audited manual payment.
                    </div>
                  ) : (
                    selectedBooking.payments.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-neutral-900">
                            {p.method || "Razorpay Gateway"} · ₹{Number(p.amount).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
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
                  {selectedBooking.refunds.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <span className="text-[10px] uppercase font-bold text-purple-600 block">
                        Processed Refunds
                      </span>
                      {selectedBooking.refunds.map((r) => (
                        <div
                          key={r.id}
                          className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 space-y-0.5"
                        >
                          <div className="flex justify-between font-bold">
                            <span>₹{Number(r.amount).toLocaleString("en-IN")}</span>
                            <span className="text-[10px] uppercase">{r.status}</span>
                          </div>
                          {r.razorpayRefundId && (
                            <div className="text-[10px] font-mono">Ref ID: {r.razorpayRefundId}</div>
                          )}
                          {r.reason && <div className="text-[11px]">{r.reason}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Internal Staff Notes */}
              <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block border-b border-neutral-100 pb-2">
                  Internal Staff Notes
                </span>
                <p className="text-xs text-neutral-700 whitespace-pre-wrap bg-neutral-50 p-3 rounded-xl border border-neutral-200/60">
                  {selectedBooking.internalNotes || "No internal staff notes recorded yet."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-In Modal */}
      {checkInModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 font-serif">
              Check In Guest: {selectedBooking.customerName}
            </h3>
            <p className="text-xs text-neutral-500">
              Confirm guest arrival for reservation <span className="font-mono font-bold">{selectedBooking.bookingReference}</span>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">Check-In Notes (Optional)</label>
              <textarea
                value={opNotes}
                onChange={(e) => setOpNotes(e.target.value)}
                placeholder="ID verification status, room key assignment, guest arrival notes..."
                rows={3}
                className="w-full p-3 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

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

      {/* Check-Out Modal */}
      {checkOutModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 font-serif">
              Check Out Guest: {selectedBooking.customerName}
            </h3>
            <p className="text-xs text-neutral-500">
              Complete departure and mark reservation as completed.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">Check-Out Notes (Optional)</label>
              <textarea
                value={opNotes}
                onChange={(e) => setOpNotes(e.target.value)}
                placeholder="Room inspection notes, key return, incidental settlement..."
                rows={3}
                className="w-full p-3 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

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

      {/* Cancel Reservation Modal */}
      {cancelModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <Ban className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold font-serif text-neutral-900">
                Cancel Reservation: {selectedBooking.bookingReference}
              </h3>
            </div>

            <p className="text-xs text-neutral-600">
              Cancelling will permanently release the dates on shared inventory. This action is irreversible.
            </p>

            {/* Cancellation Policy Guidance */}
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs space-y-1.5">
              <span className="font-bold text-neutral-800 text-[11px] uppercase block">
                Standard Cancellation Policy Terms:
              </span>
              <p className="text-neutral-600 text-[11px] leading-relaxed">
                • &gt; 7 days prior to check-in: 100% refund.<br />
                • Between 48 hours and 7 days: 50% refund.<br />
                • Within 48 hours: Non-refundable (0% refund).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">Cancellation Reason (Mandatory)</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Guest requested cancellation, flight delay, medical emergency..."
                className="w-full p-2.5 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700">Authorized Refund Amount (₹)</label>
              <input
                type="number"
                value={customRefundAmount}
                onChange={(e) => setCustomRefundAmount(Number(e.target.value))}
                className="w-full p-2.5 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
              />
              <span className="text-[10px] text-neutral-400">
                Maximum refundable: ₹{Number(selectedBooking.totalAmount).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="overrideCheck"
                checked={overridePolicy}
                onChange={(e) => setOverridePolicy(e.target.checked)}
                className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <label htmlFor="overrideCheck" className="text-xs text-neutral-600 cursor-pointer">
                I understand this will release shared estate availability and initiate refund if authorized.
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelBooking}
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
      {manualPayModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 font-serif">
              Record Audited Manual Payment
            </h3>
            <p className="text-xs text-neutral-500">
              Verify an offline or direct bank transfer for reservation{" "}
              <span className="font-mono font-bold">{selectedBooking.bookingReference}</span>.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Payment Method</label>
                <select
                  value={manualPayMethod}
                  onChange={(e) =>
                    setManualPayMethod(e.target.value as "BANK_TRANSFER" | "UPI_DIRECT" | "CASH" | "POS_TERMINAL")
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white"
                >
                  <option value="BANK_TRANSFER">Direct Bank Wire / NEFT / IMPS</option>
                  <option value="UPI_DIRECT">Direct QR / UPI Transfer</option>
                  <option value="POS_TERMINAL">Reception POS Terminal</option>
                  <option value="CASH">Cash at Property Desk</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Transaction Reference / UTR Number
                </label>
                <input
                  type="text"
                  value={manualPayRef}
                  onChange={(e) => setManualPayRef(e.target.value)}
                  placeholder="e.g. UTR1948204928 or CASH_REC_08"
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">
                  Verified Payment Amount (₹)
                </label>
                <input
                  type="number"
                  value={manualPayAmount}
                  onChange={(e) => setManualPayAmount(Number(e.target.value))}
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Staff Notes</label>
                <textarea
                  value={opNotes}
                  onChange={(e) => setOpNotes(e.target.value)}
                  placeholder="Verified by bank statement / receipt issued to guest..."
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-200"
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
                {isPending ? "Recording..." : "Verify & Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Guest Details Modal */}
      {editGuestModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 font-serif">
              Edit Guest Contact Information
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Customer Full Name</label>
                <input
                  type="text"
                  value={editGuestName}
                  onChange={(e) => setEditGuestName(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={editGuestEmail}
                  onChange={(e) => setEditGuestEmail(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editGuestPhone}
                  onChange={(e) => setEditGuestPhone(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-200 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Special Requests</label>
                <textarea
                  value={editSpecialReq}
                  onChange={(e) => setEditSpecialReq(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-200"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">Internal Staff Notes</label>
                <textarea
                  value={editInternalNotes}
                  onChange={(e) => setEditInternalNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-xl border border-neutral-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditGuestModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGuestDetails}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isPending ? "Saving..." : "Save Details"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
