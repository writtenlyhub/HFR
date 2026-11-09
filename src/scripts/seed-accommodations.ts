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
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDVgof0d5ixzAAMrLi6YrVh8RzOyfFeT6oGtCCsleXEnSx4709BcNT2HmUx_jWw0dnYVSBzNbwgacN9uo4wMVl7sNz1QCsedJCGKd1T3xasQRPKJ7NIGC4YstTvQLT4kBCloK54v6ra1_Vg-TigJRiKOOvL7ziHN_bBv2fZqOy_6MNfklkmV2jGD400Z-gGnkOeX7stKN6YBm_ZmDO8GkyiMq3prSQ46qoLwGI452U",
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
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDrc75pUMuZRzly8KtYr85K0ZbDSRhjTb2MWKIvNzohhc6n2Wue6N3McWmq5P_zFIym85OnUd8Md-gnbAzi9TrZSpSAMk8VDwrnnQ7tmXuH2-55iVO1vftNuxWQ4t2qUIQPPx1Hyvx9W9L9tWyYdrJhFoAudfbEhRCkhNMXfRAZXVQnapGjAs2gUW5fDMJoNMy12iIzFT5lo960UWDdoZMQStNPjJl6nlXOSv1xkh0",
      caption: "Private Garden Veranda & Colonnade",
      category: "exterior",
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
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuABDvjL5jP8JPbuETy4O7r5cnT95XNp-Rat1g36gtyXwMRMolmnltNPtoe1L3___s1K6qphNBILWEjx1cAb1JTv9C_8zCWlttMQBglhGEih1XYmYYAH3QHOJj6EXfd8hwCcoTeGUu3tS5eLCP-4eHzLTeT-p9oY4smkfG21szCNlomtVhXgPCKo-GRuY-VSZSO47E-z-bhsLN3gsIrq2bdSa32TbtuPn8CboxpvmB4",
      caption: "Courtyard Wing Living Salon & Interconnected Suites",
      category: "living",
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
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuD6kKrBTsXZaKC8ruztoO_cLuYvZO__CnPz3lwZNOa3p6OzHrHTyhfA_36D7SgQ-7GJPTiO1KD4AjOsd8AxCVV-uEMvUmE5PaV8OXVXVXh3wa3tvDgbVzepDabRFO_mXvklA5Nb-1sNdEsWLg3WQTjyYN5aCgyQrRrurQHYgZta_OeB2Rzi-PJimECEiAWcVfx8TWVfS8Y7qLYTRr3fZdTvqInYcHycLxTn1ePwBcg",
      caption: "Colonnade Opening to Heated Plunge Pool",
      category: "pool",
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
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuD6kKrBTsXZaKC8ruztoO_cLuYvZO__CnPz3lwZNOa3p6OzHrHTyhfA_36D7SgQ-7GJPTiO1KD4AjOsd8AxCVV-uEMvUmE5PaV8OXVXVXh3wa3tvDgbVzepDabRFO_mXvklA5Nb-1sNdEsWLg3WQTjyYN5aCgyQrRrurQHYgZta_OeB2Rzi-PJimECEiAWcVfx8TWVfS8Y7qLYTRr3fZdTvqInYcHycLxTn1ePwBcg",
      caption: "Private Heated Courtyard Plunge Pool & Sandstone Colonnade",
      category: "pool",
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
      url: "https://lh3.googleusercontent.com/aida-public/AB6AXuD5zsMfWqrfve2fmYWN_cYW2Jc0ehxDCIMJVn6ez27fzGQtMi1OdkAnVs6gc3dltaWVPZuAMrghILwZ3m5KrCu9R2rFbFxq-SGHSXwgswFbYVnGbfjH1VO2LBESVe_g5n_tt8EdzFAde0z7htZLwcmNBr0J4_xDYUSuc_t9inrS5JxuERyi2zkz-Rew4w9BfUeOYkJ8SZBaAMBVKRXMWiya6YQxKCOgEN8MttQNtpY",
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

