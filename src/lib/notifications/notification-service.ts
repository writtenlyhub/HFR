import { prisma } from "@/lib/prisma";

export interface NotificationResult {
  success: boolean;
  recipient: string;
  subject: string;
  delivered: boolean;
  simulated: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Checks if a notification of a specific type has already been sent for an entity to prevent duplicates.
 */
async function hasNotificationBeenSent(entityId: string, actionKey: string): Promise<boolean> {
  const existing = await prisma.auditLog.findFirst({
    where: {
      entityId,
      action: actionKey,
    },
  });
  return !!existing;
}

/**
 * Dispatch booking confirmation email to customer.
 */
export async function sendBookingConfirmationNotification(
  bookingId: string
): Promise<NotificationResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      property: true,
      listingOption: true,
    },
  });

  if (!booking) {
    return {
      success: false,
      recipient: "",
      subject: "Booking Confirmation",
      delivered: false,
      simulated: true,
      error: "Booking not found",
    };
  }

  // Idempotency: Prevent duplicate emails on repeated webhook events
  const actionKey = "NOTIFICATION_SENT_BOOKING_CONFIRMED";
  const alreadySent = await hasNotificationBeenSent(booking.id, actionKey);
  if (alreadySent) {
    return {
      success: true,
      recipient: booking.customerEmail,
      subject: `Booking Confirmed: ${booking.bookingReference}`,
      delivered: true,
      simulated: true,
    };
  }

  console.log(`[Notification] Dispatching confirmation email to: ${booking.customerEmail}`, {
    reference: booking.bookingReference,
    guest: booking.customerName,
    property: booking.property.name,
    dates: `${booking.checkInDate.toISOString().split("T")[0]} to ${booking.checkOutDate.toISOString().split("T")[0]}`,
    amount: booking.totalAmount,
  });

  // Record audit trace for notification
  await prisma.auditLog.create({
    data: {
      userEmail: booking.customerEmail,
      action: actionKey,
      entityType: "Booking",
      entityId: booking.id,
      metadata: {
        bookingReference: booking.bookingReference,
        recipient: booking.customerEmail,
        timestamp: new Date().toISOString(),
      },
    },
  });

  return {
    success: true,
    recipient: booking.customerEmail,
    subject: `Booking Confirmed: ${booking.bookingReference} - ${booking.property.name}`,
    delivered: true,
    simulated: true,
    messageId: `msg_conf_${Date.now()}`,
  };
}

/**
 * Dispatch cancellation notification to customer.
 */
export async function sendBookingCancellationNotification(
  bookingId: string,
  refundAmount: number = 0,
  reason?: string
): Promise<NotificationResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { property: true },
  });

  if (!booking) {
    return {
      success: false,
      recipient: "",
      subject: "Booking Cancellation",
      delivered: false,
      simulated: true,
      error: "Booking not found",
    };
  }

  const actionKey = "NOTIFICATION_SENT_BOOKING_CANCELLED";
  const alreadySent = await hasNotificationBeenSent(booking.id, actionKey);
  if (alreadySent) {
    return {
      success: true,
      recipient: booking.customerEmail,
      subject: `Booking Cancelled: ${booking.bookingReference}`,
      delivered: true,
      simulated: true,
    };
  }

  console.log(`[Notification] Dispatching cancellation email to: ${booking.customerEmail}`, {
    reference: booking.bookingReference,
    guest: booking.customerName,
    refundAmount,
    reason,
  });

  await prisma.auditLog.create({
    data: {
      userEmail: booking.customerEmail,
      action: actionKey,
      entityType: "Booking",
      entityId: booking.id,
      metadata: {
        bookingReference: booking.bookingReference,
        recipient: booking.customerEmail,
        refundAmount,
        reason,
        timestamp: new Date().toISOString(),
      },
    },
  });

  return {
    success: true,
    recipient: booking.customerEmail,
    subject: `Booking Cancelled: ${booking.bookingReference} - DevStay`,
    delivered: true,
    simulated: true,
    messageId: `msg_canc_${Date.now()}`,
  };
}

/**
 * Dispatch refund status notification.
 */
export async function sendRefundStatusNotification(refundId: string): Promise<NotificationResult> {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { booking: true },
  });

  if (!refund) {
    return {
      success: false,
      recipient: "",
      subject: "Refund Notification",
      delivered: false,
      simulated: true,
      error: "Refund not found",
    };
  }

  const actionKey = `NOTIFICATION_SENT_REFUND_${refund.status}`;
  const alreadySent = await hasNotificationBeenSent(refund.id, actionKey);
  if (alreadySent) {
    return {
      success: true,
      recipient: refund.booking.customerEmail,
      subject: `Refund ${refund.status}: ${refund.booking.bookingReference}`,
      delivered: true,
      simulated: true,
    };
  }

  console.log(`[Notification] Dispatching refund update to: ${refund.booking.customerEmail}`, {
    reference: refund.booking.bookingReference,
    amount: refund.amount,
    status: refund.status,
  });

  await prisma.auditLog.create({
    data: {
      userEmail: refund.booking.customerEmail,
      action: actionKey,
      entityType: "Refund",
      entityId: refund.id,
      metadata: {
        bookingId: refund.bookingId,
        refundId: refund.id,
        status: refund.status,
        amount: Number(refund.amount),
        timestamp: new Date().toISOString(),
      },
    },
  });

  return {
    success: true,
    recipient: refund.booking.customerEmail,
    subject: `Refund Processed for Booking ${refund.booking.bookingReference}`,
    delivered: true,
    simulated: true,
    messageId: `msg_rfnd_${Date.now()}`,
  };
}
