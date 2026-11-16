import { prisma } from "@/lib/prisma";
import { BookingStatus, PaymentStatus, BlockReason } from "@prisma/client";
import { executeBookingRefund, RefundExecutionResult } from "@/lib/payment/refund";
import { sendBookingCancellationNotification } from "@/lib/notifications/notification-service";

export interface CancellationPolicyCalculation {
  hoursUntilCheckIn: number;
  policyName: string;
  policyDescription: string;
  refundPercentage: number;
  totalBookingAmount: number;
  paidAmount: number;
  recommendedRefundAmount: number;
  nonRefundableAmount: number;
  isEligibleForRefund: boolean;
}

/**
 * Computes cancellation policy details and calculated refund amounts based on check-in lead time.
 * Standard DevStay Policy:
 * - > 7 days (168 hours): 100% refund of total booking amount.
 * - Between 48 hours and 168 hours: 50% refund.
 * - < 48 hours: 0% refund (non-refundable).
 */
export function calculateCancellationRefund(
  checkInDate: Date,
  totalAmount: number,
  paidAmount: number,
  asOfDate: Date = new Date()
): CancellationPolicyCalculation {
  const checkInTime = new Date(checkInDate).getTime();
  const currentTime = new Date(asOfDate).getTime();
  const diffHours = (checkInTime - currentTime) / (1000 * 60 * 60);

  let refundPercentage = 0;
  let policyName = "Non-Refundable (Within 48 Hours)";
  let policyDescription =
    "Cancellations requested within 48 hours of scheduled check-in are non-refundable under standard policy terms.";

  if (diffHours >= 168) {
    refundPercentage = 100;
    policyName = "Flexible (Full Refund > 7 Days)";
    policyDescription =
      "Cancellation requested more than 7 days prior to check-in qualifies for a 100% refund.";
  } else if (diffHours >= 48) {
    refundPercentage = 50;
    policyName = "Standard (50% Refund 2-7 Days)";
    policyDescription =
      "Cancellation requested between 48 hours and 7 days prior to check-in qualifies for a 50% refund.";
  }

  // Refund cannot exceed actual captured/paid amount
  const recommendedAmount = Math.min(paidAmount, (paidAmount * refundPercentage) / 100);
  const roundedRefund = Math.round(recommendedAmount * 100) / 100;
  const nonRefundable = Math.max(0, Math.round((paidAmount - roundedRefund) * 100) / 100);

  return {
    hoursUntilCheckIn: Math.round(diffHours * 10) / 10,
    policyName,
    policyDescription,
    refundPercentage,
    totalBookingAmount: totalAmount,
    paidAmount,
    recommendedRefundAmount: roundedRefund,
    nonRefundableAmount: nonRefundable,
    isEligibleForRefund: paidAmount > 0 && roundedRefund > 0,
  };
}

export interface ExecuteCancellationParams {
  bookingId: string;
  staffEmail: string;
  staffUserId?: string;
  reason: string;
  refundAmount?: number;
  overridePolicy?: boolean;
}

export interface ExecuteCancellationResult {
  success: boolean;
  bookingReference: string;
  status: BookingStatus;
  refundResult?: RefundExecutionResult;
  inventoryReleased: boolean;
  message: string;
}

/**
 * Safely cancels a reservation:
 * 1. Validates that current state permits cancellation (cannot cancel already checked-in or checked-out stays).
 * 2. Releases shared inventory by removing the AvailabilityBlock.
 * 3. If refund amount is authorized and paid via Razorpay, triggers idempotent refund.
 * 4. Updates booking status and writes audit log.
 * 5. Dispatches guest cancellation notification.
 */
