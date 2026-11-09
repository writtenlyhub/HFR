import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyRazorpayPaymentSignature } from "@/lib/payment/razorpay";
import { confirmPaymentAndBooking, handlePaymentFailure } from "@/lib/payment/confirmation";

const VerifyPaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  razorpayOrderId: z.string().min(1, "Razorpay Order ID is required"),
  razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),
  razorpaySignature: z.string().min(1, "Razorpay Signature is required"),
  paymentMethod: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = VerifyPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment verification payload",
          details: parsed.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentMethod } =
      parsed.data;

    // 1. Cryptographic HMAC-SHA256 signature verification
    const isValidSignature = verifyRazorpayPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValidSignature) {
      console.warn("[PaymentVerify] Tampered or invalid signature attempt:", {
        bookingId,
        razorpayOrderId,
        razorpayPaymentId,
      });

      await prisma.auditLog.create({
        data: {
          action: "PAYMENT_SIGNATURE_TAMPER_DETECTED",
          entityType: "Booking",
          entityId: bookingId,
          metadata: {
            razorpayOrderId,
            razorpayPaymentId,
            reason: "HMAC-SHA256 signature verification mismatch",
          },
        },
      });

      await handlePaymentFailure({
        bookingId,
        razorpayOrderId,
        razorpayPaymentId,
        failureReason: "HMAC-SHA256 signature verification failed.",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Payment verification failed: Signature mismatch or security check failed.",
        },
        { status: 400 }
      );
    }

    // 2. Transactional confirmation with PostgreSQL row-level locking & exclusive inventory guarantee
    const result = await confirmPaymentAndBooking({
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod: paymentMethod || "card/upi/netbanking",
      rawPayload: { verifiedVia: "api_verify", timestamp: new Date().toISOString() },
    });

    if (!result.success && result.refundRequired) {
      return NextResponse.json(
        {
          success: false,
          refundRequired: true,
          bookingReference: result.bookingReference,
          status: result.status,
          message: result.message,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      bookingReference: result.bookingReference,
      status: result.status,
      message: result.message,
      booking: result.booking,
    });
  } catch (err: unknown) {
    console.error("[Payment API] verify unhandled error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error verifying payment." },
      { status: 500 }
    );
  }
}
