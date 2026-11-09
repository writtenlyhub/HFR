import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRazorpayWebhookSignature } from "@/lib/payment/razorpay";
import { confirmPaymentAndBooking, handlePaymentFailure } from "@/lib/payment/confirmation";

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

    // 2. Cryptographic signature check
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
      payment?: { entity?: { id?: string; order_id?: string; amount?: number; method?: string; notes?: Record<string, unknown>; error_description?: string } };
      order?: { entity?: { id?: string; amount?: number; notes?: Record<string, unknown> } };
    };

    const paymentEntity = eventPayload.payment?.entity;
    const orderEntity = eventPayload.order?.entity;

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
    }

    // 6. Record processed webhook event to ensure idempotency
    await prisma.webhookEvent.create({
      data: {
        id: eventId,
        event: eventType,
        payload: payload as object,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully.",
      eventId,
    });
  } catch (err: unknown) {
    console.error("[RazorpayWebhook] Error handling webhook:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error processing webhook." },
      { status: 500 }
    );
  }
}
