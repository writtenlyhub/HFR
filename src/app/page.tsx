import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { TrustLayer } from "@/components/trust-layer";
import { PhotoGallery } from "@/components/photo-gallery";
import { Accommodations } from "@/components/accommodations";
import { EstateStory } from "@/components/estate-story";
import { GuestReviews } from "@/components/guest-reviews";
import { InstagramFeed } from "@/components/instagram-feed";
import { LocationSection } from "@/components/location-section";
import { MeetHost } from "@/components/meet-host";
import { HouseRules } from "@/components/house-rules";
import { InquiryForm } from "@/components/inquiry-form";
import { Footer } from "@/components/footer";
import { getInstagramFeed } from "@/lib/instagram/provider";
import {
  getSectionContent,
  HomepageHeroContent,
  FeaturedAccommodationsContent,
  HomepageAboutContent,
  ContactInfoContent,
  SocialMediaContent,
  getTestimonials,
  getFaqs,
  getExperiences,
} from "@/lib/content/content-service";

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

  // 2. Fetch live published CMS content sections
  const [
    heroCms,
    featuredCms,
    aboutCms,
    contactCms,
    socialCms,
    testimonials,
    faqs,
    experiences,
  ] = await Promise.all([
    getSectionContent<HomepageHeroContent>("homepage_hero"),
    getSectionContent<FeaturedAccommodationsContent>("featured_accommodations"),
    getSectionContent<HomepageAboutContent>("homepage_about"),
    getSectionContent<ContactInfoContent>("contact_info"),
    getSectionContent<SocialMediaContent>("social_media"),
    getTestimonials(),
    getFaqs(),
    getExperiences(),
  ]);

  // Serialize listingOptions to plain objects (converting Prisma Decimals to JavaScript numbers)
  // so they can be safely passed across the Server Component -> Client Component boundary.
  const allListingOptions =
    property?.listingOptions.map((opt) => ({
      ...opt,
      basePricePerNight: Number(opt.basePricePerNight),
      weekendPricePerNight: opt.weekendPricePerNight ? Number(opt.weekendPricePerNight) : null,
      cleaningFee: Number(opt.cleaningFee),
      taxPercentage: Number(opt.taxPercentage),
    })) ?? [];

  // Filter or limit by CMS configuration if defined
  const maxListings = featuredCms.content.maxListings || 3;
  const serializedListingOptions = allListingOptions.slice(0, maxListings);

  // Calculate dynamic starting price from active configurations or CMS override
  const startingPrice =
    heroCms.content.startingPrice ||
    serializedListingOptions.reduce((min, opt) => {
      const price = opt.basePricePerNight;
      return price < min ? price : min;
    }, 8500) ||
    8500;

  const session = await auth();
  const instagramFeed = await getInstagramFeed();

  return (
    <div className="min-h-screen flex flex-col bg-[#FCFCFC]">
      <Header session={session} />
      <main className="overflow-hidden flex-1">
        <Hero
          startingPrice={startingPrice}
          headline={heroCms.content.headline}
          description={heroCms.content.description}
          primaryButtonText={heroCms.content.primaryButtonText}
          primaryButtonLink={heroCms.content.primaryButtonLink}
          secondaryButtonText={heroCms.content.secondaryButtonText}
          secondaryButtonLink={heroCms.content.secondaryButtonLink}
          videoUrl={heroCms.content.videoUrl}
          posterImageUrl={heroCms.content.posterImageUrl}
        />
        <TrustLayer />
        <PhotoGallery images={property?.images ?? []} />
        <Accommodations
          options={serializedListingOptions}
          cmsContent={{
            badge: featuredCms.content.badge,
            headline: featuredCms.content.headline,
            subtitle: featuredCms.content.subtitle,
          }}
        />
        <EstateStory
          amenities={property?.amenities ?? []}
          listingOptions={allListingOptions.map((o) => ({
            id: o.id,
            slug: o.slug,
            title: o.title,
            basePricePerNight: o.basePricePerNight,
            maxGuests: o.maxGuests,
          }))}
          cmsContent={{
            badge: aboutCms.content.badge,
            headline: aboutCms.content.headline,
            description: aboutCms.content.description,
            brandStory: aboutCms.content.brandStory,
            highlights: aboutCms.content.highlights,
          }}
        />
        <InstagramFeed initialData={instagramFeed} />
        <GuestReviews testimonials={testimonials} />
        <LocationSection experiences={experiences} />
        <MeetHost />
        <HouseRules faqs={faqs} />
        <InquiryForm />
      </main>
      <Footer
        contactInfo={contactCms.content}
        socialMedia={socialCms.content}
      />
    </div>
  );
}
