import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding rich accommodation metadata and image galleries...");

  const property = await prisma.property.findUnique({
    where: { slug: "dev-stays-jaipur" },
  });

  if (!property) {
    console.error("Property dev-stays-jaipur not found!");
    process.exit(1);
  }

  // 1. Update Royal Suite (Main Bedroom)
  const royalSuite = await prisma.listingOption.update({
    where: { slug: "royal-suite" },
    data: {
      title: "Main Bedroom",
      coverImage: "/images/bedroom-1/imgi_415_8378c683-e395-419a-87b9-e764d4d7a670.jpg",
      bedConfiguration: "1 King Bed (Handcrafted Teak Frame)",
      sizeSqFt: 450,
      highlights: [
        "Private garden veranda overlooking bougainvillea courtyards",
        "Dedicated high-speed desk workspace with ergonomic seating & 300 Mbps Wi-Fi",
        "Ensuite Italian marble bathroom with rain shower & luxury amenities",
        "Heated courtyard plunge pool access & complimentary morning breakfast",
        "Complete privacy — no other guests on the estate during your stay",
      ],
      amenitiesList: [
        "King Bed with 400-Thread Egyptian Linen",
        "Dedicated Teak Workstation",
        "300 Mbps Enterprise Mesh Wi-Fi",
        "Ensuite Marble Rain Shower",
        "Private Garden Veranda Seating",
        "In-Room Climate Control & Air Conditioning",
        "Daily Housekeeping Service",
        "Courtyard Plunge Pool Colonnade Access",
        "Electric Kettle & Artisanal Chai Bar",
        "Electronic Safe & Security Lock",
      ],
    },
  });
  console.log("Updated Royal Suite:", royalSuite.slug);

  // 2. Update Courtyard Wing (2 Bedrooms)
  const courtyardWing = await prisma.listingOption.update({
    where: { slug: "courtyard-wing" },
    data: {
      title: "2 Bedrooms",
      coverImage: "/images/bedroom-2/imgi_425_675facbb-fb3d-4ca8-a7e3-f18a8d77ab54.jpg",
      bedConfiguration: "2 Luxury Bedrooms (1 King Bed + 1 Queen Bed + Daybed)",
      sizeSqFt: 950,
      highlights: [
        "Two interconnected luxury bedroom suites framing the central plunge pool",
        "Two private ensuite bathrooms with rainfall showers & organic bath products",
        "Private colonnade veranda with al-fresco seating for tea and relaxation",
        "Ideal configuration for small families, travelling couples, or creative cohorts",
        "Complete physical privacy with exclusive estate grounds during your reservation",
      ],
      amenitiesList: [
        "2 Private Ensuite Luxury Bedrooms",
        "1 King Bed + 1 Queen Bed + 1 Daybed",
        "Dual Rainforest Shower Ensuites",
        "Direct Colonnade Access to Heated Plunge Pool",
        "Dual 300 Mbps Mesh Wi-Fi Zones",
        "Al-Fresco Courtyard Dining Table",
        "Individual Climate Controls in Both Suites",
        "Complimentary Chef Breakfast",
        "Mini-Refrigerator & Artisanal Refreshments",
        "Secure Gated Parking with EV Charging",
      ],
    },
  });
  console.log("Updated Courtyard Wing:", courtyardWing.slug);

  // 3. Update Full Estate Buyout (Whole Villa)
  const fullEstate = await prisma.listingOption.update({
    where: { slug: "full-estate-buyout" },
    data: {
      title: "Whole Villa",
      coverImage: "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
      bedConfiguration: "3 Luxury Bedroom Suites (2 King Beds + 1 Queen Bed + 2 Divans)",
      sizeSqFt: 3200,
      highlights: [
        "100% exclusive buyout of the entire heritage sandstone estate",
        "3 luxury bedroom suites accommodating up to 10 guests across 4 bathrooms",
        "Heated courtyard plunge pool reserved exclusively for your family or group",
        "Grand living salon with Rajasthani crafts, library & smart entertainment",
        "Rooftop stargazing terrace with panoramic views of the Pink City skyline",
        "Dedicated on-site host, resident chef for customized dining & 24/7 security",
      ],
      amenitiesList: [
        "Entire Villa Exclusive Buyout",
        "3 Private Bedroom Suites (Up to 10 Guests)",
        "4 Designer Bathrooms & Powder Room",
        "Heated Courtyard Plunge Pool Exclusively Yours",
        "Grand Living Salon & Heritage Library",
        "Chef's Kitchen & Formal Dining Colonnade",
        "Rooftop Sunset & Stargazing Terrace",
        "Resident Staff & Daily Housekeeping",
        "High-Speed Mesh Wi-Fi Throughout Estate",
        "Private Gated Parking (EV Capable)",
      ],
    },
  });
  console.log("Updated Full Estate:", fullEstate.slug);

  // 4. Associate existing and room-specific images to listing options
  const existingImages = await prisma.propertyImage.findMany({
    where: { propertyId: property.id },
  });

  const imgBedroom = existingImages.find((img) => img.category === "bedroom");

  // Royal Suite images
  if (imgBedroom) {
    await prisma.propertyImage.update({
      where: { id: imgBedroom.id },
      data: { listingOptionId: royalSuite.id },
    });
  }

  // Ensure each listing option has multiple gallery images
  // For Royal Suite:
  await prisma.propertyImage.upsert({
    where: { id: "img-royal-suite-veranda" },
    update: {},
    create: {
      id: "img-royal-suite-veranda",
      propertyId: property.id,
      listingOptionId: royalSuite.id,
      url: "/images/bedroom-1/imgi_415_8378c683-e395-419a-87b9-e764d4d7a670.jpg",
      caption: "Main Bedroom Suite King Bed & Teak Accents",
      category: "bedroom",
      sortOrder: 1,
      isCover: true,
    },
  });

  await prisma.propertyImage.upsert({
    where: { id: "img-royal-suite-bath" },
    update: {},
    create: {
      id: "img-royal-suite-bath",
      propertyId: property.id,
      listingOptionId: royalSuite.id,
      url: "/images/bathroom-1/f5016be6-eeab-4778-93bf-66c5791f0cc5.avif",
      caption: "Main Bedroom Ensuite Bathroom with Rain Shower",
      category: "bathroom",
      sortOrder: 2,
    },
  });

  // Courtyard Wing images:
  await prisma.propertyImage.upsert({
    where: { id: "img-courtyard-wing-1" },
    update: {},
    create: {
      id: "img-courtyard-wing-1",
      propertyId: property.id,
      listingOptionId: courtyardWing.id,
      url: "/images/bedroom-2/imgi_425_675facbb-fb3d-4ca8-a7e3-f18a8d77ab54.jpg",
      caption: "Bedroom 2 King Bed with Botanical Accent Wall & Swan Towels",
      category: "bedroom",
      sortOrder: 1,
      isCover: true,
    },
  });

  await prisma.propertyImage.upsert({
    where: { id: "img-courtyard-wing-pool" },
    update: {},
    create: {
      id: "img-courtyard-wing-pool",
      propertyId: property.id,
      listingOptionId: courtyardWing.id,
      url: "/images/patio/2544fbd9-3035-4426-878d-3498cd2963ef.avif",
      caption: "Sunlit Courtyard Patio & Colonnade",
      category: "exterior",
      sortOrder: 2,
    },
  });

  // Full Estate Buyout images:
  await prisma.propertyImage.upsert({
    where: { id: "img-full-estate-pool" },
    update: {},
    create: {
      id: "img-full-estate-pool",
      propertyId: property.id,
      listingOptionId: fullEstate.id,
      url: "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
      caption: "Grand Living Salon with Rajasthani Crafts & Archways",
      category: "living",
      sortOrder: 1,
      isCover: true,
    },
  });

  await prisma.propertyImage.upsert({
    where: { id: "img-full-estate-dining" },
    update: {},
    create: {
      id: "img-full-estate-dining",
      propertyId: property.id,
      listingOptionId: fullEstate.id,
      url: "/images/dining/imgi_67_1ea5b444-ee63-4a50-aff9-d7dbe31eceb2.jpg",
      caption: "Dining Hall & Chef Kitchen for Exclusive Estate Feasts",
      category: "dining",
      sortOrder: 2,
    },
  });

  console.log("Successfully seeded accommodation details and image associations.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

