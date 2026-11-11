import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding real property and accommodation photographs...");

  const property = await prisma.property.findUnique({
    where: { slug: "dev-stays-jaipur" },
    include: { listingOptions: true },
  });

  if (!property) {
    console.error("Property dev-stays-jaipur not found!");
    process.exit(1);
  }

  const royalSuite = property.listingOptions.find((o) => o.slug === "royal-suite");
  const courtyardWing = property.listingOptions.find((o) => o.slug === "courtyard-wing");
  const fullEstate = property.listingOptions.find((o) => o.slug === "full-estate-buyout");

  if (!royalSuite || !courtyardWing || !fullEstate) {
    console.error("Missing one of the three listing options!");
    process.exit(1);
  }

  // 1. Update cover images on ListingOptions
  console.log("Updating listing options cover images...");

  await prisma.listingOption.update({
    where: { id: royalSuite.id },
    data: {
      coverImage: "/images/bedroom-1/imgi_415_8378c683-e395-419a-87b9-e764d4d7a670.jpg",
    },
  });

  await prisma.listingOption.update({
    where: { id: courtyardWing.id },
    data: {
      coverImage: "/images/bedroom-2/imgi_425_675facbb-fb3d-4ca8-a7e3-f18a8d77ab54.jpg",
    },
  });

  await prisma.listingOption.update({
    where: { id: fullEstate.id },
    data: {
      coverImage: "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
    },
  });

  // 2. Clear existing property images
  console.log("Replacing existing PropertyImage records with real photography...");
  await prisma.propertyImage.deleteMany({
    where: { propertyId: property.id },
  });

  // 3. Define Property Images
  // Top 5 images populate the homepage 5-slot asymmetric grid:
  // Slot 1: Large Main Hero (Living Salon)
  // Slot 2: Top-Left (Master Bedroom 1)
  // Slot 3: Top-Right (Dining Hall)
  // Slot 4: Bottom-Left (Chef Kitchen)
  // Slot 5: Bottom-Right (Veranda / Patio Colonnade)
  const realGalleryImages = [
    // --- Homepage Featured 5 Mosaic Images ---
    {
      id: "img-living-main",
      url: "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
      caption: "Grand Living Salon with Rajasthani Crafts & Archways",
      category: "living",
      sortOrder: 1,
      isCover: true,
      listingOptionId: fullEstate.id,
    },
    {
      id: "img-bedroom1-main",
      url: "/images/bedroom-1/imgi_415_8378c683-e395-419a-87b9-e764d4d7a670.jpg",
      caption: "Main Bedroom Suite King Bed & Teak Accents",
      category: "bedroom",
      sortOrder: 2,
      isCover: false,
      listingOptionId: royalSuite.id,
    },
    {
      id: "img-dining-main",
      url: "/images/dining/imgi_67_1ea5b444-ee63-4a50-aff9-d7dbe31eceb2.jpg",
      caption: "Heritage Dining Hall & Colonnade",
      category: "dining",
      sortOrder: 3,
      isCover: false,
      listingOptionId: fullEstate.id,
    },
    {
      id: "img-kitchen-main",
      url: "/images/kitchen/imgi_6_48052375-3227-4ddc-bb6f-51b650b76963.jpg",
      caption: "Modern Chef Kitchen with Full Amenities",
      category: "kitchen",
      sortOrder: 4,
      isCover: false,
      listingOptionId: fullEstate.id,
    },
    {
      id: "img-patio-main",
      url: "/images/patio/2544fbd9-3035-4426-878d-3498cd2963ef.avif",
      caption: "Covered Veranda & Sunlit Colonnade",
      category: "exterior",
      sortOrder: 5,
      isCover: false,
      listingOptionId: fullEstate.id,
    },

    // --- Exterior & Grounds ---
    {
      id: "img-exterior-facade",
      url: "/images/exterior/85623348-92e6-4ea3-9185-a80f57f90c47.avif",
      caption: "Dev Stays Jaipur Villa Facade & Entrance Courtyard",
      category: "exterior",
      sortOrder: 6,
      isCover: false,
      listingOptionId: fullEstate.id,
    },
    {
      id: "img-exterior-driveway",
      url: "/images/exterior/f40dd9f0-9e91-4066-ad81-de73942a93dc.avif",
      caption: "Private Gated Driveway & Secure Parking",
      category: "exterior",
      sortOrder: 7,
      isCover: false,
      listingOptionId: fullEstate.id,
    },
    {
      id: "img-back-garden-pergola",
      url: "/images/back-garden/f39a677f-0f88-4c89-9a3f-bd05e051a2ff.webp",
      caption: "Covered Back Garden Pergola & Lounge Stools",
      category: "exterior",
      sortOrder: 8,
      isCover: false,
      listingOptionId: fullEstate.id,
    },
    {
      id: "img-veranda-seating",
      url: "/images/veranda/d4e5c98c-7911-494a-9488-75693aa437d7.avif",
      caption: "Veranda Courtyard Seating & Potted Flora",
      category: "exterior",
      sortOrder: 9,
      isCover: false,
      listingOptionId: fullEstate.id,
    },

    // --- Bedroom 1 (Royal Suite) Additional Photos ---
    {
      id: "img-bedroom1-detail-1",
      url: "/images/bedroom-1/imgi_414_24bf98dd-d252-4142-ab40-d4c545cb16ac.jpg",
      caption: "Main Bedroom Suite Handcrafted Wooden Bed & Nightstands",
      category: "bedroom",
      sortOrder: 10,
      isCover: false,
      listingOptionId: royalSuite.id,
    },
    {
      id: "img-bedroom1-detail-2",
      url: "/images/bedroom-1/imgi_420_087c465e-5fac-4485-b855-0a1604a352dc.jpg",
      caption: "Main Bedroom Suite Vanity Mirror & Seating Corner",
      category: "bedroom",
      sortOrder: 11,
      isCover: false,
      listingOptionId: royalSuite.id,
    },
    {
      id: "img-bedroom1-detail-3",
      url: "/images/bedroom-1/imgi_419_42cdc5e2-41bf-497f-bbb5-a86fdd8c6c09.jpg",
      caption: "Main Bedroom Suite Wardrobes & Workstation",
      category: "bedroom",
      sortOrder: 12,
      isCover: false,
      listingOptionId: royalSuite.id,
    },
    {
      id: "img-bathroom-1",
      url: "/images/bathroom-1/f5016be6-eeab-4778-93bf-66c5791f0cc5.avif",
      caption: "Main Bedroom Ensuite Bathroom with Rain Shower",
      category: "bathroom",
      sortOrder: 13,
      isCover: false,
      listingOptionId: royalSuite.id,
    },

    // --- Bedroom 2 (Courtyard Wing) Photos ---
    {
      id: "img-bedroom2-main",
      url: "/images/bedroom-2/imgi_425_675facbb-fb3d-4ca8-a7e3-f18a8d77ab54.jpg",
      caption: "Bedroom 2 King Bed with Botanical Accent Wall & Swan Towels",
      category: "bedroom",
      sortOrder: 14,
      isCover: false,
      listingOptionId: courtyardWing.id,
    },
    {
      id: "img-bedroom2-detail-1",
      url: "/images/bedroom-2/imgi_427_4664f5dd-2301-4900-ab64-464fcac1ca15.jpg",
      caption: "Bedroom 2 Cozy Lounge Seating & Sunlight Windows",
      category: "bedroom",
      sortOrder: 15,
      isCover: false,
      listingOptionId: courtyardWing.id,
    },
    {
      id: "img-bedroom2-detail-2",
      url: "/images/bedroom-2/imgi_431_95019324-bfae-4231-a962-8bc32005bc63.jpg",
      caption: "Bedroom 2 Teak Dresser & Wardrobe Storage",
      category: "bedroom",
      sortOrder: 16,
      isCover: false,
      listingOptionId: courtyardWing.id,
    },
    {
      id: "img-bathroom-2",
      url: "/images/bathroom-2/83e7a7ef-978a-4fe0-8ba6-1113f6484eb6.avif",
      caption: "Bedroom 2 Designer Bathroom & Modern Fittings",
      category: "bathroom",
      sortOrder: 17,
      isCover: false,
      listingOptionId: courtyardWing.id,
    },

    // --- Bedroom 3 (Whole Villa Buyout) Photos ---
    {
      id: "img-bedroom3-main",
      url: "/images/bedroom-3/0fa41611-36f1-478d-b791-8ce3463cf8a6.avif",
      caption: "Bedroom 3 Jaipur Indigo Block Print Bed & Ambient Sconces",
      category: "bedroom",
      sortOrder: 18,
      isCover: false,
      listingOptionId: fullEstate.id,
    },
    {
      id: "img-bedroom3-detail-1",
      url: "/images/bedroom-3/788569fe-6d44-433d-9162-dbebcb475e2d.avif",
      caption: "Bedroom 3 Teak Furniture & Coffee Table",
      category: "bedroom",
      sortOrder: 19,
      isCover: false,
      listingOptionId: fullEstate.id,
    },
    {
      id: "img-bathroom-3",
      url: "/images/bathroom-3/093ae108-2d7a-4324-a05c-89fd171262ee.jpg",
      caption: "Bedroom 3 Bathroom with Rainfall Shower",
      category: "bathroom",
      sortOrder: 20,
      isCover: false,
      listingOptionId: fullEstate.id,
    },

    // --- Additional Living & Dining Spaces ---
    {
      id: "img-living-detail-1",
      url: "/images/living-room/imgi_378_afd4bfcb-d90a-443e-afb2-88c3cee38886.jpg",
      caption: "Living Salon Sofa Seating & Heritage Mirror Decor",
      category: "living",
      sortOrder: 21,
      isCover: false,
      listingOptionId: fullEstate.id,
    },
    {
      id: "img-living-detail-2",
      url: "/images/living-room/imgi_401_63a23a48-54a0-4289-801b-f75310f03104.jpg",
      caption: "Living Salon Coffee Table & Rajasthani Carvings",
      category: "living",
      sortOrder: 22,
      isCover: false,
      listingOptionId: fullEstate.id,
    },
    {
      id: "img-dining-detail-1",
      url: "/images/dining/imgi_70_b0e19ab2-3750-4717-9f0b-222f12855424.jpg",
      caption: "Formal Dining Table Set for Breakfast & Feasts",
      category: "dining",
      sortOrder: 23,
      isCover: false,
      listingOptionId: fullEstate.id,
    },
    {
      id: "img-kitchen-detail-1",
      url: "/images/kitchen/imgi_41_a6be97c1-47fb-4afb-9915-eb3cfabf3840.jpg",
      caption: "Kitchen Storage & Prepared Cooking Station",
      category: "kitchen",
      sortOrder: 24,
      isCover: false,
      listingOptionId: fullEstate.id,
    },
  ];

  for (const img of realGalleryImages) {
    await prisma.propertyImage.create({
      data: {
        id: img.id,
        propertyId: property.id,
        listingOptionId: img.listingOptionId,
        url: img.url,
        caption: img.caption,
        category: img.category,
        sortOrder: img.sortOrder,
        isCover: img.isCover,
      },
    });
  }

  console.log(`Successfully seeded ${realGalleryImages.length} real photographs into PostgreSQL!`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Seeding failed:", e);
  process.exit(1);
});

