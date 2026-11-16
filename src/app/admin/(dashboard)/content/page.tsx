import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  seedInitialCmsDataIfEmpty,
  getAllCmsSectionsOverview,
  getSectionContent,
  HomepageHeroContent,
  FeaturedAccommodationsContent,
  HomepageAboutContent,
  ContactInfoContent,
  SocialMediaContent,
  GlobalSeoContent,
  getTestimonials,
  getFaqs,
  getExperiences,
} from "@/lib/content/content-service";
import { ContentManagementView } from "./content-management-view";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/admin/login?callbackUrl=/admin/content");
  }

  // Seed default website copy if this is first run
  await seedInitialCmsDataIfEmpty(session.user.email || "admin@devstays.com");

  // Fetch overview & all section states
  const [
    overview,
    heroLive,
    heroPreview,
    featuredLive,
    featuredPreview,
    aboutLive,
    aboutPreview,
    contactLive,
    contactPreview,
    socialLive,
    socialPreview,
    seoLive,
    seoPreview,
    testimonials,
    faqs,
    experiences,
    properties,
  ] = await Promise.all([
    getAllCmsSectionsOverview(),
    getSectionContent<HomepageHeroContent>("homepage_hero", { preview: false }),
    getSectionContent<HomepageHeroContent>("homepage_hero", { preview: true }),
    getSectionContent<FeaturedAccommodationsContent>("featured_accommodations", { preview: false }),
    getSectionContent<FeaturedAccommodationsContent>("featured_accommodations", { preview: true }),
    getSectionContent<HomepageAboutContent>("homepage_about", { preview: false }),
    getSectionContent<HomepageAboutContent>("homepage_about", { preview: true }),
    getSectionContent<ContactInfoContent>("contact_info", { preview: false }),
    getSectionContent<ContactInfoContent>("contact_info", { preview: true }),
    getSectionContent<SocialMediaContent>("social_media", { preview: false }),
    getSectionContent<SocialMediaContent>("social_media", { preview: true }),
    getSectionContent<GlobalSeoContent>("global_seo", { preview: false }),
    getSectionContent<GlobalSeoContent>("global_seo", { preview: true }),
    getTestimonials({ includeUnpublished: true }),
    getFaqs({ includeUnpublished: true }),
    getExperiences({ includeUnpublished: true }),
    prisma.property.findMany({
      where: { isArchived: false },
      select: { id: true, slug: true, name: true, headline: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ContentManagementView
        overview={overview}
        initialHero={{
          live: heroLive.content,
          preview: heroPreview.content,
          meta: {
            sectionKey: "homepage_hero",
            isPublished: heroLive.isPublished,
            hasDraft: heroPreview.hasDraft,
            lastPublishedAt: heroLive.lastPublishedAt,
            lastEditedBy: heroPreview.lastEditedBy,
            updatedAt: heroPreview.updatedAt,
          },
        }}
        initialFeatured={{
          live: featuredLive.content,
          preview: featuredPreview.content,
          meta: {
            sectionKey: "featured_accommodations",
            isPublished: featuredLive.isPublished,
            hasDraft: featuredPreview.hasDraft,
            lastPublishedAt: featuredLive.lastPublishedAt,
            lastEditedBy: featuredPreview.lastEditedBy,
            updatedAt: featuredPreview.updatedAt,
          },
        }}
        initialAbout={{
          live: aboutLive.content,
          preview: aboutPreview.content,
          meta: {
            sectionKey: "homepage_about",
            isPublished: aboutLive.isPublished,
            hasDraft: aboutPreview.hasDraft,
            lastPublishedAt: aboutLive.lastPublishedAt,
            lastEditedBy: aboutPreview.lastEditedBy,
            updatedAt: aboutPreview.updatedAt,
          },
        }}
        initialContact={{
          live: contactLive.content,
          preview: contactPreview.content,
          meta: {
            sectionKey: "contact_info",
            isPublished: contactLive.isPublished,
            hasDraft: contactPreview.hasDraft,
            lastPublishedAt: contactLive.lastPublishedAt,
            lastEditedBy: contactPreview.lastEditedBy,
            updatedAt: contactPreview.updatedAt,
          },
        }}
        initialSocial={{
          live: socialLive.content,
          preview: socialPreview.content,
          meta: {
            sectionKey: "social_media",
            isPublished: socialLive.isPublished,
            hasDraft: socialPreview.hasDraft,
            lastPublishedAt: socialLive.lastPublishedAt,
            lastEditedBy: socialPreview.lastEditedBy,
            updatedAt: socialPreview.updatedAt,
          },
        }}
        initialSeo={{
          live: seoLive.content,
          preview: seoPreview.content,
          meta: {
            sectionKey: "global_seo",
            isPublished: seoLive.isPublished,
            hasDraft: seoPreview.hasDraft,
            lastPublishedAt: seoLive.lastPublishedAt,
            lastEditedBy: seoPreview.lastEditedBy,
            updatedAt: seoPreview.updatedAt,
          },
        }}
        initialTestimonials={testimonials.map((t) => ({
          ...t,
          location: t.location,
          stayType: t.stayType,
          guestImageUrl: t.guestImageUrl,
        }))}
        initialFaqs={faqs.map((f) => ({
          ...f,
          category: f.category,
        }))}
        initialExperiences={experiences.map((e) => ({
          ...e,
          subtitle: e.subtitle,
          imageUrl: e.imageUrl,
          iconName: e.iconName,
          category: e.category,
        }))}
        properties={properties}
      />
    </div>
  );
}
