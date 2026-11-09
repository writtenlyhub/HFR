import { prisma } from "../src/lib/prisma";
import { createBookingHold } from "../src/lib/booking/shared-inventory";
import { POST as createOrderRoute } from "../src/app/api/payments/create-order/route";
import { POST as verifyRoute } from "../src/app/api/payments/verify/route";
import { POST as webhookRoute } from "../src/app/api/webhooks/razorpay/route";
import { NextRequest } from "next/server";
import crypto from "crypto";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
}

async function runApiTests() {
  console.log("===============================================================");
  console.log("  HOTEL FEDERATION RAJASTHAN - PAYMENT API ROUTE TEST SUITE");
  console.log("===============================================================\n");

  const keySecret = process.env.RAZORPAY_KEY_SECRET || "test_SecretDevStays2026";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_whsec_devstays_test";

  // Cleanup past test data
  await prisma.webhookEvent.deleteMany({
    where: { id: { startsWith: "test_api_evt_" } },
  });
  await prisma.availabilityBlock.deleteMany({
    where: { startDate: { gte: new Date("2029-01-01T00:00:00.000Z") } },
  });
  await prisma.booking.deleteMany({
    where: { checkInDate: { gte: new Date("2029-01-01T00:00:00.000Z") } },
  });

  try {
    // 1. Create a hold
    console.log("--- API TEST 1: POST /api/payments/create-order ---");
    const holdRes = await createBookingHold({
      listingOptionSlug: "royal-suite",
      checkInDate: "2029-06-10",
      checkOutDate: "2029-06-12",
      guestCount: 2,
      customerName: "Rani Gayatri Devi",
      customerEmail: "gayatri@jaipur-heritage.in",
      customerPhone: "+91 99999 88888",
    });

    assert(holdRes.success === true, "Hold created for API test");

    // Invoke create-order route handler
    const req1 = new NextRequest("http://localhost:3000/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: holdRes.holdId }),
    });

    const res1 = await createOrderRoute(req1);
    const data1 = await res1.json();

    assert(res1.status === 200, `create-order returns 200 (actual: ${res1.status})`);
    assert(data1.success === true, "create-order success is true");
    assert(Boolean(data1.orderId), `Razorpay orderId returned: ${data1.orderId}`);
    assert(data1.amount === 1960000, `Amount in paise matches ₹19,600: ${data1.amount}`);

    // Verify DB updated to PAYMENT_PENDING
    const bookingInDb = await prisma.booking.findUnique({
      where: { id: holdRes.holdId },
    });
    assert(bookingInDb!.status === "PAYMENT_PENDING", "Booking status updated to PAYMENT_PENDING");

    // 2. Invoke verify route with tampered signature
    console.log("\n--- API TEST 2: POST /api/payments/verify with Tampered Signature ---");
    const tamperedReq = new NextRequest("http://localhost:3000/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: holdRes.holdId,
        razorpayOrderId: data1.orderId,
        razorpayPaymentId: "pay_tampered_999",
        razorpaySignature: "fake_signature_hash_1234567890abcdef",
      }),
    });

    const tamperedRes = await verifyRoute(tamperedReq);
    assert(tamperedRes.status === 400, `Tampered signature rejected with 400 (actual: ${tamperedRes.status})`);

    // 3. Invoke verify route with authentic HMAC signature
    console.log("\n--- API TEST 3: POST /api/payments/verify with Authentic HMAC Signature ---");
    const validPaymentId = `pay_valid_${Date.now()}`;
    const validSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${data1.orderId}|${validPaymentId}`)
      .digest("hex");

    const validReq = new NextRequest("http://localhost:3000/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: holdRes.holdId,
        razorpayOrderId: data1.orderId,
        razorpayPaymentId: validPaymentId,
        razorpaySignature: validSignature,
        paymentMethod: "card",
      }),
    });

    const validRes = await verifyRoute(validReq);
    const validData = await validRes.json();

    assert(validRes.status === 200, `Valid verify returns 200 (actual: ${validRes.status})`);
    assert(validData.success === true, "Valid verify success is true");
    assert(validData.status === "CONFIRMED", "Returned status is CONFIRMED");

    // Check DB booking is CONFIRMED
    const finalBooking = await prisma.booking.findUnique({
      where: { id: holdRes.holdId },
      include: { payments: true, availabilityBlocks: true },
    });
    assert(finalBooking!.status === "CONFIRMED", "PostgreSQL booking status is CONFIRMED");
    assert(finalBooking!.availabilityBlocks[0].reason === "BOOKING_CONFIRMED", "Block is permanent BOOKING_CONFIRMED");

    // 4. Webhook testing
    console.log("\n--- API TEST 4: POST /api/webhooks/razorpay ---");
    const webhookEventId = `test_api_evt_${Date.now()}`;
    const webhookPayload = JSON.stringify({
      entity: "event",
      account_id: "acc_jaipur_demo",
      event: "payment.captured",
      id: webhookEventId,
      contains: ["payment"],
      payload: {
        payment: {
          entity: {
            id: validPaymentId,
            order_id: data1.orderId,
            amount: 1960000,
            status: "captured",
            method: "card",
            notes: {
              bookingId: holdRes.holdId,
            },
          },
        },
      },
    });

    const webhookSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(webhookPayload)
      .digest("hex");

    const whReq = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": webhookSignature,
      },
      body: webhookPayload,
    });

    const whRes = await webhookRoute(whReq);
    const whData = await whRes.json();

    assert(whRes.status === 200, `Webhook returns 200 (actual: ${whRes.status})`);
    assert(whData.success === true, "Webhook success is true");

    // Second delivery of same webhook (idempotency deduplication)
    const whReq2 = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": webhookSignature,
      },
      body: webhookPayload,
    });

    const whRes2 = await webhookRoute(whReq2);
    const whData2 = await whRes2.json();
    assert(whData2.message === "Event already processed.", "Webhook deduplication works seamlessly");

    console.log("\n===============================================================");
    console.log("  ALL PAYMENT API ROUTE TESTS PASSED SUCCESSFULLY!");
    console.log("===============================================================\n");
  } finally {
    // Cleanup
    await prisma.webhookEvent.deleteMany({
      where: { id: { startsWith: "test_api_evt_" } },
    });
    await prisma.availabilityBlock.deleteMany({
      where: { startDate: { gte: new Date("2029-01-01T00:00:00.000Z") } },
    });
    await prisma.booking.deleteMany({
      where: { checkInDate: { gte: new Date("2029-01-01T00:00:00.000Z") } },
    });
    await prisma.$disconnect();
  }
}

runApiTests().catch((err) => {
  console.error("API route test failed:", err);
  process.exit(1);
});
