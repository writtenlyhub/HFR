"use server";

import { requireAdminSession } from "@/auth";
import { revalidatePath as nextRevalidatePath } from "next/cache";
import {
  executeCheckIn,
  executeCheckOut,
  updateGuestDetails,
  recordManualPayment,
} from "@/lib/booking/booking-operations";
import { executeBookingCancellation } from "@/lib/booking/booking-cancellation";
import { getBookingsList, BookingListFilterParams } from "@/lib/booking/booking-queries";
import { prisma } from "@/lib/prisma";

function safeRevalidatePath(path: string) {
  try {
    nextRevalidatePath(path);
  } catch {
    // Gracefully ignore during CLI integration tests where static generation store is not active
  }
}

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * Marks a confirmed booking as checked in.
 */
export async function checkInBookingAction(
  bookingId: string,
  notes?: string
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const updated = await executeCheckIn({
      bookingId,
      staffEmail: auth.user.email || "admin@devstaysjaipur.com",
      staffUserId: auth.user.id,
      notes,
    });

    safeRevalidatePath("/admin/bookings");
    safeRevalidatePath(`/admin/bookings/${bookingId}`);
    safeRevalidatePath("/admin/dashboard");
    safeRevalidatePath("/admin/calendar");

    return {
      success: true,
      message: `Guest ${updated.customerName} successfully checked in.`,
      data: updated,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Marks a checked-in booking as checked out.
 */
export async function checkOutBookingAction(
  bookingId: string,
  notes?: string
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const updated = await executeCheckOut({
      bookingId,
      staffEmail: auth.user.email || "admin@devstaysjaipur.com",
      staffUserId: auth.user.id,
      notes,
    });

    safeRevalidatePath("/admin/bookings");
    safeRevalidatePath(`/admin/bookings/${bookingId}`);
    safeRevalidatePath("/admin/dashboard");
    safeRevalidatePath("/admin/calendar");

    return {
      success: true,
      message: `Guest ${updated.customerName} successfully checked out.`,
      data: updated,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Safely cancels a booking and releases shared inventory with optional refund processing.
 */
export async function cancelBookingAction(input: {
  bookingId: string;
  reason: string;
  refundAmount?: number;
  overridePolicy?: boolean;
}): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const res = await executeBookingCancellation({
      bookingId: input.bookingId,
      staffEmail: auth.user.email || "admin@devstaysjaipur.com",
      staffUserId: auth.user.id,
      reason: input.reason,
      refundAmount: input.refundAmount,
      overridePolicy: input.overridePolicy,
    });

    safeRevalidatePath("/admin/bookings");
    safeRevalidatePath(`/admin/bookings/${input.bookingId}`);
    safeRevalidatePath("/admin/dashboard");
    safeRevalidatePath("/admin/calendar");

    return {
      success: true,
      message: res.message,
      data: res,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Updates guest contact info or internal notes.
 */
export async function updateGuestDetailsAction(input: {
  bookingId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  specialRequests?: string;
  internalNotes?: string;
}): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const updated = await updateGuestDetails({
      bookingId: input.bookingId,
      staffEmail: auth.user.email || "admin@devstaysjaipur.com",
      staffUserId: auth.user.id,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      specialRequests: input.specialRequests,
      internalNotes: input.internalNotes,
    });

    safeRevalidatePath("/admin/bookings");
    safeRevalidatePath(`/admin/bookings/${input.bookingId}`);

    return {
      success: true,
      message: "Guest details and internal notes updated successfully.",
      data: updated,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Records an audited manual offline payment (Bank Wire, UPI, Cash).
 */
export async function recordManualPaymentAction(input: {
  bookingId: string;
  paymentMethod: "BANK_TRANSFER" | "UPI_DIRECT" | "CASH" | "POS_TERMINAL";
  referenceNumber: string;
  amount: number;
  notes?: string;
}): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const res = await recordManualPayment({
      bookingId: input.bookingId,
      staffEmail: auth.user.email || "admin@devstaysjaipur.com",
      staffUserId: auth.user.id,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber,
      amount: input.amount,
      notes: input.notes,
    });

    safeRevalidatePath("/admin/bookings");
    safeRevalidatePath(`/admin/bookings/${input.bookingId}`);
    safeRevalidatePath("/admin/dashboard");
    safeRevalidatePath("/admin/calendar");

    return {
      success: true,
      message: `Manual payment (₹${input.amount.toLocaleString("en-IN")}) verified and confirmed.`,
      data: res,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Appends internal notes to a reservation with an audit trail entry.
 */
export async function addInternalNoteAction(
  bookingId: string,
  newNote: string
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return { success: false, error: "Booking not found." };
    }

    const timestampStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const formattedNote = `[${timestampStr} - ${auth.user.email || "Staff"}]: ${newNote.trim()}`;
    const combinedNotes = booking.internalNotes
      ? `${booking.internalNotes}\n\n${formattedNote}`
      : formattedNote;

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { internalNotes: combinedNotes },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.user.id,
        userEmail: auth.user.email || "admin@devstaysjaipur.com",
        action: "BOOKING_INTERNAL_NOTE_ADDED",
        entityType: "Booking",
        entityId: bookingId,
        metadata: {
          note: newNote.trim(),
        },
      },
    });

    safeRevalidatePath(`/admin/bookings/${bookingId}`);

    return {
      success: true,
      message: "Internal note recorded successfully.",
      data: updated,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Fetches filtered bookings on demand from client components.
 */
export async function fetchBookingsAction(params: BookingListFilterParams) {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    throw new Error(auth.error || "Unauthorized");
  }

  return await getBookingsList(params);
}
