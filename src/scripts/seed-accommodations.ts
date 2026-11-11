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
      summary: "Private king bedroom with ensuite bath, air conditioning, and garden veranda access.",
      description:
        "Three king bedrooms, each with a private attached bathroom (hot water), air conditioning, and fast Wi-Fi throughout. Handcrafted with Rajasthani textiles, crochet details, and antique touches.",
      coverImage: "/images/bedroom-1/imgi_415_8378c683-e395-419a-87b9-e764d4d7a670.jpg",
      bedConfiguration: "1 King Bed (Handcrafted Teak Frame, attached bath)",
      sizeSqFt: 450,
      highlights: [
        "Three king bedrooms, each with a private attached bathroom (hot water)",
        "Handcrafted with Rajasthani textiles, crochet details & curated decor",
        "Air conditioning and fast Wi-Fi throughout the suite",
        "Street-facing veranda with mature old tree seating — perfect for morning chai",
        "Walkable to cafes & street food lanes in Raja Park (2-min walk) and pet friendly",
      ],
      amenitiesList: [
        "1 King Bed with Handcrafted Teak Frame",
        "Private Attached Bathroom with Hot Water",
        "Air Conditioning & Climate Control",
        "Fast Wi-Fi Throughout",
        "Street-Facing Veranda with Old Tree Seating",
        "Dedicated Work Desk & Chai Station",
        "Coffee Always on the House",
        "Pet Friendly Sanctuary",
        "Self Check-in via Building Staff",
        "Exterior CCTV Security & Smoke Alarm",
      ],
    },
  });
  console.log("Updated Royal Suite:", royalSuite.slug);

  // 2. Update Courtyard Wing (2 Bedrooms)
  const courtyardWing = await prisma.listingOption.update({
    where: { slug: "courtyard-wing" },
    data: {
      title: "2 Bedrooms",
      summary: "Two private king bedrooms with attached bathrooms, living room, and front veranda.",
      description:
        "Two king bedrooms, each with a private attached bathroom (hot water), air conditioning, and fast Wi-Fi throughout. Access to large living room and private veranda. Ideal for families and small groups.",
      coverImage: "/images/bedroom-2/imgi_425_675facbb-fb3d-4ca8-a7e3-f18a8d77ab54.jpg",
      bedConfiguration: "2 Luxury Bedrooms (2 King Beds, 2 attached baths)",
      sizeSqFt: 950,
      highlights: [
        "Two king bedrooms, each with a private attached bathroom (hot water)",
        "Air conditioning and fast Wi-Fi throughout both bedrooms",
        "Access to large living room with 3 comfortable sofas and dining area",
        "Fully equipped kitchen with on-site food ordering menu available",
        "Private veranda, parking for 3-4 cars inside property & pet friendly",
      ],
      amenitiesList: [
        "2 Luxury Bedrooms with King Beds",
        "2 Private Attached Bathrooms with Hot Water",
        "Air Conditioning & Fast Wi-Fi in Both Bedrooms",
        "Access to Large Living Room with 3 Sofas",
        "Fully Equipped Kitchen (Fridge, RO Purifier, Gas Stove, Microwave)",
        "On-Site Food Ordering Menu Available",
        "Private Street-Facing Veranda Seating",
        "Dedicated Parking for 3-4 Cars Inside Property",
        "Board Games & Badminton Available",
        "Pet Friendly (Fur Babies Welcome)",
      ],
    },
  });
  console.log("Updated Courtyard Wing:", courtyardWing.slug);

  // 3. Update Full Estate Buyout (Whole Villa)
  const fullEstate = await prisma.listingOption.update({
    where: { slug: "full-estate-buyout" },
    data: {
      title: "Whole Villa",
      summary: "Your own private 3BHK villa in Central Jaipur (Raja Park) — 3 king bedrooms, 3 bathrooms, large living room, full kitchen, dining area, veranda & parking.",
      description:
        "Dev Stays (@devstays.jaipur) is your own private villa in the heart of Jaipur - no shared spaces, no other guests. Just your group, your home, your rules. Three king bedrooms, each with private attached bath (hot water), full kitchen, living room with 3 sofas, dining area, front veranda with old tree & parking for 3-4 cars.",
      coverImage: "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
      bedConfiguration: "3 Luxury Bedroom Suites (3 King Beds + 3 Sofas, 3 attached baths)",
      sizeSqFt: 3200,
      highlights: [
        "Your own private 3BHK villa in Central Jaipur (Raja Park) — no shared spaces, no other guests",
        "3 King bedrooms, each with private attached bathroom (hot water)",
        "Large living room with 3 sofas for family dinners, game nights, and group conversations",
        "Fully equipped kitchen with fridge, RO water purifier, gas stove, microwave & cooking essentials",
        "On-site food menu available for day-to-day ordering if you prefer not to cook",
        "Private street-facing veranda with beautiful old tree, plants & seating for morning chai",
        "Parking for 3-4 cars inside property, pet friendly & board games available",
        "Celebrations, small events & get-togethers welcome (priced for 6, hosts up to 15)",
      ],
      amenitiesList: [
        "Entire 3BHK Villa Exclusive Private Access",
        "3 King Bedrooms with Attached Private Bathrooms (Hot Water)",
        "Air Conditioning & Fast Wi-Fi Throughout Entire Villa",
        "Large Living Room with 3 Sofas & Board Games",
        "Fully Equipped Kitchen (Fridge, RO Purifier, Gas Stove, Microwave)",
        "On-Site Food Menu Available for Convenient Ordering",
        "Private Street-Facing Veranda with Old Tree & Seating",
        "Dedicated Parking for 3-4 Cars Inside Property",
        "Pet Friendly — We Love Hosting Fur Babies",
        "Celebrations, Small Events & Offsites Welcome",
        "Self Check-in via Building Staff & Exterior CCTV",
        "Complimentary Coffee by Superhost Aparna",
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

