import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful fallback for non-Next/test contexts where static generation store is not active
  }
}

// ============================================================
// Default Section Data Structures
// ============================================================

export interface HomepageHeroContent {
  headline: string;
  description: string;
  startingPrice: number;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
  videoUrl: string;
  posterImageUrl: string;
}

export interface FeaturedAccommodationsContent {
  headline: string;
  subtitle: string;
  badge: string;
  maxListings: number;
  selectedPropertyIds: string[];
}

export interface HomepageAboutContent {
  badge: string;
  headline: string;
  description: string;
  brandStory: string;
  highlights: Array<{
    title: string;
    detail: string;
    iconName?: string;
  }>;
  host: {
    name: string;
    role: string;
    superhostBadge: string;
    reviewsCount: number;
    ratingScore: string;
    bio: string;
    imageUrl: string;
  };
}

export interface ContactInfoContent {
  businessPhone: string;
  contactEmail: string;
  physicalAddress: string;
  googleMapsUrl: string;
  whatsappUrl: string;
}

export interface SocialMediaContent {
  instagramUrl: string;
  facebookUrl: string;
  twitterUrl?: string;
  youtubeUrl?: string;
}

export interface GlobalSeoContent {
  siteTitle: string;
  defaultMetaDescription: string;
  defaultOgImageUrl: string;
  ogTitle?: string;
  ogDescription?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
}

export const DEFAULT_CMS_CONTENT = {
  homepage_hero: {
    headline: "YOUR OWN PRIVATE 3BHK VILLA IN CENTRAL JAIPUR",
    description:
      "A private 3BHK villa handcrafted with Rajasthani textiles, crochet details, and curated decor. Your peaceful sanctuary in Raja Park — no shared spaces, no other guests.",
    startingPrice: 8500,
    primaryButtonText: "Explore Accommodations",
    primaryButtonLink: "#accommodations",
    secondaryButtonText: "Check Availability",
    secondaryButtonLink: "#sidebar-booking-card",
    videoUrl: "/videos/hero-video.mp4",
    posterImageUrl: "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
  } satisfies HomepageHeroContent,

  featured_accommodations: {
    badge: "TAILORED CONFIGURATIONS",
    headline: "CHOOSE YOUR STAY AT DEV STAYS",
    subtitle: "Three thoughtfully designed accommodation options for every kind of stay.",
    maxListings: 3,
    selectedPropertyIds: [],
  } satisfies FeaturedAccommodationsContent,

  homepage_about: {
    badge: "Private Estate · Raja Park, Jaipur",
    headline: "Your Own Private 3BHK Sanctuary",
    description:
      "An entire private villa in the heart of Raja Park reserved exclusively for your group — no shared spaces, no other guests. Handcrafted with warm Rajasthani textiles, crochet accents, indoor plants, and antique character.",
    brandStory:
      "Dev Stay represents modern Rajasthani heritage living, offering complete tranquility right in the vibrant core of Raja Park. Each corner of our home has been individually curated with sustainable handicrafts, local artistry, and genuine warm hospitality.",
    highlights: [
      {
        title: "The Villa",
        detail:
          "Three king bedrooms, private attached bathrooms (24/7 hot water), AC & spacious family living room.",
        iconName: "Bed",
      },
      {
        title: "Kitchen & Dining",
        detail:
          "Full kitchen with fridge, RO water, gas stove, microwave & an on-site local food ordering menu.",
        iconName: "UtensilsCrossed",
      },
      {
        title: "Veranda & Parking",
        detail:
          "Street-facing tree-shaded veranda for morning chai + dedicated gated parking for 3–4 cars.",
        iconName: "Car",
      },
      {
        title: "Events & Gatherings",
        detail:
          "Priced for 6 overnight guests; welcomes get-togethers, offsites & celebrations for up to 15.",
        iconName: "PartyPopper",
      },
    ],
    host: {
      name: "Aparna",
      role: "Hospitality & Crochet Artist",
      superhostBadge: "Superhost · 12 Years Hosting",
      reviewsCount: 18,
      ratingScore: "5.0★",
      bio: "Born and raised in Jaipur, Aparna is passionate about textile crafts, home preservation, and ensuring every guest experiences the heartfelt warmth of a true Rajasthani welcome.",
      imageUrl: "/images/host/host-aparna.avif",
    },
  } satisfies HomepageAboutContent,

  contact_info: {
    businessPhone: "+91 141 289 4400",
    contactEmail: "concierge@devstaysjaipur.com",
    physicalAddress: "Raja Park, Central Jaipur, Rajasthan 302004, India",
    googleMapsUrl: "https://maps.google.com/?q=Raja+Park+Jaipur",
    whatsappUrl: "https://wa.me/911412894400",
  } satisfies ContactInfoContent,

  social_media: {
    instagramUrl: "https://instagram.com/devstays.jaipur",
    facebookUrl: "https://facebook.com/devstaysjaipur",
    twitterUrl: "https://twitter.com/devstaysjaipur",
    youtubeUrl: "https://youtube.com/@devstaysjaipur",
  } satisfies SocialMediaContent,

  global_seo: {
    siteTitle: "Dev Stays Jaipur · Private 3BHK Villa in Raja Park | Hotel Federation Rajasthan",
    defaultMetaDescription:
      "Your own private 3BHK villa in Central Jaipur (Raja Park) — 3 king bedrooms, 3 bathrooms, large living room, full kitchen, dining area, veranda & parking for 3-4 cars. Handcrafted with Rajasthani textiles & crochet details.",
    defaultOgImageUrl: "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
    ogTitle: "Dev Stays Jaipur · Private 3BHK Villa in Raja Park",
    ogDescription: "Handcrafted 3BHK villa in central Jaipur for families and group stays.",
    robotsIndex: true,
    robotsFollow: true,
  } satisfies GlobalSeoContent,
};

