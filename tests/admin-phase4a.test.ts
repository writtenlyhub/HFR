process.env.TEST_ADMIN_BYPASS = "true";

import { prisma } from "../src/lib/prisma";
import { Role, BookingStatus, BookingSource } from "@prisma/client";
import {
  calculateReservationPricing,
  evaluateSingleNightRate,
  getCalendarMonthPricing,
  normalizeDateOnly,
  formatDateKey,
} from "../src/lib/pricing/pricing-engine";
import {
  updateListingPricingSettings,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  togglePricingRule,
  quickDateOverride,
  previewPricingCalculation,
} from "../src/app/admin/(dashboard)/pricing/pricing-actions";
import { createBookingHold } from "../src/lib/booking/shared-inventory";

async function runPhase4ATests() {
  console.log("\n========================================================");
  console.log("  DEVSTAY ADMIN DASHBOARD — PHASE 4A PRICING TESTS");
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
  // 1. Setup Sandbox Property & Configurations
  // -----------------------------------------------------------
  console.log("1. Setting Up Phase 4A Pricing Sandbox:");
  const testSlug = `phase4a-pricing-estate-${Date.now().toString().slice(-6)}`;
  
  // Clean up any stale test records from aborted previous runs
  const staleProps = await prisma.property.findMany({
    where: { slug: { startsWith: "phase4a-pricing-estate" } },
    select: { id: true },
  });
  if (staleProps.length > 0) {
    const staleIds = staleProps.map((p) => p.id);
    await prisma.availabilityBlock.deleteMany({
      where: { booking: { propertyId: { in: staleIds } } },
    });
    await prisma.booking.deleteMany({
      where: { propertyId: { in: staleIds } },
    });
    await prisma.pricingRule.deleteMany({
      where: { propertyId: { in: staleIds } },
    });
    await prisma.property.deleteMany({
      where: { id: { in: staleIds } },
    });
  }

  const sandbox = await prisma.$transaction(async (tx) => {
    const prop = await tx.property.create({
      data: {
        name: "Phase 4A Royal Heritage Sanctuary",
        slug: testSlug,
        headline: "Ultra-Luxury Private Estate in Jaipur",
        description: "An authentic architectural sanctuary for dynamic pricing tests.",
        address: "44 Amber Fort Ridge",
        city: "Jaipur",
        state: "Rajasthan",
        country: "India",
        postalCode: "302028",
        checkInTime: "14:00",
        checkOutTime: "11:00",
        houseRules: "Respect the property heritage.",
        cancellationPolicy: "Full refund 7 days prior.",
        isActive: true,
      },
    });

    const invGroup = await tx.inventoryGroup.create({
      data: {
        propertyId: prop.id,
        name: `${prop.name} Estate Footprint`,
        code: `${testSlug.toUpperCase()}-ESTATE`,
        totalPhysicalUnits: 1,
      },
    });

    const config = await tx.listingOption.create({
      data: {
        propertyId: prop.id,
        inventoryGroupId: invGroup.id,
        slug: `${testSlug}-grand-suite`,
        title: "Grand Royal Suite",
        bedroomCount: 2,
        bathroomCount: 2,
        maxGuests: 6,
        standardGuests: 4,
        basePricePerNight: 10000,
        weekendPricePerNight: 12000,
        cleaningFee: 1000,
        taxPercentage: 12,
        extraGuestCharge: 1500,
        minStayNights: 1,
        description: "2 King bedroom royal configuration.",
        isActive: true,
        sortOrder: 1,
      },
    });

    return { prop, invGroup, config };
  });

  assert(Boolean(sandbox.prop.id), "Sandbox test property created successfully");

  // -----------------------------------------------------------
  // 2. Base & Weekend Pricing Evaluation
  // -----------------------------------------------------------
  console.log("\n2. Testing Base vs Weekend Pricing Calculations:");
  // Stay: 2026-11-18 (Wed) to 2026-11-20 (Fri) -> 2 weekday nights (Wed, Thu)
  const weekdayCalc = await calculateReservationPricing({
    propertyId: sandbox.prop.id,
    listingOptionId: sandbox.config.id,
    checkInDate: "2026-11-18",
    checkOutDate: "2026-11-20",
    guestCount: 2,
  });

  assert(weekdayCalc.nights === 2, "Weekday stay correctly calculates 2 nights");
  assert(
    weekdayCalc.baseNightlyTotal === 20000,
    "Weekday stay applies basePricePerNight (₹10,000 * 2 = ₹20,000)"
  );
  assert(
    weekdayCalc.nightlyRates.every((n) => n.rateType === "BASE"),
    "Both nights classified as BASE rateType"
  );

  // Stay spanning weekend: 2026-11-20 (Fri) to 2026-11-22 (Sun) -> 2 weekend nights (Fri, Sat)
  const weekendCalc = await calculateReservationPricing({
    propertyId: sandbox.prop.id,
    listingOptionId: sandbox.config.id,
    checkInDate: "2026-11-20",
    checkOutDate: "2026-11-22",
    guestCount: 2,
  });

  assert(
    weekendCalc.baseNightlyTotal === 24000,
    "Weekend stay applies weekendPricePerNight (₹12,000 * 2 = ₹24,000)"
  );
  assert(
    weekendCalc.nightlyRates.every((n) => n.isWeekend && n.rateType === "WEEKEND"),
    "Friday and Saturday nights automatically identified as WEEKEND rateType"
  );

  // Blended stay: Thursday to Sunday (1 weekday night + 2 weekend nights = ₹10k + ₹12k + ₹12k = ₹34k)
  const blendedCalc = await calculateReservationPricing({
    propertyId: sandbox.prop.id,
    listingOptionId: sandbox.config.id,
    checkInDate: "2026-11-19",
    checkOutDate: "2026-11-22",
    guestCount: 2,
  });
  assert(
    blendedCalc.baseNightlyTotal === 34000,
    "Blended stay accurately combines weekday and weekend rates (₹10k + ₹12k + ₹12k = ₹34,000)"
  );

  // -----------------------------------------------------------
  // 3. Seasonal Rule Creation & Multiplier Application
  // -----------------------------------------------------------
  console.log("\n3. Testing Seasonal Pricing (Fixed Rate & Multiplier):");
  // Create seasonal fixed price rule for December peak
  const seasonRuleRes = await createPricingRule({
    propertyId: sandbox.prop.id,
    listingOptionId: sandbox.config.id,
    name: "Winter Heritage Peak Season",
    ruleType: "SEASONAL",
    startDate: "2026-12-01",
    endDate: "2026-12-20",
    pricePerNight: 16000, // Fixed seasonal rate
    minStayNights: 2,
  });
  assert(seasonRuleRes.success === true, "Seasonal fixed-price rule created successfully");

  const seasonalCalc = await calculateReservationPricing({
    propertyId: sandbox.prop.id,
    listingOptionId: sandbox.config.id,
    checkInDate: "2026-12-05",
    checkOutDate: "2026-12-08", // 3 nights in seasonal window
    guestCount: 2,
  });
  assert(
    seasonalCalc.baseNightlyTotal === 48000,
    "Seasonal fixed rate overrides standard rates (₹16,000 * 3 = ₹48,000)"
  );
  assert(
    seasonalCalc.nightlyRates.every((n) => n.rateType === "SEASONAL"),
    "Nightly rates classified as SEASONAL rateType"
  );
  assert(
    seasonalCalc.requiredMinStay === 2,
    "Minimum stay requirement from seasonal rule (2 nights) is recognized"
  );

  // -----------------------------------------------------------
  // 4. Holiday Premium Rule & Precedence over Seasonal
  // -----------------------------------------------------------
  console.log("\n4. Testing Holiday Premium & Precedence over Seasonal:");
  // Add a holiday rule overlapping inside the seasonal window
  const holidayRuleRes = await createPricingRule({
    propertyId: sandbox.prop.id,
    listingOptionId: sandbox.config.id,
    name: "Pushkar Festival Weekend",
    ruleType: "HOLIDAY",
    startDate: "2026-12-10",
    endDate: "2026-12-12",
    pricePerNight: 22000, // Higher holiday premium
    minStayNights: 3,
  });
  assert(holidayRuleRes.success === true, "Holiday premium rule created successfully");

  // Check night of 2026-12-11 (falls within both Seasonal 12-01..12-20 and Holiday 12-10..12-12)
  const holidayNightCalc = await calculateReservationPricing({
    propertyId: sandbox.prop.id,
    listingOptionId: sandbox.config.id,
    checkInDate: "2026-12-10",
    checkOutDate: "2026-12-13", // 3 nights
    guestCount: 2,
  });

  const night10 = holidayNightCalc.nightlyRates.find((n) => n.date === "2026-12-10");
  const night12 = holidayNightCalc.nightlyRates.find((n) => n.date === "2026-12-12");
  assert(
    night10?.rateType === "HOLIDAY" && night10.appliedRate === 22000,
    "Holiday rule takes precedence over seasonal rule for overlapping dates (₹22,000 vs ₹16,000)"
  );
  assert(
    night10?.ruleName === "Pushkar Festival Weekend",
    "Rule name correctly attributed to Holiday rule"
  );

  // -----------------------------------------------------------
  // 5. Date-Specific Override (Highest Precedence)
  // -----------------------------------------------------------
  console.log("\n5. Testing Date-Specific Overrides (Highest Precedence):");
  // Set date-specific override on 2026-12-11
  const overrideRes = await quickDateOverride({
    propertyId: sandbox.prop.id,
    listingOptionId: sandbox.config.id,
    startDate: "2026-12-11",
    endDate: "2026-12-11",
    pricePerNight: 28000,
    label: "VIP Gala Night Override",
  });
  assert(overrideRes.success === true, "Date-specific override created successfully");

  const overrideCalc = await calculateReservationPricing({
    propertyId: sandbox.prop.id,
    listingOptionId: sandbox.config.id,
    checkInDate: "2026-12-10",
    checkOutDate: "2026-12-13",
    guestCount: 2,
  });

  const night11 = overrideCalc.nightlyRates.find((n) => n.date === "2026-12-11");
  assert(
    night11?.rateType === "OVERRIDE" && night11.appliedRate === 28000,
    "Date override takes highest precedence over Holiday and Seasonal rules (₹28,000)"
  );
  assert(
    night11?.ruleName === "VIP Gala Night Override",
    "Rule name correctly identifies override label"
  );

  // -----------------------------------------------------------
  // 6. Extra Guest Surcharge & Tax Calculation
  // -----------------------------------------------------------
  console.log("\n6. Testing Extra Guest Fees & GST Calculations:");
  // Standard guests = 4, requested = 6 (2 extra guests @ ₹1,500/night each)
  // Stay: 2 nights weekday -> 2 * ₹10,000 = ₹20,000 base
  // Extra guest charge: 2 extra * ₹1,500 * 2 nights = ₹6,000
  // Cleaning fee = ₹1,000
  // Taxable amount = ₹20,000 + ₹6,000 + ₹1,000 = ₹27,000
  // Tax 12% = ₹3,240
  // Total = ₹30,240
  const extraGuestCalc = await calculateReservationPricing({
    propertyId: sandbox.prop.id,
    listingOptionId: sandbox.config.id,
    checkInDate: "2026-11-18",
    checkOutDate: "2026-11-20",
    guestCount: 6,
  });

  assert(extraGuestCalc.extraGuestCount === 2, "Extra guest count accurately calculated (6 - 4 = 2)");
  assert(
    extraGuestCalc.extraGuestTotal === 6000,
    "Extra guest fee calculated correctly (2 guests * ₹1,500 * 2 nights = ₹6,000)"
  );
  assert(
    extraGuestCalc.cleaningFee === 1000,
    "Cleaning fee of ₹1,000 included in breakdown"
  );
  assert(
    extraGuestCalc.taxableAmount === 27000,
    "Taxable amount combines base + extra guests + cleaning (₹27,000)"
  );
  assert(
    extraGuestCalc.taxesAmount === 3240,
    "12% GST calculated accurately (₹27,000 * 12% = ₹3,240)"
  );
  assert(
    extraGuestCalc.totalAmount === 30240,
    "Grand total matches taxable + taxes (₹30,240)"
  );

  // -----------------------------------------------------------
  // 7. Minimum Stay Enforcement
  // -----------------------------------------------------------
  console.log("\n7. Testing Minimum Stay Enforcement:");
  // Holiday rule requires 3 nights min stay. Requesting only 2 nights:
  const shortStayCalc = await calculateReservationPricing({
    propertyId: sandbox.prop.id,
    listingOptionId: sandbox.config.id,
    checkInDate: "2026-12-10",
    checkOutDate: "2026-12-12", // 2 nights
    guestCount: 2,
  });

  assert(
    shortStayCalc.meetsMinStay === false,
    "Identifies reservation failing required minimum stay"
  );
  assert(
    Boolean(shortStayCalc.minStayError?.includes("minimum stay of 3 nights")),
    "Provides actionable error explaining 3 nights minimum requirement"
  );

  // -----------------------------------------------------------
  // 8. Immutable Confirmed Booking Snapshot Guarantee
  // -----------------------------------------------------------
  console.log("\n8. Testing Immutable Booking Price Snapshots Guarantee:");
  // Create confirmed booking under current pricing
  const snapshotBooking = await prisma.booking.create({
    data: {
      bookingReference: `IMMUTABLE-BK-${Date.now().toString().slice(-6)}`,
      propertyId: sandbox.prop.id,
      listingOptionId: sandbox.config.id,
      inventoryGroupId: sandbox.invGroup.id,
      checkInDate: new Date("2026-11-25"),
      checkOutDate: new Date("2026-11-27"),
      nights: 2,
      guestCount: 2,
      customerName: "Immutability Test Guest",
      customerEmail: "snapshot.guest@example.com",
      status: BookingStatus.CONFIRMED,
      currency: "INR",
      baseAmount: 20000,
      taxesAmount: 2520,
      totalAmount: 23520,
      source: BookingSource.DIRECT_WEB,
    },
  });

  // Now, administrator alters basePricePerNight drastically
  await updateListingPricingSettings({
    listingOptionId: sandbox.config.id,
    basePricePerNight: 50000, // Quadruple price
    weekendPricePerNight: 60000,
    cleaningFee: 5000,
  });

  // Verify that the historical confirmed booking record has NOT CHANGED AT ALL!
  const verifyBooking = await prisma.booking.findUnique({
    where: { id: snapshotBooking.id },
  });
  assert(
    Number(verifyBooking?.baseAmount) === 20000,
    "CRITICAL: Historical booking baseAmount remains untouched (₹20,000)"
  );
  assert(
    Number(verifyBooking?.totalAmount) === 23520,
    "CRITICAL: Historical booking totalAmount remains untouched (₹23,520)"
  );

  // -----------------------------------------------------------
  // 9. Booking Hold Creation with Current Dynamic Pricing
  // -----------------------------------------------------------
  console.log("\n9. Testing Booking Hold Creation with Updated Rates:");
  const holdRes = await createBookingHold({
    listingOptionId: sandbox.config.id,
    checkInDate: "2026-12-02",
    checkOutDate: "2026-12-04", // 2 nights in seasonal window (₹16,000/nt)
    guestCount: 2,
    customerName: "Dynamic Hold Guest",
    customerEmail: "hold.guest@example.com",
  });

  assert(holdRes.success === true, "Booking hold successfully created");
  assert(
    holdRes.pricing?.baseAmount === 32000,
    "Booking hold used active seasonal rate (₹16,000 * 2 = ₹32,000)"
  );

  // Clean up created hold
  if (holdRes.holdId) {
    await prisma.availabilityBlock.deleteMany({ where: { bookingId: holdRes.holdId } });
    await prisma.booking.delete({ where: { id: holdRes.holdId } });
  }

  // -----------------------------------------------------------
  // 10. Audit Logging Verification
  // -----------------------------------------------------------
  console.log("\n10. Testing Audit Trail Recording:");
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: ["PRICING_SETTINGS_UPDATED", "PRICING_RULE_CREATED"],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  assert(auditLogs.length >= 2, "Audit log records were written for pricing changes");

  // -----------------------------------------------------------
  // 11. Clean Up Sandbox Records
  // -----------------------------------------------------------
  await prisma.pricingRule.deleteMany({ where: { propertyId: sandbox.prop.id } });
  await prisma.booking.deleteMany({ where: { propertyId: sandbox.prop.id } });
  await prisma.property.delete({ where: { id: sandbox.prop.id } });
  console.log("\nCleaned up all Phase 4A sandbox test records.");

  // -----------------------------------------------------------
  // Summary
  // -----------------------------------------------------------
  console.log("\n========================================================");
  console.log(`  PHASE 4A TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) process.exit(1);
}

runPhase4ATests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
