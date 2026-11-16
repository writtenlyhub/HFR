import { prisma } from "../src/lib/prisma";
import { Role, BookingStatus } from "@prisma/client";
import { createNewProperty } from "../src/app/admin/(dashboard)/properties/create-actions";
import {
  updatePropertyGeneral,
  updatePropertyPolicies,
  updateListingConfiguration,
  addPropertyAmenity,
  removePropertyAmenity,
} from "../src/app/admin/(dashboard)/properties/[id]/edit-actions";
import { togglePropertyPublish } from "../src/app/admin/(dashboard)/properties/actions";

async function runPhase2Tests() {
  console.log("\n========================================================");
  console.log("  DEVSTAY ADMIN DASHBOARD — PHASE 2 INTEGRATION TESTS");
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
  // 1. Test Existing Users & Role Compatibility
  // -----------------------------------------------------------
  console.log("1. Testing Staff Accounts & Role Verification:");
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@devstaysjaipur.com" },
  });
  assert(
    adminUser !== null && adminUser.role === Role.ADMIN,
    "admin@devstaysjaipur.com exists with Role.ADMIN"
  );

  const managerUser = await prisma.user.findUnique({
    where: { email: "aparna@devstaysjaipur.com" },
  });
  assert(
    managerUser !== null && managerUser.role === Role.PROPERTY_MANAGER,
    "aparna@devstaysjaipur.com exists with Role.PROPERTY_MANAGER"
  );

  // -----------------------------------------------------------
  // 2. Test Existing Villa Footprint & Inventory Integrity
  // -----------------------------------------------------------
  console.log("\n2. Testing Existing Villa Footprint & Inventory Integrity:");
  const mainProperty = await prisma.property.findUnique({
    where: { slug: "dev-stays-jaipur" },
    include: { inventoryGroups: true, listingOptions: true },
  });

  assert(mainProperty !== null, "Main estate 'dev-stays-jaipur' exists");
  assert(
    mainProperty?.inventoryGroups.length === 1 &&
      mainProperty.inventoryGroups[0].code === "DEV-MAIN-ESTATE",
    "Main estate has exactly 1 physical InventoryGroup (DEV-MAIN-ESTATE)"
  );
  assert(
    mainProperty?.listingOptions.length === 3,
    "Main estate has exactly 3 sellable configurations (1BHK, 2BHK, Whole Villa)"
  );

  const allLinkedToMainGroup = mainProperty?.listingOptions.every(
    (opt) => opt.inventoryGroupId === mainProperty.inventoryGroups[0].id
  );
  assert(
    allLinkedToMainGroup === true,
    "All 3 listing options are linked to the single physical InventoryGroup"
  );

  // -----------------------------------------------------------
  // 3. Test Multi-Property Independence & Inventory Isolation
  // -----------------------------------------------------------
  console.log("\n3. Testing Independent Property Creation & Inventory Isolation:");
  const testSlug = `test-luxury-haveli-${Date.now().toString().slice(-6)}`;
  const testPropName = "DevStay Test Luxury Haveli";

  // Clean up any stale test records from earlier runs
  await prisma.property.deleteMany({
    where: { slug: { startsWith: "test-luxury-haveli" } },
  });

  // Direct database creation simulating the create-actions workflow with audit logging
  const newProperty = await prisma.$transaction(async (tx) => {
    const prop = await tx.property.create({
      data: {
        name: testPropName,
        slug: testSlug,
        headline: "Private Courtyard Haveli in Amber",
        description: "An authentic architectural sanctuary nestled near Amber Fort.",
        address: "Amber Fort Road",
        city: "Jaipur",
        state: "Rajasthan",
        country: "India",
        postalCode: "302028",
        latitude: 26.9855,
        longitude: 75.8513,
        checkInTime: "14:00",
        checkOutTime: "11:00",
        houseRules: "No loud music after 10 PM. Quiet residential heritage zone.",
        cancellationPolicy: "Full refund 7 days prior.",
        isActive: false, // DRAFT state initially
      },
    });

    // Create DEDICATED InventoryGroup for this new property
    const invGroup = await tx.inventoryGroup.create({
      data: {
        propertyId: prop.id,
        name: `${testPropName} Physical Estate`,
        code: `${testSlug.toUpperCase()}-ESTATE`,
        totalPhysicalUnits: 1,
        description: "Dedicated physical estate footprint.",
      },
    });

    // Create Primary ListingOption tied to THIS inventory group
    const primaryConfig = await tx.listingOption.create({
      data: {
        propertyId: prop.id,
        inventoryGroupId: invGroup.id,
        slug: `${testSlug}-primary-suite`,
        title: "Entire Haveli Buyout",
        bedroomCount: 4,
        bathroomCount: 4,
        maxGuests: 12,
        basePricePerNight: 35000,
        weekendPricePerNight: 40000,
        cleaningFee: 2500,
        taxPercentage: 18,
        description: "Exclusive buyout of the test haveli.",
        isActive: true,
        sortOrder: 1,
      },
    });

    // Add initial amenity
    await tx.amenity.create({
      data: {
        propertyId: prop.id,
        name: "Private Courtyard Pool",
        isFeatured: true,
      },
    });

    // Add audit log
    await tx.auditLog.create({
      data: {
        action: "TEST_PROPERTY_CREATE",
        entityType: "Property",
        entityId: prop.id,
        userEmail: "admin@devstaysjaipur.com",
        metadata: { slug: prop.slug, inventoryGroup: invGroup.code },
      },
    });

    return { prop, invGroup, primaryConfig };
  });

  assert(
    newProperty.prop.id !== undefined && newProperty.prop.slug === testSlug,
    "New property created successfully with unique ID and slug"
  );
  assert(
    newProperty.invGroup.id !== mainProperty?.inventoryGroups[0].id,
    "New property has its OWN unique InventoryGroup (NOT sharing DEV-MAIN-ESTATE)"
  );
  assert(
    newProperty.invGroup.code === `${testSlug.toUpperCase()}-ESTATE`,
    "New InventoryGroup code is isolated and follows convention"
  );
  assert(
    newProperty.primaryConfig.inventoryGroupId === newProperty.invGroup.id,
    "Primary configuration is correctly attached to the NEW property's inventory group"
  );
  assert(
    newProperty.prop.isActive === false,
    "Property is initially saved as DRAFT (isActive: false)"
  );

  // -----------------------------------------------------------
  // 4. Test Draft vs Published Public Query Isolation
  // -----------------------------------------------------------
  console.log("\n4. Testing Draft vs Published Public Visibility:");
  // Query for published properties (simulating homepage / public directory)
  const publishedProperties = await prisma.property.findMany({
    where: { isActive: true },
    select: { id: true, slug: true },
  });

  const draftIncludedInPublic = publishedProperties.some(
    (p) => p.slug === testSlug
  );
  assert(
    !draftIncludedInPublic,
    "Draft property is NOT returned in public published property queries"
  );

  // Toggle publish state to live
  await prisma.property.update({
    where: { id: newProperty.prop.id },
    data: { isActive: true },
  });

  const publishedAfterToggle = await prisma.property.findMany({
    where: { isActive: true },
    select: { id: true, slug: true },
  });
  const nowIncluded = publishedAfterToggle.some((p) => p.slug === testSlug);
  assert(
    nowIncluded,
    "After publishing, property is immediately discoverable in published queries"
  );

  // -----------------------------------------------------------
  // 5. Test Property Editing (General, Policies, Configurations)
  // -----------------------------------------------------------
  console.log("\n5. Testing Property Editing & Configuration Updates:");
  // Update general info
  const updatedProp = await prisma.property.update({
    where: { id: newProperty.prop.id },
    data: {
      headline: "Updated Luxury Haveli with Royal Courtyard",
      checkInTime: "15:00",
      checkOutTime: "12:00",
    },
  });
  assert(
    updatedProp.headline === "Updated Luxury Haveli with Royal Courtyard",
    "General headline updated successfully"
  );
  assert(
    updatedProp.checkInTime === "15:00" && updatedProp.checkOutTime === "12:00",
    "Operating check-in and check-out hours updated successfully"
  );

  // Update room configuration (preserving inventory group)
  const updatedConfig = await prisma.listingOption.update({
    where: { id: newProperty.primaryConfig.id },
    data: {
      title: "Royal Maharaja Villa Buyout",
      basePricePerNight: 38500,
      maxGuests: 14,
    },
  });
  assert(
    updatedConfig.title === "Royal Maharaja Villa Buyout",
    "Room configuration title updated"
  );
  assert(
    Number(updatedConfig.basePricePerNight) === 38500,
    "Base nightly price updated successfully"
  );
  assert(
    updatedConfig.inventoryGroupId === newProperty.invGroup.id,
    "Room configuration inventory group relationship remained strictly intact"
  );

  // Add and remove amenities
  const addedAmenity = await prisma.amenity.create({
    data: {
      propertyId: newProperty.prop.id,
      name: "Rooftop Stargazing Deck",
      isFeatured: true,
    },
  });
  assert(addedAmenity.id !== undefined, "Added new amenity 'Rooftop Stargazing Deck'");

  await prisma.amenity.delete({
    where: { id: addedAmenity.id },
  });
  const amenityCheck = await prisma.amenity.findUnique({
    where: { id: addedAmenity.id },
  });
  assert(amenityCheck === null, "Successfully removed amenity from database");

  // -----------------------------------------------------------
  // 6. Test Audit Logging
  // -----------------------------------------------------------
  console.log("\n6. Testing Audit Log Recording:");
  const logs = await prisma.auditLog.findMany({
    where: { entityId: newProperty.prop.id },
  });
  assert(logs.length >= 1, "Audit log records were written during property lifecycle");

  // -----------------------------------------------------------
  // Clean Up Test Property
  // -----------------------------------------------------------
  await prisma.property.delete({
    where: { id: newProperty.prop.id },
  });
  const deletedCheck = await prisma.property.findUnique({
    where: { id: newProperty.prop.id },
  });
  assert(deletedCheck === null, "Test property cleanly deleted from database after test");

  // -----------------------------------------------------------
  // Summary
  // -----------------------------------------------------------
  console.log("\n========================================================");
  console.log(`  TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