// ============================================================
// Section Queries & Cache Revalidation
// ============================================================

export async function getSectionContent<T = Record<string, unknown>>(
  sectionKey: keyof typeof DEFAULT_CMS_CONTENT,
  options: { preview?: boolean } = {}
): Promise<{
  content: T;
  isPublished: boolean;
  hasDraft: boolean;
  lastPublishedAt: Date | null;
  lastEditedBy: string | null;
  updatedAt: Date;
}> {
  const fallback = DEFAULT_CMS_CONTENT[sectionKey] as unknown as T;

  const record = await prisma.siteContent.findUnique({
    where: { sectionKey },
  });

  if (!record) {
    return {
      content: fallback,
      isPublished: true,
      hasDraft: false,
      lastPublishedAt: null,
      lastEditedBy: null,
      updatedAt: new Date(),
    };
  }

  // Preview Mode: return draft if available, otherwise live content
  if (options.preview && record.hasDraft && record.draftContent) {
    const draftMerged = {
      ...fallback,
      ...(record.draftContent as Record<string, unknown>),
    } as T;
    return {
      content: draftMerged,
      isPublished: record.isPublished,
      hasDraft: true,
      lastPublishedAt: record.lastPublishedAt,
      lastEditedBy: record.lastEditedBy,
      updatedAt: record.updatedAt,
    };
  }

  // Published Live Mode
  if (!record.isPublished && !options.preview) {
    return {
      content: fallback,
      isPublished: false,
      hasDraft: record.hasDraft,
      lastPublishedAt: record.lastPublishedAt,
      lastEditedBy: record.lastEditedBy,
      updatedAt: record.updatedAt,
    };
  }

  const liveMerged = {
    ...fallback,
    ...(record.content as Record<string, unknown>),
  } as T;

  return {
    content: liveMerged,
    isPublished: record.isPublished,
    hasDraft: record.hasDraft,
    lastPublishedAt: record.lastPublishedAt,
    lastEditedBy: record.lastEditedBy,
    updatedAt: record.updatedAt,
  };
}

export async function getAllCmsSectionsOverview() {
  const records = await prisma.siteContent.findMany();
  const recordMap = new Map(records.map((r) => [r.sectionKey, r]));

  const keys: Array<keyof typeof DEFAULT_CMS_CONTENT> = [
    "homepage_hero",
    "featured_accommodations",
    "homepage_about",
    "contact_info",
    "social_media",
    "global_seo",
  ];

  const sections = keys.map((key) => {
    const found = recordMap.get(key);
    return {
      sectionKey: key,
      isPublished: found ? found.isPublished : true,
      hasDraft: found ? found.hasDraft : false,
      lastPublishedAt: found?.lastPublishedAt || null,
      lastEditedBy: found?.lastEditedBy || null,
      updatedAt: found?.updatedAt || new Date(),
    };
  });

  const [testimonialsCount, faqsCount, experiencesCount] = await Promise.all([
    prisma.testimonial.count(),
    prisma.faqItem.count(),
    prisma.experienceItem.count(),
  ]);

  return {
    sections,
    testimonialsCount,
    faqsCount,
    experiencesCount,
  };
}

