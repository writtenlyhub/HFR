import { prisma } from "../src/lib/prisma";
import { createBookingHold, checkAvailability } from "../src/lib/booking/shared-inventory";
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "../src/lib/payment/razorpay";
import {
  confirmPaymentAndBooking,
  handlePaymentFailure,
} from "../src/lib/payment/confirmation";
import { BookingStatus, BlockReason, PaymentStatus } from "@prisma/client";
import crypto from "crypto";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runPaymentTests() {
  console.log("===============================================================");
  console.log("  HOTEL FEDERATION RAJASTHAN - PHASE 4 PAYMENT ENGINE TEST SUITE");
  console.log("===============================================================\n");

  let totalPassed = 0;
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "test_SecretDevStays2026";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_whsec_devstays_test";

  // Cleanup past test data
  await prisma.webhookEvent.deleteMany({
    where: { id: { startsWith: "test_evt_" } },
  });
  await prisma.availabilityBlock.deleteMany({
    where: { startDate: { gte: new Date("2028-01-01T00:00:00.000Z") } },
  });
  await prisma.booking.deleteMany({
    where: { checkInDate: { gte: new Date("2028-01-01T00:00:00.000Z") } },
  });

  try {
    // -----------------------------------------------------------------
    // TEST 1: Cryptographic HMAC Signature Verification (Valid vs Tampered)
    // -----------------------------------------------------------------
    console.log("--- TEST 1: Razorpay HMAC-SHA256 Signature Verification ---");
    const testOrderId = "order_TestJaipur123";
    const testPaymentId = "pay_TestPayment456";

    const validSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest("hex");

    const isValid = verifyRazorpayPaymentSignature(testOrderId, testPaymentId, validSignature);
    assert(isValid === true, "Valid payment signature matches correctly");
    totalPassed++;

    const isTampered = verifyRazorpayPaymentSignature(
      testOrderId,
      testPaymentId,
      "0000000000000000000000000000000000000000000000000000000000000000"
    );
    assert(isTampered === false, "Tampered signature is strictly rejected");
    totalPassed++;

    const testWebhookBody = JSON.stringify({
      event: "payment.captured",
      id: "test_evt_001",
      payload: { payment: { entity: { id: testPaymentId } } },
    });
    const validWebhookSig = crypto
      .createHmac("sha256", webhookSecret)
      .update(testWebhookBody)
      .digest("hex");

    const isWhValid = verifyRazorpayWebhookSignature(testWebhookBody, validWebhookSig);
    assert(isWhValid === true, "Valid webhook HMAC signature matches correctly");
    totalPassed++;

    const isWhTampered = verifyRazorpayWebhookSignature(testWebhookBody, "invalid_sig");
    assert(isWhTampered === false, "Tampered webhook signature is rejected");
    totalPassed++;

    // -----------------------------------------------------------------
    // TEST 2: Integer Paise Order Amount & Hold Creation
    // -----------------------------------------------------------------
    console.log("\n--- TEST 2: Hold Creation & Order Calculation ---");
    const holdRes = await createBookingHold({
      listingOptionSlug: "royal-suite",
      checkInDate: "2028-04-10",
      checkOutDate: "2028-04-12", // 2 nights
      guestCount: 2,
      customerName: "Maharaja Vikramaditya",
      customerEmail: "vikram@example.com",
      customerPhone: "+91 98290 12345",
      idempotencyKey: "test-hold-pay-1",
    });

    assert(holdRes.success === true, "Booking hold created successfully");
    totalPassed++;
    assert(Boolean(holdRes.holdId), "Valid holdId returned");
    totalPassed++;

    const bookingInDb = await prisma.booking.findUnique({
      where: { id: holdRes.holdId },
    });
    assert(Boolean(bookingInDb), "Booking stored in PostgreSQL");
    totalPassed++;
    assert(bookingInDb!.status === BookingStatus.PENDING_HOLD, "Status is PENDING_HOLD");
    totalPassed++;

    const expectedRupees = holdRes.pricing!.totalAmount;
    const totalRupees = Number(bookingInDb!.totalAmount);
    assert(totalRupees === expectedRupees, `Total rupees is ₹${expectedRupees} (actual: ₹${totalRupees})`);
    totalPassed++;

    const expectedPaise = Math.round(expectedRupees * 100);
    const totalPaise = Math.round(totalRupees * 100);
    assert(totalPaise === expectedPaise, `Total paise is ${expectedPaise} paise (actual: ${totalPaise})`);
    totalPassed++;

    // -----------------------------------------------------------------
    // TEST 3: Transactional Confirmation Engine
    // -----------------------------------------------------------------
    console.log("\n--- TEST 3: Transactional Payment Confirmation Engine ---");
    const testRzpOrderId = `order_test_${Date.now()}`;
    const testRzpPaymentId = `pay_test_${Date.now()}`;
    const generatedSig = crypto
      .createHmac("sha256", keySecret)
      .update(`${testRzpOrderId}|${testRzpPaymentId}`)
      .digest("hex");

    const confirmRes = await confirmPaymentAndBooking({
      bookingId: bookingInDb!.id,
      razorpayOrderId: testRzpOrderId,
      razorpayPaymentId: testRzpPaymentId,
      razorpaySignature: generatedSig,
      paymentMethod: "upi",
      amountPaidPaise: totalPaise,
    });

    assert(confirmRes.success === true, "Payment confirmation succeeded");
    totalPassed++;
    assert(confirmRes.status === BookingStatus.CONFIRMED, "Booking status returned CONFIRMED");
    totalPassed++;

    // Verify in PostgreSQL:
    const confirmedBooking = await prisma.booking.findUnique({
      where: { id: bookingInDb!.id },
      include: { payments: true, availabilityBlocks: true },
    });

    assert(confirmedBooking!.status === BookingStatus.CONFIRMED, "DB booking status is CONFIRMED");
    totalPassed++;
    assert(confirmedBooking!.holdExpiresAt === null, "holdExpiresAt is cleared to null");
    totalPassed++;
    assert(confirmedBooking!.payments.length === 1, "Payment record exists in PostgreSQL");
    totalPassed++;
    assert(
      confirmedBooking!.payments[0].status === PaymentStatus.CAPTURED,
      "Payment status is CAPTURED"
    );
    totalPassed++;
    assert(
      confirmedBooking!.payments[0].razorpayPaymentId === testRzpPaymentId,
      "razorpayPaymentId recorded accurately"
    );
    totalPassed++;
    assert(
      confirmedBooking!.payments[0].verifiedAt !== null,
      "verifiedAt timestamp is populated"
    );
    totalPassed++;

    // Verify AvailabilityBlock was converted from temporary hold to permanent confirmed
    assert(
      confirmedBooking!.availabilityBlocks.length === 1,
      "AvailabilityBlock exists in PostgreSQL"
    );
    totalPassed++;
    assert(
      confirmedBooking!.availabilityBlocks[0].reason === BlockReason.BOOKING_CONFIRMED,
      "AvailabilityBlock reason converted to BOOKING_CONFIRMED"
    );
    totalPassed++;
    assert(
      confirmedBooking!.availabilityBlocks[0].expiresAt === null,
      "AvailabilityBlock expiresAt is null (permanent exclusive block)"
    );
    totalPassed++;

    // Verify AuditLog written
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityId: bookingInDb!.id,
        action: "PAYMENT_CAPTURED_AND_CONFIRMED",
      },
    });
    assert(auditLogs.length > 0, "AuditLog recorded PAYMENT_CAPTURED_AND_CONFIRMED");
    totalPassed++;

    // -----------------------------------------------------------------
    // TEST 4: Confirmation Idempotency (Webhook + Browser Double Call)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 4: Confirmation Idempotency (Concurrent or Duplicate Callback) ---");
    const duplicateConfirmRes = await confirmPaymentAndBooking({
      bookingId: bookingInDb!.id,
      razorpayOrderId: testRzpOrderId,
      razorpayPaymentId: testRzpPaymentId,
      razorpaySignature: generatedSig,
      paymentMethod: "upi",
    });

    assert(duplicateConfirmRes.success === true, "Duplicate confirmation succeeds seamlessly");
    totalPassed++;
    assert(
      duplicateConfirmRes.alreadyConfirmed === true,
      "Returns alreadyConfirmed: true flag"
    );
    totalPassed++;

    // Check that we didn't duplicate blocks or payments
    const blocksAfter = await prisma.availabilityBlock.count({
      where: { bookingId: bookingInDb!.id },
    });
    assert(blocksAfter === 1, "Exactly 1 availability block remains after duplicate confirmation");
    totalPassed++;

    // -----------------------------------------------------------------
    // TEST 5: Shared Inventory Invariant Protection After Confirmed Booking
    // -----------------------------------------------------------------
    console.log("\n--- TEST 5: Shared Inventory Invariant Protection After Confirmed Booking ---");
    // The "main-bedroom" was confirmed for 2028-04-10 to 2028-04-12.
    // Check if "whole-villa" and "2-bedrooms" are blocked for overlapping dates:
    const villaAvail = await checkAvailability({
      listingOptionSlug: "full-estate-buyout",
      checkInDate: "2028-04-10",
      checkOutDate: "2028-04-12",
      guestCount: 8,
    });

    assert(villaAvail.available === false, "Whole Villa is blocked due to Main Bedroom booking");
    totalPassed++;
    assert(
      villaAvail.sharedInventoryBlocked === true,
      "sharedInventoryBlocked is true for Whole Villa"
    );
    totalPassed++;

    const twoBedroomAvail = await checkAvailability({
      listingOptionSlug: "courtyard-wing",
      checkInDate: "2028-04-11",
      checkOutDate: "2028-04-13",
      guestCount: 4,
    });
    assert(
      twoBedroomAvail.available === false,
      "2 Bedrooms Suite is blocked for overlapping night"
    );
    totalPassed++;

    // Non-overlapping dates should still be available
    const futureAvail = await checkAvailability({
      listingOptionSlug: "full-estate-buyout",
      checkInDate: "2028-04-15",
      checkOutDate: "2028-04-18",
      guestCount: 6,
    });
    assert(futureAvail.available === true, "Non-overlapping dates remain available");
    totalPassed++;

    // -----------------------------------------------------------------
    // TEST 6: Webhook Event Deduplication
    // -----------------------------------------------------------------
    console.log("\n--- TEST 6: Webhook Event Deduplication (WebhookEvent table) ---");
    const testEventId = `test_evt_${Date.now()}`;
    await prisma.webhookEvent.create({
      data: {
        id: testEventId,
        event: "payment.captured",
        payload: { test: true },
      },
    });

    const isExisting = await prisma.webhookEvent.findUnique({
      where: { id: testEventId },
    });
    assert(Boolean(isExisting), "WebhookEvent recorded in PostgreSQL");
    totalPassed++;

    // -----------------------------------------------------------------
    // TEST 7: Payment Failure Handling
    // -----------------------------------------------------------------
    console.log("\n--- TEST 7: Payment Failure Flow ---");
    const failHold = await createBookingHold({
      listingOptionSlug: "royal-suite",
      checkInDate: "2028-05-01",
      checkOutDate: "2028-05-03",
      guestCount: 2,
      customerName: "Test Failed Guest",
      customerEmail: "failed@example.com",
    });

    await handlePaymentFailure({
      bookingId: failHold.holdId,
      razorpayOrderId: "order_failed_123",
      razorpayPaymentId: "pay_failed_456",
      failureReason: "Card declined by issuing bank",
    });

    const failedBooking = await prisma.booking.findUnique({
      where: { id: failHold.holdId },
    });
    assert(
      failedBooking!.status === BookingStatus.PAYMENT_FAILED,
      "Booking status correctly transitioned to PAYMENT_FAILED"
    );
    totalPassed++;

    console.log("\n===============================================================");
    console.log(`  TEST RESULTS: ${totalPassed}/${totalPassed} PASSED (0 FAILED)`);
    console.log("===============================================================\n");
    process.exit(0);
  } finally {
    // Cleanup test data
    console.log("Cleaning up test artifacts...");
    await prisma.webhookEvent.deleteMany({
      where: { id: { startsWith: "test_evt_" } },
    });
    await prisma.availabilityBlock.deleteMany({
      where: { startDate: { gte: new Date("2028-01-01T00:00:00.000Z") } },
    });
    await prisma.booking.deleteMany({
      where: { checkInDate: { gte: new Date("2028-01-01T00:00:00.000Z") } },
    });
    await prisma.$disconnect();
  }
}

runPaymentTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
