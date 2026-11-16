import { prisma } from "@/lib/prisma";
import { BookingStatus, PaymentStatus, BlockReason } from "@prisma/client";

export interface CheckInParams {
  bookingId: string;
  staffEmail: string;
  staffUserId?: string;
  notes?: string;
}

export interface CheckOutParams {
  bookingId: string;
  staffEmail: string;
  staffUserId?: string;
  notes?: string;
}

export interface UpdateGuestParams {
  bookingId: string;
  staffEmail: string;
  staffUserId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  specialRequests?: string;
  internalNotes?: string;
}

export interface RecordManualPaymentParams {
  bookingId: string;
  staffEmail: string;
  staffUserId?: string;
  paymentMethod: "BANK_TRANSFER" | "UPI_DIRECT" | "CASH" | "POS_TERMINAL";
  referenceNumber: string;
  amount: number;
  notes?: string;
}

export interface BookingActivityItem {
  id: string;
  type: "CREATED" | "PAYMENT" | "CONFIRMED" | "CHECK_IN" | "CHECK_OUT" | "CANCELLED" | "REFUND" | "NOTE" | "MODIFIED";
  title: string;
  description: string;
  actor: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Executes a guest check-in operation with strict state validation.
 */
export async function executeCheckIn(params: CheckInParams) {
  const { bookingId, staffEmail, staffUserId, notes } = params;

  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("BOOKING_NOT_FOUND");
    }

    if (booking.status === BookingStatus.CHECKED_IN) {
      throw new Error("ALREADY_CHECKED_IN: Guest has already been checked in.");
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new Error(
        `INVALID_STATE_TRANSITION: Cannot check in booking currently in '${booking.status}' status. Only CONFIRMED bookings can be checked in.`
      );
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CHECKED_IN,
        checkedInAt: new Date(),
        checkInNotes: notes?.trim() || booking.checkInNotes,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: staffUserId || null,
        userEmail: staffEmail,
        action: "GUEST_CHECKED_IN",
        entityType: "Booking",
        entityId: booking.id,
        metadata: {
          bookingReference: booking.bookingReference,
          previousStatus: booking.status,
          newStatus: BookingStatus.CHECKED_IN,
          checkInNotes: notes || null,
          checkedInAt: updated.checkedInAt?.toISOString(),
        },
      },
    });

    return updated;
  });
}

/**
 * Executes a guest check-out operation with strict state validation.
 */
export async function executeCheckOut(params: CheckOutParams) {
  const { bookingId, staffEmail, staffUserId, notes } = params;

  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("BOOKING_NOT_FOUND");
    }

    if (booking.status === BookingStatus.CHECKED_OUT || booking.status === BookingStatus.COMPLETED) {
      throw new Error("ALREADY_CHECKED_OUT: Guest has already checked out.");
    }

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new Error(
        `INVALID_STATE_TRANSITION: Cannot check out booking currently in '${booking.status}' status. Only CHECKED_IN guests can be checked out.`
      );
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CHECKED_OUT,
        checkedOutAt: new Date(),
        checkOutNotes: notes?.trim() || booking.checkOutNotes,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: staffUserId || null,
        userEmail: staffEmail,
        action: "GUEST_CHECKED_OUT",
        entityType: "Booking",
        entityId: booking.id,
        metadata: {
          bookingReference: booking.bookingReference,
          previousStatus: booking.status,
          newStatus: BookingStatus.CHECKED_OUT,
          checkOutNotes: notes || null,
          checkedOutAt: updated.checkedOutAt?.toISOString(),
        },
      },
    });

    return updated;
  });
}

/**
 * Updates guest details and contact information with server-side validation.
 */
export async function updateGuestDetails(params: UpdateGuestParams) {
  const {
    bookingId,
    staffEmail,
    staffUserId,
    customerName,
    customerEmail,
    customerPhone,
    specialRequests,
    internalNotes,
  } = params;

  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    throw new Error("INVALID_EMAIL: Please provide a valid email address.");
  }

  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error("BOOKING_NOT_FOUND");
    }

    const updatePayload: Record<string, unknown> = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (customerName && customerName.trim() !== booking.customerName) {
      changes.customerName = { from: booking.customerName, to: customerName.trim() };
      updatePayload.customerName = customerName.trim();
    }
    if (customerEmail && customerEmail.trim() !== booking.customerEmail) {
      changes.customerEmail = { from: booking.customerEmail, to: customerEmail.trim() };
      updatePayload.customerEmail = customerEmail.trim();
    }
    if (customerPhone !== undefined && customerPhone !== booking.customerPhone) {
      changes.customerPhone = { from: booking.customerPhone, to: customerPhone };
      updatePayload.customerPhone = customerPhone;
    }
    if (specialRequests !== undefined && specialRequests !== booking.specialRequests) {
      changes.specialRequests = { from: booking.specialRequests, to: specialRequests };
      updatePayload.specialRequests = specialRequests;
    }
    if (internalNotes !== undefined && internalNotes !== booking.internalNotes) {
      changes.internalNotes = { from: booking.internalNotes, to: internalNotes };
      updatePayload.internalNotes = internalNotes;
    }

    if (Object.keys(updatePayload).length === 0) {
      return booking;
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: updatePayload,
    });

    await tx.auditLog.create({
      data: {
        userId: staffUserId || null,
        userEmail: staffEmail,
        action: "GUEST_DETAILS_UPDATED",
        entityType: "Booking",
        entityId: booking.id,
        metadata: {
          bookingReference: booking.bookingReference,
          changes: JSON.parse(JSON.stringify(changes)),
        },
      },
    });

    return updated;
  });
}