// ============================================================
// Section Draft / Publish Mutations
// ============================================================

export async function saveSectionDraft(
  sectionKey: string,
  draftData: Record<string, unknown>,
  staffEmail: string
) {
  const existing = await prisma.siteContent.findUnique({
    where: { sectionKey },
  });

  const fallback =
    (DEFAULT_CMS_CONTENT as Record<string, unknown>)[sectionKey] || {};

  const initialContent = (existing?.content ?? (fallback as Prisma.InputJsonValue)) as Prisma.InputJsonValue;

  const updated = await prisma.siteContent.upsert({
    where: { sectionKey },
    create: {
      sectionKey,
      content: initialContent,
      draftContent: draftData as Prisma.InputJsonValue,
      hasDraft: true,
      isPublished: existing ? existing.isPublished : true,
      lastEditedBy: staffEmail,
    },
    update: {
      draftContent: draftData as Prisma.InputJsonValue,
      hasDraft: true,
      lastEditedBy: staffEmail,
    },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "SITE_CONTENT_DRAFT_SAVED",
      entityType: "SiteContent",
      entityId: updated.id,
      metadata: {
        sectionKey,
        draftData: JSON.parse(JSON.stringify(draftData)),
      },
    },
  });

  return updated;
}

export async function publishSection(sectionKey: string, staffEmail: string) {
  const record = await prisma.siteContent.findUnique({
    where: { sectionKey },
  });

  const fallback =
    (DEFAULT_CMS_CONTENT as Record<string, unknown>)[sectionKey] || {};

  // If there's a draft, make it live; otherwise publish whatever current content is
  const liveContent = record?.hasDraft && record?.draftContent
    ? record.draftContent
    : record?.content || (fallback as Prisma.InputJsonValue);

  const updated = await prisma.siteContent.upsert({
    where: { sectionKey },
    create: {
      sectionKey,
      content: liveContent,
      draftContent: Prisma.JsonNull,
      hasDraft: false,
      isPublished: true,
      lastPublishedAt: new Date(),
      lastEditedBy: staffEmail,
    },
    update: {
      content: liveContent,
      draftContent: Prisma.JsonNull,
      hasDraft: false,
      isPublished: true,
      lastPublishedAt: new Date(),
      lastEditedBy: staffEmail,
    },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "SITE_CONTENT_PUBLISHED",
      entityType: "SiteContent",
      entityId: updated.id,
      metadata: {
        sectionKey,
        publishedContent: JSON.parse(JSON.stringify(liveContent)),
      },
    },
  });

  // Revalidate Next.js cache so public visitors immediately see updates
  safeRevalidatePath("/");
  safeRevalidatePath("/admin/content");

  return updated;
}

export async function unpublishSection(sectionKey: string, staffEmail: string) {
  const updated = await prisma.siteContent.update({
    where: { sectionKey },
    data: {
      isPublished: false,
      lastEditedBy: staffEmail,
    },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "SITE_CONTENT_UNPUBLISHED",
      entityType: "SiteContent",
      entityId: updated.id,
      metadata: { sectionKey },
    },
  });

  safeRevalidatePath("/");
  safeRevalidatePath("/admin/content");

  return updated;
}

export async function discardSectionDraft(sectionKey: string, staffEmail: string) {
  const updated = await prisma.siteContent.update({
    where: { sectionKey },
    data: {
      draftContent: Prisma.JsonNull,
      hasDraft: false,
      lastEditedBy: staffEmail,
    },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "SITE_CONTENT_DRAFT_DISCARDED",
      entityType: "SiteContent",
      entityId: updated.id,
      metadata: { sectionKey },
    },
  });

  return updated;
}

// ============================================================
// Testimonials (Guest Reviews) Management
// ============================================================

