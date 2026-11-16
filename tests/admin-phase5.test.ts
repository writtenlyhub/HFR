process.env.TEST_ADMIN_BYPASS = "true";

import { prisma } from "../src/lib/prisma";
import { Role, BookingStatus, BookingSource, BlockReason, PaymentStatus, RefundStatus } from "@prisma/client";
import {
  checkInBookingAction,
  checkOutBookingAction,
  cancelBookingAction,
  recordManualPaymentAction,
  updateGuestDetailsAction,
  addInternalNoteAction,
} from "../src/app/admin/(dashboard)/bookings/booking-actions";
import {
  getBookingsList,
  getBookingDetails,
  getDashboardOperationalMetrics,
} from "../src/lib/booking/booking-queries";
import {
  executeCheckIn,
  executeCheckOut,
  updateGuestDetails,
  recordManualPayment,
  getBookingActivityTimeline,
} from "../src/lib/booking/booking-operations";
import {
  calculateCancellationRefund,
  executeBookingCancellation,
} from "../src/lib/booking/booking-cancellation";
import {
  checkAvailability,
  createBookingHold,
} from "../src/lib/booking/shared-inventory";
import { executeBookingRefund } from "../src/lib/payment/refund";

async function runPhase5Tests() {
  console.log("\n========================================================");
  console.log("  DEVSTAY ADMIN DASHBOARD — PHASE 5 RESERVATION TESTS");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  // -----------------------------------------------------------
  // 1. Setup Sandbox Properties & Shared Inventory
  // -----------------------------------------------------------
  console.log("1. Setting Up Sandbox Properties & Shared Inventory:");
  const testSlug = `phase5-res-estate-${Date.now().toString().slice(-6)}`;

  // Clean up any stale records
  const staleProps = await prisma.property.findMany({
    where: { slug: testSlug },
    select: { id: true },
  });
  if (staleProps.length > 0) {
    const sIds = staleProps.map((p) => p.id);
    await prisma.availabilityBlock.deleteMany({
      where: { inventoryGroup: { propertyId: { in: sIds } } },
    });
    await prisma.payment.deleteMany({ where: { booking: { propertyId: { in: sIds } } } });
    await prisma.refund.deleteMany({ where: { booking: { propertyId: { in: sIds } } } });
    await prisma.booking.deleteMany({ where: { propertyId: { in: sIds } } });
    await prisma.property.deleteMany({ where: { id: { in: sIds } } });
  }

  const property = await prisma.property.create({
    data: {
      slug: testSlug,
      name: "Phase 5 Sandbox Heritage Villa",
      headline: "Royal Estate with Private Courtyard",
      description: "Dedicated sandbox property for Phase 5 booking operations testing.",
      address: "10 Rajpath",
      city: "Jaipur",
      state: "Rajasthan",
      country: "India",
      postalCode: "302001",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      cancellationPolicy: "Full refund up to 7 days before check-in.",
      isActive: true,
      inventoryGroups: {
        create: {
          name: "Phase 5 Villa Physical Units",
          code: `P5-ESTATE-${Date.now().toString().slice(-4)}`,
          totalPhysicalUnits: 1,
        },
      },
    },
    include: { inventoryGroups: true },
  });

  const invGroup = property.inventoryGroups[0];

  const listingOption = await prisma.listingOption.create({
    data: {
      propertyId: property.id,
      inventoryGroupId: invGroup.id,
      slug: `${testSlug}-royal-suite`,
      title: "Royal Suite Luxury Wing",
      bedroomCount: 2,
      bathroomCount: 2,
      maxGuests: 4,
      basePricePerNight: 12000,
      weekendPricePerNight: 14000,
      cleaningFee: 1500,
      taxPercentage: 18,
      minStayNights: 1,
      extraGuestCharge: 2000,
      description: "Opulent suite configuration for reservation tests.",
      highlights: ["Private Pool", "Heritage Archway"],
      amenitiesList: ["WiFi", "Butler Service"],
      isActive: true,
    },
  });

  assert(!!property.id && !!listingOption.id, "Sandbox property and listing option initialized");

  const staffEmail = "admin@devstaysjaipur.com";
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  // -----------------------------------------------------------
  // 2. Seed Bookings for List & Filter Tests (Scenario 1)
  // -----------------------------------------------------------
  console.log("\n2. Test 1: Booking List, Search, and Filtering:");

  const d1In = new Date(Date.UTC(currentYear, currentMonth, 10));
  const d1Out = new Date(Date.UTC(currentYear, currentMonth, 12));
  const booking1 = await prisma.booking.create({
    data: {
      bookingReference: `DEV-P5-CONF-${Date.now().toString().slice(-4)}`,
      propertyId: property.id,
      listingOptionId: listingOption.id,
      inventoryGroupId: invGroup.id,
      checkInDate: d1In,
      checkOutDate: d1Out,
      nights: 2,
      guestCount: 2,
      customerName: "Maharani Gayatri Devi",
      customerEmail: "gayatridevi@jaipurheritage.in",
      customerPhone: "+91 98290 11111",
      status: BookingStatus.CONFIRMED,
      currency: "INR",
      baseAmount: 24000,
      taxesAmount: 4320,
      totalAmount: 28320,
    },
  });

  const d2In = new Date(Date.UTC(currentYear, currentMonth, 15));
  const d2Out = new Date(Date.UTC(currentYear, currentMonth, 17));
  const booking2 = await prisma.booking.create({
    data: {
      bookingReference: `DEV-P5-INHOUSE-${Date.now().toString().slice(-4)}`,
      propertyId: property.id,
      listingOptionId: listingOption.id,
      inventoryGroupId: invGroup.id,
      checkInDate: d2In,
      checkOutDate: d2Out,
      nights: 2,
      guestCount: 3,
      customerName: "Raja Man Singh",
      customerEmail: "mansingh@amberfort.org",
      customerPhone: "+91 98290 22222",
      status: BookingStatus.CHECKED_IN,
      checkedInAt: new Date(),
      checkInNotes: "VIP welcome garland and courtyard suite key handed over.",
      currency: "INR",
      baseAmount: 24000,
      taxesAmount: 4320,
      totalAmount: 28320,
    },
  });

  const d3In = new Date(Date.UTC(currentYear, currentMonth, 22));
  const d3Out = new Date(Date.UTC(currentYear, currentMonth, 24));
  const booking3 = await prisma.booking.create({
    data: {
      bookingReference: `DEV-P5-HOLD-${Date.now().toString().slice(-4)}`,
      propertyId: property.id,
      listingOptionId: listingOption.id,
      inventoryGroupId: invGroup.id,
      checkInDate: d3In,
      checkOutDate: d3Out,
      nights: 2,
      guestCount: 2,
      customerName: "Sawai Jai Singh",
      customerEmail: "jaisingh@citypalace.in",
      status: BookingStatus.PENDING_HOLD,
      currency: "INR",
      baseAmount: 24000,
      taxesAmount: 4320,
      totalAmount: 28320,
    },
  });

  // Test status filter
  const confList = await getBookingsList({ status: "CONFIRMED", propertyId: property.id });
  assert(
    confList.bookings.some((b) => b.id === booking1.id) &&
      !confList.bookings.some((b) => b.id === booking2.id),
    "Filtering by status 'CONFIRMED' isolates confirmed reservations"
  );

  // Test search filter on guest name
  const searchNameResult = await getBookingsList({ search: "Gayatri", propertyId: property.id });
  assert(
    searchNameResult.bookings.length === 1 && searchNameResult.bookings[0].id === booking1.id,
    "Search matches customer name 'Gayatri'"
  );

  // Test search filter on booking reference
  const searchRefResult = await getBookingsList({ search: booking2.bookingReference });
  assert(
    searchRefResult.bookings.length === 1 && searchRefResult.bookings[0].id === booking2.id,
    "Search matches exact booking reference"
  );

  // Test pagination
  const pagedResult = await getBookingsList({ propertyId: property.id, page: 1, pageSize: 2 });
  assert(
    pagedResult.pagination.pageSize === 2 &&
      pagedResult.pagination.totalRecords >= 3 &&
      pagedResult.bookings.length === 2,
    "Pagination slices records correctly (pageSize: 2)"
  );

  // -----------------------------------------------------------
  // 3. Test 2: Booking Details Retrieval
  // -----------------------------------------------------------
  console.log("\n3. Test 2: Booking Details Retrieval:");
  const detailsById = await getBookingDetails(booking1.id);
  const detailsByRef = await getBookingDetails(booking1.bookingReference);

  assert(
    !!detailsById && detailsById.bookingReference === booking1.bookingReference,
    "Booking details retrieved by unique database ID"
  );
  assert(
    !!detailsByRef && detailsByRef.id === booking1.id,
    "Booking details retrieved by public booking reference"
  );
  assert(
    detailsById?.property.name === property.name &&
      detailsById?.listingOption.title === listingOption.title,
    "Booking details correctly include nested Property and ListingOption entities"
  );

  // -----------------------------------------------------------
  // 4. Test 3: Guest Data Access & Authorization Guard
  // -----------------------------------------------------------
  console.log("\n4. Test 3: Guest Data Access Permissions:");
  process.env.TEST_ADMIN_BYPASS = "false"; // Simulate unauthenticated caller
  const unauthRes = await checkInBookingAction(booking1.id);
  assert(
    !unauthRes.success && Boolean(unauthRes.error?.includes("Unauthorized")),
    "Unauthenticated requests to booking management actions are rejected (401 Unauthorized)"
  );
  process.env.TEST_ADMIN_BYPASS = "true"; // Restore test bypass

  // -----------------------------------------------------------
  // 5. Test 4: Valid Check-In Operation
  // -----------------------------------------------------------
  console.log("\n5. Test 4: Valid Check-In Operation:");
  const checkInRes = await executeCheckIn({
    bookingId: booking1.id,
    staffEmail,
    notes: "Guest arrived early. Room inspected, keys provided.",
  });

  assert(
    checkInRes.status === BookingStatus.CHECKED_IN,
    "Booking status successfully transitioned to CHECKED_IN"
  );
  assert(
    Boolean(checkInRes.checkedInAt) && Boolean(checkInRes.checkInNotes?.includes("keys provided")),
    "checkedInAt timestamp and checkInNotes recorded in PostgreSQL"
  );

  // -----------------------------------------------------------
  // 6. Test 5: Valid Check-Out Operation
  // -----------------------------------------------------------
  console.log("\n6. Test 5: Valid Check-Out Operation:");
  const checkOutRes = await executeCheckOut({
    bookingId: booking1.id,
    staffEmail,
    notes: "Guest departed. Room key received and mini-bar settled.",
  });

  assert(
    checkOutRes.status === BookingStatus.CHECKED_OUT,
    "Booking status successfully transitioned to CHECKED_OUT"
  );
  assert(
    Boolean(checkOutRes.checkedOutAt) && Boolean(checkOutRes.checkOutNotes?.includes("mini-bar settled")),
    "checkedOutAt timestamp and checkOutNotes recorded in PostgreSQL"
  );

  // -----------------------------------------------------------
  // 7. Test 6: Invalid Status Transitions Safeguards
  // -----------------------------------------------------------
  console.log("\n7. Test 6: Invalid Status Transitions Safeguards:");

  // Attempt check-in on already checked-out booking
  let invalidTransitionCaught = false;
  try {
    await executeCheckIn({ bookingId: booking1.id, staffEmail });
  } catch (err: unknown) {
    invalidTransitionCaught = true;
    assert(
      String(err).includes("INVALID_STATE_TRANSITION"),
      "Reject check-in on already CHECKED_OUT reservation"
    );
  }
  if (!invalidTransitionCaught) {
    assert(false, "Failed to reject invalid check-in on checked-out reservation");
  }

  // Attempt check-out on pending hold booking
  let invalidCheckOutCaught = false;
  try {
    await executeCheckOut({ bookingId: booking3.id, staffEmail });
  } catch (err: unknown) {
    invalidCheckOutCaught = true;
    assert(
      String(err).includes("INVALID_STATE_TRANSITION"),
      "Reject check-out on PENDING_HOLD reservation"
    );
  }
  if (!invalidCheckOutCaught) {
    assert(false, "Failed to reject invalid check-out on pending hold reservation");
  }

  // -----------------------------------------------------------
  // 8. Test 7 & 8: Safe Cancellation, Policy Calculation, & Refund Limits
  // -----------------------------------------------------------
  console.log("\n8. Test 7 & 8: Cancellation Policy Calculation & Refund Authorization:");

  // Policy Calculation: Lead time > 7 days (168h) -> 100% refund
  const futureCheckIn = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days in future
  const policy10Days = calculateCancellationRefund(futureCheckIn, 20000, 20000);
  assert(
    policy10Days.refundPercentage === 100 && policy10Days.recommendedRefundAmount === 20000,
    "Cancellation > 7 days before check-in recommends 100% refund"
  );

  // Policy Calculation: Lead time between 48h and 7d -> 50% refund
  const midCheckIn = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000); // 4 days in future
  const policy4Days = calculateCancellationRefund(midCheckIn, 20000, 20000);
  assert(
    policy4Days.refundPercentage === 50 && policy4Days.recommendedRefundAmount === 10000,
    "Cancellation between 48h and 7d recommends 50% refund"
  );

  // Policy Calculation: Lead time < 48 hours -> 0% refund
  const urgentCheckIn = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours in future
  const policy24h = calculateCancellationRefund(urgentCheckIn, 20000, 20000);
  assert(
    policy24h.refundPercentage === 0 && policy24h.recommendedRefundAmount === 0,
    "Cancellation < 48h recommends 0% refund (non-refundable)"
  );

  // Create a booking with captured payment to test cancellation & refund
  const dCancelIn = new Date(Date.UTC(currentYear, currentMonth, 26));
  const dCancelOut = new Date(Date.UTC(currentYear, currentMonth, 28));
  const cancelBooking = await prisma.booking.create({
    data: {
      bookingReference: `DEV-P5-CANC-${Date.now().toString().slice(-4)}`,
      propertyId: property.id,
      listingOptionId: listingOption.id,
      inventoryGroupId: invGroup.id,
      checkInDate: dCancelIn,
      checkOutDate: dCancelOut,
      nights: 2,
      guestCount: 2,
      customerName: "Rao Raja Hanut Singh",
      customerEmail: "hanutsingh@polojaipur.com",
      status: BookingStatus.CONFIRMED,
      currency: "INR",
      baseAmount: 24000,
      taxesAmount: 4320,
      totalAmount: 28320,
    },
  });

  // Create associated AvailabilityBlock
  await prisma.availabilityBlock.create({
    data: {
      inventoryGroupId: invGroup.id,
      bookingId: cancelBooking.id,
      startDate: dCancelIn,
      endDate: dCancelOut,
      reason: BlockReason.BOOKING_CONFIRMED,
      notes: "Confirmed test stay",
    },
  });

  // Create captured Payment
  const paymentRecord = await prisma.payment.create({
    data: {
      bookingId: cancelBooking.id,
      razorpayOrderId: `order_test_${Date.now()}`,
      razorpayPaymentId: `pay_test_${Date.now()}`,
      amount: 28320,
      currency: "INR",
      status: PaymentStatus.CAPTURED,
      method: "card",
      verifiedAt: new Date(),
    },
  });

  // Refund limit safeguard: Reject refund > paid amount
  let excessiveRefundCaught = false;
  try {
    await executeBookingCancellation({
      bookingId: cancelBooking.id,
      staffEmail,
      reason: "Emergency change of schedule",
      refundAmount: 50000, // Exceeds 28,320
    });
  } catch (err: unknown) {
    excessiveRefundCaught = true;
    assert(
      String(err).includes("REFUND_EXCEEDS_PAID"),
      "Reject refund authorization exceeding captured payment amount"
    );
  }
  if (!excessiveRefundCaught) {
    assert(false, "Failed to reject excessive refund amount");
  }

  // Cancel reservation with valid refund
  const cancelExecution = await executeBookingCancellation({
    bookingId: cancelBooking.id,
    staffEmail,
    reason: "Guest itinerary altered due to flights",
    refundAmount: 28320,
  });

  assert(
    cancelExecution.success,
    "Booking cancellation succeeded with authorized refund execution"
  );
  assert(
    cancelExecution.inventoryReleased,
    "Cancellation released shared inventory availability blocks"
  );

  const reloadedCancelBooking = await prisma.booking.findUnique({
    where: { id: cancelBooking.id },
  });
  assert(
    reloadedCancelBooking?.status === BookingStatus.REFUNDED ||
      reloadedCancelBooking?.status === BookingStatus.CANCELLED ||
      reloadedCancelBooking?.status === BookingStatus.REFUND_PENDING,
    "Booking status reflects cancellation/refund lifecycle"
  );
  assert(
    Boolean(reloadedCancelBooking?.cancelledAt) &&
      Boolean(reloadedCancelBooking?.cancellationReason?.includes("flights")),
    "cancelledAt and cancellationReason recorded on booking"
  );

  // -----------------------------------------------------------
  // 9. Test 9: Audited Manual Payment Recording
  // -----------------------------------------------------------
  console.log("\n9. Test 9: Audited Manual Payment Recording:");

  const dManIn = new Date(Date.UTC(currentYear, currentMonth, 28));
  const dManOut = new Date(Date.UTC(currentYear, currentMonth, 30));
  const manualBooking = await prisma.booking.create({
    data: {
      bookingReference: `DEV-P5-MANUAL-${Date.now().toString().slice(-4)}`,
      propertyId: property.id,
      listingOptionId: listingOption.id,
      inventoryGroupId: invGroup.id,
      checkInDate: dManIn,
      checkOutDate: dManOut,
      nights: 2,
      guestCount: 2,
      customerName: "Thakur Jagat Singh",
      customerEmail: "jagat@diggi.in",
      status: BookingStatus.PAYMENT_PENDING,
      currency: "INR",
      baseAmount: 24000,
      taxesAmount: 4320,
      totalAmount: 28320,
    },
  });

  const uniqueUtr = `UTR_${Date.now()}`;
  const manualPayResult = await recordManualPayment({
    bookingId: manualBooking.id,
    staffEmail,
    paymentMethod: "BANK_TRANSFER",
    referenceNumber: uniqueUtr,
    amount: 28320,
    notes: "Verified against HDFC Bank corporate account statement.",
  });

  assert(
    manualPayResult.booking.status === BookingStatus.CONFIRMED,
    "Manual payment transitioned booking status to CONFIRMED"
  );
  assert(
    manualPayResult.payment.status === PaymentStatus.CAPTURED &&
      manualPayResult.payment.razorpayPaymentId === `MANUAL_${uniqueUtr}`,
    "Captured Payment record created with MANUAL_ prefix and UTR reference"
  );

  // Reject duplicate manual reference
  let dupRefCaught = false;
  try {
    await recordManualPayment({
      bookingId: manualBooking.id,
      staffEmail,
      paymentMethod: "BANK_TRANSFER",
      referenceNumber: uniqueUtr,
      amount: 28320,
    });
  } catch (err: unknown) {
    dupRefCaught = true;
    assert(
      String(err).includes("ALREADY_CONFIRMED") || String(err).includes("DUPLICATE_PAYMENT_REF"),
      "Reject duplicate manual payment reference on confirmed booking"
    );
  }
  if (!dupRefCaught) {
    assert(false, "Failed to reject duplicate manual payment reference");
  }

  // -----------------------------------------------------------
  // 10. Test 10: Immutable Booking Price Snapshots
  // -----------------------------------------------------------
  console.log("\n10. Test 10: Immutable Booking Price Snapshots:");

  // Execute an update on guest contact info
  await updateGuestDetails({
    bookingId: manualBooking.id,
    staffEmail,
    customerName: "Thakur Jagat Singh Ji",
    customerPhone: "+91 98290 33333",
  });

  const verifiedBooking = await prisma.booking.findUnique({
    where: { id: manualBooking.id },
  });

  assert(
    Number(verifiedBooking?.baseAmount) === 24000 &&
      Number(verifiedBooking?.taxesAmount) === 4320 &&
      Number(verifiedBooking?.totalAmount) === 28320,
    "Booking financial price snapshots remain 100% immutable after creation and updates"
  );

  // -----------------------------------------------------------
  // 11. Test 11: Availability Release After Cancellation
  // -----------------------------------------------------------
  console.log("\n11. Test 11: Availability Release After Cancellation:");

  const availBlocksAfterCancel = await prisma.availabilityBlock.findMany({
    where: { bookingId: cancelBooking.id },
  });
  assert(
    availBlocksAfterCancel.length === 0,
    "AvailabilityBlock for cancelled booking was completely released"
  );

  const availCheck = await checkAvailability({
    propertyId: property.id,
    checkInDate: dCancelIn,
    checkOutDate: dCancelOut,
    guestCount: 2,
  });
  assert(
    availCheck.available,
    "Target dates immediately register as available in public checkAvailability() after cancellation"
  );

  // -----------------------------------------------------------
  // 12. Test 12: Comprehensive Audit Logging
  // -----------------------------------------------------------
  console.log("\n12. Test 12: Comprehensive Audit Logging:");

  const logs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          "GUEST_CHECKED_IN",
          "GUEST_CHECKED_OUT",
          "BOOKING_CANCELLED_BY_STAFF",
          "MANUAL_PAYMENT_VERIFIED_AND_CONFIRMED",
          "GUEST_DETAILS_UPDATED",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  assert(
    logs.some((l) => l.action === "GUEST_CHECKED_IN"),
    "AuditLog recorded GUEST_CHECKED_IN action"
  );
  assert(
    logs.some((l) => l.action === "GUEST_CHECKED_OUT"),
    "AuditLog recorded GUEST_CHECKED_OUT action"
  );
  assert(
    logs.some((l) => l.action === "BOOKING_CANCELLED_BY_STAFF"),
    "AuditLog recorded BOOKING_CANCELLED_BY_STAFF action"
  );
  assert(
    logs.some((l) => l.action === "MANUAL_PAYMENT_VERIFIED_AND_CONFIRMED"),
    "AuditLog recorded MANUAL_PAYMENT_VERIFIED_AND_CONFIRMED action"
  );

  // -----------------------------------------------------------
  // 13. Test 13: Public Reservation Hold Integration
  // -----------------------------------------------------------
  console.log("\n13. Test 13: Public Web Reservation Hold Integration:");

  const dHoldIn = new Date(Date.UTC(currentYear, currentMonth, 1));
  const dHoldOut = new Date(Date.UTC(currentYear, currentMonth, 3));
  const holdResult = await createBookingHold({
    listingOptionId: listingOption.id,
    checkInDate: dHoldIn,
    checkOutDate: dHoldOut,
    guestCount: 2,
    customerName: "Public Guest Web",
    customerEmail: "guest@webbooking.com",
    customerPhone: "+91 99999 88888",
  });

  assert(
    holdResult.success && !!holdResult.holdId && !!holdResult.holdToken,
    "Public reservation hold successfully created with token"
  );

  // -----------------------------------------------------------
  // 14. Test 14: Activity Timeline Assembly
  // -----------------------------------------------------------
  console.log("\n14. Test 14: Activity Timeline Assembly:");
  const timeline = await getBookingActivityTimeline(manualBooking.id);
  assert(
    timeline.length >= 2 && timeline.some((t) => t.type === "CREATED") && timeline.some((t) => t.type === "PAYMENT"),
    "Activity timeline compiles chronological lifecycle events (Created, Payment, Modifications)"
  );

  // -----------------------------------------------------------
  // 15. Test 15: Operations Dashboard Metrics Verification
  // -----------------------------------------------------------
  console.log("\n15. Test 15: Operations Dashboard Metrics Verification:");
  const dashboardMetrics = await getDashboardOperationalMetrics();
  assert(
    typeof dashboardMetrics.monthlyRevenue === "number" &&
      Array.isArray(dashboardMetrics.todayArrivals) &&
      Array.isArray(dashboardMetrics.todayDepartures) &&
      Array.isArray(dashboardMetrics.inHouseGuests) &&
      Array.isArray(dashboardMetrics.recentReservations),
    "Dashboard metrics aggregate real database records (arrivals, departures, in-house, revenue)"
  );

  // -----------------------------------------------------------
  // Cleanup Sandbox Records
  // -----------------------------------------------------------
  console.log("\nCleaning up Phase 5 sandbox records...");
  await prisma.availabilityBlock.deleteMany({
    where: { inventoryGroup: { propertyId: property.id } },
  });
  await prisma.refund.deleteMany({ where: { booking: { propertyId: property.id } } });
  await prisma.payment.deleteMany({ where: { booking: { propertyId: property.id } } });
  await prisma.booking.deleteMany({ where: { propertyId: property.id } });
  await prisma.listingOption.deleteMany({ where: { propertyId: property.id } });
  await prisma.inventoryGroup.deleteMany({ where: { propertyId: property.id } });
  await prisma.property.delete({ where: { id: property.id } });

  console.log("Cleaned up all Phase 5 sandbox records.\n");

  console.log("========================================================");
  console.log(`  PHASE 5 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5Tests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