/**
 * Records an audited manual payment (e.g. Bank Wire / UPI Transfer / Reception Cash).
 * Strict Security:
 * - Must be authorized staff.
 * - Booking must be in PENDING_HOLD or PAYMENT_PENDING status.
 * - Creates a verified CAPTURED payment record.
 * - Converts availability hold block to BOOKING_CONFIRMED.
 * - Transitions booking status to CONFIRMED.
 */
export async function recordManualPayment(params: RecordManualPaymentParams) {
  const { bookingId, staffEmail, staffUserId, paymentMethod, referenceNumber, amount, notes } =
    params;

  if (!referenceNumber || referenceNumber.trim().length < 4) {
    throw new Error(
      "INVALID_REFERENCE: A valid payment transaction reference or UTR number (min 4 characters) is required."
    );
  }

  if (amount <= 0) {
    throw new Error("INVALID_AMOUNT: Payment amount must be greater than zero.");
  }

  return await prisma.$transaction(
    async (tx) => {
      const [booking] = await tx.$queryRaw<
        Array<{
          id: string;
          booking_reference: string;
          status: string;
          inventory_group_id: string;
          total_amount: string | number;
          check_in_date: Date;
          check_out_date: Date;
        }>
      >`
        SELECT id, booking_reference, status, inventory_group_id, total_amount, check_in_date, check_out_date
        FROM bookings
        WHERE id = ${bookingId}
        FOR UPDATE
      `;

      if (!booking) {
        throw new Error("BOOKING_NOT_FOUND");
      }

      if (booking.status === BookingStatus.CONFIRMED) {
        throw new Error("ALREADY_CONFIRMED: This reservation is already confirmed and paid.");
      }

      if (
        booking.status !== BookingStatus.PENDING_HOLD &&
        booking.status !== BookingStatus.PAYMENT_PENDING
      ) {
        throw new Error(
          `INVALID_PAYMENT_STATUS: Cannot record payment for booking in '${booking.status}' status.`
        );
      }

      const totalBookingRupees = Number(booking.total_amount);
      if (amount < totalBookingRupees) {
        throw new Error(
          `INSUFFICIENT_AMOUNT: Manual payment amount (₹${amount}) is less than booking total (₹${totalBookingRupees}). Partial manual payments are not permitted.`
        );
      }

      // Check for duplicate manual payment reference
      const existingPay = await tx.payment.findFirst({
        where: {
          razorpayPaymentId: `MANUAL_${referenceNumber.trim()}`,
        },
      });

      if (existingPay) {
        throw new Error(
          `DUPLICATE_PAYMENT_REF: Payment reference '${referenceNumber}' has already been recorded.`
        );
      }

      // 1. Create Payment record
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          razorpayPaymentId: `MANUAL_${referenceNumber.trim()}`,
          amount,
          currency: "INR",
          status: PaymentStatus.CAPTURED,
          method: paymentMethod,
          verifiedAt: new Date(),
          failureReason: null,
          rawPayload: {
            recordedBy: staffEmail,
            referenceNumber: referenceNumber.trim(),
            notes: notes || "Audited manual staff payment",
            recordedAt: new Date().toISOString(),
          },
        },
      });

      // 2. Convert hold block to BOOKING_CONFIRMED
      const existingBlock = await tx.availabilityBlock.findFirst({
        where: {
          bookingId: booking.id,
          inventoryGroupId: booking.inventory_group_id,
        },
      });

      if (existingBlock) {
        await tx.availabilityBlock.update({
          where: { id: existingBlock.id },
          data: {
            reason: BlockReason.BOOKING_CONFIRMED,
            expiresAt: null,
            notes: `Confirmed manual reservation ${booking.booking_reference} (Ref: ${referenceNumber})`,
          },
        });
      } else {
        await tx.availabilityBlock.create({
          data: {
            inventoryGroupId: booking.inventory_group_id,
            bookingId: booking.id,
            startDate: new Date(booking.check_in_date),
            endDate: new Date(booking.check_out_date),
            reason: BlockReason.BOOKING_CONFIRMED,
            expiresAt: null,
            notes: `Confirmed manual reservation ${booking.booking_reference} (Ref: ${referenceNumber})`,
          },
        });
      }

      // 3. Update booking status to CONFIRMED
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
          holdExpiresAt: null,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: staffUserId || null,
          userEmail: staffEmail,
          action: "MANUAL_PAYMENT_VERIFIED_AND_CONFIRMED",
          entityType: "Booking",
          entityId: booking.id,
          metadata: {
            bookingReference: booking.booking_reference,
            paymentId: payment.id,
            paymentMethod,
            referenceNumber: referenceNumber.trim(),
            amount,
            notes,
          },
        },
      });

      return {
        booking: updatedBooking,
        payment,
      };
    },
    { timeout: 15000 }
  );
}

