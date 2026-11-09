import { prisma } from "@/lib/prisma";
import { BookingStatus, BlockReason, PaymentStatus } from "@prisma/client";

export interface ConfirmPaymentParams {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  paymentMethod?: string;
  amountPaidPaise?: number;
  rawPayload?: unknown;
}

export interface ConfirmPaymentResult {
  success: boolean;
  alreadyConfirmed?: boolean;
  refundRequired?: boolean;
  bookingReference?: string;
  status: BookingStatus;
  message: string;
  booking?: {
    id: string;
    bookingReference: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number;
    checkInDate: Date;
    checkOutDate: Date;
    nights: number;
    guestCount: number;
    listingTitle?: string;
  };
}

/**
 * Transactional payment confirmation engine.
 * Locks the booking and inventory group with PostgreSQL pessimistic locks (FOR UPDATE),
 * converts temporary inventory holds to confirmed reservations, updates payment status to CAPTURED,
 * and maintains idempotency across multiple verification triggers (frontend + webhooks).
 */
export async function confirmPaymentAndBooking(
  params: ConfirmPaymentParams
): Promise<ConfirmPaymentResult> {
  const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMethod, rawPayload } = params;

  return await prisma.$transaction(
    async (tx) => {
      // 1. Pessimistic lock on the target booking
      const lockedBookings = await tx.$queryRaw<
        Array<{
          id: string;
          booking_reference: string;
          status: string;
          inventory_group_id: string;
          listing_option_id: string;
          check_in_date: Date;
          check_out_date: Date;
          total_amount: string | number;
          customer_name: string;
          customer_email: string;
          nights: number;
          guestCount: number;
        }>
      >`
        SELECT 
          id, 
          booking_reference, 
          status, 
          inventory_group_id, 
          listing_option_id,
          check_in_date, 
          check_out_date, 
          total_amount, 
          customer_name, 
          customer_email, 
          nights, 
          "guestCount"
        FROM bookings 
        WHERE id = ${bookingId}
        FOR UPDATE
      `;

      if (!lockedBookings || lockedBookings.length === 0) {
        throw new Error("BOOKING_NOT_FOUND");
      }

      const booking = lockedBookings[0];

      // 2. Idempotency Check: If already confirmed, return success immediately
      if (booking.status === BookingStatus.CONFIRMED) {
        const option = await tx.listingOption.findUnique({
          where: { id: booking.listing_option_id },
          select: { title: true },
        });

        return {
          success: true,
          alreadyConfirmed: true,
          bookingReference: booking.booking_reference,
          status: BookingStatus.CONFIRMED,
          message: "Booking is already confirmed and protected.",
          booking: {
            id: booking.id,
            bookingReference: booking.booking_reference,
            customerName: booking.customer_name,
            customerEmail: booking.customer_email,
            totalAmount: Number(booking.total_amount),
            checkInDate: new Date(booking.check_in_date),
            checkOutDate: new Date(booking.check_out_date),
            nights: booking.nights,
            guestCount: booking.guestCount,
            listingTitle: option?.title,
          },
        };
      }

      // 3. Lock shared inventory group to ensure exclusive modification
      await tx.$queryRaw`
        SELECT id FROM inventory_groups 
        WHERE id = ${booking.inventory_group_id} 
        FOR UPDATE
      `;

      // 4. Overlap Safety Invariant:
      // Verify no OTHER confirmed booking or active hold occupies overlapping dates on this shared inventory group
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);
      const now = new Date();

      const conflictingBlocks = await tx.availabilityBlock.findMany({
        where: {
          inventoryGroupId: booking.inventory_group_id,
          bookingId: { not: booking.id },
          startDate: { lt: checkOut },
          endDate: { gt: checkIn },
          OR: [
            { reason: { not: BlockReason.BOOKING_HOLD } }, // Other confirmed reservations, airbnb, maintenance
            {
              reason: BlockReason.BOOKING_HOLD,
              expiresAt: { gt: now }, // Active unexpired hold by another customer
            },
          ],
        },
      });

      if (conflictingBlocks.length > 0) {
        // Double-booking prevention: another reservation confirmed overlapping dates.
        // Mark payment as captured, but set booking to REFUND_PENDING to trigger automatic refund.
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: BookingStatus.REFUND_PENDING,
            cancellationReason: "Inventory conflict during payment processing: Overlapping reservation exists.",
          },
        });

        await tx.payment.upsert({
          where: { razorpayOrderId },
          create: {
            bookingId: booking.id,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature: razorpaySignature || null,
            amount: Number(booking.total_amount),
            currency: "INR",
            status: PaymentStatus.CAPTURED,
            method: paymentMethod || "razorpay",
            rawPayload: (rawPayload as object) || null,
            verifiedAt: new Date(),
          },
          update: {
            razorpayPaymentId,
            razorpaySignature: razorpaySignature || null,
            status: PaymentStatus.CAPTURED,
            method: paymentMethod || "razorpay",
            rawPayload: (rawPayload as object) || null,
            verifiedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            userEmail: booking.customer_email,
            action: "PAYMENT_OVERLAP_CONFLICT_REFUND_PENDING",
            entityType: "Booking",
            entityId: booking.id,
            metadata: {
              bookingReference: booking.booking_reference,
              razorpayOrderId,
              razorpayPaymentId,
              amount: Number(booking.total_amount),
            },
          },
        });

        return {
          success: false,
          refundRequired: true,
          bookingReference: booking.booking_reference,
          status: BookingStatus.REFUND_PENDING,
          message: "Inventory was reserved by another guest prior to payment completion. Refund has been initiated.",
          booking: {
            id: booking.id,
            bookingReference: booking.booking_reference,
            customerName: booking.customer_name,
            customerEmail: booking.customer_email,
            totalAmount: Number(booking.total_amount),
            checkInDate: checkIn,
            checkOutDate: checkOut,
            nights: booking.nights,
            guestCount: booking.guestCount,
          },
        };
      }

      // 5. Convert temporary hold availability block to permanent BOOKING_CONFIRMED block
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
            expiresAt: null, // Permanent block
            notes: `Confirmed reservation ${booking.booking_reference} (Payment ID: ${razorpayPaymentId})`,
          },
        });
      } else {
        // If the hold block had expired and was cleaned up, recreate it as permanent confirmed
        await tx.availabilityBlock.create({
          data: {
            inventoryGroupId: booking.inventory_group_id,
            bookingId: booking.id,
            startDate: checkIn,
            endDate: checkOut,
            reason: BlockReason.BOOKING_CONFIRMED,
            expiresAt: null,
            notes: `Confirmed reservation ${booking.booking_reference} (Payment ID: ${razorpayPaymentId})`,
          },
        });
      }

      // 6. Update Booking status to CONFIRMED
      const confirmedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
          holdExpiresAt: null,
        },
        include: {
          listingOption: true,
        },
      });

      // 7. Update or create the Payment record with CAPTURED status
      await tx.payment.upsert({
        where: { razorpayOrderId },
        create: {
          bookingId: booking.id,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: razorpaySignature || null,
          amount: Number(booking.total_amount),
          currency: "INR",
          status: PaymentStatus.CAPTURED,
          method: paymentMethod || "razorpay",
          rawPayload: (rawPayload as object) || null,
          verifiedAt: new Date(),
        },
        update: {
          razorpayPaymentId,
          razorpaySignature: razorpaySignature || null,
          status: PaymentStatus.CAPTURED,
          method: paymentMethod || "razorpay",
          rawPayload: (rawPayload as object) || null,
          verifiedAt: new Date(),
        },
      });

      // 8. Record audit log entry
      await tx.auditLog.create({
        data: {
          userEmail: booking.customer_email,
          action: "PAYMENT_CAPTURED_AND_CONFIRMED",
          entityType: "Booking",
          entityId: booking.id,
          metadata: {
            bookingReference: booking.booking_reference,
            razorpayOrderId,
            razorpayPaymentId,
            amount: Number(booking.total_amount),
            method: paymentMethod,
          },
        },
      });

      return {
        success: true,
        bookingReference: booking.booking_reference,
        status: BookingStatus.CONFIRMED,
        message: "Payment captured successfully and reservation confirmed.",
        booking: {
          id: confirmedBooking.id,
          bookingReference: confirmedBooking.bookingReference,
          customerName: confirmedBooking.customerName,
          customerEmail: confirmedBooking.customerEmail,
          totalAmount: Number(confirmedBooking.totalAmount),
          checkInDate: confirmedBooking.checkInDate,
          checkOutDate: confirmedBooking.checkOutDate,
          nights: confirmedBooking.nights,
          guestCount: confirmedBooking.guestCount,
          listingTitle: confirmedBooking.listingOption.title,
        },
      };
    },
    {
      timeout: 15000, // 15 second transaction timeout
    }
  );
}

