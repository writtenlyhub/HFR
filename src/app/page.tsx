import { prisma } from "@/lib/prisma";
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

  // Calculate dynamic starting price from active configurations
  const startingPrice =
    property?.listingOptions.reduce((min, opt) => {
      const price = Number(opt.basePricePerNight);
      return price < min ? price : min;
    }, 8500) ?? 8500;

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFCFC]">
      <Header />
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
        <Accommodations options={property?.listingOptions ?? []} />
        <EstateStory
          amenities={property?.amenities ?? []}
          listingOptions={
            property?.listingOptions.map((o) => ({
              id: o.id,
              slug: o.slug,
              title: o.title,
              basePricePerNight: o.basePricePerNight,
            })) ?? []
          }
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
