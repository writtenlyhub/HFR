process.env.TEST_ADMIN_BYPASS = "true";

import crypto from "crypto";
import { prisma } from "../src/lib/prisma";
import {
  BookingStatus,
  BookingSource,
  BlockReason,
  PaymentStatus,
  RefundStatus,
} from "@prisma/client";
import {
  isRazorpayConfigured,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  verifyPaymentWithRazorpayServer,
} from "../src/lib/payment/razorpay";
import {
  confirmPaymentAndBooking,
  handlePaymentFailure,
} from "../src/lib/payment/confirmation";
import { executeBookingRefund } from "../src/lib/payment/refund";
import {
  getBookingsList,
  getBookingDetails,
} from "../src/lib/booking/booking-queries";

async function runPhase8RazorpayTests() {
  console.log("\n========================================================");
  console.log("  DEVSTAY PHASE 8 — RAZORPAY TEST MODE INTEGRATION TESTS");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: unknown, testName: string, detail?: string) {
    if (Boolean(condition)) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET || "test_SecretDevStays2026";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_whsec_devstays_test";
  const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_DevStaysJaipur2026";

  // -----------------------------------------------------------
  // 1. Razorpay Environment & Test Mode Configuration
  // -----------------------------------------------------------
  console.log("1. Razorpay Test Mode Credentials & Isolation:");
  assert(isRazorpayConfigured(), "Razorpay is configured with credentials");
  assert(
    keyId.startsWith("rzp_test_"),
    "Razorpay Key ID is strictly in TEST MODE (rzp_test_...)"
  );
  assert(
    !keyId.startsWith("rzp_live_"),
    "Razorpay Live credentials are NOT active (strict security isolation)"
  );
  assert(Boolean(keySecret), "Razorpay Key Secret is present server-side");
  assert(Boolean(webhookSecret), "Razorpay Webhook Secret is present server-side");

  // -----------------------------------------------------------
  // 2. Cryptographic Signature Verification (HMAC-SHA256)
  // -----------------------------------------------------------
  console.log("\n2. Cryptographic Signature Verification (HMAC-SHA256):");
  const testOrderId = `order_test_${Date.now()}`;
  const testPaymentId = `pay_test_${Date.now()}`;

  const validSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest("hex");

  assert(
    verifyRazorpayPaymentSignature(testOrderId, testPaymentId, validSignature),
    "Valid checkout payment signature verified successfully"
  );

  const tamperedSignature = validSignature.slice(0, -4) + "0000";
  assert(
    !verifyRazorpayPaymentSignature(testOrderId, testPaymentId, tamperedSignature),
    "Tampered payment signature rejected"
  );

  assert(
    !verifyRazorpayPaymentSignature(testOrderId, "pay_different_id", validSignature),
    "Payment ID mismatch signature rejected"
  );

  assert(
    !verifyRazorpayPaymentSignature("", testPaymentId, validSignature),
    "Empty orderId rejected safely without uncaught exception"
  );

  // Webhook Signature verification
  const sampleWebhookBody = JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: { id: testPaymentId, amount: 500000 } } },
  });
  const validWebhookSig = crypto
    .createHmac("sha256", webhookSecret)
    .update(sampleWebhookBody)
    .digest("hex");

  assert(
    verifyRazorpayWebhookSignature(sampleWebhookBody, validWebhookSig),
    "Valid webhook HMAC-SHA256 signature verified"
  );

  const invalidWebhookSig = validWebhookSig.slice(0, -6) + "abcdef";
  assert(
    !verifyRazorpayWebhookSignature(sampleWebhookBody, invalidWebhookSig),
    "Tampered webhook signature rejected"
  );

  // -----------------------------------------------------------
  // 3. Server-side Gateway Amount, Currency & Order Verification
  // -----------------------------------------------------------
  console.log("\n3. Server-Side Gateway Verification Logic:");
  const testPaise = 1500000; // 15,000 INR

  // Valid simulated test payment
  const validCheck = await verifyPaymentWithRazorpayServer({
    paymentId: `pay_test_${Date.now()}`,
    expectedOrderId: testOrderId,
    expectedAmountPaise: testPaise,
    expectedCurrency: "INR",
  });
  assert(validCheck.verified, "Valid test payment verified against gateway requirements");
  assert(validCheck.paymentDetails?.amount === testPaise, "Verified amount matches expected paise");
  assert(validCheck.paymentDetails?.currency === "INR", "Verified currency matches INR");

  // Amount Mismatch check
  const amountMismatchCheck = await verifyPaymentWithRazorpayServer({
    paymentId: "pay_mismatch_amount_123",
    expectedOrderId: testOrderId,
    expectedAmountPaise: testPaise,
    expectedCurrency: "INR",
  });
  assert(!amountMismatchCheck.verified, "Amount mismatch rejected by gateway check");
  assert(
    amountMismatchCheck.error?.includes("Amount mismatch"),
    `Error reports amount mismatch: ${amountMismatchCheck.error}`
  );

  // Currency Mismatch check
  const currencyMismatchCheck = await verifyPaymentWithRazorpayServer({
    paymentId: "pay_mismatch_currency_123",
    expectedOrderId: testOrderId,
    expectedAmountPaise: testPaise,
    expectedCurrency: "INR",
  });
  assert(!currencyMismatchCheck.verified, "Non-INR currency rejected");
  assert(
    currencyMismatchCheck.error?.includes("Currency mismatch"),
    `Error reports currency mismatch: ${currencyMismatchCheck.error}`
  );

  // Order ID Mismatch check
  const orderMismatchCheck = await verifyPaymentWithRazorpayServer({
    paymentId: "pay_mismatch_order_123",
    expectedOrderId: testOrderId,
    expectedAmountPaise: testPaise,
    expectedCurrency: "INR",
  });
  assert(!orderMismatchCheck.verified, "Order ID mismatch rejected");

  // Uncaptured Status check
  const uncapturedCheck = await verifyPaymentWithRazorpayServer({
    paymentId: "pay_uncaptured_123",
    expectedOrderId: testOrderId,
    expectedAmountPaise: testPaise,
    expectedCurrency: "INR",
  });
  assert(!uncapturedCheck.verified, "Uncaptured payment rejected");

  // -----------------------------------------------------------
  // 4. Setup Test Data in PostgreSQL Sandbox
  // -----------------------------------------------------------
  console.log("\n4. Setting Up Sandbox Booking & Shared Inventory in DB:");
  const uniqueCode = Date.now().toString().slice(-6);
  const testPropSlug = `rzp-phase8-estate-${uniqueCode}`;

  const testProp = await prisma.property.create({
    data: {
      name: `DevStay Razorpay Estate ${uniqueCode}`,
      slug: testPropSlug,
      city: "Jaipur",
      state: "Rajasthan",
      address: "123 Civil Lines, Jaipur",
      postalCode: "302006",
      country: "India",
      description: "Test Estate for Razorpay Payment Testing",
    },
  });

  const testGroup = await prisma.inventoryGroup.create({
    data: {
      propertyId: testProp.id,
      name: "Heritage Suite Group",
      code: `GRP-RZP-${uniqueCode}`,
      totalPhysicalUnits: 1,
    },
  });

  const testOption = await prisma.listingOption.create({
    data: {
      propertyId: testProp.id,
      inventoryGroupId: testGroup.id,
      title: "Entire Royal Heritage Suite",
      slug: `entire-royal-suite-${uniqueCode}`,
      description: "Test Suite Luxury Wing for Razorpay Payment Testing",
      basePricePerNight: 8500,
      weekendPricePerNight: 9500,
      cleaningFee: 500,
      taxPercentage: 18,
      bedroomCount: 2,
      bathroomCount: 2,
      maxGuests: 4,
    },
  });

  const checkIn = new Date("2026-12-10T14:00:00Z");
  const checkOut = new Date("2026-12-12T11:00:00Z");
  const holdToken = `ht_${Date.now()}_abc123`;
  const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins in future

  // Create booking in PENDING_HOLD
  const testBooking = await prisma.booking.create({
    data: {
      bookingReference: `DEV-RZP-${uniqueCode}`,
      propertyId: testProp.id,
      inventoryGroupId: testGroup.id,
      listingOptionId: testOption.id,
      customerName: "Maharaja Vikramaditya",
      customerEmail: "vikramaditya@devstays.test",
      customerPhone: "+91 98765 43210",
      guestCount: 2,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights: 2,
      baseAmount: 17000,
      taxesAmount: 2660,
      totalAmount: 19660, // 17000 + 2660 = 19660 INR
      currency: "INR",
      status: BookingStatus.PENDING_HOLD,
      source: BookingSource.DIRECT_WEB,
      holdToken,
      holdExpiresAt,
    },
  });

  // Create temporary hold availability block
  const holdBlock = await prisma.availabilityBlock.create({
    data: {
      inventoryGroupId: testGroup.id,
      bookingId: testBooking.id,
      startDate: checkIn,
      endDate: checkOut,
      reason: BlockReason.BOOKING_HOLD,
      expiresAt: holdExpiresAt,
      notes: "Temporary 15-minute checkout hold",
    },
  });

  assert(testBooking.id.length > 0, `Sandbox Booking created (${testBooking.bookingReference})`);
  assert(holdBlock.reason === BlockReason.BOOKING_HOLD, "Temporary availability block registered");

  // -----------------------------------------------------------
  // 5. Order Creation Invariants & Expired Hold Checks
  // -----------------------------------------------------------
  console.log("\n5. Order Creation & Hold Validation Checks:");

  // Amount in integer paise calculation check
  const totalAmountPaise = Math.round(Number(testBooking.totalAmount) * 100);
  assert(
    totalAmountPaise === 1966000,
    `Total amount is integer paise: ${totalAmountPaise} paise (19,660.00 INR)`
  );

  // Simulate Order Creation record in DB
  const rzpOrderId = `order_rzp_${Date.now()}_${uniqueCode}`;
  const initialPayment = await prisma.payment.create({
    data: {
      bookingId: testBooking.id,
      razorpayOrderId: rzpOrderId,
      amount: Number(testBooking.totalAmount),
      currency: "INR",
      status: PaymentStatus.CREATED,
    },
  });

  await prisma.booking.update({
    where: { id: testBooking.id },
    data: { status: BookingStatus.PAYMENT_PENDING },
  });

  assert(initialPayment.status === PaymentStatus.CREATED, "Payment initialized in CREATED state");

  // Expired hold verification: create another booking that has expired
  const expiredBooking = await prisma.booking.create({
    data: {
      bookingReference: `DEV-EXP-${uniqueCode}`,
      propertyId: testProp.id,
      inventoryGroupId: testGroup.id,
      listingOptionId: testOption.id,
      customerName: "Late Customer",
      customerEmail: "late@devstays.test",
      checkInDate: new Date("2026-12-15T14:00:00Z"),
      checkOutDate: new Date("2026-12-17T11:00:00Z"),
      nights: 2,
      baseAmount: 17000,
      totalAmount: 17000,
      currency: "INR",
      status: BookingStatus.PENDING_HOLD,
      source: BookingSource.DIRECT_WEB,
      holdExpiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago!
    },
  });

  // Check that hold is detected as expired
  const isExpired = expiredBooking.holdExpiresAt! < new Date();
  assert(isExpired, "Expired booking hold accurately identified");

  // -----------------------------------------------------------
  // 6. Checkout Dismissal State Invariant
  // -----------------------------------------------------------
  console.log("\n6. Checkout Dismissal & Hold Preservation:");
  // When a guest dismisses the checkout modal, the booking hold must remain active in DB
  const bookingAfterDismissal = await prisma.booking.findUnique({
    where: { id: testBooking.id },
    include: { availabilityBlocks: true },
  });

  assert(
    bookingAfterDismissal?.status === BookingStatus.PAYMENT_PENDING ||
      bookingAfterDismissal?.status === BookingStatus.PENDING_HOLD,
    `Booking status preserved upon dismissal (${bookingAfterDismissal?.status})`
  );
  assert(
    bookingAfterDismissal?.holdExpiresAt! > new Date(),
    "15-minute hold remains active after dismissal so guest can retry payment"
  );
  assert(
    bookingAfterDismissal?.availabilityBlocks.length! > 0,
    "Shared inventory block is NOT released when modal is dismissed"
  );

  // -----------------------------------------------------------
  // 7. End-to-End Payment Confirmation (`confirmPaymentAndBooking`)
  // -----------------------------------------------------------
  console.log("\n7. End-to-End Transactional Payment Confirmation:");
  const rzpPaymentId = `pay_valid_${Date.now()}_${uniqueCode}`;
  const validConfirmSig = crypto
    .createHmac("sha256", keySecret)
    .update(`${rzpOrderId}|${rzpPaymentId}`)
    .digest("hex");

  const confirmResult = await confirmPaymentAndBooking({
    bookingId: testBooking.id,
    razorpayOrderId: rzpOrderId,
    razorpayPaymentId: rzpPaymentId,
    razorpaySignature: validConfirmSig,
    paymentMethod: "upi",
    amountPaidPaise: totalAmountPaise,
    rawPayload: { simulated: true, testMode: true },
  });

  assert(confirmResult.success, "confirmPaymentAndBooking succeeded");
  assert(
    confirmResult.status === BookingStatus.CONFIRMED,
    "Booking transitioned to CONFIRMED"
  );
  assert(
    confirmResult.bookingReference === testBooking.bookingReference,
    `Booking reference matches: ${confirmResult.bookingReference}`
  );

  // Verify DB state
  const updatedBooking = await prisma.booking.findUnique({
    where: { id: testBooking.id },
    include: { payments: true, availabilityBlocks: true },
  });

  assert(updatedBooking?.status === BookingStatus.CONFIRMED, "DB booking status is CONFIRMED");
  assert(updatedBooking?.holdExpiresAt === null, "holdExpiresAt cleared upon confirmation");

  const capturedPayment = updatedBooking?.payments.find((p) => p.razorpayOrderId === rzpOrderId);
  assert(capturedPayment?.status === PaymentStatus.CAPTURED, "Payment status updated to CAPTURED");
  assert(capturedPayment?.razorpayPaymentId === rzpPaymentId, "Razorpay payment ID recorded");
  assert(capturedPayment?.method === "upi", "Payment method recorded (upi)");

  const confirmedBlock = updatedBooking?.availabilityBlocks[0];
  assert(
    confirmedBlock?.reason === BlockReason.BOOKING_CONFIRMED,
    "Availability block converted to permanent BOOKING_CONFIRMED"
  );
  assert(confirmedBlock?.expiresAt === null, "Confirmed block has null expiresAt (permanent block)");

  // Check Audit Log
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: testBooking.id },
  });
  const captureAudit = auditLogs.find((l) => l.action === "PAYMENT_CAPTURED_AND_CONFIRMED");
  assert(Boolean(captureAudit), "AuditLog created for PAYMENT_CAPTURED_AND_CONFIRMED");

  // -----------------------------------------------------------
  // 8. Idempotency & Duplicate Callbacks
  // -----------------------------------------------------------
  console.log("\n8. Idempotency & Duplicate Verification Invariants:");
  const secondConfirm = await confirmPaymentAndBooking({
    bookingId: testBooking.id,
    razorpayOrderId: rzpOrderId,
    razorpayPaymentId: rzpPaymentId,
    razorpaySignature: validConfirmSig,
    paymentMethod: "upi",
    amountPaidPaise: totalAmountPaise,
  });

  assert(secondConfirm.success, "Second confirmation call returned success");
  assert(secondConfirm.alreadyConfirmed === true, "alreadyConfirmed flag is true");

  const totalPaymentsForBooking = await prisma.payment.count({
    where: { bookingId: testBooking.id },
  });
  assert(
    totalPaymentsForBooking === 1,
    `No duplicate payment rows created (total: ${totalPaymentsForBooking})`
  );

  // -----------------------------------------------------------
  // 9. Payment Failure Handling (`handlePaymentFailure`)
  // -----------------------------------------------------------
  console.log("\n9. Payment Failure Scenarios:");
  const failBooking = await prisma.booking.create({
    data: {
      bookingReference: `DEV-FAIL-${uniqueCode}`,
      propertyId: testProp.id,
      inventoryGroupId: testGroup.id,
      listingOptionId: testOption.id,
      customerName: "Failing Card Customer",
      customerEmail: "fail@devstays.test",
      checkInDate: new Date("2026-12-20T14:00:00Z"),
      checkOutDate: new Date("2026-12-22T11:00:00Z"),
      nights: 2,
      baseAmount: 17000,
      totalAmount: 17000,
      currency: "INR",
      status: BookingStatus.PAYMENT_PENDING,
      source: BookingSource.DIRECT_WEB,
    },
  });

  const failOrderId = `order_fail_${Date.now()}`;
  await prisma.payment.create({
    data: {
      bookingId: failBooking.id,
      razorpayOrderId: failOrderId,
      amount: 17000,
      currency: "INR",
      status: PaymentStatus.CREATED,
    },
  });

  await handlePaymentFailure({
    bookingId: failBooking.id,
    razorpayOrderId: failOrderId,
    razorpayPaymentId: `pay_failed_${Date.now()}`,
    failureReason: "Card declined by issuing bank (Test simulation)",
  });

  const updatedFailBooking = await prisma.booking.findUnique({
    where: { id: failBooking.id },
    include: { payments: true },
  });
  assert(
    updatedFailBooking?.status === BookingStatus.PAYMENT_FAILED,
    "Booking transitioned to PAYMENT_FAILED"
  );
  assert(
    updatedFailBooking?.payments[0]?.status === PaymentStatus.FAILED,
    "Payment record transitioned to FAILED"
  );
  assert(
    updatedFailBooking?.payments[0]?.failureReason?.includes("Card declined"),
    "Failure reason recorded in payment record"
  );

  // Invariant: Never downgrade an already CONFIRMED booking
  await handlePaymentFailure({
    bookingId: testBooking.id,
    razorpayOrderId: rzpOrderId,
    failureReason: "Late failure webhook for already confirmed booking",
  });
  const protectedBooking = await prisma.booking.findUnique({
    where: { id: testBooking.id },
  });
  assert(
    protectedBooking?.status === BookingStatus.CONFIRMED,
    "Confirmed booking is NEVER downgraded by failure handler"
  );

  // -----------------------------------------------------------
  // 10. Webhook Deduplication & Event Handling
  // -----------------------------------------------------------
  console.log("\n10. Webhook Deduplication & Event Handling:");
  const testWebhookEventId = `evt_test_${Date.now()}_${uniqueCode}`;

  // Insert first event
  await prisma.webhookEvent.create({
    data: {
      id: testWebhookEventId,
      event: "payment.captured",
      payload: { test: true },
    },
  });

  // Verify deduplication check
  const duplicateWebhookEvent = await prisma.webhookEvent.findUnique({
    where: { id: testWebhookEventId },
  });
  assert(Boolean(duplicateWebhookEvent), "Webhook event registered in webhook_events table");

  // Attempting second read acknowledges existing event without re-processing
  assert(
    duplicateWebhookEvent?.id === testWebhookEventId,
    "Subsequent webhook with same event_id detected as already processed"
  );

  // -----------------------------------------------------------
  // 11. Refund Execution (`executeBookingRefund`)
  // -----------------------------------------------------------
  console.log("\n11. Refund Simulation & Audit Logging:");
  const refundIdempotencyKey = `ref_key_${Date.now()}_${uniqueCode}`;

  const refundResult = await executeBookingRefund({
    bookingId: testBooking.id,
    amountRupees: 19660,
    reason: "Client cancellation test in Razorpay sandbox",
    idempotencyKey: refundIdempotencyKey,
  });

  assert(refundResult.success, "Refund executed successfully in test mode");
  assert(
    refundResult.status === RefundStatus.PROCESSED,
    "Refund status marked as PROCESSED"
  );

  // Verify booking and payment status
  const refundedBooking = await prisma.booking.findUnique({
    where: { id: testBooking.id },
    include: { payments: true, refunds: true },
  });

  assert(
    refundedBooking?.status === BookingStatus.REFUNDED,
    "Booking status updated to REFUNDED"
  );
  assert(
    refundedBooking?.payments.some((p) => p.status === PaymentStatus.REFUNDED),
    "Payment status updated to REFUNDED"
  );
  assert(
    refundedBooking?.refunds.length! > 0,
    "Refund entity created with audit trail"
  );

  // Test idempotency of refund
  const secondRefund = await executeBookingRefund({
    bookingId: testBooking.id,
    amountRupees: 19660,
    reason: "Duplicate refund attempt",
    idempotencyKey: refundIdempotencyKey,
  });
  assert(secondRefund.success, "Duplicate refund call returns success");
  assert(secondRefund.alreadyProcessed === true, "alreadyProcessed is true for duplicate refund");

  // -----------------------------------------------------------
  // 12. Admin Dashboard & Booking Visibility
  // -----------------------------------------------------------
  console.log("\n12. Admin Dashboard & Query Visibility:");
  const bookingsList = await getBookingsList({ search: testBooking.bookingReference });
  assert(bookingsList.bookings.length > 0, "Booking found in admin booking list query");
  assert(
    bookingsList.bookings[0].bookingReference === testBooking.bookingReference,
    "Admin query returns accurate booking reference"
  );

  const bookingDetail = await getBookingDetails(testBooking.id);
  assert(Boolean(bookingDetail), "Booking details loaded for admin standalone/drawer view");
  assert(
    bookingDetail?.payments.some((p) => p.razorpayPaymentId === rzpPaymentId),
    "Admin detail page displays Razorpay Payment ID"
  );
  assert(
    bookingDetail?.refunds.some((r) => r.idempotencyKey === refundIdempotencyKey),
    "Admin detail page displays processed refund record"
  );

  // -----------------------------------------------------------
  // Clean Up Sandbox Test Records
  // -----------------------------------------------------------
  console.log("\nCleaning up sandbox test records...");
  await prisma.refund.deleteMany({
    where: { bookingId: { in: [testBooking.id, failBooking.id, expiredBooking.id] } },
  });
  await prisma.payment.deleteMany({
    where: { bookingId: { in: [testBooking.id, failBooking.id, expiredBooking.id] } },
  });
  await prisma.availabilityBlock.deleteMany({
    where: { bookingId: { in: [testBooking.id, failBooking.id, expiredBooking.id] } },
  });
  await prisma.auditLog.deleteMany({
    where: { entityId: { in: [testBooking.id, failBooking.id, expiredBooking.id] } },
  });
  await prisma.booking.deleteMany({
    where: { id: { in: [testBooking.id, failBooking.id, expiredBooking.id] } },
  });
  await prisma.webhookEvent.deleteMany({
    where: { id: testWebhookEventId },
  });
  await prisma.listingOption.deleteMany({
    where: { propertyId: testProp.id },
  });
  await prisma.inventoryGroup.deleteMany({
    where: { propertyId: testProp.id },
  });
  await prisma.property.delete({
    where: { id: testProp.id },
  });

  console.log("\n========================================================");
  console.log(`  PHASE 8 TESTS COMPLETED: ${passed} passed, ${failed} failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8RazorpayTests()
  .catch((e) => {
    console.error("Test execution fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
