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

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 1. Fetch live property data from PostgreSQL via Prisma
  const property = await prisma.property.findUnique({
    where: { slug: "dev-stays-jaipur" },
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

  // Serialize listingOptions to plain objects (converting Prisma Decimals to JavaScript numbers)
  // so they can be safely passed across the Server Component -> Client Component boundary.
  const serializedListingOptions =
    property?.listingOptions.map((opt) => ({
      ...opt,
      basePricePerNight: Number(opt.basePricePerNight),
      weekendPricePerNight: opt.weekendPricePerNight ? Number(opt.weekendPricePerNight) : null,
      cleaningFee: Number(opt.cleaningFee),
      taxPercentage: Number(opt.taxPercentage),
    })) ?? [];

  // Calculate dynamic starting price from active configurations
  const startingPrice =
    serializedListingOptions.reduce((min, opt) => {
      const price = opt.basePricePerNight;
      return price < min ? price : min;
    }, 8500) ?? 8500;

  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFCFC]">
      <Header session={session} />
      <main className="overflow-hidden flex-1">
        <Hero
          startingPrice={startingPrice}
          headline={property?.name?.toUpperCase() ?? "DEV STAYS JAIPUR"}
          description={
            property?.description ??
            "An architectural sanctuary in Jaipur offering independently bookable private suites and exclusive villa buyouts."
          }
        />
        <TrustLayer />
        <PhotoGallery images={property?.images ?? []} />
        <Accommodations options={serializedListingOptions} />
        <EstateStory
          amenities={property?.amenities ?? []}
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
