import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  verifyRazorpayPaymentSignature,
  verifyPaymentWithRazorpayServer,
} from "@/lib/payment/razorpay";
import {
  confirmPaymentAndBooking,
  handlePaymentFailure,
} from "@/lib/payment/confirmation";

const VerifyPaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  holdToken: z.string().optional(),
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

    const {
      bookingId,
      holdToken,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod,
    } = parsed.data;

    // 1. Fetch booking for authorization and amount verification
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        holdToken: true,
        totalAmount: true,
        currency: true,
        customerEmail: true,
        bookingReference: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking reservation not found." },
        { status: 404 }
      );
    }

    // 2. Booking Ownership & Authorization Check
    const providedHoldToken = holdToken || request.headers.get("x-hold-token");
    if (booking.holdToken) {
      if (!providedHoldToken || booking.holdToken !== providedHoldToken) {
        return NextResponse.json(
          {
            success: false,
            error: "Access denied: Invalid or missing booking authorization token.",
          },
          { status: 403 }
        );
      }
    }

    // 3. Verify Razorpay Order belongs to this booking
    const registeredPayment = await prisma.payment.findFirst({
      where: {
        bookingId: booking.id,
        razorpayOrderId,
      },
    });

    if (!registeredPayment) {
      return NextResponse.json(
        {
          success: false,
          error: "Order ID mismatch: Provided Razorpay Order ID is not associated with this booking.",
        },
        { status: 400 }
      );
    }

    // 4. Cryptographic HMAC-SHA256 signature verification (Constant-time)
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
          userEmail: booking.customerEmail,
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

    // 4. Server-side payment entity verification (Amount, Currency, Captured Status, Order ID)
    const expectedPaise = Math.round(Number(booking.totalAmount) * 100);
    const serverCheck = await verifyPaymentWithRazorpayServer({
      paymentId: razorpayPaymentId,
      expectedOrderId: razorpayOrderId,
      expectedAmountPaise: expectedPaise,
      expectedCurrency: booking.currency || "INR",
    });

    if (!serverCheck.verified) {
      console.warn("[PaymentVerify] Server-side verification rejected:", serverCheck.error);

      await prisma.auditLog.create({
        data: {
          userEmail: booking.customerEmail,
          action: "PAYMENT_SERVER_VERIFICATION_REJECTED",
          entityType: "Booking",
          entityId: bookingId,
          metadata: {
            razorpayOrderId,
            razorpayPaymentId,
            reason: serverCheck.error,
          },
        },
      });

      await handlePaymentFailure({
        bookingId,
        razorpayOrderId,
        razorpayPaymentId,
        failureReason: serverCheck.error || "Payment not captured on server.",
      });

      return NextResponse.json(
        {
          success: false,
          error: serverCheck.error || "Payment verification failed against gateway records.",
        },
        { status: 400 }
      );
    }

    // 5. Transactional confirmation with PostgreSQL row-level locking & exclusive inventory guarantee
    const result = await confirmPaymentAndBooking({
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod: serverCheck.paymentDetails?.method || paymentMethod || "card/upi/netbanking",
      rawPayload: {
        verifiedVia: "api_verify",
        timestamp: new Date().toISOString(),
        paymentDetails: serverCheck.paymentDetails,
      },
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
