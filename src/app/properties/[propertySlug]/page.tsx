import { notFound } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { TrustLayer } from "@/components/trust-layer";
import { PhotoGallery } from "@/components/photo-gallery";
import { Accommodations } from "@/components/accommodations";
import { EstateStory } from "@/components/estate-story";
import { GuestReviews } from "@/components/guest-reviews";
import { LocationSection } from "@/components/location-section";
import { MeetHost } from "@/components/meet-host";
import { HouseRules } from "@/components/house-rules";
import { InquiryForm } from "@/components/inquiry-form";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

interface PropertyPageProps {
  params: Promise<{ propertySlug: string }> | { propertySlug: string };
}

export async function generateMetadata(
  props: PropertyPageProps
): Promise<Metadata> {
  const params = await props.params;
  const { propertySlug } = params;

  const property = await prisma.property.findUnique({
    where: { slug: propertySlug },
    select: { name: true, headline: true, description: true, city: true },
  });

  if (!property) {
    return {
      title: "Property Not Found | Hotel Federation Rajasthan",
    };
  }

  const title = `${property.name} | Luxury Haveli & Private Suites in ${property.city}`;
  const description =
    property.description?.slice(0, 160) ||
    "An architectural sanctuary in Jaipur offering independently bookable private suites and exclusive villa buyouts.";

  return {
    title,
    description,
    alternates: {
      canonical: `/properties/${propertySlug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "en_IN",
    },
  };
}

export default async function PropertyOverviewPage(props: PropertyPageProps) {
  const params = await props.params;
  const { propertySlug } = params;

  const property = await prisma.property.findUnique({
    where: { slug: propertySlug },
    include: {
      inventoryGroups: true,
      listingOptions: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
      amenities: {
        where: { isFeatured: true },
      },
      images: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!property) {
    notFound();
  }

  const serializedListingOptions = property.listingOptions.map((opt) => ({
    ...opt,
    basePricePerNight: Number(opt.basePricePerNight),
    weekendPricePerNight: opt.weekendPricePerNight
      ? Number(opt.weekendPricePerNight)
      : null,
    cleaningFee: Number(opt.cleaningFee),
    taxPercentage: Number(opt.taxPercentage),
  }));

  const startingPrice =
    serializedListingOptions.reduce((min, opt) => {
      const price = opt.basePricePerNight;
      return price < min ? price : min;
    }, 8500) ?? 8500;

  const session = await auth();

  // JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: property.name,
    description: property.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address,
      addressLocality: property.city,
      addressRegion: property.state,
      postalCode: property.postalCode,
      addressCountry: property.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: property.latitude,
      longitude: property.longitude,
    },
    priceRange: "₹8,500 - ₹28,500",
    checkinTime: property.checkInTime,
    checkoutTime: property.checkOutTime,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFCFC]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header session={session} />

      {/* Breadcrumb Bar */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-12 pt-4">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-neutral-500 font-medium"
        >
          <Link href="/" className="hover:text-black transition-colors">
            Home
          </Link>
          <ChevronRight size={13} className="text-neutral-400" />
          <span className="text-neutral-900 font-bold">{property.name}</span>
        </nav>
      </div>

      <main className="overflow-hidden flex-1">
        <Hero
          startingPrice={startingPrice}
          headline={property.name.toUpperCase()}
          description={
            property.description ??
            "An architectural sanctuary in Jaipur offering independently bookable private suites and exclusive villa buyouts."
          }
        />
        <TrustLayer />
        <PhotoGallery images={property.images ?? []} />
        <Accommodations options={serializedListingOptions} />
        <EstateStory
          amenities={property.amenities ?? []}
          listingOptions={serializedListingOptions.map((o) => ({
            id: o.id,
            slug: o.slug,
            title: o.title,
            basePricePerNight: o.basePricePerNight,
            maxGuests: o.maxGuests,
          }))}
        />
        <GuestReviews />
        <LocationSection />
        <MeetHost />
        <HouseRules />
        <InquiryForm />
      </main>
      <Footer />
    </div>
  );
}

