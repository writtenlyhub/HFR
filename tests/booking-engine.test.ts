import { prisma } from "../src/lib/prisma";
import {
  checkAvailability,
  createBookingHold,
  cleanupExpiredHolds,
  normalizeDate,
} from "../src/lib/booking/shared-inventory";
import { BookingStatus, BlockReason, BookingSource } from "@prisma/client";

interface TestStats {
  passed: number;
  failed: number;
  total: number;
}

const stats: TestStats = { passed: 0, failed: 0, total: 0 };

function assert(condition: boolean, message: string) {
  stats.total++;
  if (condition) {
    stats.passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    stats.failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log("===============================================================");
  console.log("  HOTEL FEDERATION - SHARED INVENTORY & BOOKING ENGINE TEST SUITE");
  console.log("===============================================================\n");

  // Clean up any old test records
  await prisma.availabilityBlock.deleteMany({
    where: { notes: { contains: "HFR-TEST-" } },
  });
  await prisma.booking.deleteMany({
    where: { bookingReference: { startsWith: "HFR-TEST-" } },
  });

  const property = await prisma.property.findUnique({
    where: { slug: "dev-stays-jaipur" },
    include: { inventoryGroups: true, listingOptions: true },
  });

  if (!property) throw new Error("Property Dev Stays Jaipur not found in DB.");
  const invGroupId = property.inventoryGroups[0].id;

  const mainBedOpt = property.listingOptions.find((o) => o.slug === "royal-suite")!;
  const wholeVillaOpt = property.listingOptions.find((o) => o.slug === "full-estate-buyout")!;

  console.log(`Loaded Property: ${property.name}`);
  console.log(`Shared Inventory Group: ${property.inventoryGroups[0].name} (Units: ${property.inventoryGroups[0].totalPhysicalUnits})\n`);

  // -------------------------------------------------------------
  // TEST 1: Available Date Range
  // -------------------------------------------------------------
  console.log("TEST 1: Available Date Range Checking & Pricing Calculation");
  const t1 = await checkAvailability({
    propertySlug: "dev-stays-jaipur",
    listingOptionSlug: "royal-suite",
    checkInDate: "2027-01-10",
    checkOutDate: "2027-01-14",
    guestCount: 2,
  });
  assert(t1.available === true, "Open dates are available");
  assert(t1.pricing?.nights === 4, "Nights calculated correctly as 4");
  assert(
    t1.pricing?.baseAmount === 4 * Number(mainBedOpt.basePricePerNight),
    `Base price calculation matches (4 * ${mainBedOpt.basePricePerNight})`
  );
  assert(t1.sharedInventoryBlocked === false, "Shared inventory is unblocked");

  // -------------------------------------------------------------
  // TEST 2: Overlapping Confirmed Booking
  // -------------------------------------------------------------
  console.log("\nTEST 2: Overlapping Confirmed Booking Protection");
  const t2Booking = await prisma.booking.create({
    data: {
      bookingReference: "HFR-TEST-CONFIRMED-01",
      propertyId: property.id,
      listingOptionId: wholeVillaOpt.id,
      inventoryGroupId: invGroupId,
      checkInDate: normalizeDate("2027-02-10"),
      checkOutDate: normalizeDate("2027-02-15"),
      nights: 5,
      guestCount: 6,
      customerName: "Test Confirmed Guest",
      customerEmail: "confirmed@test.com",
      status: BookingStatus.CONFIRMED,
      currency: "INR",
      baseAmount: 142500,
      totalAmount: 168150,
      source: BookingSource.DIRECT_WEB,
    },
  });

  await prisma.availabilityBlock.create({
    data: {
      inventoryGroupId: invGroupId,
      bookingId: t2Booking.id,
      startDate: normalizeDate("2027-02-10"),
      endDate: normalizeDate("2027-02-15"),
      reason: BlockReason.BOOKING_CONFIRMED,
      notes: "HFR-TEST-CONFIRMED-01",
    },
  });

  const t2Overlap = await checkAvailability({
    propertySlug: "dev-stays-jaipur",
    listingOptionSlug: "royal-suite",
    checkInDate: "2027-02-12",
    checkOutDate: "2027-02-14",
    guestCount: 2,
  });
  assert(t2Overlap.available === false, "Overlapping confirmed booking rejected");
  assert(t2Overlap.sharedInventoryBlocked === true, "Shared inventory marked blocked");

  // -------------------------------------------------------------
  // TEST 3: Overlapping Active Hold
  // -------------------------------------------------------------
  console.log("\nTEST 3: Overlapping Active Temporary Hold");
  const t3Hold = await createBookingHold({
    listingOptionSlug: "courtyard-wing",
    checkInDate: "2027-03-01",
    checkOutDate: "2027-03-05",
    guestCount: 4,
    customerName: "Hold Guest",
    customerEmail: "hold@test.com",
    idempotencyKey: "test-hold-key-01",
  });
  assert(t3Hold.success === true, "Hold created successfully");
  assert(t3Hold.expiresInSeconds === 900, "Hold duration set to 15 minutes (900s)");

  const t3Check = await checkAvailability({
    propertySlug: "dev-stays-jaipur",
    listingOptionSlug: "full-estate-buyout",
    checkInDate: "2027-03-02",
    checkOutDate: "2027-03-04",
    guestCount: 4,
  });
  assert(t3Check.available === false, "Active hold blocks overlapping booking");
  assert(
    Boolean(t3Check.reason?.includes("temporary") || t3Check.reason?.includes("held")),
    "Reason clearly indicates active hold"
  );

  // -------------------------------------------------------------
  // TEST 4: Expired Hold Becoming Available Again
  // -------------------------------------------------------------
  console.log("\nTEST 4: Expired Hold Auto-Release & Availability Restoration");
  // Backdate the hold expiration to 2 minutes ago
  await prisma.booking.update({
    where: { id: t3Hold.holdId! },
    data: { holdExpiresAt: new Date(Date.now() - 120000) },
  });
  await prisma.availabilityBlock.updateMany({
    where: { bookingId: t3Hold.holdId! },
    data: { expiresAt: new Date(Date.now() - 120000) },
  });

  const prunedCount = await cleanupExpiredHolds();
  assert(prunedCount >= 1, `Expired hold detected and cleaned up (count: ${prunedCount})`);

  const t4Check = await checkAvailability({
    propertySlug: "dev-stays-jaipur",
    listingOptionSlug: "courtyard-wing",
    checkInDate: "2027-03-01",
    checkOutDate: "2027-03-05",
    guestCount: 4,
  });
  assert(t4Check.available === true, "Dates become available again after hold expires");

  // -------------------------------------------------------------
  // TEST 5: Adjacent Bookings Being Allowed (Half-Open Intervals)
  // -------------------------------------------------------------
  console.log("\nTEST 5: Adjacent Bookings (Checkout day = Next Checkin day)");
  // Create a hold for April 10 to April 15
  const t5Hold = await createBookingHold({
    listingOptionSlug: "full-estate-buyout",
    checkInDate: "2027-04-10",
    checkOutDate: "2027-04-15",
    guestCount: 8,
    customerName: "April Guest",
    customerEmail: "april@test.com",
  });
  assert(t5Hold.success === true, "Prior booking held for Apr 10 - Apr 15");

  // Check immediately adjacent next booking: April 15 to April 20
  const t5Adjacent = await checkAvailability({
    propertySlug: "dev-stays-jaipur",
    listingOptionSlug: "royal-suite",
    checkInDate: "2027-04-15",
    checkOutDate: "2027-04-20",
    guestCount: 2,
  });
  assert(t5Adjacent.available === true, "Adjacent booking starting on checkout date is ALLOWED");

  // -------------------------------------------------------------
  // TEST 6: Main Bedroom Booking Blocks All Configurations
  // -------------------------------------------------------------
  console.log("\nTEST 6: Main Bedroom booking blocks 2 Bedrooms and Whole Villa");
  const t6Hold = await createBookingHold({
    listingOptionSlug: "royal-suite",
    checkInDate: "2027-05-01",
    checkOutDate: "2027-05-05",
    guestCount: 2,
    customerName: "Solo Guest",
    customerEmail: "solo@test.com",
  });
  assert(t6Hold.success === true, "Main Bedroom held for May 01 - May 05");

  const t6TwoBed = await checkAvailability({
    propertySlug: "dev-stays-jaipur",
    listingOptionSlug: "courtyard-wing",
    checkInDate: "2027-05-02",
    checkOutDate: "2027-05-04",
    guestCount: 4,
  });
  assert(t6TwoBed.available === false, "2 Bedrooms is blocked by Main Bedroom booking");

  const t6Villa = await checkAvailability({
    propertySlug: "dev-stays-jaipur",
    listingOptionSlug: "full-estate-buyout",
    checkInDate: "2027-05-02",
    checkOutDate: "2027-05-04",
    guestCount: 8,
  });
  assert(t6Villa.available === false, "Whole Villa is blocked by Main Bedroom booking");

  // -------------------------------------------------------------
  // TEST 7: 2 Bedrooms Booking Blocks All Configurations
  // -------------------------------------------------------------
  console.log("\nTEST 7: 2 Bedrooms booking blocks Main Bedroom and Whole Villa");
  const t7Hold = await createBookingHold({
    listingOptionSlug: "courtyard-wing",
    checkInDate: "2027-06-01",
    checkOutDate: "2027-06-05",
    guestCount: 4,
    customerName: "Family Guest",
    customerEmail: "family@test.com",
  });
  assert(t7Hold.success === true, "2 Bedrooms held for Jun 01 - Jun 05");

  const t7Main = await checkAvailability({
    propertySlug: "dev-stays-jaipur",
    listingOptionSlug: "royal-suite",
    checkInDate: "2027-06-02",
    checkOutDate: "2027-06-04",
    guestCount: 2,
  });
  assert(t7Main.available === false, "Main Bedroom is blocked by 2 Bedrooms booking");

  const t7Villa = await checkAvailability({
    propertySlug: "dev-stays-jaipur",
    listingOptionSlug: "full-estate-buyout",
    checkInDate: "2027-06-02",
    checkOutDate: "2027-06-04",
    guestCount: 8,
  });
  assert(t7Villa.available === false, "Whole Villa is blocked by 2 Bedrooms booking");

  // -------------------------------------------------------------
  // TEST 8: Whole Villa Booking Blocks All Configurations
  // -------------------------------------------------------------
  console.log("\nTEST 8: Whole Villa booking blocks Main Bedroom and 2 Bedrooms");
  const t8Hold = await createBookingHold({
    listingOptionSlug: "full-estate-buyout",
    checkInDate: "2027-07-01",
    checkOutDate: "2027-07-05",
    guestCount: 10,
    customerName: "Retreat Group",
    customerEmail: "group@test.com",
  });
  assert(t8Hold.success === true, "Whole Villa held for Jul 01 - Jul 05");

  const t8Main = await checkAvailability({
    propertySlug: "dev-stays-jaipur",
    listingOptionSlug: "royal-suite",
    checkInDate: "2027-07-02",
    checkOutDate: "2027-07-04",
    guestCount: 2,
  });
  assert(t8Main.available === false, "Main Bedroom is blocked by Whole Villa booking");

  const t8TwoBed = await checkAvailability({
    propertySlug: "dev-stays-jaipur",
    listingOptionSlug: "courtyard-wing",
    checkInDate: "2027-07-02",
    checkOutDate: "2027-07-04",
    guestCount: 4,
  });
  assert(t8TwoBed.available === false, "2 Bedrooms is blocked by Whole Villa booking");

  // -------------------------------------------------------------
  // TEST 9: Guest Capacity Validation
  // -------------------------------------------------------------
  console.log("\nTEST 9: Guest Capacity Strict Validation");
  const t9OverCapacity = await createBookingHold({
    listingOptionSlug: "royal-suite", // max 2 guests
    checkInDate: "2027-09-01",
    checkOutDate: "2027-09-05",
    guestCount: 5, // Exceeds 2
    customerName: "Too Many Guests",
    customerEmail: "capacity@test.com",
  });
  assert(t9OverCapacity.success === false, "Excess guest count (5 > 2) is strictly rejected");
  assert(
    t9OverCapacity.error?.includes("Capacity exceeded") || false,
    "Clear capacity error returned"
  );

  // -------------------------------------------------------------
  // TEST 10: CONCURRENCY RACE CONDITION TEST (Mandatory)
  // Two simultaneous requests for the exact same inventory and dates
  // -------------------------------------------------------------
  console.log("\nTEST 10: Concurrency Test – 2 Simultaneous Requests with Row-Level Locking");
  const raceDates = {
    checkInDate: "2027-10-10",
    checkOutDate: "2027-10-15",
  };

  console.log("  Launching 2 simultaneous createBookingHold requests via Promise.all...");
  const [res1, res2] = await Promise.all([
    createBookingHold({
      listingOptionSlug: "royal-suite",
      ...raceDates,
      guestCount: 2,
      customerName: "Racer 1",
      customerEmail: "racer1@test.com",
    }),
    createBookingHold({
      listingOptionSlug: "full-estate-buyout",
      ...raceDates,
      guestCount: 8,
      customerName: "Racer 2",
      customerEmail: "racer2@test.com",
    }),
  ]);

  const successCount = (res1.success ? 1 : 0) + (res2.success ? 1 : 0);
  const failureCount = (!res1.success ? 1 : 0) + (!res2.success ? 1 : 0);

  assert(successCount === 1, "Exactly ONE concurrent request acquired the lock and succeeded");
  assert(failureCount === 1, "The competing request was serialized and received a conflict rejection");

  const winner = res1.success ? "Racer 1 (Main Bedroom)" : "Racer 2 (Whole Villa)";
  console.log(`  Winning hold: ${winner}`);

  // Verify only 1 availability block was written to the database for these dates
  const raceBlocks = await prisma.availabilityBlock.findMany({
    where: {
      inventoryGroupId: invGroupId,
      startDate: normalizeDate(raceDates.checkInDate),
      endDate: normalizeDate(raceDates.checkOutDate),
    },
  });
  assert(raceBlocks.length === 1, `Exactly 1 availability block written in PostgreSQL (found: ${raceBlocks.length})`);

  // Final Cleanup of test-created records
  console.log("\nCleaning up test artifacts...");
  await prisma.availabilityBlock.deleteMany({
    where: {
      startDate: { gte: normalizeDate("2027-01-01") },
    },
  });
  await prisma.booking.deleteMany({
    where: {
      checkInDate: { gte: normalizeDate("2027-01-01") },
    },
  });

  console.log("\n===============================================================");
  console.log(`  TEST RESULTS: ${stats.passed}/${stats.total} PASSED (${stats.failed} FAILED)`);
  console.log("===============================================================\n");

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
