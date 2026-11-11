import { PrismaClient, Role, ChannelType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with Dev Stays Jaipur data...");

  // 1. Create Default Admin & Manager Users
  const passwordHash = await bcrypt.hash("Admin@HFR2026!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@devstaysjaipur.com" },
    update: {},
    create: {
      email: "admin@devstaysjaipur.com",
      name: "Dev Stays Admin",
      passwordHash,
      role: Role.ADMIN,
      phone: "+91 141 289 4400",
    },
  });

  await prisma.user.upsert({
    where: { email: "aparna@devstaysjaipur.com" },
    update: {},
    create: {
      email: "aparna@devstaysjaipur.com",
      name: "Aparna & Saksham",
      role: Role.PROPERTY_MANAGER,
      phone: "+91 98290 12345",
    },
  });

  console.log(`Admin created: ${admin.email}`);

  // 2. Create Dev Stays Property
  const propertyData = {
    slug: "dev-stays-jaipur",
    name: "Dev Stays Jaipur",
    headline: "Your own private 3BHK villa in Central Jaipur",
    description:
      "Your own private 3BHK villa in Central Jaipur (Raja Park) - 3 king bedrooms, 3 bathrooms, a large living room, full kitchen, dining area, veranda & parking for 3-4 cars. Every corner is handcrafted with Rajasthani textiles, crochet details & curated decor. Celebrations, small events & get-togethers are welcome. Priced for 6 guests; message us to host up to 15. Walkable to cafes & 10-25 mins to main attractions. Pet friendly. Board games available.",
    address: "Raja Park",
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    postalCode: "302004",
    latitude: 26.8968,
    longitude: 75.8271,
    checkInTime: "14:00",
    checkOutTime: "11:00",
    houseRules:
      "Check-in after 14:00 · Checkout before 11:00 (Self check-in via building staff). Celebrations, small events & get-togethers welcome (priced for 6, hosts up to 15). Pet friendly — we love hosting fur babies. Quiet residential lane in central Raja Park. Exterior security cameras on property and smoke alarm installed for your safety.",
    cancellationPolicy:
      "Full refund up to 7 days before check-in. 50% refund between 7 days and 48 hours prior to check-in. Direct booking cancellation guarantees applied.",
    isActive: true,
  };

  const property = await prisma.property.upsert({
    where: { slug: "dev-stays-jaipur" },
    update: propertyData,
    create: propertyData,
  });

  console.log(`Property created: ${property.name}`);

  // 3. Shared Inventory Group (Exclusive Booking Unit)
  const inventoryGroup = await prisma.inventoryGroup.upsert({
    where: { code: "DEV-MAIN-ESTATE" },
    update: {
      description:
        "The complete physical footprint of Dev Stays Jaipur including 3 king bedrooms, 3 attached bathrooms, large living room with 3 sofas, full kitchen, dining area, front veranda, and private parking for 3-4 cars.",
    },
    create: {
      propertyId: property.id,
      name: "Dev Stays Main Estate",
      code: "DEV-MAIN-ESTATE",
      totalPhysicalUnits: 1, // 1 exclusive physical property
      description:
        "The complete physical footprint of Dev Stays Jaipur including 3 king bedrooms, 3 attached bathrooms, large living room with 3 sofas, full kitchen, dining area, front veranda, and private parking for 3-4 cars.",
    },
  });

  console.log(`Inventory Group created: ${inventoryGroup.name}`);

  // 4. Listing Configurations (3 Options mapping to the same inventory group)
  await prisma.listingOption.upsert({
    where: { slug: "royal-suite" },
    update: {
      title: "Main Bedroom",
      summary: "Private king bedroom with ensuite bath, air conditioning, and garden veranda access.",
      description:
        "Three king bedrooms, each with a private attached bathroom (hot water), air conditioning, and fast Wi-Fi throughout. Handcrafted with Rajasthani textiles, crochet details, and antique touches.",
    },
    create: {
      propertyId: property.id,
      inventoryGroupId: inventoryGroup.id,
      slug: "royal-suite",
      title: "Main Bedroom",
      bedroomCount: 1,
      bathroomCount: 1,
      maxGuests: 2,
      basePricePerNight: 8500.0,
      weekendPricePerNight: 9500.0,
      cleaningFee: 500.0,
      taxPercentage: 12.0,
      summary: "Private king bedroom with ensuite bath, air conditioning, and garden veranda access.",
      description:
        "Three king bedrooms, each with a private attached bathroom (hot water), air conditioning, and fast Wi-Fi throughout. Handcrafted with Rajasthani textiles, crochet details, and antique touches.",
      coverImage:
        "/images/bedroom-1/imgi_415_8378c683-e395-419a-87b9-e764d4d7a670.jpg",
      isFeatured: false,
      sortOrder: 1,
    },
  });

  await prisma.listingOption.upsert({
    where: { slug: "courtyard-wing" },
    update: {
      title: "2 Bedrooms",
      summary: "Two private king bedrooms with attached bathrooms, living room, and front veranda.",
      description:
        "Two king bedrooms, each with a private attached bathroom (hot water), air conditioning, and fast Wi-Fi throughout. Access to large living room and private veranda. Ideal for families and small groups.",
    },
    create: {
      propertyId: property.id,
      inventoryGroupId: inventoryGroup.id,
      slug: "courtyard-wing",
      title: "2 Bedrooms",
      bedroomCount: 2,
      bathroomCount: 2,
      maxGuests: 5,
      basePricePerNight: 16500.0,
      weekendPricePerNight: 18500.0,
      cleaningFee: 1000.0,
      taxPercentage: 12.0,
      summary: "Two private king bedrooms with attached bathrooms, living room, and front veranda.",
      description:
        "Two king bedrooms, each with a private attached bathroom (hot water), air conditioning, and fast Wi-Fi throughout. Access to large living room and private veranda. Ideal for families and small groups.",
      coverImage:
        "/images/bedroom-2/imgi_425_675facbb-fb3d-4ca8-a7e3-f18a8d77ab54.jpg",
      isFeatured: false,
      sortOrder: 2,
    },
  });

  const config3 = await prisma.listingOption.upsert({
    where: { slug: "full-estate-buyout" },
    update: {
      title: "Whole Villa",
      summary: "Your own private 3BHK villa in Central Jaipur (Raja Park) — 3 king bedrooms, 3 bathrooms, large living room, full kitchen, dining area, veranda & parking.",
      description:
        "Dev Stays (@devstays.jaipur) is your own private villa in the heart of Jaipur - no shared spaces, no other guests. Just your group, your home, your rules. Three king bedrooms, each with private attached bath (hot water), full kitchen, living room with 3 sofas, dining area, front veranda with old tree & parking for 3-4 cars.",
    },
    create: {
      propertyId: property.id,
      inventoryGroupId: inventoryGroup.id,
      slug: "full-estate-buyout",
      title: "Whole Villa",
      bedroomCount: 3,
      bathroomCount: 4,
      maxGuests: 10,
      basePricePerNight: 28500.0,
      weekendPricePerNight: 32000.0,
      cleaningFee: 2000.0,
      taxPercentage: 18.0,
      summary: "Your own private 3BHK villa in Central Jaipur (Raja Park) — 3 king bedrooms, 3 bathrooms, large living room, full kitchen, dining area, veranda & parking.",
      description:
        "Dev Stays (@devstays.jaipur) is your own private villa in the heart of Jaipur - no shared spaces, no other guests. Just your group, your home, your rules. Three king bedrooms, each with private attached bath (hot water), full kitchen, living room with 3 sofas, dining area, front veranda with old tree & parking for 3-4 cars.",
      coverImage:
        "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
      isFeatured: true,
      sortOrder: 3,
    },
  });

  console.log("Listing Configurations seeded (3 configurations).");

  // 5. Seed Amenities
  await prisma.amenity.deleteMany({ where: { propertyId: property.id } });

  const amenities = [
    {
      name: "Fully Equipped Kitchen & Menu",
      description: "Gas stove, fridge, RO purifier, microwave, cooking essentials & on-site food ordering",
      iconName: "restaurant",
      category: "dining",
    },
    {
      name: "Fast Wi-Fi Throughout",
      description: "High-speed Wi-Fi across all bedrooms, living room & front veranda",
      iconName: "wifi",
      category: "work",
    },
    {
      name: "Private Veranda & Old Tree",
      description: "Street-facing veranda with plants & seating — perfect for morning chai",
      iconName: "yard",
      category: "outdoor",
    },
    {
      name: "Free Parking (3-4 Cars)",
      description: "Dedicated parking for 3-4 cars inside the gated property",
      iconName: "local_parking",
      category: "facilities",
    },
    {
      name: "Pet Friendly Sanctuary",
      description: "We love hosting fur babies! Spacious and welcoming to pets",
      iconName: "pets",
      category: "lifestyle",
    },
    {
      name: "Board Games & Badminton",
      description: "Board games, badminton & outdoor activities available for guests",
      iconName: "sports_tennis",
      category: "activities",
    },
    {
      name: "Celebrations & Events",
      description: "Birthdays, anniversaries, work offsites & get-togethers welcome",
      iconName: "celebration",
      category: "events",
    },
    {
      name: "Coffee Always on the House",
      description: "Complimentary coffee brewed with love by host Aparna",
      iconName: "coffee",
      category: "hospitality",
    },
    {
      name: "Self Check-in & Security",
      description: "Self check-in via building staff, exterior CCTV & smoke alarm",
      iconName: "security",
      category: "safety",
    },
  ];

  for (const a of amenities) {
    await prisma.amenity.create({
      data: {
        propertyId: property.id,
        name: a.name,
        description: a.description,
        iconName: a.iconName,
        category: a.category,
        isFeatured: true,
      },
    });
  }

  // 6. Seed Property Images with authentic photography
  const gallery = [
    {
      url: "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
      caption: "Grand Living Salon with Rajasthani Crafts & Archways",
      category: "living",
      sortOrder: 1,
      isCover: true,
    },
    {
      url: "/images/bedroom-1/imgi_415_8378c683-e395-419a-87b9-e764d4d7a670.jpg",
      caption: "Main Bedroom Suite King Bed & Teak Accents",
      category: "bedroom",
      sortOrder: 2,
    },
    {
      url: "/images/dining/imgi_67_1ea5b444-ee63-4a50-aff9-d7dbe31eceb2.jpg",
      caption: "Heritage Dining Hall & Colonnade",
      category: "dining",
      sortOrder: 3,
    },
    {
      url: "/images/kitchen/imgi_6_48052375-3227-4ddc-bb6f-51b650b76963.jpg",
      caption: "Modern Chef Kitchen with Full Amenities",
      category: "kitchen",
      sortOrder: 4,
    },
    {
      url: "/images/patio/2544fbd9-3035-4426-878d-3498cd2963ef.avif",
      caption: "Covered Veranda & Sunlit Colonnade",
      category: "exterior",
      sortOrder: 5,
    },
  ];

  for (const img of gallery) {
    await prisma.propertyImage.create({
      data: {
        propertyId: property.id,
        url: img.url,
        caption: img.caption,
        category: img.category,
        sortOrder: img.sortOrder,
        isCover: img.isCover ?? false,
      },
    });
  }

  // 7. Seed External Channel (Airbnb) & Listing Mapping
  const airbnbChannel = await prisma.externalChannel.create({
    data: {
      name: "Airbnb",
      channelType: ChannelType.AIRBNB,
      isActive: true,
      syncIntervalMinutes: 15,
    },
  });

  await prisma.externalChannelListing.create({
    data: {
      externalChannelId: airbnbChannel.id,
      propertyId: property.id,
      listingOptionId: config3.id, // Maps to Whole Villa on Airbnb
      externalListingId: "AIRBNB-DEVSTAYS-001",
      externalListingName: "Dev Stays Jaipur - Architectural Sanctuary & Pool",
      syncEnabled: true,
    },
  });

  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

