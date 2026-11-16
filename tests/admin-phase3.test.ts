process.env.TEST_ADMIN_BYPASS = "true";

import { prisma } from "../src/lib/prisma";
import { Role, BookingStatus, BookingSource } from "@prisma/client";
import {
  validatePropertyForPublish,
  publishPropertyWithValidation,
  archiveProperty,
  restoreProperty,
  updatePropertySEO,
  setCoverImage,
  deletePropertyImage,
  reorderPropertyImages,
} from "../src/app/admin/(dashboard)/properties/phase3-actions";

async function runPhase3Tests() {
  console.log("\n========================================================");
  console.log("  DEVSTAY ADMIN DASHBOARD — PHASE 3 INTEGRATION TESTS");
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
  // 1. Setup Test Property for Phase 3
  // -----------------------------------------------------------
  console.log("1. Setting Up Test Property Sandbox:");
  const testSlug = `phase3-test-estate-${Date.now().toString().slice(-6)}`;
  await prisma.property.deleteMany({
    where: { slug: { startsWith: "phase3-test-estate" } },
  });

  const testProperty = await prisma.$transaction(async (tx) => {
    const prop = await tx.property.create({
      data: {
        name: "Phase 3 Test Heritage Estate",
        slug: testSlug,
        headline: "Private Haveli in Jaipur",
        description: "A luxury private boutique haveli featuring handcrafted Rajasthani decor.",
        address: "12 Heritage Lane, Raja Park",
        city: "Jaipur",
        state: "Rajasthan",
        country: "India",
        postalCode: "302004",
        checkInTime: "14:00",
        checkOutTime: "11:00",
        houseRules: "Quiet lane. Pets welcome.",
        cancellationPolicy: "Full refund 7 days prior.",
        isActive: false, // DRAFT state
      },
    });

    const invGroup = await tx.inventoryGroup.create({
      data: {
        propertyId: prop.id,
        name: `${prop.name} Inventory`,
        code: `${testSlug.toUpperCase()}-ESTATE`,
        totalPhysicalUnits: 1,
      },
    });

    const config = await tx.listingOption.create({
      data: {
        propertyId: prop.id,
        inventoryGroupId: invGroup.id,
        slug: `${testSlug}-suite`,
        title: "Entire Estate Buyout",
        bedroomCount: 3,
        bathroomCount: 3,
        maxGuests: 8,
        basePricePerNight: 28000,
        description: "Complete buyout of the Phase 3 test estate.",
        isActive: true,
        sortOrder: 1,
      },
    });

    // Create 2 test photographs
    const img1 = await tx.propertyImage.create({
      data: {
        propertyId: prop.id,
        url: "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
        caption: "Main Living Salon",
        altText: "Spacious salon with traditional seating",
        isCover: true,
        sortOrder: 1,
      },
    });

    const img2 = await tx.propertyImage.create({
      data: {
        propertyId: prop.id,
        url: "/images/bedroom-1/imgi_415_8378c683-e395-419a-87b9-e764d4d7a670.jpg",
        caption: "Master Bedroom 1",
        altText: "King bedroom with teak furnishings",
        isCover: false,
        sortOrder: 2,
      },
    });

    return { prop, invGroup, config, img1, img2 };
  });

  assert(Boolean(testProperty.prop.id), "Test property created in DRAFT state");

  // -----------------------------------------------------------
  // 2. Test Publishing Validation
  // -----------------------------------------------------------
  console.log("\n2. Testing Pre-Flight Publishing Validation:");
  // With complete data, validation should succeed
  const initialValidation = await validatePropertyForPublish(testProperty.prop.id);
  assert(initialValidation.valid === true, "Valid property passes all pre-flight publishing checks");
  assert(initialValidation.errors.length === 0, "No validation errors on complete property");

  // Temporarily break a requirement (e.g. remove cover photo flag)
  await prisma.propertyImage.updateMany({
    where: { propertyId: testProperty.prop.id },
    data: { isCover: false },
  });
  const brokenValidation = await validatePropertyForPublish(testProperty.prop.id);
  assert(brokenValidation.valid === false, "Fails validation when no cover photograph is designated");
  assert(
    brokenValidation.errors.some((e) => e.includes("cover photograph")),
    "Returns specific actionable error for missing cover photograph"
  );

  // Restore cover photograph
  await prisma.propertyImage.update({
    where: { id: testProperty.img1.id },
    data: { isCover: true },
  });

  // -----------------------------------------------------------
  // 3. Test Safe Archival with Active Booking Protection
  // -----------------------------------------------------------
  console.log("\n3. Testing Safe Archival & Active Reservation Protection:");
  const futureCheckIn = new Date();
  futureCheckIn.setDate(futureCheckIn.getDate() + 10);
  const futureCheckOut = new Date();
  futureCheckOut.setDate(futureCheckOut.getDate() + 13);

  // Create an active future reservation on this test property
  const activeBooking = await prisma.booking.create({
    data: {
      bookingReference: `TEST-BK-${Date.now().toString().slice(-6)}`,
      propertyId: testProperty.prop.id,
      listingOptionId: testProperty.config.id,
      inventoryGroupId: testProperty.invGroup.id,
      checkInDate: futureCheckIn,
      checkOutDate: futureCheckOut,
      nights: 3,
      guestCount: 4,
      customerName: "Safety Test Guest",
      customerEmail: "safety.guest@example.com",
      status: BookingStatus.CONFIRMED,
      currency: "INR",
      baseAmount: 84000,
      taxesAmount: 10080,
      totalAmount: 94080,
      source: BookingSource.DIRECT_WEB,
    },
  });

  // Attempt archival: MUST BE BLOCKED BY SAFETY POLICY!
  const blockedArchival = await archiveProperty(
    testProperty.prop.id,
    "Attempting archival with active booking"
  );
  assert(
    blockedArchival.success === false,
    "Archival is BLOCKED when property has active/upcoming reservations"
  );
  assert(
    Boolean(blockedArchival.error?.includes("active or upcoming reservation")),
    "Returns clear explanation citing active reservation reference"
  );

  // Cancel the active booking so property can be safely archived
  await prisma.booking.update({
    where: { id: activeBooking.id },
    data: { status: BookingStatus.CANCELLED },
  });

  // Now archival should succeed safely
  const allowedArchival = await archiveProperty(
    testProperty.prop.id,
    "Safe seasonal closure test"
  );
  assert(allowedArchival.success === true, "Property safely archived when no active bookings exist");

  const archivedPropInDb = await prisma.property.findUnique({
    where: { id: testProperty.prop.id },
  });
  assert(
    archivedPropInDb?.isArchived === true && archivedPropInDb?.isActive === false,
    "Property record updated: isArchived = true, isActive = false"
  );
  assert(
    archivedPropInDb?.archivedReason === "Safe seasonal closure test",
    "Archival reason recorded in database"
  );

  // -----------------------------------------------------------
  // 4. Test Restore from Archive
  // -----------------------------------------------------------
  console.log("\n4. Testing Property Restoration from Archive:");
  const restoreRes = await restoreProperty(testProperty.prop.id);
  assert(restoreRes.success === true, "Property successfully restored");

  const restoredPropInDb = await prisma.property.findUnique({
    where: { id: testProperty.prop.id },
  });
  assert(
    restoredPropInDb?.isArchived === false && restoredPropInDb?.isActive === false,
    "Restored property is unarchived and placed in DRAFT state for safe review"
  );

  // -----------------------------------------------------------
  // 5. Test SEO Metadata Updates & Slug Redirect Tracking
  // -----------------------------------------------------------
  console.log("\n5. Testing SEO Metadata & Slug Redirect Tracking:");
  const newSlug = `${testSlug}-updated-heritage`;

  const seoRes = await updatePropertySEO(testProperty.prop.id, {
    slug: newSlug,
    seoTitle: "DevStay Amber Sanctuary | Ultra-Luxury Villa",
    seoDescription: "Stay in our private 3BHK Amber heritage sanctuary with full villa exclusivity.",
    canonicalUrl: `https://devstaysjaipur.com/properties/${newSlug}`,
    ogTitle: "Amber Sanctuary Private Stay",
    ogDescription: "Exclusive villa booking in Jaipur.",
    ogImageUrl: "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
  });
  assert(seoRes.success === true, "SEO metadata and new slug updated successfully");

  const propWithSeo = await prisma.property.findUnique({
    where: { id: testProperty.prop.id },
  });
  assert(propWithSeo?.slug === newSlug, "Property active slug updated to new slug");
  assert(
    propWithSeo?.seoTitle === "DevStay Amber Sanctuary | Ultra-Luxury Villa",
    "Custom SEO meta title stored"
  );
  assert(
    Boolean(propWithSeo?.previousSlugs.includes(testSlug)),
    "Previous slug was automatically recorded in previousSlugs array for 308 redirects"
  );

  // Test 308 redirect lookup
  const redirectTarget = await prisma.property.findFirst({
    where: { previousSlugs: { has: testSlug } },
    select: { slug: true },
  });
  assert(
    redirectTarget?.slug === newSlug,
    "Visiting old slug correctly resolves to the new active slug for 308 redirect"
  );

  // -----------------------------------------------------------
  // 6. Test Image Management (Cover, Reorder, Delete)
  // -----------------------------------------------------------
  console.log("\n6. Testing Image Management (Cover, Reorder, Delete):");
  // Set image 2 as primary cover
  const coverRes = await setCoverImage(testProperty.prop.id, testProperty.img2.id);
  assert(coverRes.success === true, "Cover photograph changed to image 2");

  const img2InDb = await prisma.propertyImage.findUnique({
    where: { id: testProperty.img2.id },
  });
  const img1InDb = await prisma.propertyImage.findUnique({
    where: { id: testProperty.img1.id },
  });
  assert(img2InDb?.isCover === true, "Image 2 is now designated as isCover = true");
  assert(img1InDb?.isCover === false, "Previous cover (Image 1) is now isCover = false");

  // Reorder images
  const reorderRes = await reorderPropertyImages(testProperty.prop.id, [
    testProperty.img2.id,
    testProperty.img1.id,
  ]);
  assert(reorderRes.success === true, "Gallery images reordered successfully");

  // Delete an image
  const deleteRes = await deletePropertyImage(testProperty.prop.id, testProperty.img2.id);
  assert(deleteRes.success === true, "Property image deleted successfully");

  // When cover was deleted, img1 should automatically be promoted to cover
  const remainingImg1 = await prisma.propertyImage.findUnique({
    where: { id: testProperty.img1.id },
  });
  assert(remainingImg1?.isCover === true, "Remaining image automatically promoted to cover");

  // -----------------------------------------------------------
  // 7. Test Public Query Isolation for Draft & Archived States
  // -----------------------------------------------------------
  console.log("\n7. Testing Public Website Discovery Isolation:");
  // Query only published active properties
  const publicList = await prisma.property.findMany({
    where: { isActive: true, isArchived: false },
    select: { slug: true },
  });
  assert(
    !publicList.some((p) => p.slug === newSlug),
    "Draft/unconfirmed property does NOT appear in public listing queries"
  );

  const mainEstate = publicList.find((p) => p.slug === "dev-stays-jaipur");
  assert(Boolean(mainEstate), "Main production property 'dev-stays-jaipur' remains published & live");

  // -----------------------------------------------------------
  // Clean Up Test Records
  // -----------------------------------------------------------
  await prisma.booking.deleteMany({ where: { propertyId: testProperty.prop.id } });
  await prisma.property.delete({ where: { id: testProperty.prop.id } });
  console.log("\nCleaned up all test sandbox records.");

  // -----------------------------------------------------------
  // Summary
  // -----------------------------------------------------------
  console.log("\n========================================================");
  console.log(`  PHASE 3 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) process.exit(1);
}

runPhase3Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