/**
 * Handles failed payment attempts by logging the failure and updating payment record.
 */
export async function handlePaymentFailure(params: {
  bookingId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  failureReason?: string;
  rawPayload?: unknown;
}): Promise<void> {
  const { bookingId, razorpayOrderId, razorpayPaymentId, failureReason, rawPayload } = params;

  // Never downgrade an already CAPTURED or REFUNDED payment!
  if (razorpayOrderId) {
    await prisma.payment.updateMany({
      where: {
        razorpayOrderId,
        status: { notIn: [PaymentStatus.CAPTURED, PaymentStatus.REFUNDED] },
      },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: failureReason || "Payment failed or was cancelled by user.",
        rawPayload: (rawPayload as object) || null,
      },
    });
  }

  // Never downgrade an already CONFIRMED, REFUND_PENDING, or REFUNDED booking!
  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (
      booking &&
      booking.status !== BookingStatus.CONFIRMED &&
      booking.status !== BookingStatus.REFUND_PENDING &&
      booking.status !== BookingStatus.REFUNDED
    ) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.PAYMENT_FAILED,
        },
      });

      await prisma.auditLog.create({
        data: {
          userEmail: booking.customerEmail,
          action: "PAYMENT_FAILED",
          entityType: "Booking",
          entityId: booking.id,
          metadata: {
            bookingReference: booking.bookingReference,
            razorpayOrderId,
            razorpayPaymentId,
            failureReason,
          },
        },
      });
    }
  }
}
