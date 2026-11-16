import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
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
import { ChevronRight, Eye, ShieldAlert, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

interface PropertyPageProps {
  params: Promise<{ propertySlug: string }> | { propertySlug: string };
  searchParams?: Promise<{ preview?: string }> | { preview?: string };
}

export async function generateMetadata(
  props: PropertyPageProps
): Promise<Metadata> {
  const params = await props.params;
  const { propertySlug } = params;

  let property = await prisma.property.findUnique({
    where: { slug: propertySlug },
    select: {
      name: true,
      headline: true,
      description: true,
      city: true,
      seoTitle: true,
      seoDescription: true,
      canonicalUrl: true,
      ogTitle: true,
      ogDescription: true,
      ogImageUrl: true,
      isArchived: true,
      isActive: true,
    },
  });

  // Check for previous slug 308 redirect
  if (!property) {
    const redirected = await prisma.property.findFirst({
      where: { previousSlugs: { has: propertySlug } },
      select: { slug: true },
    });
    if (redirected) {
      return { title: "Redirecting... | DevStay" };
    }
    return {
      title: "Property Not Found | DevStay",
    };
  }

  const title =
    property.seoTitle ||
    `${property.name} | Luxury Haveli & Private Suites in ${property.city}`;
  const description =
    property.seoDescription ||
    property.description?.slice(0, 160) ||
    "An architectural sanctuary in Jaipur offering independently bookable private suites and exclusive villa buyouts.";

  const canonical = property.canonicalUrl || `/properties/${propertySlug}`;
  const ogTitle = property.ogTitle || title;
  const ogDescription = property.ogDescription || description;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: "website",
      locale: "en_IN",
      images: property.ogImageUrl ? [{ url: property.ogImageUrl }] : undefined,
    },
  };
}

export default async function PropertyOverviewPage(props: PropertyPageProps) {
  const params = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : {};
  const { propertySlug } = params;

  let property = await prisma.property.findUnique({
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

  // Check if this was a previous slug that requires a 308 permanent redirect
  if (!property) {
    const redirected = await prisma.property.findFirst({
      where: { previousSlugs: { has: propertySlug } },
      select: { slug: true },
    });
    if (redirected) {
      redirect(`/properties/${redirected.slug}`);
    }
    notFound();
  }

  // Archived properties are NEVER shown to public visitors
  if (property.isArchived) {
    notFound();
  }

  const session = await auth();
  const isStaff =
    session?.user &&
    (session.user.role === Role.ADMIN ||
      session.user.role === Role.PROPERTY_MANAGER);

  // Draft properties: accessible ONLY if requested by authenticated staff
  const isDraft = !property.isActive;
  if (isDraft && !isStaff) {
    notFound();
  }

  // Convert Decimals to JavaScript Numbers for safe Client Component serialization
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

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-neutral-900 font-sans selection:bg-amber-100 selection:text-amber-900 antialiased">
      {/* Sticky Staff Preview Bar for Draft Properties */}
      {isDraft && (
        <div className="sticky top-0 z-50 bg-amber-500 text-neutral-950 px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-neutral-950 animate-pulse" />
            <span>
              STAFF PREVIEW MODE — This property is currently a DRAFT and hidden from the public.
            </span>
          </div>
          <Link
            href={`/admin/properties/${property.id}`}
            className="px-3 py-1 bg-neutral-900 text-white rounded-lg text-[11px] font-semibold hover:bg-black transition"
          >
            Open in Editor ↗
          </Link>
        </div>
      )}

      {/* Global Header Navigation */}
      <Header />

      {/* Hero Visual Section */}
      <Hero startingPrice={startingPrice} />

      {/* Trust & Guarantee Layer */}
      <TrustLayer />

      {/* Curated Photography Gallery */}
      <PhotoGallery images={property.images} />

      {/* Accommodations & Configurations Section */}
      <Accommodations
        options={serializedListingOptions}
      />

      {/* Estate Sanctuary Story & Amenities */}
      <EstateStory
        amenities={property.amenities}
        listingOptions={serializedListingOptions}
      />

      {/* Guest Reviews Section */}
      <GuestReviews />

      {/* Location, Neighborhood & Map Section */}
      <LocationSection />

      {/* Meet Your Host Section */}
      <MeetHost />

      {/* House Rules & Operational Policies */}
      <HouseRules />

      {/* Direct Booking Inquiry Form */}
      <InquiryForm />

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