export async function getTestimonials(options: { includeUnpublished?: boolean } = {}) {
  return await prisma.testimonial.findMany({
    where: options.includeUnpublished ? undefined : { isPublished: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createTestimonial(
  data: {
    guestName: string;
    location?: string;
    stayType?: string;
    reviewText: string;
    rating?: number;
    guestImageUrl?: string;
    sortOrder?: number;
  },
  staffEmail: string
) {
  const count = await prisma.testimonial.count();
  const created = await prisma.testimonial.create({
    data: {
      guestName: data.guestName.trim(),
      location: data.location?.trim() || null,
      stayType: data.stayType?.trim() || "Verified Guest Stay",
      reviewText: data.reviewText.trim(),
      rating: Math.min(5, Math.max(1, data.rating ?? 5)),
      guestImageUrl: data.guestImageUrl?.trim() || null,
      sortOrder: data.sortOrder ?? count,
      isPublished: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "TESTIMONIAL_CREATED",
      entityType: "Testimonial",
      entityId: created.id,
      metadata: { guestName: created.guestName, rating: created.rating },
    },
  });

  safeRevalidatePath("/");
  return created;
}

export async function updateTestimonial(
  id: string,
  data: {
    guestName?: string;
    location?: string;
    stayType?: string;
    reviewText?: string;
    rating?: number;
    guestImageUrl?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
  staffEmail: string
) {
  const updated = await prisma.testimonial.update({
    where: { id },
    data: {
      ...(data.guestName !== undefined && { guestName: data.guestName.trim() }),
      ...(data.location !== undefined && { location: data.location.trim() || null }),
      ...(data.stayType !== undefined && { stayType: data.stayType.trim() || null }),
      ...(data.reviewText !== undefined && { reviewText: data.reviewText.trim() }),
      ...(data.rating !== undefined && {
        rating: Math.min(5, Math.max(1, data.rating)),
      }),
      ...(data.guestImageUrl !== undefined && {
        guestImageUrl: data.guestImageUrl.trim() || null,
      }),
      ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "TESTIMONIAL_UPDATED",
      entityType: "Testimonial",
      entityId: updated.id,
      metadata: { guestName: updated.guestName, changes: data },
    },
  });

  safeRevalidatePath("/");
  return updated;
}

export async function deleteTestimonial(id: string, staffEmail: string) {
  const deleted = await prisma.testimonial.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "TESTIMONIAL_DELETED",
      entityType: "Testimonial",
      entityId: id,
      metadata: { guestName: deleted.guestName },
    },
  });

  safeRevalidatePath("/");
  return deleted;
}

export async function reorderTestimonials(ids: string[], staffEmail: string) {
  const updates = ids.map((id, index) =>
    prisma.testimonial.update({
      where: { id },
      data: { sortOrder: index },
    })
  );

  await prisma.$transaction(updates);

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "TESTIMONIALS_REORDERED",
      entityType: "Testimonial",
      entityId: "batch",
      metadata: { newOrder: ids },
    },
  });

  safeRevalidatePath("/");
  return { success: true };
}

// ============================================================
// FAQs Management
// ============================================================

export async function getFaqs(options: { includeUnpublished?: boolean } = {}) {
  return await prisma.faqItem.findMany({
    where: options.includeUnpublished ? undefined : { isPublished: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createFaq(
  data: {
    question: string;
    answer: string;
    category?: string;
    sortOrder?: number;
  },
  staffEmail: string
) {
  const count = await prisma.faqItem.count();
  const created = await prisma.faqItem.create({
    data: {
      question: data.question.trim(),
      answer: data.answer.trim(),
      category: data.category?.trim() || "General",
      sortOrder: data.sortOrder ?? count,
      isPublished: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "FAQ_CREATED",
      entityType: "FaqItem",
      entityId: created.id,
      metadata: { question: created.question },
    },
  });

  safeRevalidatePath("/");
  return created;
}

export async function updateFaq(
  id: string,
  data: {
    question?: string;
    answer?: string;
    category?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
  staffEmail: string
) {
  const updated = await prisma.faqItem.update({
    where: { id },
    data: {
      ...(data.question !== undefined && { question: data.question.trim() }),
      ...(data.answer !== undefined && { answer: data.answer.trim() }),
      ...(data.category !== undefined && { category: data.category.trim() }),
      ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "FAQ_UPDATED",
      entityType: "FaqItem",
      entityId: updated.id,
      metadata: { question: updated.question, changes: data },
    },
  });

  safeRevalidatePath("/");
  return updated;
}

export async function deleteFaq(id: string, staffEmail: string) {
  const deleted = await prisma.faqItem.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "FAQ_DELETED",
      entityType: "FaqItem",
      entityId: id,
      metadata: { question: deleted.question },
    },
  });

  safeRevalidatePath("/");
  return deleted;
}

export async function reorderFaqs(ids: string[], staffEmail: string) {
  const updates = ids.map((id, index) =>
    prisma.faqItem.update({
      where: { id },
      data: { sortOrder: index },
    })
  );

  await prisma.$transaction(updates);

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "FAQS_REORDERED",
      entityType: "FaqItem",
      entityId: "batch",
      metadata: { newOrder: ids },
    },
  });

  safeRevalidatePath("/");
  return { success: true };
}

