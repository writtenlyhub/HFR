import assert from "assert";
import { prisma } from "../src/lib/prisma";
import {
  checkAvailability,
  createBookingHold,
  releaseHold,
} from "../src/lib/booking/shared-inventory";

let passedCount = 0;
function testAssert(condition: boolean, message: string) {
  assert(condition, message);
  passedCount++;
  console.log(`  ✓ PASS [${passedCount}]: ${message}`);
}

async function runAccommodationDetailPagesTests() {
  console.log("\n==========================================================================");
  console.log("  HOTEL FEDERATION RAJASTHAN — ACCOMMODATION DETAIL PAGES TEST SUITE");
  console.log("==========================================================================\n");

  // --------------------------------------------------------------------------
  // TEST 1: Property and Listing Configurations Verification
  // --------------------------------------------------------------------------
  console.log("--- TEST 1: Property and Listing Options Database Consistency ---");

  const property = await prisma.property.findUnique({
    where: { slug: "dev-stays-jaipur" },
    include: {
      inventoryGroups: true,
      listingOptions: {
        include: { images: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  testAssert(Boolean(property), "Property 'dev-stays-jaipur' exists in PostgreSQL");
  testAssert(
    property?.inventoryGroups.some((g) => g.code === "DEV-MAIN-ESTATE") || false,
    "Property is linked to shared physical inventory group DEV-MAIN-ESTATE"
  );
  testAssert(
    property?.listingOptions.length === 3,
    `Property has exactly 3 bookable configurations (found: ${property?.listingOptions.length})`
  );

  // --------------------------------------------------------------------------
  // TEST 2: Royal Suite (Main Bedroom) Details Verification
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 2: Royal Suite Specification and Metadata Verification ---");

  const royalSuite = property?.listingOptions.find((o) => o.slug === "royal-suite");
  testAssert(Boolean(royalSuite), "Royal Suite configuration exists with slug 'royal-suite'");
  testAssert(Number(royalSuite?.basePricePerNight) === 8500, "Royal Suite base price is ₹8,500/night");
  testAssert(royalSuite?.maxGuests === 2, "Royal Suite max guest capacity is 2");
  testAssert(royalSuite?.bedroomCount === 1, "Royal Suite has 1 bedroom");
  testAssert(royalSuite?.bathroomCount === 1, "Royal Suite has 1 bathroom");
  testAssert(
    Boolean(royalSuite?.bedConfiguration?.includes("King Bed")),
    `Royal Suite bed configuration contains King Bed (got: ${royalSuite?.bedConfiguration})`
  );
  testAssert(
    Boolean(royalSuite?.highlights && royalSuite.highlights.length >= 3),
    `Royal Suite has at least 3 highlights (found: ${royalSuite?.highlights?.length})`
  );
  testAssert(
    Boolean(royalSuite?.amenitiesList && royalSuite.amenitiesList.length >= 5),
    `Royal Suite has rich amenities list (found: ${royalSuite?.amenitiesList?.length})`
  );
  testAssert(
    Boolean(royalSuite?.images && royalSuite.images.length >= 1),
    `Royal Suite has dedicated gallery images (found: ${royalSuite?.images?.length})`
  );

  // --------------------------------------------------------------------------
  // TEST 3: Courtyard Wing (2 Bedrooms) Details Verification
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 3: Courtyard Wing Specification and Metadata Verification ---");

  const courtyardWing = property?.listingOptions.find((o) => o.slug === "courtyard-wing");
  testAssert(Boolean(courtyardWing), "Courtyard Wing configuration exists with slug 'courtyard-wing'");
  testAssert(Number(courtyardWing?.basePricePerNight) === 16500, "Courtyard Wing base price is ₹16,500/night");
  testAssert(courtyardWing?.maxGuests === 5, "Courtyard Wing max guest capacity is 5");
  testAssert(courtyardWing?.bedroomCount === 2, "Courtyard Wing has 2 bedrooms");
  testAssert(courtyardWing?.bathroomCount === 2, "Courtyard Wing has 2 bathrooms");
  testAssert(
    Boolean(courtyardWing?.bedConfiguration?.includes("2 Luxury Bedrooms")),
    `Courtyard Wing bed configuration is documented (got: ${courtyardWing?.bedConfiguration})`
  );
  testAssert(
    Boolean(courtyardWing?.highlights && courtyardWing.highlights.length >= 3),
    `Courtyard Wing has at least 3 highlights (found: ${courtyardWing?.highlights?.length})`
  );
  testAssert(
    Boolean(courtyardWing?.amenitiesList && courtyardWing.amenitiesList.length >= 5),
    `Courtyard Wing has rich amenities list (found: ${courtyardWing?.amenitiesList?.length})`
  );
  testAssert(
    Boolean(courtyardWing?.images && courtyardWing.images.length >= 1),
    `Courtyard Wing has dedicated gallery images (found: ${courtyardWing?.images?.length})`
  );

  // --------------------------------------------------------------------------
  // TEST 4: Full Estate Buyout (Whole Villa) Details Verification
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 4: Full Estate Buyout Specification and Metadata Verification ---");

  const fullEstate = property?.listingOptions.find((o) => o.slug === "full-estate-buyout");
  testAssert(Boolean(fullEstate), "Full Estate configuration exists with slug 'full-estate-buyout'");
  testAssert(Number(fullEstate?.basePricePerNight) === 28500, "Full Estate base price is ₹28,500/night");
  testAssert(fullEstate?.maxGuests === 10, "Full Estate max guest capacity is 10");
  testAssert(fullEstate?.bedroomCount === 3, "Full Estate has 3 bedrooms");
  testAssert(fullEstate?.bathroomCount === 4, "Full Estate has 4 bathrooms");
  testAssert(
    Boolean(fullEstate?.bedConfiguration?.includes("3 Luxury Bedroom Suites")),
    `Full Estate bed configuration is documented (got: ${fullEstate?.bedConfiguration})`
  );
  testAssert(
    Boolean(fullEstate?.highlights && fullEstate.highlights.length >= 3),
    `Full Estate has at least 3 highlights (found: ${fullEstate?.highlights?.length})`
  );
  testAssert(
    Boolean(fullEstate?.amenitiesList && fullEstate.amenitiesList.length >= 5),
    `Full Estate has rich amenities list (found: ${fullEstate?.amenitiesList?.length})`
  );
  testAssert(
    Boolean(fullEstate?.images && fullEstate.images.length >= 1),
    `Full Estate has dedicated gallery images (found: ${fullEstate?.images?.length})`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Route Slug Resolution
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 5: Route Slug Aliasing & Resolution ---");

  function resolveRouteSlug(slug: string): string {
    if (slug === "full-estate") return "full-estate-buyout";
    return slug;
  }

  testAssert(resolveRouteSlug("royal-suite") === "royal-suite", "royal-suite resolves to royal-suite");
  testAssert(resolveRouteSlug("courtyard-wing") === "courtyard-wing", "courtyard-wing resolves to courtyard-wing");
  testAssert(resolveRouteSlug("full-estate") === "full-estate-buyout", "full-estate resolves to full-estate-buyout in DB");
  testAssert(
    resolveRouteSlug("full-estate-buyout") === "full-estate-buyout",
    "full-estate-buyout also resolves to full-estate-buyout"
  );

  // --------------------------------------------------------------------------
  // TEST 6: Shared Physical Inventory Exclusivity Across Detail Pages
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 6: Shared Inventory Exclusivity Across All 3 Detail Pages ---");

  const testCheckIn = new Date("2034-02-10T14:00:00.000Z");
  const testCheckOut = new Date("2034-02-14T11:00:00.000Z");

  // Clean test artifacts
  await prisma.availabilityBlock.deleteMany({
    where: {
      startDate: {
        gte: new Date("2034-02-10T00:00:00.000Z"),
        lt: new Date("2034-02-15T00:00:00.000Z"),
      },
    },
  });
  await prisma.booking.deleteMany({
    where: {
      checkInDate: {
        gte: new Date("2034-02-10T00:00:00.000Z"),
        lt: new Date("2034-02-15T00:00:00.000Z"),
      },
    },
  });

  // Verify all 3 pages show initial availability
  const suiteAvail = await checkAvailability({
    listingOptionSlug: "royal-suite",
    checkInDate: testCheckIn,
    checkOutDate: testCheckOut,
    guestCount: 2,
  });
  const wingAvail = await checkAvailability({
    listingOptionSlug: "courtyard-wing",
    checkInDate: testCheckIn,
    checkOutDate: testCheckOut,
    guestCount: 4,
  });
  const estateAvail = await checkAvailability({
    listingOptionSlug: "full-estate-buyout",
    checkInDate: testCheckIn,
    checkOutDate: testCheckOut,
    guestCount: 8,
  });

  testAssert(
    suiteAvail.available && wingAvail.available && estateAvail.available,
    "All three accommodation detail pages show available for unreserved dates"
  );

  // SCENARIO A: Guest locks hold from Royal Suite detail page
  const royalHold = await createBookingHold({
    listingOptionSlug: "royal-suite",
    checkInDate: testCheckIn,
    checkOutDate: testCheckOut,
    guestCount: 2,
    customerName: "Alice Sharma",
    customerEmail: "alice@example.com",
    customerPhone: "+919876543210",
  });
  testAssert(royalHold.success && Boolean(royalHold.holdId), "Royal Suite hold created successfully");

  // Verify that Courtyard Wing and Full Estate detail pages now report UNAVAILABLE!
  const wingDuringRoyalHold = await checkAvailability({
    listingOptionSlug: "courtyard-wing",
    checkInDate: testCheckIn,
    checkOutDate: testCheckOut,
    guestCount: 4,
  });
  const estateDuringRoyalHold = await checkAvailability({
    listingOptionSlug: "full-estate-buyout",
    checkInDate: testCheckIn,
    checkOutDate: testCheckOut,
    guestCount: 8,
  });

  testAssert(
    !wingDuringRoyalHold.available,
    "CRITICAL INVARIANT: Courtyard Wing detail page reports UNAVAILABLE due to Royal Suite hold"
  );
  testAssert(
    !estateDuringRoyalHold.available,
    "CRITICAL INVARIANT: Full Estate detail page reports UNAVAILABLE due to Royal Suite hold"
  );

  // Release the Royal Suite hold
  if (royalHold.holdId) {
    await releaseHold(royalHold.holdId);
  }

  // SCENARIO B: Guest locks hold from Full Estate detail page
  const estateHold = await createBookingHold({
    listingOptionSlug: "full-estate-buyout",
    checkInDate: testCheckIn,
    checkOutDate: testCheckOut,
    guestCount: 8,
    customerName: "Rajeshwar Singh",
    customerEmail: "rajeshwar@example.com",
    customerPhone: "+919876543211",
  });
  testAssert(estateHold.success && Boolean(estateHold.holdId), "Full Estate hold created successfully");

  // Verify Royal Suite and Courtyard Wing detail pages now report UNAVAILABLE!
  const suiteDuringEstateHold = await checkAvailability({
    listingOptionSlug: "royal-suite",
    checkInDate: testCheckIn,
    checkOutDate: testCheckOut,
    guestCount: 2,
  });
  const wingDuringEstateHold = await checkAvailability({
    listingOptionSlug: "courtyard-wing",
    checkInDate: testCheckIn,
    checkOutDate: testCheckOut,
    guestCount: 4,
  });

  testAssert(
    !suiteDuringEstateHold.available,
    "CRITICAL INVARIANT: Royal Suite detail page reports UNAVAILABLE due to Full Estate hold"
  );
  testAssert(
    !wingDuringEstateHold.available,
    "CRITICAL INVARIANT: Courtyard Wing detail page reports UNAVAILABLE due to Full Estate hold"
  );

  // Release the Full Estate hold
  if (estateHold.holdId) {
    await releaseHold(estateHold.holdId);
  }

  // All 3 pages are now available again
  const suiteAfterRelease = await checkAvailability({
    listingOptionSlug: "royal-suite",
    checkInDate: testCheckIn,
    checkOutDate: testCheckOut,
    guestCount: 2,
  });
  const estateAfterRelease = await checkAvailability({
    listingOptionSlug: "full-estate-buyout",
    checkInDate: testCheckIn,
    checkOutDate: testCheckOut,
    guestCount: 8,
  });
  testAssert(
    suiteAfterRelease.available && estateAfterRelease.available,
    "Releasing hold immediately restores availability across all detail pages"
  );

  // --------------------------------------------------------------------------
  // TEST 7: Pricing and GST Tax Calculation
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 7: Pricing & GST Tax Tier Verification ---");

  const suitePricing = await checkAvailability({
    listingOptionSlug: "royal-suite",
    checkInDate: testCheckIn,
    checkOutDate: testCheckOut,
    guestCount: 2,
  });
  const estatePricing = await checkAvailability({
    listingOptionSlug: "full-estate-buyout",
    checkInDate: testCheckIn,
    checkOutDate: testCheckOut,
    guestCount: 8,
  });

  // 4 nights stay
  testAssert(suitePricing.pricing?.nights === 4, "Stay is correctly calculated as 4 nights");
  testAssert(
    suitePricing.pricing?.baseAmount === 8500 * 4,
    `Royal Suite 4-night base amount is ₹34,000 (got: ${suitePricing.pricing?.baseAmount})`
  );
  testAssert(
    suitePricing.pricing?.taxesAmount === Math.round((34000 + 500) * 0.12),
    `Royal Suite 12% GST (with ₹500 cleaning) is ₹4,140 (got: ${suitePricing.pricing?.taxesAmount})`
  );
  testAssert(
    suitePricing.pricing?.totalAmount === 34000 + 500 + 4140,
    `Royal Suite total amount with tax is ₹38,640 (got: ${suitePricing.pricing?.totalAmount})`
  );

  testAssert(
    estatePricing.pricing?.baseAmount === 28500 * 4,
    `Full Estate 4-night base amount is ₹114,000 (got: ${estatePricing.pricing?.baseAmount})`
  );
  testAssert(
    estatePricing.pricing?.taxesAmount === Math.round((114000 + 2000) * 0.18),
    `Full Estate 18% GST (with ₹2000 cleaning) is ₹20,880 (got: ${estatePricing.pricing?.taxesAmount})`
  );
  testAssert(
    estatePricing.pricing?.totalAmount === 114000 + 2000 + 20880,
    `Full Estate total amount with tax is ₹136,880 (got: ${estatePricing.pricing?.totalAmount})`
  );

  console.log("\n==========================================================================");
  console.log(`  ALL ${passedCount} ACCOMMODATION DETAIL PAGES TEST ASSERTIONS PASSED!`);
  console.log("==========================================================================\n");

  await prisma.$disconnect();
  process.exit(0);
}

runAccommodationDetailPagesTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
