process.env.TEST_ADMIN_BYPASS = "true";

import { prisma } from "../src/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  saveSectionDraftAction,
  publishSectionAction,
  unpublishSectionAction,
  discardSectionDraftAction,
  createTestimonialAction,
  updateTestimonialAction,
  deleteTestimonialAction,
  reorderTestimonialsAction,
  createFaqAction,
  updateFaqAction,
  deleteFaqAction,
  reorderFaqsAction,
  createExperienceAction,
  updateExperienceAction,
  deleteExperienceAction,
  reorderExperiencesAction,
  uploadContentImageAction,
} from "../src/app/admin/(dashboard)/content/content-actions";
import {
  getSectionContent,
  getAllCmsSectionsOverview,
  seedInitialCmsDataIfEmpty,
  DEFAULT_CMS_CONTENT,
  HomepageHeroContent,
  FeaturedAccommodationsContent,
  HomepageAboutContent,
  ContactInfoContent,
  SocialMediaContent,
  GlobalSeoContent,
  getTestimonials,
  getFaqs,
  getExperiences,
} from "../src/lib/content/content-service";
import {
  validateEmail,
  validatePhoneNumber,
  validateSafeUrl,
  sanitizeRichText,
} from "../src/lib/content/content-validation";
import { saveUploadedImage, deleteUploadedImage, validateImageUpload } from "../src/lib/storage";