// ============================================================
// Experiences & Local Landmarks Management
// ============================================================

export async function getExperiences(options: { includeUnpublished?: boolean } = {}) {
  return await prisma.experienceItem.findMany({
    where: options.includeUnpublished ? undefined : { isPublished: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createExperience(
  data: {
    title: string;
    subtitle?: string;
    description: string;
    imageUrl?: string;
    iconName?: string;
    category?: string;
    sortOrder?: number;
  },
  staffEmail: string
) {
  const count = await prisma.experienceItem.count();
  const created = await prisma.experienceItem.create({
    data: {
      title: data.title.trim(),
      subtitle: data.subtitle?.trim() || null,
      description: data.description.trim(),
      imageUrl: data.imageUrl?.trim() || null,
      iconName: data.iconName?.trim() || "pin_drop",
      category: data.category?.trim() || "Neighborhood",
      sortOrder: data.sortOrder ?? count,
      isPublished: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "EXPERIENCE_CREATED",
      entityType: "ExperienceItem",
      entityId: created.id,
      metadata: { title: created.title },
    },
  });

  safeRevalidatePath("/");
  return created;
}

export async function updateExperience(
  id: string,
  data: {
    title?: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    iconName?: string;
    category?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
  staffEmail: string
) {
  const updated = await prisma.experienceItem.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.subtitle !== undefined && { subtitle: data.subtitle.trim() || null }),
      ...(data.description !== undefined && { description: data.description.trim() }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl.trim() || null }),
      ...(data.iconName !== undefined && { iconName: data.iconName.trim() || null }),
      ...(data.category !== undefined && { category: data.category.trim() }),
      ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "EXPERIENCE_UPDATED",
      entityType: "ExperienceItem",
      entityId: updated.id,
      metadata: { title: updated.title, changes: data },
    },
  });

  safeRevalidatePath("/");
  return updated;
}

export async function deleteExperience(id: string, staffEmail: string) {
  const deleted = await prisma.experienceItem.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "EXPERIENCE_DELETED",
      entityType: "ExperienceItem",
      entityId: id,
      metadata: { title: deleted.title },
    },
  });

  safeRevalidatePath("/");
  return deleted;
}

export async function reorderExperiences(ids: string[], staffEmail: string) {
  const updates = ids.map((id, index) =>
    prisma.experienceItem.update({
      where: { id },
      data: { sortOrder: index },
    })
  );

  await prisma.$transaction(updates);

  await prisma.auditLog.create({
    data: {
      userEmail: staffEmail,
      action: "EXPERIENCES_REORDERED",
      entityType: "ExperienceItem",
      entityId: "batch",
      metadata: { newOrder: ids },
    },
  });

  safeRevalidatePath("/");
  return { success: true };
}

// ============================================================
// Seed Existing Website Content If DB Is Empty
// ============================================================

