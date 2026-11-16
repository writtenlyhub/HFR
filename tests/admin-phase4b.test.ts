process.env.TEST_ADMIN_BYPASS = "true";

import { prisma } from "../src/lib/prisma";
import { Role, BookingStatus, BookingSource, BlockReason, CalendarPlatform } from "@prisma/client";
import {
  createDateBlock,
  removeDateBlock,
  triggerExternalCalendarSync,
  fetchMonthAvailability,
} from "../src/app/admin/(dashboard)/calendar/availability-actions";
import {
  getCalendarMonthAvailability,
  checkBlockCollisions,
} from "../src/lib/availability/availability-service";
import {
  checkAvailability,
  createBookingHold,
  cleanupExpiredHolds,
} from "../src/lib/booking/shared-inventory";
import { calculateReservationPricing } from "../src/lib/pricing/pricing-engine";

async function runPhase4BTests() {
  console.log("\n========================================================");
  console.log("  DEVSTAY ADMIN DASHBOARD — PHASE 4B AVAILABILITY TESTS");
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
  const testSlugA = `phase4b-estate-a-${Date.now().toString().slice(-6)}`;
  const testSlugB = `phase4b-estate-b-${Date.now().toString().slice(-6)}`;

  // Clean up any stale records from earlier runs
  const staleProps = await prisma.property.findMany({
    where: { slug: { in: [testSlugA, testSlugB] } },
    select: { id: true },
  });
  if (staleProps.length > 0) {
    const sIds = staleProps.map((p) => p.id);
    await prisma.availabilityBlock.deleteMany({
      where: { inventoryGroup: { propertyId: { in: sIds } } },
    });
    await prisma.booking.deleteMany({ where: { propertyId: { in: sIds } } });
    await prisma.property.deleteMany({ where: { id: { in: sIds } } });
  }

  // Estate A: Shared hierarchical inventory (Villa footprint + 2 configurations)
  const estateA = await prisma.$transaction(async (tx) => {
    const prop = await tx.property.create({
      data: {
        name: "DevStay Phase 4B Heritage Estate A",
        slug: testSlugA,
        headline: "Heritage Courtyard Estate",
        description: "Private haveli configured with shared inventory.",
        address: "1 Heritage Way",
        city: "Jaipur",
        state: "Rajasthan",
        country: "India",
        postalCode: "302001",
        checkInTime: "14:00",
        checkOutTime: "11:00",
        houseRules: "Respect the property.",
        cancellationPolicy: "Flexible",
        isActive: true,
      },
    });

    const ig = await tx.inventoryGroup.create({
      data: {
        propertyId: prop.id,
        name: "Estate A Physical Footprint",
        code: `${testSlugA.toUpperCase()}-ESTATE`,
        totalPhysicalUnits: 1,
      },
    });

    // 1BHK Suite configuration
    const config1 = await tx.listingOption.create({
      data: {
        propertyId: prop.id,
        inventoryGroupId: ig.id,
        slug: `${testSlugA}-suite`,
        title: "Royal Suite 1BHK",
        bedroomCount: 1,
        bathroomCount: 1,
        maxGuests: 2,
        basePricePerNight: 8500,
        weekendPricePerNight: 9500,
        cleaningFee: 500,
        taxPercentage: 12,
        description: "1 King Suite",
        isActive: true,
        sortOrder: 1,
      },
    });

    // Whole Villa configuration (shares ig.id)
    const configVilla = await tx.listingOption.create({
      data: {
        propertyId: prop.id,
        inventoryGroupId: ig.id,
        slug: `${testSlugA}-full-villa`,
        title: "Full Villa Buyout",
        bedroomCount: 3,
        bathroomCount: 3,
        maxGuests: 8,
        basePricePerNight: 28000,
        weekendPricePerNight: 32000,
        cleaningFee: 2000,
        taxPercentage: 18,
        description: "Whole Villa",
        isActive: true,
        sortOrder: 2,
      },
    });

    return { prop, ig, config1, configVilla };
  });

  // Estate B: Independent property with its OWN inventory group
  const estateB = await prisma.$transaction(async (tx) => {
    const prop = await tx.property.create({
      data: {
        name: "DevStay Independent Estate B",
        slug: testSlugB,
        headline: "Independent Amber Villa",
        description: "Completely isolated inventory footprint.",
        address: "2 Amber Way",
        city: "Jaipur",
        state: "Rajasthan",
        country: "India",
        postalCode: "302028",
        checkInTime: "14:00",
        checkOutTime: "11:00",
        houseRules: "Quiet hours after 10 PM.",
        cancellationPolicy: "Strict",
        isActive: true,
      },
    });

    const ig = await tx.inventoryGroup.create({
      data: {
        propertyId: prop.id,
        name: "Estate B Physical Footprint",
        code: `${testSlugB.toUpperCase()}-ESTATE`,
        totalPhysicalUnits: 1,
      },
    });

    const config = await tx.listingOption.create({
      data: {
        propertyId: prop.id,
        inventoryGroupId: ig.id,
        slug: `${testSlugB}-manor`,
        title: "Amber Manor",
        bedroomCount: 4,
        bathroomCount: 4,
        maxGuests: 10,
        basePricePerNight: 35000,
        cleaningFee: 2500,
        taxPercentage: 18,
        description: "Exclusive Amber Manor",
        isActive: true,
        sortOrder: 1,
      },
    });

    return { prop, ig, config };
  });

  assert(Boolean(estateA.prop.id) && Boolean(estateB.prop.id), "Sandbox properties created successfully");

  // -----------------------------------------------------------
  // 2. Test 1: Single-Date Blocking
  // -----------------------------------------------------------
  console.log("\n2. Test 1 & 2: Single-Date and Date-Range Blocking:");
  const singleBlockRes = await createDateBlock({
    propertyId: estateA.prop.id,
    startDate: "2026-11-18",
    endDate: "2026-11-19",
    reason: "ADMIN_BLOCKED",
    notes: "VIP private single-night estate hold",
  });
  assert(singleBlockRes.success === true, "Single-date administrative block created");

  const singleBlockInDb = await prisma.availabilityBlock.findFirst({
    where: {
      inventoryGroupId: estateA.ig.id,
      startDate: new Date("2026-11-18T00:00:00.000Z"),
    },
  });
  assert(
    singleBlockInDb !== null && singleBlockInDb.reason === BlockReason.ADMIN_BLOCKED,
    "AvailabilityBlock persisted with reason ADMIN_BLOCKED on the physical InventoryGroup"
  );

  // -----------------------------------------------------------
  // 3. Test 2: Date-Range Blocking
  // -----------------------------------------------------------
  const rangeBlockRes = await createDateBlock({
    propertyId: estateA.prop.id,
    startDate: "2026-11-23",
    endDate: "2026-11-26",
    reason: "SEASONAL_CLOSURE",
    notes: "Post-Diwali deep restoration closure",
  });
  assert(rangeBlockRes.success === true, "Multi-day date-range block created");

  // -----------------------------------------------------------
  // 4. Test 3: Unblocking Eligible Dates
  // -----------------------------------------------------------
  console.log("\n3. Test 3: Unblocking Eligible Dates:");
  if (singleBlockInDb) {
    const unblockRes = await removeDateBlock(singleBlockInDb.id);
    assert(unblockRes.success === true, "Unblocking action successfully executed");

    const checkRemoved = await prisma.availabilityBlock.findUnique({
      where: { id: singleBlockInDb.id },
    });
    assert(checkRemoved === null, "AvailabilityBlock record cleanly deleted from database");
  }

  // -----------------------------------------------------------
  // 5. Test 4: Maintenance Blocks
  // -----------------------------------------------------------
  console.log("\n4. Test 4: Maintenance Blocks:");
  const maintBlockRes = await createDateBlock({
    propertyId: estateA.prop.id,
    startDate: "2026-11-28",
    endDate: "2026-11-30",
    reason: "ADMIN_MAINTENANCE",
    notes: "HVAC and plumbing annual inspection",
  });
  assert(maintBlockRes.success === true, "Maintenance block created with reason ADMIN_MAINTENANCE");

  const monthView = await getCalendarMonthAvailability(estateA.prop.id, null, 2026, 11);
  const day28 = monthView.days.find((d) => d.date === "2026-11-28");
  assert(
    day28?.status === "ADMIN_MAINTENANCE",
    "Monthly calendar accurately classifies day as ADMIN_MAINTENANCE"
  );
  assert(
    day28?.notes === "HVAC and plumbing annual inspection",
    "Maintenance notes surfaced in day details"
  );

  // -----------------------------------------------------------
  // 6. Test 5: Existing Confirmed Booking Protection (CRITICAL)
  // -----------------------------------------------------------
  console.log("\n5. Test 5: Confirmed Guest Reservation Protection (Collision Prevention):");
  const confirmedBooking = await prisma.booking.create({
    data: {
      bookingReference: `CONF-SAFETY-${Date.now().toString().slice(-6)}`,
      propertyId: estateA.prop.id,
      listingOptionId: estateA.configVilla.id,
      inventoryGroupId: estateA.ig.id,
      checkInDate: new Date("2026-12-05T00:00:00.000Z"),
      checkOutDate: new Date("2026-12-08T00:00:00.000Z"),
      nights: 3,
      guestCount: 6,
      customerName: "Maharaja Guest",
      customerEmail: "maharaja@example.com",
      status: BookingStatus.CONFIRMED,
      currency: "INR",
      baseAmount: 84000,
      taxesAmount: 15120,
      totalAmount: 99120,
      source: BookingSource.DIRECT_WEB,
    },
  });

  // Attempting to block dates overlapping confirmed booking: MUST BE STRICTLY BLOCKED!
  const blockedAttempt = await createDateBlock({
    propertyId: estateA.prop.id,
    startDate: "2026-12-06",
    endDate: "2026-12-07",
    reason: "ADMIN_MAINTENANCE",
    notes: "Attempting to overwrite confirmed booking",
  });

  assert(
    blockedAttempt.success === false,
    "CRITICAL: System BLOCKS manual date block overlapping confirmed reservation"
  );
  assert(
    Boolean(blockedAttempt.error?.includes(confirmedBooking.bookingReference)),
    "Actionable rejection message cites active booking reference"
  );

  // Attempting to delete block tied to booking must also be rejected
  const bookingBlock = await prisma.availabilityBlock.create({
    data: {
      inventoryGroupId: estateA.ig.id,
      bookingId: confirmedBooking.id,
      startDate: confirmedBooking.checkInDate,
      endDate: confirmedBooking.checkOutDate,
      reason: BlockReason.BOOKING_CONFIRMED,
    },
  });

  const illegalUnblock = await removeDateBlock(bookingBlock.id);
  assert(
    illegalUnblock.success === false,
    "CRITICAL: System refuses to remove availability blocks tied to active guest bookings"
  );

  // -----------------------------------------------------------
  // 7. Test 6: Pending Reservation Hold Protection
  // -----------------------------------------------------------
  console.log("\n6. Test 6: Pending 15-Minute Reservation Hold Protection:");
  const activeHold = await prisma.booking.create({
    data: {
      bookingReference: `HOLD-SAFETY-${Date.now().toString().slice(-6)}`,
      propertyId: estateA.prop.id,
      listingOptionId: estateA.config1.id,
      inventoryGroupId: estateA.ig.id,
      checkInDate: new Date("2026-12-15T00:00:00.000Z"),
      checkOutDate: new Date("2026-12-18T00:00:00.000Z"),
      nights: 3,
      guestCount: 2,
      customerName: "Prospective Customer",
      customerEmail: "prospect@example.com",
      status: BookingStatus.PENDING_HOLD,
      holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // active for 10 more minutes
      currency: "INR",
      baseAmount: 25500,
      taxesAmount: 3060,
      totalAmount: 28560,
      source: BookingSource.DIRECT_WEB,
    },
  });

  const holdBlockAttempt = await createDateBlock({
    propertyId: estateA.prop.id,
    startDate: "2026-12-16",
    endDate: "2026-12-17",
    reason: "ADMIN_BLOCKED",
    notes: "Attempting to block while guest is in checkout",
  });

  assert(
    holdBlockAttempt.success === false,
    "System BLOCKS manual blocking when a 15-minute checkout hold is active"
  );

  // -----------------------------------------------------------
  // 8. Test 7: Shared Hierarchical Inventory Conflict Prevention
  // -----------------------------------------------------------
  console.log("\n7. Test 7: Shared Hierarchical Inventory Conflict Prevention:");
  // A Whole Villa booking exists on Dec 5-8.
  // When a guest checks availability for the 1BHK Suite for Dec 6-7:
  const sharedAvailability = await checkAvailability({
    propertyId: estateA.prop.id,
    listingOptionId: estateA.config1.id,
    checkInDate: "2026-12-06",
    checkOutDate: "2026-12-07",
    guestCount: 2,
  });

  assert(
    sharedAvailability.available === false,
    "Booking the Whole Villa automatically blocks the shared 1BHK Suite for overlapping dates"
  );
  assert(
    sharedAvailability.sharedInventoryBlocked === true,
    "sharedInventoryBlocked flag set to true"
  );

  // -----------------------------------------------------------
  // 9. Test 8: Independent Property Inventory Isolation
  // -----------------------------------------------------------
  console.log("\n8. Test 8: Independent Property Inventory Isolation:");
  // Checking availability on Estate B for Dec 6-7:
  const estateBAvailability = await checkAvailability({
    propertyId: estateB.prop.id,
    listingOptionId: estateB.config.id,
    checkInDate: "2026-12-06",
    checkOutDate: "2026-12-07",
    guestCount: 2,
  });

  assert(
    estateBAvailability.available === true,
    "Estate A booking has ZERO impact on independent Estate B (Estate B remains available)"
  );

  // -----------------------------------------------------------
  // 10. Test 9 & 10: External iCal Channel Imports & De-duplication
  // -----------------------------------------------------------
  console.log("\n9. Test 9 & 10: External iCal Channel Imports & Duplicate Prevention:");
  const calendarConn = await prisma.externalCalendarConnection.create({
    data: {
      inventoryGroupId: estateA.ig.id,
      platform: CalendarPlatform.AIRBNB,
      connectionName: "Airbnb Test Sync Channel",
      importUrl: "https://example.com/airbnb-calendar.ics",
      isActive: true,
    },
  });

  // Create an external event with stable UID
  const externalEvent = await prisma.externalCalendarEvent.create({
    data: {
      connectionId: calendarConn.id,
      externalUid: "airbnb-uid-test-12345",
      summary: "Reserved on Airbnb - Mr. John Doe",
      startDate: new Date("2026-12-22T00:00:00.000Z"),
      endDate: new Date("2026-12-25T00:00:00.000Z"),
      status: "CONFIRMED",
    },
  });

  const externalBlock = await prisma.availabilityBlock.create({
    data: {
      inventoryGroupId: estateA.ig.id,
      externalCalendarConnectionId: calendarConn.id,
      externalCalendarEventId: externalEvent.id,
      startDate: externalEvent.startDate,
      endDate: externalEvent.endDate,
      reason: BlockReason.EXTERNAL_AIRBNB,
      notes: "Imported from Airbnb",
    },
  });

  assert(Boolean(externalBlock.id), "External iCal reservation created availability block");

  // Verify monthly view reflects external OTA
  const decView = await getCalendarMonthAvailability(estateA.prop.id, null, 2026, 12);
  const day23 = decView.days.find((d) => d.date === "2026-12-23");
  assert(
    day23?.status === "EXTERNAL_RESERVATION",
    "Calendar accurately displays external reservation status"
  );
  assert(
    day23?.externalPlatform === "AIRBNB",
    "Platform identified as AIRBNB"
  );

  // Verify unique constraint prevents duplicate event imports
  let duplicateRejected = false;
  try {
    await prisma.externalCalendarEvent.create({
      data: {
        connectionId: calendarConn.id,
        externalUid: "airbnb-uid-test-12345", // duplicate UID!
        startDate: new Date("2026-12-22T00:00:00.000Z"),
        endDate: new Date("2026-12-25T00:00:00.000Z"),
      },
    });
  } catch {
    duplicateRejected = true;
  }
  assert(duplicateRejected, "Database unique constraint strictly blocks duplicate external event UIDs");

  // -----------------------------------------------------------
  // 11. Test 11: Calendar Synchronization Failures Handling
  // -----------------------------------------------------------
  console.log("\n10. Test 11: External Calendar Synchronization Failures Handling:");
  // Deactivate connection and trigger sync
  await prisma.externalCalendarConnection.update({
    where: { id: calendarConn.id },
    data: { isActive: false },
  });

  const inactiveSyncRes = await triggerExternalCalendarSync(calendarConn.id);
  assert(
    inactiveSyncRes.success === true && inactiveSyncRes.data?.skipped === true,
    "Inactive calendar connection handles sync request gracefully without throwing error"
  );

  // -----------------------------------------------------------
  // 12. Test 12: Expired Reservation Hold Auto-Cleanup
  // -----------------------------------------------------------
  console.log("\n11. Test 12: Expired Reservation Hold Auto-Cleanup:");
  // Create an expired hold in the past
  const expiredHold = await prisma.booking.create({
    data: {
      bookingReference: `EXPIRED-TEST-${Date.now().toString().slice(-6)}`,
      propertyId: estateA.prop.id,
      listingOptionId: estateA.config1.id,
      inventoryGroupId: estateA.ig.id,
      checkInDate: new Date("2026-11-01T00:00:00.000Z"),
      checkOutDate: new Date("2026-11-03T00:00:00.000Z"),
      nights: 2,
      guestCount: 2,
      customerName: "Expired Guest",
      customerEmail: "expired@example.com",
      status: BookingStatus.PENDING_HOLD,
      holdExpiresAt: new Date(Date.now() - 60 * 1000), // expired 1 minute ago
      currency: "INR",
      baseAmount: 17000,
      taxesAmount: 2040,
      totalAmount: 19040,
      source: BookingSource.DIRECT_WEB,
    },
  });

  const expiredBlock = await prisma.availabilityBlock.create({
    data: {
      inventoryGroupId: estateA.ig.id,
      bookingId: expiredHold.id,
      startDate: expiredHold.checkInDate,
      endDate: expiredHold.checkOutDate,
      reason: BlockReason.BOOKING_HOLD,
      expiresAt: expiredHold.holdExpiresAt,
    },
  });

  // Run cleanup routine
  const cleanedCount = await cleanupExpiredHolds();
  assert(cleanedCount >= 1, "Expired hold cleanup successfully processed stale holds");

  const holdInDb = await prisma.booking.findUnique({ where: { id: expiredHold.id } });
  assert(
    holdInDb?.status === BookingStatus.HOLD_EXPIRED,
    "Booking status automatically updated to HOLD_EXPIRED"
  );

  const blockInDb = await prisma.availabilityBlock.findUnique({ where: { id: expiredBlock.id } });
  assert(blockInDb === null, "AvailabilityBlock for expired hold deleted, freeing inventory");

  // -----------------------------------------------------------
  // 13. Test 13: Public Availability Updates
  // -----------------------------------------------------------
  console.log("\n12. Test 13: Public Website Availability Updates:");
  // Dates 2026-12-28 to 2026-12-30 are currently open
  const openCheck = await checkAvailability({
    propertyId: estateA.prop.id,
    listingOptionId: estateA.config1.id,
    checkInDate: "2026-12-28",
    checkOutDate: "2026-12-30",
    guestCount: 2,
  });
  assert(openCheck.available === true, "Dates 2026-12-28 to 2026-12-30 initially open on public engine");

  // Administrator adds a block
  const pubBlock = await createDateBlock({
    propertyId: estateA.prop.id,
    startDate: "2026-12-28",
    endDate: "2026-12-30",
    reason: "ADMIN_MAINTENANCE",
    notes: "Year-end maintenance",
  });
  assert(pubBlock.success === true, "Admin block created for public test");

  // Public check immediately reflects unavailable
  const blockedCheck = await checkAvailability({
    propertyId: estateA.prop.id,
    listingOptionId: estateA.config1.id,
    checkInDate: "2026-12-28",
    checkOutDate: "2026-12-30",
    guestCount: 2,
  });
  assert(
    blockedCheck.available === false,
    "Public website checkAvailability() immediately reflects blocked state without cache stale delay"
  );

  // -----------------------------------------------------------
  // 14. Test 14: Concurrent Booking Collision Protection
  // -----------------------------------------------------------
  console.log("\n13. Test 14: Concurrent Booking Collision Protection:");
  // Both User 1 and User 2 try to create holds for the exact same physical estate
  const [resUser1, resUser2] = await Promise.all([
    createBookingHold({
      listingOptionId: estateA.configVilla.id,
      checkInDate: "2027-01-10",
      checkOutDate: "2027-01-12",
      guestCount: 4,
      customerName: "Concurrent User 1",
      customerEmail: "user1@example.com",
    }),
    createBookingHold({
      listingOptionId: estateA.configVilla.id,
      checkInDate: "2027-01-10",
      checkOutDate: "2027-01-12",
      guestCount: 4,
      customerName: "Concurrent User 2",
      customerEmail: "user2@example.com",
    }),
  ]);

  const oneSuccess = (resUser1.success && !resUser2.success) || (!resUser1.success && resUser2.success);
  assert(
    oneSuccess,
    "PostgreSQL row-level lock ensures EXACTLY ONE concurrent hold succeeds and the other is safely rejected"
  );

  // -----------------------------------------------------------
  // 15. Test 15: Existing Pricing Engine Calculations Preservation
  // -----------------------------------------------------------
  console.log("\n14. Test 15: Pricing Calculations Preservation:");
  const pricingCheck = await calculateReservationPricing({
    propertyId: estateA.prop.id,
    listingOptionId: estateA.config1.id,
    checkInDate: "2027-01-20",
    checkOutDate: "2027-01-22",
    guestCount: 2,
  });
  assert(
    pricingCheck.baseNightlyTotal === 17000 && pricingCheck.nights === 2,
    "Dynamic pricing engine preserved intact (₹8,500 * 2 = ₹17,000)"
  );

  // -----------------------------------------------------------
  // 16. Audit Log Recording Verification
  // -----------------------------------------------------------
  console.log("\n15. Testing Audit Log Recording:");
  const logs = await prisma.auditLog.findMany({
    where: {
      action: { in: ["AVAILABILITY_BLOCK_CREATED", "AVAILABILITY_BLOCK_REMOVED"] },
    },
    take: 5,
  });
  assert(logs.length >= 2, "Audit log records created for availability operations");

  // -----------------------------------------------------------
  // Clean Up Sandbox Records
  // -----------------------------------------------------------
  await prisma.availabilityBlock.deleteMany({
    where: { inventoryGroup: { propertyId: { in: [estateA.prop.id, estateB.prop.id] } } },
  });
  await prisma.externalCalendarEvent.deleteMany({
    where: { connection: { inventoryGroup: { propertyId: estateA.prop.id } } },
  });
  await prisma.externalCalendarConnection.deleteMany({
    where: { inventoryGroupId: estateA.ig.id },
  });
  await prisma.booking.deleteMany({
    where: { propertyId: { in: [estateA.prop.id, estateB.prop.id] } },
  });
  await prisma.property.deleteMany({
    where: { id: { in: [estateA.prop.id, estateB.prop.id] } },
  });
  console.log("\nCleaned up all Phase 4B sandbox records.");

  // -----------------------------------------------------------
  // Summary
  // -----------------------------------------------------------
  console.log("\n========================================================");
  console.log(`  PHASE 4B TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) process.exit(1);
}

runPhase4BTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