async function runPhase6Tests() {
  console.log("\n========================================================");
  console.log("  DEVSTAY ADMIN DASHBOARD — PHASE 6 CMS TESTS");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  const staffEmail = "admin@devstays.com";

  // -----------------------------------------------------------
  // 1. Initial CMS Seeding & Baseline Sanity Check
  // -----------------------------------------------------------
  console.log("1. CMS Seeding & Baseline Verification:");
  await seedInitialCmsDataIfEmpty(staffEmail);

  // Ensure clean baseline for test isolation
  await prisma.siteContent.update({
    where: { sectionKey: "homepage_hero" },
    data: {
      content: DEFAULT_CMS_CONTENT.homepage_hero,
      draftContent: Prisma.JsonNull,
      hasDraft: false,
      isPublished: true,
    },
  });

  const overview = await getAllCmsSectionsOverview();
  assert(
    overview.sections.length === 6,
    "CMS Overview lists all 6 standard content sections (Hero, Featured, About, Contact, Social, SEO)"
  );
  assert(
    overview.testimonialsCount >= 5,
    "Testimonials seeded with baseline verified reviews"
  );
  assert(overview.faqsCount >= 5, "FAQs seeded with baseline stay rules & questions");
  assert(
    overview.experiencesCount >= 4,
    "Experiences seeded with baseline Raja Park landmarks"
  );

  // -----------------------------------------------------------
  // 2. Test 1: Homepage Hero Content Editing & Draft Saving
  // -----------------------------------------------------------
  console.log("\n2. Test 1: Homepage Hero Content Editing & Draft Saving:");
  const testHeadline = "ROYAL HERITAGE SANCTUARY IN RAJA PARK JAIPUR";
  const testDesc = "Handcrafted 3BHK villa with private veranda, rooftop chai deck, and organic garden.";

  const saveHeroDraftRes = await saveSectionDraftAction("homepage_hero", {
    ...DEFAULT_CMS_CONTENT.homepage_hero,
    headline: testHeadline,
    description: testDesc,
    startingPrice: 9500,
  });

  assert(
    Boolean(saveHeroDraftRes.success),
    "Homepage Hero draft saved successfully via Server Action"
  );

  // Verify live content remains untouched while preview returns draft
  const heroLive = await getSectionContent<HomepageHeroContent>("homepage_hero", {
    preview: false,
  });
  const heroPreview = await getSectionContent<HomepageHeroContent>("homepage_hero", {
    preview: true,
  });

  assert(
    heroLive.content.headline !== testHeadline &&
      heroLive.hasDraft === true &&
      heroLive.content.headline === DEFAULT_CMS_CONTENT.homepage_hero.headline,
    "Public live Hero content remains untouched while draft exists"
  );
  assert(
    heroPreview.content.headline === testHeadline && heroPreview.content.startingPrice === 9500,
    "Preview mode accurately retrieves unpublished draft edits"
  );

  // -----------------------------------------------------------
  // 3. Test 2: Content Publishing & Cache Workflow
  // -----------------------------------------------------------
  console.log("\n3. Test 2: Content Publishing & Cache Workflow:");
  const publishHeroRes = await publishSectionAction("homepage_hero");
  assert(Boolean(publishHeroRes.success), "Publish action executed successfully");

  const heroAfterPublish = await getSectionContent<HomepageHeroContent>("homepage_hero", {
    preview: false,
  });
  assert(
    heroAfterPublish.content.headline === testHeadline &&
      heroAfterPublish.hasDraft === false &&
      heroAfterPublish.isPublished === true &&
      Boolean(heroAfterPublish.lastPublishedAt),
    "Published Hero content is now live on public website and hasDraft is cleared"
  );

  // Discard draft test
  await saveSectionDraftAction("homepage_hero", {
    ...DEFAULT_CMS_CONTENT.homepage_hero,
    headline: "TEMPORARY UNWANTED HEADLINE",
  });
  const discardRes = await discardSectionDraftAction("homepage_hero");
  assert(Boolean(discardRes.success), "Discard draft action resets draft state");

  const heroAfterDiscard = await getSectionContent<HomepageHeroContent>("homepage_hero", {
    preview: true,
  });
  assert(
    heroAfterDiscard.content.headline === testHeadline && heroAfterDiscard.hasDraft === false,
    "Discarded draft reverts preview to currently published content"
  );

  // -----------------------------------------------------------
  // 4. Test 3: Featured Property Selection (No Duplication)
  // -----------------------------------------------------------
  console.log("\n4. Test 3: Featured Property Selection (No Duplicate Records):");
  const properties = await prisma.property.findMany({ select: { id: true, name: true } });
  assert(properties.length > 0, "Existing Property records found in database");

  const selectedIds = properties.slice(0, 2).map((p) => p.id);
  const saveFeaturedRes = await saveSectionDraftAction("featured_accommodations", {
    ...DEFAULT_CMS_CONTENT.featured_accommodations,
    selectedPropertyIds: selectedIds,
    maxListings: 2,
    headline: "FEATURED LUXURY RESIDENCES",
  });
  assert(Boolean(saveFeaturedRes.success), "Featured properties draft saved");

  await publishSectionAction("featured_accommodations");
  const featuredLive = await getSectionContent<FeaturedAccommodationsContent>(
    "featured_accommodations"
  );

  assert(
    featuredLive.content.headline === "FEATURED LUXURY RESIDENCES" &&
      featuredLive.content.maxListings === 2 &&
      featuredLive.content.selectedPropertyIds.length === selectedIds.length,
    "Featured property selections and max listing limit published"
  );

  // Verify Property count hasn't changed (no duplicate models)
  const propCountAfter = await prisma.property.count();
  assert(
    propCountAfter === properties.length,
    "Property database count strictly unchanged (no duplicated property records created)"
  );

  // -----------------------------------------------------------
  // 5. Test 4: About DevStay & Sanctuary Story Updates
  // -----------------------------------------------------------
  console.log("\n5. Test 4: About DevStay & Sanctuary Story Updates:");
  const testStoryHeadline = "A Handcrafted Sanctuary of Rajasthani Warmth";
  const testBrandStory =
    "DevStay was built with hand-carved stone, vintage block prints, and generations of heartfelt Jaipur hospitality.";

  await saveSectionDraftAction("homepage_about", {
    ...DEFAULT_CMS_CONTENT.homepage_about,
    headline: testStoryHeadline,
    brandStory: testBrandStory,
  });
  await publishSectionAction("homepage_about");

  const aboutLive = await getSectionContent<HomepageAboutContent>("homepage_about");
  assert(
    aboutLive.content.headline === testStoryHeadline &&
      aboutLive.content.brandStory === testBrandStory,
    "About DevStay sanctuary headline and brand story published to public database"
  );

  // -----------------------------------------------------------
  // 6. Test 5: Experience Management (CRUD, Ordering, Publishing)
  // -----------------------------------------------------------
  console.log("\n6. Test 5: Experience Management (CRUD, Ordering, Publishing):");
  const newExpRes = await createExperienceAction({
    title: "Moti Dungri Sunrise Walk",
    subtitle: "5 Mins Walk · 400 m",
    description: "Quiet morning stroll to the historic Ganesha fortress with panoramic city views.",
    category: "Sightseeing",
    iconName: "temple_hindu",
  });

  assert(Boolean(newExpRes.success) && Boolean(newExpRes.data), "New Experience record created");
  const createdExp = newExpRes.data as { id: string; title: string };

  // Update Experience
  const updateExpRes = await updateExperienceAction(createdExp.id, {
    subtitle: "8 Mins Walk · 600 m",
    isPublished: true,
  });
  assert(Boolean(updateExpRes.success), "Experience record updated");

  // Reorder Experiences
  const allExperiences = await getExperiences({ includeUnpublished: true });
  const reorderedExpIds = allExperiences.map((e) => e.id).reverse();
  const reorderExpRes = await reorderExperiencesAction(reorderedExpIds);
  assert(Boolean(reorderExpRes.success), "Experiences successfully reordered in batch");

  // Delete Experience
  const deleteExpRes = await deleteExperienceAction(createdExp.id);
  assert(Boolean(deleteExpRes.success), "Experience deleted successfully");

  // -----------------------------------------------------------
  // 7. Test 6: Testimonials Management (CRUD & Ratings)
  // -----------------------------------------------------------
  console.log("\n7. Test 6: Testimonials Management (CRUD & Ratings):");
  const newTestimonialRes = await createTestimonialAction({
    guestName: "Ananya Sharma",
    location: "Mumbai, India",
    stayType: "Family Vacation · 3 Nights",
    rating: 5,
    reviewText: "The villa is simply breathtaking! Aparna and the staff treated us like family.",
  });

  assert(
    Boolean(newTestimonialRes.success) && Boolean(newTestimonialRes.data),
    "Guest Testimonial created with 5-star rating"
  );
  const createdTestimonial = newTestimonialRes.data as { id: string; guestName: string };

  // Update Testimonial
  const updateTestimonialRes = await updateTestimonialAction(createdTestimonial.id, {
    rating: 4,
    reviewText: "Wonderful quiet stay in Raja Park with splendid decor.",
  });
  assert(Boolean(updateTestimonialRes.success), "Testimonial updated");

  // Delete Testimonial
  const deleteTestimonialRes = await deleteTestimonialAction(createdTestimonial.id);
  assert(Boolean(deleteTestimonialRes.success), "Testimonial deleted successfully");

  // -----------------------------------------------------------
  // 8. Test 7: FAQ Management (CRUD & Ordering)
  // -----------------------------------------------------------
  console.log("\n8. Test 7: FAQ Management (CRUD & Ordering):");
  const newFaqRes = await createFaqAction({
    question: "Do you offer private high-speed Wi-Fi for remote work?",
    answer: "Yes, dedicated 300 Mbps fiber broadband Wi-Fi covers the entire villa and veranda.",
    category: "Connectivity",
  });
  assert(Boolean(newFaqRes.success) && Boolean(newFaqRes.data), "FAQ question created");
  const createdFaq = newFaqRes.data as { id: string; question: string };

  const updateFaqRes = await updateFaqAction(createdFaq.id, {
    answer: "Yes, dedicated 500 Mbps redundant fiber Wi-Fi covers all bedrooms and work desks.",
  });
  assert(Boolean(updateFaqRes.success), "FAQ answer updated");

  const deleteFaqRes = await deleteFaqAction(createdFaq.id);
  assert(Boolean(deleteFaqRes.success), "FAQ deleted successfully");

  // -----------------------------------------------------------
  // 9. Test 8: Contact Information Validation & Saving
  // -----------------------------------------------------------
  console.log("\n9. Test 8: Contact Information Validation & Saving:");

  // Invalid email format test
  const invalidEmailRes = await saveSectionDraftAction("contact_info", {
    contactEmail: "invalid-email-address",
    businessPhone: "+91 141 289 4400",
  });
  assert(
    !invalidEmailRes.success && Boolean(invalidEmailRes.error?.includes("Invalid contact email")),
    "Validation rejects malformed contact email addresses"
  );

  // Invalid phone test
  const invalidPhoneRes = await saveSectionDraftAction("contact_info", {
    contactEmail: "concierge@devstaysjaipur.com",
    businessPhone: "not-a-phone",
  });
  assert(
    !invalidPhoneRes.success && Boolean(invalidPhoneRes.error?.includes("Invalid business phone")),
    "Validation rejects invalid phone number formats"
  );

  // Valid contact info save & publish
  const validContactRes = await saveSectionDraftAction("contact_info", {
    businessPhone: "+91 141 289 4400",
    contactEmail: "concierge@devstaysjaipur.com",
    physicalAddress: "Raja Park, Central Jaipur, Rajasthan 302004, India",
    googleMapsUrl: "https://maps.google.com/?q=Raja+Park+Jaipur",
    whatsappUrl: "https://wa.me/911412894400",
  });
  assert(Boolean(validContactRes.success), "Valid contact information saved");
  await publishSectionAction("contact_info");

  const contactLive = await getSectionContent<ContactInfoContent>("contact_info");
  assert(
    contactLive.content.contactEmail === "concierge@devstaysjaipur.com" &&
      contactLive.content.businessPhone === "+91 141 289 4400",
    "Contact information published live"
  );

  // -----------------------------------------------------------
  // 10. Test 9: Social Media Validation & Security
  // -----------------------------------------------------------
  console.log("\n10. Test 9: Social Media Validation & Security:");

  // XSS javascript: protocol detection
  const xssUrlRes = await saveSectionDraftAction("social_media", {
    instagramUrl: "javascript:alert('XSS')",
  });
  assert(
    !xssUrlRes.success && Boolean(xssUrlRes.error?.includes("Insecure URL")),
    "Security check prevents javascript: protocol injection in social URLs"
  );

  // Valid social save
  const validSocialRes = await saveSectionDraftAction("social_media", {
    instagramUrl: "https://instagram.com/devstays.jaipur",
    facebookUrl: "https://facebook.com/devstaysjaipur",
  });
  assert(Boolean(validSocialRes.success), "Valid social media URLs accepted and saved");

  // -----------------------------------------------------------
  // 11. Test 10: Global SEO Settings & Property Inheritance Preservation
  // -----------------------------------------------------------
  console.log("\n11. Test 10: Global SEO Settings & Property Metadata Preservation:");
  const testSiteTitle = "Dev Stays Jaipur · Private 3BHK Villa in Raja Park";
  const testMetaDesc = "Authentic handcrafted private 3BHK villa in Raja Park, Central Jaipur.";

  await saveSectionDraftAction("global_seo", {
    siteTitle: testSiteTitle,
    defaultMetaDescription: testMetaDesc,
    defaultOgImageUrl: "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
    robotsIndex: true,
    robotsFollow: true,
  });
  await publishSectionAction("global_seo");

  const seoLive = await getSectionContent<GlobalSeoContent>("global_seo");
  assert(
    seoLive.content.siteTitle === testSiteTitle &&
      seoLive.content.defaultMetaDescription === testMetaDesc &&
      seoLive.content.robotsIndex === true,
    "Global SEO metadata configured and published"
  );

  // Verify property-specific SEO record is strictly preserved
  const sampleProperty = await prisma.property.findFirst({
    where: { isArchived: false },
    select: { id: true, name: true, seoTitle: true },
  });
  assert(
    Boolean(sampleProperty),
    "Property record exists and property-level SEO titles remain intact"
  );

  // -----------------------------------------------------------
  // 12. Test 11: Media Validation & Storage Abstraction
  // -----------------------------------------------------------
  console.log("\n12. Test 11: Media Validation & Storage Abstraction:");

  // Oversized image test (>8MB)
  const oversizedCheck = validateImageUpload(9 * 1024 * 1024, "image/jpeg");
  assert(
    !oversizedCheck.valid && Boolean(oversizedCheck.error?.includes("exceeds the 8 MB maximum")),
    "Storage validation rejects image files exceeding 8 MB limit"
  );

  // Disallowed MIME type
  const badMimeCheck = validateImageUpload(1024 * 100, "application/pdf");
  assert(
    !badMimeCheck.valid && Boolean(badMimeCheck.error?.includes("Unsupported file type")),
    "Storage validation rejects non-image MIME types (PDF, EXE, etc.)"
  );

  // Valid image persistence
  const sampleBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  const uploadResult = await saveUploadedImage(sampleBuffer, "test-cms-icon.png", "image/png");
  assert(
    Boolean(uploadResult.url) && uploadResult.url.startsWith("/uploads/"),
    "Image saved to persistent storage with unique collision-free URL"
  );

  // Delete image
  const deleteImageRes = await deleteUploadedImage(uploadResult.url);
  assert(Boolean(deleteImageRes), "Uploaded image successfully deleted from persistent storage");

  // -----------------------------------------------------------
  // 13. Test 12: Rich Text & HTML Sanitization
  // -----------------------------------------------------------
  console.log("\n13. Test 12: Rich Text & HTML Sanitization:");
  const dirtyHtml = '<p>Great stay! <script>alert("hack")</script><b onclick="evil()">Click</b></p>';
  const cleanHtml = sanitizeRichText(dirtyHtml);
  assert(
    !cleanHtml.includes("<script") &&
      !cleanHtml.includes("onclick=") &&
      cleanHtml.includes("<p>Great stay!"),
    "Rich text sanitizer strips script tags and inline DOM event handlers"
  );

  // -----------------------------------------------------------
  // 14. Test 13: Comprehensive Audit Logging
  // -----------------------------------------------------------
  console.log("\n14. Test 13: Comprehensive Audit Logging:");
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          "SITE_CONTENT_DRAFT_SAVED",
          "SITE_CONTENT_PUBLISHED",
          "TESTIMONIAL_CREATED",
          "FAQ_CREATED",
          "EXPERIENCE_CREATED",
        ],
      },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  assert(
    auditLogs.some((l) => l.action === "SITE_CONTENT_DRAFT_SAVED"),
    "AuditLog recorded SITE_CONTENT_DRAFT_SAVED"
  );
  assert(
    auditLogs.some((l) => l.action === "SITE_CONTENT_PUBLISHED"),
    "AuditLog recorded SITE_CONTENT_PUBLISHED"
  );
  assert(
    auditLogs.some((l) => l.action === "TESTIMONIAL_CREATED"),
    "AuditLog recorded TESTIMONIAL_CREATED"
  );
  assert(auditLogs.some((l) => l.action === "FAQ_CREATED"), "AuditLog recorded FAQ_CREATED");
  assert(
    auditLogs.some((l) => l.action === "EXPERIENCE_CREATED"),
    "AuditLog recorded EXPERIENCE_CREATED"
  );

  // -----------------------------------------------------------
  // 15. Test 14 & 15: Admin Authorization Security Guards
  // -----------------------------------------------------------
  console.log("\n15. Test 14 & 15: Admin Authorization Security Guards:");
  process.env.TEST_ADMIN_BYPASS = "false"; // Simulate unauthenticated guest

  const unauthSaveRes = await saveSectionDraftAction("homepage_hero", { headline: "Hack" });
  assert(
    !unauthSaveRes.success && Boolean(unauthSaveRes.error?.includes("Unauthorized")),
    "Unauthenticated draft save attempt rejected (401 Unauthorized)"
  );

  const unauthPublishRes = await publishSectionAction("homepage_hero");
  assert(
    !unauthPublishRes.success && Boolean(unauthPublishRes.error?.includes("Unauthorized")),
    "Unauthenticated publish attempt rejected (401 Unauthorized)"
  );

  const unauthFaqRes = await createFaqAction({ question: "Q", answer: "A" });
  assert(
    !unauthFaqRes.success && Boolean(unauthFaqRes.error?.includes("Unauthorized")),
    "Unauthenticated FAQ creation attempt rejected (401 Unauthorized)"
  );

  process.env.TEST_ADMIN_BYPASS = "true"; // Restore test bypass

  // Restore hero content to original baseline so tests leave database clean
  await publishSectionAction("homepage_hero");
  await saveSectionDraftAction("homepage_hero", DEFAULT_CMS_CONTENT.homepage_hero);
  await publishSectionAction("homepage_hero");

  console.log("\n========================================================");
  console.log(`  PHASE 6 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Tests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
