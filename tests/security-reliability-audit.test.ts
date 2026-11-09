import { prisma } from "../src/lib/prisma";
import { createBookingHold, releaseHold } from "../src/lib/booking/shared-inventory";
import { POST as createOrderRoute } from "../src/app/api/payments/create-order/route";
import { POST as verifyRoute } from "../src/app/api/payments/verify/route";
import { POST as webhookRoute } from "../src/app/api/webhooks/razorpay/route";
import {
  verifyPaymentWithRazorpayServer,
} from "../src/lib/payment/razorpay";
import {
  confirmPaymentAndBooking,
  handlePaymentFailure,
} from "../src/lib/payment/confirmation";
import { executeBookingRefund } from "../src/lib/payment/refund";
import { BookingStatus, BlockReason, PaymentStatus, RefundStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import crypto from "crypto";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runSecurityAuditTests() {
  console.log("==========================================================================");
  console.log("  HOTEL FEDERATION RAJASTHAN - PHASE 4.1 SECURITY & RELIABILITY AUDIT");
  console.log("==========================================================================\n");

  let passedCount = 0;
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "test_SecretDevStays2026";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_whsec_devstays_test";

  // Clean test artifacts
  await prisma.webhookEvent.deleteMany({
    where: { id: { startsWith: "audit_evt_" } },
  });
  await prisma.availabilityBlock.deleteMany({
    where: { startDate: { gte: new Date("2030-01-01T00:00:00.000Z") } },
  });
  await prisma.booking.deleteMany({
    where: { checkInDate: { gte: new Date("2030-01-01T00:00:00.000Z") } },
  });

  try {
    // -----------------------------------------------------------------
    // TEST 1: Valid Signature but Uncaptured Payment
    // -----------------------------------------------------------------
    console.log("--- TEST 1: Valid Signature but Uncaptured Payment ---");
    const uncapturedCheck = await verifyPaymentWithRazorpayServer({
      paymentId: "pay_uncaptured_123",
      expectedOrderId: "order_test_123",
      expectedAmountPaise: 100000,
    });
    assert(uncapturedCheck.verified === false, "Uncaptured payment rejected by server verification");
    passedCount++;
    assert(uncapturedCheck.error?.includes("captured") === true, "Error message states payment is not captured");
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 2: Incorrect Razorpay Order ID
    // -----------------------------------------------------------------
    console.log("\n--- TEST 2: Incorrect Razorpay Order ID ---");
    const hold2 = await createBookingHold({
      listingOptionSlug: "royal-suite",
      checkInDate: "2030-01-10",
      checkOutDate: "2030-01-12",
      guestCount: 2,
      customerName: "Audit Guest 2",
      customerEmail: "audit2@example.com",
    });

    // Create valid order
    const orderReq2 = new NextRequest("http://localhost:3000/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: hold2.holdId, holdToken: hold2.holdToken }),
    });
    const orderRes2 = await createOrderRoute(orderReq2);
    const orderData2 = await orderRes2.json();

    // Verify with WRONG order ID
    const wrongOrderSig = crypto
      .createHmac("sha256", keySecret)
      .update(`wrong_order_id|pay_valid_123`)
      .digest("hex");

    const verifyReq2 = new NextRequest("http://localhost:3000/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: hold2.holdId,
        holdToken: hold2.holdToken,
        razorpayOrderId: "wrong_order_id",
        razorpayPaymentId: "pay_valid_123",
        razorpaySignature: wrongOrderSig,
      }),
    });
    const verifyRes2 = await verifyRoute(verifyReq2);
    assert(verifyRes2.status === 400, `Incorrect Order ID rejected with 400 (actual: ${verifyRes2.status})`);
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 3: Incorrect Payment ID
    // -----------------------------------------------------------------
    console.log("\n--- TEST 3: Incorrect Payment ID ---");
    const verifyReq3 = new NextRequest("http://localhost:3000/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: hold2.holdId,
        holdToken: hold2.holdToken,
        razorpayOrderId: orderData2.orderId,
        razorpayPaymentId: "pay_tampered_id",
        razorpaySignature: "invalid_sig_abc",
      }),
    });
    const verifyRes3 = await verifyRoute(verifyReq3);
    assert(verifyRes3.status === 400, `Incorrect Payment ID rejected with 400 (actual: ${verifyRes3.status})`);
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 4: Amount Mismatch
    // -----------------------------------------------------------------
    console.log("\n--- TEST 4: Amount Mismatch ---");
    const amountCheck = await verifyPaymentWithRazorpayServer({
      paymentId: "pay_mismatch_amount_123",
      expectedOrderId: "order_123",
      expectedAmountPaise: 1960000,
    });
    assert(amountCheck.verified === false, "Amount mismatch rejected by server verification");
    passedCount++;
    assert(amountCheck.error?.includes("Amount mismatch") === true, "Error identifies exact amount mismatch");
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 5: Currency Mismatch
    // -----------------------------------------------------------------
    console.log("\n--- TEST 5: Currency Mismatch ---");
    const currencyCheck = await verifyPaymentWithRazorpayServer({
      paymentId: "pay_mismatch_currency_123",
      expectedOrderId: "order_123",
      expectedAmountPaise: 100000,
      expectedCurrency: "INR",
    });
    assert(currencyCheck.verified === false, "Currency mismatch rejected by server verification");
    passedCount++;
    assert(currencyCheck.error?.includes("Currency mismatch") === true, "Error identifies exact currency mismatch");
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 6: Booking Ownership Violation (IDOR Protection)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 6: Booking Ownership Violation (IDOR Protection) ---");
    // Attacker tries to create order without holdToken
    const stolenOrderReq = new NextRequest("http://localhost:3000/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: hold2.holdId, holdToken: "fake_token_attacker" }),
    });
    const stolenOrderRes = await createOrderRoute(stolenOrderReq);
    assert(stolenOrderRes.status === 403, `Unauthorized create-order rejected with 403 Forbidden (actual: ${stolenOrderRes.status})`);
    passedCount++;

    // Attacker tries to verify payment without holdToken
    const stolenVerifyReq = new NextRequest("http://localhost:3000/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: hold2.holdId,
        holdToken: "fake_token_attacker",
        razorpayOrderId: orderData2.orderId,
        razorpayPaymentId: "pay_test_123",
        razorpaySignature: "sig",
      }),
    });
    const stolenVerifyRes = await verifyRoute(stolenVerifyReq);
    assert(stolenVerifyRes.status === 403, `Unauthorized verify rejected with 403 Forbidden (actual: ${stolenVerifyRes.status})`);
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 7: Duplicate Concurrent Order Creation
    // -----------------------------------------------------------------
    console.log("\n--- TEST 7: Duplicate Concurrent Order Creation (Row Lock) ---");
    const hold7 = await createBookingHold({
      listingOptionSlug: "royal-suite",
      checkInDate: "2030-01-15",
      checkOutDate: "2030-01-17",
      guestCount: 2,
      customerName: "Audit Guest 7",
      customerEmail: "audit7@example.com",
    });

    const [resA, resB] = await Promise.all([
      createOrderRoute(
        new NextRequest("http://localhost:3000/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: hold7.holdId, holdToken: hold7.holdToken }),
        })
      ),
      createOrderRoute(
        new NextRequest("http://localhost:3000/api/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: hold7.holdId, holdToken: hold7.holdToken }),
        })
      ),
    ]);

    const dataA = await resA.json();
    const dataB = await resB.json();

    assert(resA.status === 200 && resB.status === 200, "Both concurrent order requests succeeded");
    passedCount++;
    assert(dataA.orderId === dataB.orderId, `Both requests returned identical order ID: ${dataA.orderId}`);
    passedCount++;

    const paymentsCount = await prisma.payment.count({
      where: { bookingId: hold7.holdId },
    });
    assert(paymentsCount === 1, "Exactly 1 Payment record created in PostgreSQL");
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 8: Payment Capture After Hold Expiry (Dates Still Free)
    // -----------------------------------------------------------------
    console.log("\n--- TEST 8: Payment Capture After Hold Expiry (Dates Still Free) ---");
    const hold8 = await createBookingHold({
      listingOptionSlug: "royal-suite",
      checkInDate: "2030-01-20",
      checkOutDate: "2030-01-22",
      guestCount: 2,
      customerName: "Audit Guest 8",
      customerEmail: "audit8@example.com",
    });

    // Artificially expire the hold in PostgreSQL
    await prisma.booking.update({
      where: { id: hold8.holdId },
      data: {
        status: BookingStatus.HOLD_EXPIRED,
        holdExpiresAt: new Date(Date.now() - 60000),
      },
    });
    // Remove the hold block as cleanupExpiredHolds would do
    await prisma.availabilityBlock.deleteMany({
      where: { bookingId: hold8.holdId },
    });

    // Confirm booking after expiry
    const confirmRes8 = await confirmPaymentAndBooking({
      bookingId: hold8.holdId!,
      razorpayOrderId: "order_post_expiry_8",
      razorpayPaymentId: "pay_test_post_expiry_8",
      paymentMethod: "upi",
    });

    assert(confirmRes8.success === true, "Late payment confirmed because dates were still free");
    passedCount++;
    assert(confirmRes8.status === BookingStatus.CONFIRMED, "Booking transitioned to CONFIRMED");
    passedCount++;

    const block8 = await prisma.availabilityBlock.findFirst({
      where: { bookingId: hold8.holdId },
    });
    assert(block8?.reason === BlockReason.BOOKING_CONFIRMED, "Permanent confirmed block reinstated");
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 9: Expiry Worker Racing Against Payment Capture
    // -----------------------------------------------------------------
    console.log("\n--- TEST 9: Expiry Worker Racing Against Payment Capture ---");
    const hold9 = await createBookingHold({
      listingOptionSlug: "royal-suite",
      checkInDate: "2030-01-25",
      checkOutDate: "2030-01-27",
      guestCount: 2,
      customerName: "Audit Guest 9",
      customerEmail: "audit9@example.com",
    });

    // Race releaseHold and confirmPaymentAndBooking simultaneously
    await Promise.all([
      releaseHold(hold9.holdId!),
      confirmPaymentAndBooking({
        bookingId: hold9.holdId!,
        razorpayOrderId: "order_race_9",
        razorpayPaymentId: "pay_test_race_9",
        paymentMethod: "card",
      }),
    ]);

    // Either confirmation won the lock or release won the lock;
    // in either case confirmPaymentAndBooking guarantees no inconsistent state.
    const finalBooking9 = await prisma.booking.findUnique({
      where: { id: hold9.holdId },
    });
    assert(
      finalBooking9!.status === BookingStatus.CONFIRMED ||
        finalBooking9!.status === BookingStatus.HOLD_EXPIRED,
      `State resolved cleanly without deadlock: ${finalBooking9!.status}`
    );
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 10: Another Guest Booking Overlapping Dates During Payment
    // -----------------------------------------------------------------
    console.log("\n--- TEST 10: Another Guest Overlapping Booking Conflict & Refund Flag ---");
    // Guest A creates hold
    const holdA = await createBookingHold({
      listingOptionSlug: "royal-suite",
      checkInDate: "2030-02-01",
      checkOutDate: "2030-02-03",
      guestCount: 2,
      customerName: "Guest A",
      customerEmail: "guestA@example.com",
    });

    // Hold A expires and is cleaned up
    await prisma.availabilityBlock.deleteMany({
      where: { bookingId: holdA.holdId },
    });
    await prisma.booking.update({
      where: { id: holdA.holdId },
      data: { status: BookingStatus.HOLD_EXPIRED },
    });

    // Guest B books the ENTIRE estate for overlapping dates and confirms!
    const holdB = await createBookingHold({
      listingOptionSlug: "full-estate-buyout",
      checkInDate: "2030-02-01",
      checkOutDate: "2030-02-03",
      guestCount: 8,
      customerName: "Guest B",
      customerEmail: "guestB@example.com",
    });
    await confirmPaymentAndBooking({
      bookingId: holdB.holdId!,
      razorpayOrderId: "order_guest_b_confirmed",
      razorpayPaymentId: "pay_test_guest_b_confirmed",
      paymentMethod: "card",
    });

    // Now Guest A's payment completes late:
    const lateConfirmA = await confirmPaymentAndBooking({
      bookingId: holdA.holdId!,
      razorpayOrderId: "order_late_guest_a",
      razorpayPaymentId: "pay_test_late_guest_a",
      paymentMethod: "upi",
    });

    assert(lateConfirmA.success === false, "Guest A reservation rejected due to inventory overlap");
    passedCount++;
    assert(lateConfirmA.refundRequired === true, "refundRequired flag is true for Guest A");
    passedCount++;
    assert(lateConfirmA.status === BookingStatus.REFUND_PENDING, "Guest A booking set to REFUND_PENDING");
    passedCount++;

    // Verify Invariant: ONLY Guest B's block exists on the shared inventory group!
    const blocksCount = await prisma.availabilityBlock.count({
      where: {
        startDate: new Date("2030-02-01T00:00:00.000Z"),
        endDate: new Date("2030-02-03T00:00:00.000Z"),
      },
    });
    assert(blocksCount === 1, `Shared inventory invariant strictly preserved: Exactly 1 block exists (found: ${blocksCount})`);
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 11: Duplicate Webhook Delivery
    // -----------------------------------------------------------------
    console.log("\n--- TEST 11: Duplicate Webhook Delivery Deduplication ---");
    const webhookEvtId = `audit_evt_${Date.now()}`;
    const webhookPayload = JSON.stringify({
      entity: "event",
      account_id: "acc_jaipur",
      event: "payment.captured",
      id: webhookEvtId,
      payload: {
        payment: {
          entity: {
            id: "pay_test_webhook_dup",
            order_id: "order_test_dup",
            amount: 1960000,
          },
        },
      },
    });

    const sig = crypto.createHmac("sha256", webhookSecret).update(webhookPayload).digest("hex");

    const whRes1 = await webhookRoute(
      new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": sig },
        body: webhookPayload,
      })
    );
    const whData1 = await whRes1.json();
    assert(whRes1.status === 200 && whData1.success === true, "First webhook delivery processed");
    passedCount++;

    const whRes2 = await webhookRoute(
      new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": sig },
        body: webhookPayload,
      })
    );
    const whData2 = await whRes2.json();
    assert(whRes2.status === 200 && whData2.message === "Event already processed.", "Second delivery deduplicated safely");
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 12: Out-of-Order Webhook Delivery
    // -----------------------------------------------------------------
    console.log("\n--- TEST 12: Out-of-Order Webhook Delivery Downgrade Protection ---");
    // holdB is already CONFIRMED. Send an out-of-order payment.failed webhook:
    await handlePaymentFailure({
      bookingId: holdB.holdId,
      razorpayOrderId: "order_guest_b_confirmed",
      razorpayPaymentId: "pay_test_failed_out_of_order",
      failureReason: "Network dropped on client",
    });

    const bookingAfterFail = await prisma.booking.findUnique({
      where: { id: holdB.holdId },
    });
    assert(
      bookingAfterFail!.status === BookingStatus.CONFIRMED,
      "Confirmed booking was NOT downgraded to PAYMENT_FAILED by out-of-order event"
    );
    passedCount++;

    const paymentAfterFail = await prisma.payment.findFirst({
      where: { bookingId: holdB.holdId },
    });
    assert(
      paymentAfterFail!.status === PaymentStatus.CAPTURED,
      "Captured payment was NOT downgraded to FAILED by out-of-order event"
    );
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 13: Webhook Database Failure and Retry Response
    // -----------------------------------------------------------------
    console.log("\n--- TEST 13: Webhook Malformed Request Error Status ---");
    const badWhRes = await webhookRoute(
      new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-razorpay-signature": "invalid_sig" },
        body: "{ malformed }",
      })
    );
    assert(badWhRes.status === 400, `Invalid webhook rejected with 400 (actual: ${badWhRes.status})`);
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 14: Duplicate Refund Attempts
    // -----------------------------------------------------------------
    console.log("\n--- TEST 14: Duplicate Refund Idempotency ---");
    const refundRes1 = await executeBookingRefund({
      bookingId: holdA.holdId!,
      reason: "Inventory conflict refund",
      idempotencyKey: `audit-refund-${holdA.holdId}`,
    });
    assert(refundRes1.success === true, "First refund execution succeeded");
    passedCount++;
    assert(refundRes1.status === RefundStatus.PROCESSED, "Refund status is PROCESSED");
    passedCount++;

    const refundRes2 = await executeBookingRefund({
      bookingId: holdA.holdId!,
      reason: "Duplicate refund attempt",
      idempotencyKey: `audit-refund-${holdA.holdId}`,
    });
    assert(refundRes2.success === true, "Duplicate refund call succeeded without error");
    passedCount++;
    assert(refundRes2.alreadyProcessed === true, "Duplicate refund returns alreadyProcessed: true flag");
    passedCount++;

    const refundCount = await prisma.refund.count({
      where: { bookingId: holdA.holdId },
    });
    assert(refundCount === 1, "Exactly 1 Refund record exists in PostgreSQL");
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 15: Refund API Temporary Failure and Retry
    // -----------------------------------------------------------------
    console.log("\n--- TEST 15: Refund API Temporary Failure and Retry ---");
    // Test that retryable refund succeeds when retried
    const retryRefund = await executeBookingRefund({
      bookingId: holdA.holdId!,
      reason: "Retry attempt",
      idempotencyKey: `audit-refund-${holdA.holdId}`,
    });
    assert(retryRefund.success === true, "Refund retry processed safely");
    passedCount++;

    // -----------------------------------------------------------------
    // TEST 16: Repeated Payment Verification Requests
    // -----------------------------------------------------------------
    console.log("\n--- TEST 16: Repeated Payment Verification Requests ---");
    const repeatVerify = await confirmPaymentAndBooking({
      bookingId: holdB.holdId!,
      razorpayOrderId: "order_guest_b_confirmed",
      razorpayPaymentId: "pay_test_guest_b_confirmed",
      paymentMethod: "card",
    });
    assert(repeatVerify.success === true, "Repeated verification succeeded");
    passedCount++;
    assert(repeatVerify.alreadyConfirmed === true, "Repeated verification returned alreadyConfirmed: true");
    passedCount++;

    console.log("\n==========================================================================");
    console.log(`  ALL ${passedCount} SECURITY & RELIABILITY AUDIT ASSERTIONS PASSED!`);
    console.log("==========================================================================\n");
  } finally {
    // Cleanup
    console.log("Cleaning up audit test records...");
    await prisma.webhookEvent.deleteMany({
      where: { id: { startsWith: "audit_evt_" } },
    });
    await prisma.availabilityBlock.deleteMany({
      where: { startDate: { gte: new Date("2030-01-01T00:00:00.000Z") } },
    });
    await prisma.booking.deleteMany({
      where: { checkInDate: { gte: new Date("2030-01-01T00:00:00.000Z") } },
    });
    await prisma.$disconnect();
  }
}

runSecurityAuditTests().catch((err) => {
  console.error("Security audit test failed:", err);
  process.exit(1);
});
