import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRazorpayWebhookSignature } from "@/lib/payment/razorpay";
import {
  confirmPaymentAndBooking,
  handlePaymentFailure,
} from "@/lib/payment/confirmation";
import { PaymentStatus, BookingStatus, RefundStatus } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    // 1. Read raw request body as plain text for cryptographic signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Missing x-razorpay-signature header." },
        { status: 400 }
      );
    }

    // 2. Cryptographic signature check against RAZORPAY_WEBHOOK_SECRET
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("[RazorpayWebhook] Unauthorized webhook call: Invalid signature.");
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    // 3. Parse JSON body
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Malformed JSON payload." },
        { status: 400 }
      );
    }

    // Extract event ID and type
    const eventId = (payload.event_id || payload.id || `evt_${Date.now()}_${Math.random()}`) as string;
    const eventType = (payload.event as string) || "unknown";

    // 4. Idempotency Check: Deduplicate already processed webhook events
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (existingEvent) {
      return NextResponse.json({
        success: true,
        message: "Event already processed.",
        eventId,
      });
    }

    // 5. Process event based on type
    const eventPayload = (payload.payload || {}) as {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
          method?: string;
          notes?: Record<string, unknown>;
          error_description?: string;
          status?: string;
        };
      };
      order?: {
        entity?: {
          id?: string;
          amount?: number;
          notes?: Record<string, unknown>;
        };
      };
      refund?: {
        entity?: {
          id?: string;
          payment_id?: string;
          amount?: number;
          status?: string;
          notes?: Record<string, unknown>;
        };
      };
    };

    const paymentEntity = eventPayload.payment?.entity;
    const orderEntity = eventPayload.order?.entity;
    const refundEntity = eventPayload.refund?.entity;

    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const paymentId = paymentEntity?.id || `pay_${Date.now()}`;
    const notes = paymentEntity?.notes || orderEntity?.notes || {};

    let bookingId = notes.bookingId as string | undefined;

    // If bookingId wasn't in notes, resolve via razorpayOrderId in PostgreSQL
    if (!bookingId && orderId) {
      const existingPayment = await prisma.payment.findUnique({
        where: { razorpayOrderId: orderId },
        select: { bookingId: true },
      });
      if (existingPayment) {
        bookingId = existingPayment.bookingId;
      }
    }

    // Supported Events Processing
    if (eventType === "payment.captured" || eventType === "order.paid") {
      if (bookingId && orderId) {
        await confirmPaymentAndBooking({
          bookingId,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          paymentMethod: paymentEntity?.method || "webhook",
          amountPaidPaise: paymentEntity?.amount,
          rawPayload: payload,
        });
      }
    } else if (eventType === "payment.failed") {
      await handlePaymentFailure({
        bookingId,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        failureReason: paymentEntity?.error_description || "Payment failed at gateway.",
        rawPayload: payload,
      });
    } else if (eventType === "refund.processed") {
      if (refundEntity?.payment_id) {
        const payment = await prisma.payment.findFirst({
          where: { razorpayPaymentId: refundEntity.payment_id },
          include: { booking: true },
        });

        if (payment) {
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: PaymentStatus.REFUNDED },
            });

            await tx.booking.update({
              where: { id: payment.bookingId },
              data: { status: BookingStatus.REFUNDED },
            });

            if (refundEntity.id) {
              await tx.refund.upsert({
                where: { razorpayRefundId: refundEntity.id },
                create: {
                  bookingId: payment.bookingId,
                  paymentId: payment.id,
                  razorpayRefundId: refundEntity.id,
                  amount: Number(refundEntity.amount ? refundEntity.amount / 100 : payment.amount),
                  status: RefundStatus.PROCESSED,
                  processedAt: new Date(),
                  reason: "Reconciled via Razorpay webhook",
                },
                update: {
                  status: RefundStatus.PROCESSED,
                  processedAt: new Date(),
                },
              });
            }
          });
        }
      }
    } else if (eventType === "refund.failed") {
      if (refundEntity?.id) {
        await prisma.refund.updateMany({
          where: { razorpayRefundId: refundEntity.id },
          data: { status: RefundStatus.FAILED },
        });
      }
    } else {
      // Unrecognized/unsupported event: safely ignore without changing state
      console.log(`[RazorpayWebhook] Unhandled event type '${eventType}' safely acknowledged.`);
    }

    // 6. Record processed webhook event with race-condition safety
    try {
      await prisma.webhookEvent.create({
        data: {
          id: eventId,
          event: eventType,
          payload: payload as object,
        },
      });
    } catch (createErr: unknown) {
      // If another worker inserted the event id simultaneously (P2002), handle gracefully
      if (
        typeof createErr === "object" &&
        createErr !== null &&
        "code" in createErr &&
        createErr.code === "P2002"
      ) {
        return NextResponse.json({
          success: true,
          message: "Event already recorded.",
          eventId,
        });
      }
      throw createErr;
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully.",
      eventId,
    });
  } catch (err: unknown) {
    console.error("[RazorpayWebhook] Error handling webhook:", err);
    // Return 500 so Razorpay retries if an unexpected system/database error occurs
    return NextResponse.json(
      { success: false, error: "Internal server error processing webhook." },
      { status: 500 }
    );
  }
}
