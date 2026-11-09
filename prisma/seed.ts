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
  const property = await prisma.property.upsert({
    where: { slug: "dev-stays-jaipur" },
    update: {},
    create: {
      slug: "dev-stays-jaipur",
      name: "Dev Stays Jaipur",
      headline: "An architectural sanctuary in the Pink City",
      description:
        "Crafted with locally quarried, hand-chiseled Dholpur sandstone, Dev Stays is conceived as a serene residential sanctuary in Jaipur's coveted Civil Lines and Raja Park belt. Designed around classic Rajasthani haveli geometry, every sunlit corner frames internal courtyards, bougainvillea verandas, and peaceful water features.",
      address: "Civil Lines & Raja Park Enclave",
      city: "Jaipur",
      state: "Rajasthan",
      country: "India",
      postalCode: "302006",
      latitude: 26.9124,
      longitude: 75.7873,
      checkInTime: "14:00",
      checkOutTime: "11:00",
      houseRules:
        "Quiet hours after 10:00 PM to respect neighboring diplomatic residences. No unauthorized parties or non-registered overnight guests. Non-smoking interiors; smoking permitted in open courtyard gardens.",
      cancellationPolicy:
        "Full refund up to 7 days before check-in. 50% refund between 7 days and 48 hours prior to check-in. Direct booking cancellation guarantees applied.",
      isActive: true,
    },
  });

  console.log(`Property created: ${property.name}`);

  // 3. Shared Inventory Group (Exclusive Booking Unit)
  const inventoryGroup = await prisma.inventoryGroup.upsert({
    where: { code: "DEV-MAIN-ESTATE" },
    update: {},
    create: {
      propertyId: property.id,
      name: "Dev Stays Main Estate",
      code: "DEV-MAIN-ESTATE",
      totalPhysicalUnits: 1, // 1 exclusive physical property
      description:
        "The complete physical footprint of Dev Stays Jaipur including all 3 bedrooms, private courtyard, plunge pool, dining hall, and living salon.",
    },
  });

  console.log(`Inventory Group created: ${inventoryGroup.name}`);

  // 4. Listing Configurations (3 Options mapping to the same inventory group)
  await prisma.listingOption.upsert({
    where: { slug: "royal-suite" },
    update: {},
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
      summary: "A private and comfortable bedroom for your stay.",
      description:
        "The master bedroom suite features hand-crafted teak furniture, an ensuite marble bath with rain shower, direct garden veranda access, and dedicated high-speed desk workspace.",
      coverImage:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDVgof0d5ixzAAMrLi6YrVh8RzOyfFeT6oGtCCsleXEnSx4709BcNT2HmUx_jWw0dnYVSBzNbwgacN9uo4wMVl7sNz1QCsedJCGKd1T3xasQRPKJ7NIGC4YstTvQLT4kBCloK54v6ra1_Vg-TigJRiKOOvL7ziHN_bBv2fZqOy_6MNfklkmV2jGD400Z-gGnkOeX7stKN6YBm_ZmDO8GkyiMq3prSQ46qoLwGI452U",
      isFeatured: false,
      sortOrder: 1,
    },
  });

  await prisma.listingOption.upsert({
    where: { slug: "courtyard-wing" },
    update: {},
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
      summary: "More space and comfort for families and small groups.",
      description:
        "Two interconnected luxury bedrooms framing the central plunge pool. Ideal for small families or travelling couples seeking shared social spaces with private individual sleeping sanctuaries.",
      coverImage:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuABDvjL5jP8JPbuETy4O7r5cnT95XNp-Rat1g36gtyXwMRMolmnltNPtoe1L3___s1K6qphNBILWEjx1cAb1JTv9C_8zCWlttMQBglhGEih1XYmYYAH3QHOJj6EXfd8hwCcoTeGUu3tS5eLCP-4eHzLTeT-p9oY4smkfG21szCNlomtVhXgPCKo-GRuY-VSZSO47E-z-bhsLN3gsIrq2bdSa32TbtuPn8CboxpvmB4",
      isFeatured: false,
      sortOrder: 2,
    },
  });

  const config3 = await prisma.listingOption.upsert({
    where: { slug: "full-estate-buyout" },
    update: {},
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
      summary: "Enjoy the entire property with complete privacy.",
      description:
        "Exclusive buyout of the entire estate: all three bedroom suites, the private heated plunge pool, grand living salon, open chef's kitchen, dining hall, and rooftop stargazing terrace. Full private staffing and dedicated security included.",
      coverImage:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD6kKrBTsXZaKC8ruztoO_cLuYvZO__CnPz3lwZNOa3p6OzHrHTyhfA_36D7SgQ-7GJPTiO1KD4AjOsd8AxCVV-uEMvUmE5PaV8OXVXVXh3wa3tvDgbVzepDabRFO_mXvklA5Nb-1sNdEsWLg3WQTjyYN5aCgyQrRrurQHYgZta_OeB2Rzi-PJimECEiAWcVfx8TWVfS8Y7qLYTRr3fZdTvqInYcHycLxTn1ePwBcg",
      isFeatured: true,
      sortOrder: 3,
    },
  });

  console.log("Listing Configurations seeded (3 configurations).");

  // 5. Seed Amenities
  const amenities = [
    {
      name: "Courtyard Plunge Pool",
      description: "Heated & sun-dappled courtyard plunge pool",
      iconName: "pool",
      category: "luxury",
    },
    {
      name: "Dual 300 Mbps Wi-Fi",
      description: "Enterprise mesh Wi-Fi coverage across all rooms & courtyards",
      iconName: "wifi",
      category: "work",
    },
    {
      name: "Resident Chef & Modern Kitchen",
      description: "Authentic Rajasthani & Continental meals freshly prepared",
      iconName: "restaurant",
      category: "dining",
    },
    {
      name: "Tranquil Garden Terraces",
      description: "Rooftop sunset views over Civil Lines diplomatic enclave",
      iconName: "yard",
      category: "outdoor",
    },
    {
      name: "Secure Private Parking",
      description: "Gated on-premises EV-capable spots with 24/7 security",
      iconName: "local_parking",
      category: "facilities",
    },
    {
      name: "24/7 Gated Security",
      description: "Concierge & discreet exterior CCTV protection",
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

  // 6. Seed Property Images
  const gallery = [
    {
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuD6kKrBTsXZaKC8ruztoO_cLuYvZO__CnPz3lwZNOa3p6OzHrHTyhfA_36D7SgQ-7GJPTiO1KD4AjOsd8AxCVV-uEMvUmE5PaV8OXVXVXh3wa3tvDgbVzepDabRFO_mXvklA5Nb-1sNdEsWLg3WQTjyYN5aCgyQrRrurQHYgZta_OeB2Rzi-PJimECEiAWcVfx8TWVfS8Y7qLYTRr3fZdTvqInYcHycLxTn1ePwBcg",
      caption: "Courtyard Plunge Pool & Sandstone Colonnade",
      category: "pool",
      sortOrder: 1,
      isCover: true,
    },
    {
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDVgof0d5ixzAAMrLi6YrVh8RzOyfFeT6oGtCCsleXEnSx4709BcNT2HmUx_jWw0dnYVSBzNbwgacN9uo4wMVl7sNz1QCsedJCGKd1T3xasQRPKJ7NIGC4YstTvQLT4kBCloK54v6ra1_Vg-TigJRiKOOvL7ziHN_bBv2fZqOy_6MNfklkmV2jGD400Z-gGnkOeX7stKN6YBm_ZmDO8GkyiMq3prSQ46qoLwGI452U",
      caption: "Master Bedroom Suite with Teak Furnishings",
      category: "bedroom",
      sortOrder: 2,
    },
    {
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuABDvjL5jP8JPbuETy4O7r5cnT95XNp-Rat1g36gtyXwMRMolmnltNPtoe1L3___s1K6qphNBILWEjx1cAb1JTv9C_8zCWlttMQBglhGEih1XYmYYAH3QHOJj6EXfd8hwCcoTeGUu3tS5eLCP-4eHzLTeT-p9oY4smkfG21szCNlomtVhXgPCKo-GRuY-VSZSO47E-z-bhsLN3gsIrq2bdSa32TbtuPn8CboxpvmB4",
      caption: "Living Salon with Rajasthani Crafts & Library",
      category: "living",
      sortOrder: 3,
    },
    {
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuD5zsMfWqrfve2fmYWN_cYW2Jc0ehxDCIMJVn6ez27fzGQtMi1OdkAnVs6gc3dltaWVPZuAMrghILwZ3m5KrCu9R2rFbFxq-SGHSXwgswFbYVnGbfjH1VO2LBESVe_g5n_tt8EdzFAde0z7htZLwcmNBr0J4_xDYUSuc_t9inrS5JxuERyi2zkz-Rew4w9BfUeOYkJ8SZBaAMBVKRXMWiya6YQxKCOgEN8MttQNtpY",
      caption: "Dining Hall & Chef Kitchen",
      category: "dining",
      sortOrder: 4,
    },
    {
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDrc75pUMuZRzly8KtYr85K0ZbDSRhjTb2MWKIvNzohhc6n2Wue6N3McWmq5P_zFIym85OnUd8Md-gnbAzi9TrZSpSAMk8VDwrnnQ7tmXuH2-55iVO1vftNuxWQ4t2qUIQPPx1Hyvx9W9L9tWyYdrJhFoAudfbEhRCkhNMXfRAZXVQnapGjAs2gUW5fDMJoNMy12iIzFT5lo960UWDdoZMQStNPjJl6nlXOSv1xkh0",
      caption: "Architectural Colonnades & Terraces",
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