export async function executeBookingCancellation(
  params: ExecuteCancellationParams
): Promise<ExecuteCancellationResult> {
  const { bookingId, staffEmail, staffUserId, reason, refundAmount } = params;

  // 1. Transactional check and state update
  const cancelTx = await prisma.$transaction(
    async (tx) => {
      // Row-level lock on the booking
      const [booking] = await tx.$queryRaw<
        Array<{
          id: string;
          booking_reference: string;
          status: string;
          total_amount: string | number;
          check_in_date: Date;
          check_out_date: Date;
          customer_name: string;
          customer_email: string;
          inventory_group_id: string;
        }>
      >`
        SELECT 
          id, 
          booking_reference, 
          status, 
          total_amount, 
          check_in_date, 
          check_out_date, 
          customer_name, 
          customer_email,
          inventory_group_id
        FROM bookings 
        WHERE id = ${bookingId} 
        FOR UPDATE
      `;

      if (!booking) {
        throw new Error("BOOKING_NOT_FOUND");
      }

      // Check state transition constraints
      if (booking.status === BookingStatus.CANCELLED) {
        throw new Error("ALREADY_CANCELLED: This reservation has already been cancelled.");
      }

      if (
        booking.status === BookingStatus.CHECKED_IN ||
        booking.status === BookingStatus.CHECKED_OUT ||
        booking.status === BookingStatus.COMPLETED
      ) {
        throw new Error(
          `CANNOT_CANCEL_ACTIVE_OR_COMPLETED_STAY: Cannot cancel a reservation in '${booking.status}' status.`
        );
      }

      // 2. Fetch payments to check paid amount
      const capturedPayment = await tx.payment.findFirst({
        where: {
          bookingId: booking.id,
          status: PaymentStatus.CAPTURED,
        },
        orderBy: { createdAt: "desc" },
      });

      const totalPaid = capturedPayment ? Number(capturedPayment.amount) : 0;
      const finalRefundAmount =
        typeof refundAmount === "number" && refundAmount >= 0 ? refundAmount : 0;

      if (finalRefundAmount > totalPaid) {
        throw new Error(
          `REFUND_EXCEEDS_PAID: Authorized refund (₹${finalRefundAmount}) cannot exceed captured payment (₹${totalPaid}).`
        );
      }

      // 3. Release shared inventory: delete associated availability blocks
      const deletedBlocks = await tx.availabilityBlock.deleteMany({
        where: {
          bookingId: booking.id,
        },
      });

      // 4. Update booking record
      const nextStatus =
        finalRefundAmount > 0 && capturedPayment
          ? BookingStatus.REFUND_PENDING
          : BookingStatus.CANCELLED;

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: nextStatus,
          cancellationReason: reason,
          cancelledAt: new Date(),
          refundAmount: finalRefundAmount,
        },
      });

      // 5. Write Audit Log
      await tx.auditLog.create({
        data: {
          userId: staffUserId || null,
          userEmail: staffEmail,
          action: "BOOKING_CANCELLED_BY_STAFF",
          entityType: "Booking",
          entityId: booking.id,
          metadata: {
            bookingReference: booking.booking_reference,
            previousStatus: booking.status,
            newStatus: nextStatus,
            cancellationReason: reason,
            authorizedRefundAmount: finalRefundAmount,
            inventoryBlocksReleased: deletedBlocks.count,
          },
        },
      });

      return {
        booking: updatedBooking,
        capturedPayment,
        finalRefundAmount,
        inventoryReleased: deletedBlocks.count > 0,
      };
    },
    { timeout: 15000 }
  );

  let refundResult: RefundExecutionResult | undefined;

  // If a refund was authorized and a captured payment exists, execute it
  if (cancelTx.finalRefundAmount > 0 && cancelTx.capturedPayment) {
    try {
      refundResult = await executeBookingRefund({
        bookingId: cancelTx.booking.id,
        paymentId: cancelTx.capturedPayment.id,
        amountRupees: cancelTx.finalRefundAmount,
        reason: `Staff cancellation: ${reason}`,
        idempotencyKey: `cancel_refund_${cancelTx.booking.id}_${Date.now()}`,
      });
    } catch (refundErr) {
      console.error("[Cancellation] Error executing refund:", refundErr);
    }
  }

  // Send guest notification (asynchronously safe)
  try {
    await sendBookingCancellationNotification(
      cancelTx.booking.id,
      cancelTx.finalRefundAmount,
      reason
    );
  } catch (notifErr) {
    console.warn("[Cancellation] Notification failed:", notifErr);
  }

  return {
    success: true,
    bookingReference: cancelTx.booking.bookingReference,
    status: cancelTx.booking.status,
    refundResult,
    inventoryReleased: cancelTx.inventoryReleased,
    message: `Reservation ${cancelTx.booking.bookingReference} has been successfully cancelled. Availability released.`,
  };
}