export async function seedInitialCmsDataIfEmpty(staffEmail = "system@devstays.com") {
  // 1. Seed SiteContent sections
  for (const [key, value] of Object.entries(DEFAULT_CMS_CONTENT)) {
    const exists = await prisma.siteContent.findUnique({
      where: { sectionKey: key },
    });
    if (!exists) {
      await prisma.siteContent.create({
        data: {
          sectionKey: key,
          content: value as Prisma.InputJsonValue,
          isPublished: true,
          hasDraft: false,
          lastPublishedAt: new Date(),
          lastEditedBy: staffEmail,
        },
      });
    }
  }

  // 2. Seed Testimonials if empty
  const testimonialCount = await prisma.testimonial.count();
  if (testimonialCount === 0) {
    const initialReviews = [
      {
        guestName: "Sumit",
        location: "Family & Friends Stay",
        stayType: "Verified Guest Stay",
        rating: 5,
        reviewText:
          "The stay was very good. It is located in a place from where we have lots of options for food. Rooms were clean. Host was responsive over phone and the caretaker also active. Very good for family and friends.",
        sortOrder: 0,
      },
      {
        guestName: "Surabhi",
        location: "Leisure Stay · Vibrant Raja Park",
        stayType: "Verified Guest Stay",
        rating: 5,
        reviewText:
          "A lovely, tastefully decorated property that offers great value for money. The host was very responsive and accommodating, making our stay all the more comfortable. The location is lively and vibrant, yet the property itself remains peaceful and relaxing.",
        sortOrder: 1,
      },
      {
        guestName: "Kartik",
        location: "Central Jaipur · Near Birla Mandir",
        stayType: "Verified Guest Stay",
        rating: 5,
        reviewText:
          "Listing is located in central Jaipur very close to Birla Mandir. Everything is as mentioned in the description. Definitely a 5 star.",
        sortOrder: 2,
      },
      {
        guestName: "Akanksha",
        location: "Group Trip · Fort Worth, Texas",
        stayType: "Verified Guest Stay",
        rating: 5,
        reviewText:
          "Wonderful place to stay, quite spacious! And lots of shops nearby. Location is central.",
        sortOrder: 3,
      },
      {
        guestName: "Sarthak",
        location: "Group Stay · Market Accessibility",
        stayType: "Verified Guest Stay",
        rating: 5,
        reviewText:
          "The villa was very good, liked the amenities. The cleanliness, staff support, market accessibility and the experience staying that was excellent, I will definitely consider this villa again when I visit Jaipur in future.",
        sortOrder: 4,
      },
    ];

    for (const r of initialReviews) {
      await prisma.testimonial.create({ data: { ...r, isPublished: true } });
    }
  }

  // 3. Seed FAQs if empty
  const faqCount = await prisma.faqItem.count();
  if (faqCount === 0) {
    const initialFaqs = [
      {
        question: "What are the check-in and checkout timings?",
        answer:
          "Check-in is from 14:00 (2:00 PM) onwards, and checkout is strictly before 11:00 AM. Early check-in or late checkout can be accommodated based on calendar availability with prior coordination with our concierge.",
        category: "House Rules",
        sortOrder: 0,
      },
      {
        question: "Can we host family celebrations, get-togethers, or corporate offsites?",
        answer:
          "Yes! Birthday celebrations, anniversaries, family reunions, and executive team retreats are warmly welcome. While the villa is priced for 6 overnight guests, we can host daytime gatherings for up to 15 guests with extra mattresses and arrangements.",
        category: "Events & Capacity",
        sortOrder: 1,
      },
      {
        question: "Is the property pet-friendly?",
        answer:
          "Yes, Dev Stay is completely pet-friendly! We love hosting fur babies. We just request that pets are kept supervised in the veranda and common areas.",
        category: "Amenities & Pets",
        sortOrder: 2,
      },
      {
        question: "Is there private on-site car parking?",
        answer:
          "Yes, the villa features dedicated gated on-site parking accommodating 3 to 4 vehicles comfortably.",
        category: "Parking & Transport",
        sortOrder: 3,
      },
      {
        question: "What cooking facilities are provided in the villa?",
        answer:
          "The villa features a fully functional kitchen with a refrigerator, RO filtered drinking water, gas stove, microwave oven, electric kettle, cookware, and dinnerware for 12 guests.",
        category: "Kitchen & Dining",
        sortOrder: 4,
      },
    ];

    for (const f of initialFaqs) {
      await prisma.faqItem.create({ data: { ...f, isPublished: true } });
    }
  }

  // 4. Seed Experiences if empty
  const experienceCount = await prisma.experienceItem.count();
  if (experienceCount === 0) {
    const initialExperiences = [
      {
        title: "Cafes & Street Food Lanes",
        subtitle: "2 Mins Walk · 200 m",
        description:
          "Lively local bakeries, sweet shops, specialty chai stalls & trendy cafes along Raja Park market lanes.",
        category: "Food",
        iconName: "local_cafe",
        sortOrder: 0,
      },
      {
        title: "Birla Mandir & White Marble Temples",
        subtitle: "~5 Mins Drive · 1.8 km",
        description:
          "Iconic white marble temple beneath Moti Dungri Fort, beautifully illuminated at sunset.",
        category: "Heritage",
        iconName: "temple_hindu",
        sortOrder: 1,
      },
      {
        title: "MI Road (Heritage Shopping & Lassiwala)",
        subtitle: "~8–10 Mins Drive · 3.2 km",
        description:
          "Jaipur's historic shopping boulevard with jewellers, block-print textiles, and the legendary Lassiwala.",
        category: "Shopping",
        iconName: "shopping_bag",
        sortOrder: 2,
      },
      {
        title: "Hawa Mahal (Palace of Winds) & Pink City",
        subtitle: "~12 Mins Drive · 4.5 km",
        description:
          "The world-renowned 5-story honeycomb facade constructed in 1799, bordering the historic walled bazaar.",
        category: "Sightseeing",
        iconName: "castle",
        sortOrder: 3,
      },
    ];

    for (const e of initialExperiences) {
      await prisma.experienceItem.create({ data: { ...e, isPublished: true } });
    }
  }
}