/**
 * Assembles chronological booking activity timeline from AuditLog, Payment, and Refund records.
 */
export async function getBookingActivityTimeline(bookingId: string): Promise<BookingActivityItem[]> {
  const [booking, auditLogs, payments, refunds] = await Promise.all([
    prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingReference: true,
        createdAt: true,
        customerName: true,
        customerEmail: true,
        status: true,
        checkedInAt: true,
        checkedOutAt: true,
        cancelledAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        entityId: bookingId,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.refund.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!booking) return [];

  const timeline: BookingActivityItem[] = [];

  // Booking Creation
  timeline.push({
    id: `creation_${booking.id}`,
    type: "CREATED",
    title: "Reservation Created",
    description: `Reservation initialized for ${booking.customerName} (${booking.bookingReference}).`,
    actor: booking.customerEmail || "Guest",
    timestamp: booking.createdAt,
  });

  // Payments
  for (const p of payments) {
    timeline.push({
      id: `payment_${p.id}`,
      type: "PAYMENT",
      title: `Payment ${p.status}`,
      description: `₹${Number(p.amount).toLocaleString("en-IN")} via ${p.method || "Razorpay"} (Ref: ${p.razorpayPaymentId || p.razorpayOrderId || "Pending"}).`,
      actor: p.method?.startsWith("MANUAL") ? "Staff" : "Payment Gateway",
      timestamp: p.createdAt,
    });
  }

  // Refunds
  for (const r of refunds) {
    timeline.push({
      id: `refund_${r.id}`,
      type: "REFUND",
      title: `Refund ${r.status}`,
      description: `₹${Number(r.amount).toLocaleString("en-IN")} refund processed. Reason: ${r.reason || "N/A"}`,
      actor: "Finance",
      timestamp: r.createdAt,
    });
  }

  // Check In
  if (booking.checkedInAt) {
    timeline.push({
      id: `checkin_${booking.id}`,
      type: "CHECK_IN",
      title: "Guest Checked In",
      description: "Guest arrived and marked checked in by DevStay staff.",
      actor: "Staff",
      timestamp: booking.checkedInAt,
    });
  }

  // Check Out
  if (booking.checkedOutAt) {
    timeline.push({
      id: `checkout_${booking.id}`,
      type: "CHECK_OUT",
      title: "Guest Checked Out",
      description: "Guest completed stay and checked out.",
      actor: "Staff",
      timestamp: booking.checkedOutAt,
    });
  }

  // Cancellation
  if (booking.cancelledAt) {
    timeline.push({
      id: `cancel_${booking.id}`,
      type: "CANCELLED",
      title: "Reservation Cancelled",
      description: "Reservation cancelled and inventory availability released.",
      actor: "Staff",
      timestamp: booking.cancelledAt,
    });
  }

  // Add Audit Logs for notes and other actions
  for (const log of auditLogs) {
    if (
      log.action === "GUEST_DETAILS_UPDATED" ||
      log.action === "BOOKING_INTERNAL_NOTE_ADDED" ||
      log.action === "MANUAL_PAYMENT_VERIFIED_AND_CONFIRMED"
    ) {
      timeline.push({
        id: `audit_${log.id}`,
        type: "NOTE",
        title: log.action.replace(/_/g, " "),
        description: `Logged administrative action by ${log.userEmail || "Staff"}.`,
        actor: log.userEmail || "Staff",
        timestamp: log.createdAt,
        metadata: (log.metadata as Record<string, unknown>) || undefined,
      });
    }
  }

  // Sort descending by timestamp
  return timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
