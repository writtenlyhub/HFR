import { notFound } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  AccommodationDetailView,
  RoomData,
  PropertyData,
} from "@/components/accommodation-detail-view";

export const dynamic = "force-dynamic";

interface AccommodationPageProps {
  params: Promise<{ propertySlug: string; roomSlug: string }> | {
    propertySlug: string;
    roomSlug: string;
  };
}

function resolveListingSlug(routeSlug: string): string {
  if (routeSlug === "full-estate") {
    return "full-estate-buyout";
  }
  return routeSlug;
}

export async function generateMetadata(
  props: AccommodationPageProps
): Promise<Metadata> {
  const params = await props.params;
  const { propertySlug, roomSlug } = params;
  const dbSlug = resolveListingSlug(roomSlug);

  const room = await prisma.listingOption.findFirst({
    where: {
      slug: dbSlug,
      property: { slug: propertySlug },
    },
    include: {
      property: {
        select: { name: true, city: true },
      },
    },
  });

  if (!room) {
    return {
      title: "Accommodation Not Found | Dev Stays Jaipur",
    };
  }

  const title = `${room.title} | ${room.property.name} ${room.property.city}`;
  const description =
    room.summary ||
    room.description?.slice(0, 160) ||
    `${room.title} at ${room.property.name}. Private luxury stay in Jaipur.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/properties/${propertySlug}/${roomSlug}`,
    },
    openGraph: {
      title,
      description,
      images: room.coverImage ? [room.coverImage] : [],
      type: "website",
      locale: "en_IN",
    },
  };
}

export default async function AccommodationDetailPage(
  props: AccommodationPageProps
) {
  const params = await props.params;
  const { propertySlug, roomSlug } = params;
  const dbSlug = resolveListingSlug(roomSlug);

  // Fetch property and all active listing options
  const property = await prisma.property.findUnique({
    where: { slug: propertySlug },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
      },
      listingOptions: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!property) {
    notFound();
  }

  const targetOption = property.listingOptions.find((o) => o.slug === dbSlug);
  if (!targetOption) {
    notFound();
  }

  const serializedAllOptions = property.listingOptions.map((opt) => ({
    id: opt.id,
    slug: opt.slug,
    title: opt.title,
    basePricePerNight: Number(opt.basePricePerNight),
    maxGuests: opt.maxGuests,
    bedroomCount: opt.bedroomCount,
    bathroomCount: opt.bathroomCount,
  }));

  const serializedRoom: RoomData = {
    id: targetOption.id,
    slug: targetOption.slug,
    title: targetOption.title,
    bedroomCount: targetOption.bedroomCount,
    bathroomCount: targetOption.bathroomCount,
    maxGuests: targetOption.maxGuests,
    basePricePerNight: Number(targetOption.basePricePerNight),
    weekendPricePerNight: targetOption.weekendPricePerNight
      ? Number(targetOption.weekendPricePerNight)
      : null,
    cleaningFee: Number(targetOption.cleaningFee),
    taxPercentage: Number(targetOption.taxPercentage),
    description: targetOption.description,
    summary: targetOption.summary,
    coverImage: targetOption.coverImage,
    bedConfiguration: targetOption.bedConfiguration,
    sizeSqFt: targetOption.sizeSqFt,
    highlights: targetOption.highlights,
    amenitiesList: targetOption.amenitiesList,
    images: targetOption.images.map((img) => ({
      id: img.id,
      url: img.url,
      caption: img.caption,
      category: img.category,
      isCover: img.isCover,
    })),
  };

  const serializedProperty: PropertyData = {
    id: property.id,
    name: property.name,
    slug: property.slug,
    headline: property.headline,
    description: property.description,
    address: property.address,
    city: property.city,
    state: property.state,
    checkInTime: property.checkInTime,
    checkOutTime: property.checkOutTime,
    houseRules: property.houseRules,
    cancellationPolicy: property.cancellationPolicy,
    images: property.images.map((img) => ({
      id: img.id,
      url: img.url,
      caption: img.caption,
      category: img.category,
      isCover: img.isCover,
    })),
  };

  const session = await auth();

  // Schema.org JSON-LD structured data for HotelRoom / Accommodation
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HotelRoom",
    name: targetOption.title,
    description: targetOption.description,
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: targetOption.maxGuests,
      unitText: "Guests",
    },
    bed: {
      "@type": "BedDetails",
      description: targetOption.bedConfiguration || "Luxury Beds",
    },
    numberOfRooms: targetOption.bedroomCount,
    numberOfBathroomsTotal: targetOption.bathroomCount,
    floorSize: {
      "@type": "QuantitativeValue",
      value: targetOption.sizeSqFt || 450,
      unitCode: "FTK",
    },
    offers: {
      "@type": "Offer",
      price: Number(targetOption.basePricePerNight),
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    containedInPlace: {
      "@type": "LodgingBusiness",
      name: property.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: property.address,
        addressLocality: property.city,
        addressRegion: property.state,
        addressCountry: property.country,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AccommodationDetailView
        property={serializedProperty}
        room={serializedRoom}
        allListingOptions={serializedAllOptions}
        session={session}
      />
    </>
  );
}

