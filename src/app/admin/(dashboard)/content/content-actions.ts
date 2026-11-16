"use server";

import { requireAdminSession } from "@/auth";
import { revalidatePath as nextRevalidatePath } from "next/cache";
import { saveUploadedImage, validateImageUpload } from "@/lib/storage";
import {
  saveSectionDraft,
  publishSection,
  unpublishSection,
  discardSectionDraft,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  reorderTestimonials,
  createFaq,
  updateFaq,
  deleteFaq,
  reorderFaqs,
  createExperience,
  updateExperience,
  deleteExperience,
  reorderExperiences,
} from "@/lib/content/content-service";
import {
  validateEmail,
  validatePhoneNumber,
  validateSafeUrl,
  sanitizeRichText,
} from "@/lib/content/content-validation";

function safeRevalidatePath(path: string) {
  try {
    nextRevalidatePath(path);
  } catch {
    // Graceful fallback for non-Next request contexts like standalone tests
  }
}

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// ============================================================
// Section Draft / Publish Actions
// ============================================================

export async function saveSectionDraftAction(
  sectionKey: string,
  draftData: Record<string, unknown>
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  // Validate specific section fields
  if (sectionKey === "contact_info") {
    const email = draftData.contactEmail as string;
    const phone = draftData.businessPhone as string;
    const maps = draftData.googleMapsUrl as string;
    const wa = draftData.whatsappUrl as string;

    if (email && !validateEmail(email)) {
      return { success: false, error: "Invalid contact email format." };
    }
    if (phone && !validatePhoneNumber(phone)) {
      return { success: false, error: "Invalid business phone number format." };
    }
    if (maps) {
      const v = validateSafeUrl(maps);
      if (!v.valid) return { success: false, error: `Google Maps URL: ${v.error}` };
    }
    if (wa) {
      const v = validateSafeUrl(wa);
      if (!v.valid) return { success: false, error: `WhatsApp URL: ${v.error}` };
    }
  }

  if (sectionKey === "social_media") {
    const ig = draftData.instagramUrl as string;
    const fb = draftData.facebookUrl as string;
    if (ig) {
      const v = validateSafeUrl(ig);
      if (!v.valid) return { success: false, error: `Instagram URL: ${v.error}` };
    }
    if (fb) {
      const v = validateSafeUrl(fb);
      if (!v.valid) return { success: false, error: `Facebook URL: ${v.error}` };
    }
  }

  if (sectionKey === "homepage_hero") {
    if (draftData.headline && typeof draftData.headline === "string") {
      draftData.headline = sanitizeRichText(draftData.headline);
    }
    if (draftData.description && typeof draftData.description === "string") {
      draftData.description = sanitizeRichText(draftData.description);
    }
    if (draftData.primaryButtonLink) {
      const v = validateSafeUrl(draftData.primaryButtonLink as string);
      if (!v.valid) return { success: false, error: `Primary link: ${v.error}` };
    }
    if (draftData.secondaryButtonLink) {
      const v = validateSafeUrl(draftData.secondaryButtonLink as string);
      if (!v.valid) return { success: false, error: `Secondary link: ${v.error}` };
    }
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    await saveSectionDraft(sectionKey, draftData, staffEmail);
    safeRevalidatePath("/admin/content");

    return {
      success: true,
      message: `Draft for section "${sectionKey}" saved successfully.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save draft";
    return { success: false, error: msg };
  }
}

export async function publishSectionAction(
  sectionKey: string
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    await publishSection(sectionKey, staffEmail);

    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return {
      success: true,
      message: `Section "${sectionKey}" published live to public website.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to publish section";
    return { success: false, error: msg };
  }
}

export async function unpublishSectionAction(
  sectionKey: string
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    await unpublishSection(sectionKey, staffEmail);

    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return {
      success: true,
      message: `Section "${sectionKey}" has been unpublished.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to unpublish section";
    return { success: false, error: msg };
  }
}

export async function discardSectionDraftAction(
  sectionKey: string
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    await discardSectionDraft(sectionKey, staffEmail);

    safeRevalidatePath("/admin/content");

    return {
      success: true,
      message: `Draft changes for section "${sectionKey}" discarded.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to discard draft";
    return { success: false, error: msg };
  }
}

// ============================================================
// Testimonials Actions
// ============================================================

export async function createTestimonialAction(data: {
  guestName: string;
  location?: string;
  stayType?: string;
  reviewText: string;
  rating?: number;
  guestImageUrl?: string;
}): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  if (!data.guestName || data.guestName.trim().length === 0) {
    return { success: false, error: "Guest name is required." };
  }
  if (!data.reviewText || data.reviewText.trim().length === 0) {
    return { success: false, error: "Review text is required." };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    const created = await createTestimonial(
      {
        ...data,
        reviewText: sanitizeRichText(data.reviewText),
      },
      staffEmail
    );
    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return { success: true, message: "Testimonial created successfully.", data: created };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create testimonial";
    return { success: false, error: msg };
  }
}

export async function updateTestimonialAction(
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
  }
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    const updated = await updateTestimonial(
      id,
      {
        ...data,
        ...(data.reviewText && { reviewText: sanitizeRichText(data.reviewText) }),
      },
      staffEmail
    );
    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return { success: true, message: "Testimonial updated.", data: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update testimonial";
    return { success: false, error: msg };
  }
}

export async function deleteTestimonialAction(id: string): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    await deleteTestimonial(id, staffEmail);
    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return { success: true, message: "Testimonial deleted." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete testimonial";
    return { success: false, error: msg };
  }
}

export async function reorderTestimonialsAction(ids: string[]): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    await reorderTestimonials(ids, staffEmail);
    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return { success: true, message: "Testimonials reordered." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reorder testimonials";
    return { success: false, error: msg };
  }
}

// ============================================================
// FAQs Actions
// ============================================================

export async function createFaqAction(data: {
  question: string;
  answer: string;
  category?: string;
}): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  if (!data.question || data.question.trim().length === 0) {
    return { success: false, error: "Question is required." };
  }
  if (!data.answer || data.answer.trim().length === 0) {
    return { success: false, error: "Answer is required." };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    const created = await createFaq(
      {
        question: sanitizeRichText(data.question),
        answer: sanitizeRichText(data.answer),
        category: data.category,
      },
      staffEmail
    );
    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return { success: true, message: "FAQ created successfully.", data: created };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create FAQ";
    return { success: false, error: msg };
  }
}

export async function updateFaqAction(
  id: string,
  data: {
    question?: string;
    answer?: string;
    category?: string;
    isPublished?: boolean;
    sortOrder?: number;
  }
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    const updated = await updateFaq(
      id,
      {
        ...data,
        ...(data.question && { question: sanitizeRichText(data.question) }),
        ...(data.answer && { answer: sanitizeRichText(data.answer) }),
      },
      staffEmail
    );
    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return { success: true, message: "FAQ updated.", data: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update FAQ";
    return { success: false, error: msg };
  }
}

export async function deleteFaqAction(id: string): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    await deleteFaq(id, staffEmail);
    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return { success: true, message: "FAQ deleted." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete FAQ";
    return { success: false, error: msg };
  }
}

export async function reorderFaqsAction(ids: string[]): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    await reorderFaqs(ids, staffEmail);
    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return { success: true, message: "FAQs reordered." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reorder FAQs";
    return { success: false, error: msg };
  }
}

// ============================================================
// Experiences Actions
// ============================================================

export async function createExperienceAction(data: {
  title: string;
  subtitle?: string;
  description: string;
  imageUrl?: string;
  iconName?: string;
  category?: string;
}): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  if (!data.title || data.title.trim().length === 0) {
    return { success: false, error: "Experience title is required." };
  }
  if (!data.description || data.description.trim().length === 0) {
    return { success: false, error: "Experience description is required." };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    const created = await createExperience(
      {
        ...data,
        title: sanitizeRichText(data.title),
        description: sanitizeRichText(data.description),
      },
      staffEmail
    );
    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return { success: true, message: "Experience created.", data: created };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create experience";
    return { success: false, error: msg };
  }
}

export async function updateExperienceAction(
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
  }
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    const updated = await updateExperience(
      id,
      {
        ...data,
        ...(data.title && { title: sanitizeRichText(data.title) }),
        ...(data.description && { description: sanitizeRichText(data.description) }),
      },
      staffEmail
    );
    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return { success: true, message: "Experience updated.", data: updated };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update experience";
    return { success: false, error: msg };
  }
}

export async function deleteExperienceAction(id: string): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    await deleteExperience(id, staffEmail);
    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return { success: true, message: "Experience deleted." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete experience";
    return { success: false, error: msg };
  }
}

export async function reorderExperiencesAction(ids: string[]): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  try {
    const staffEmail = auth.user.email || "admin@devstays.com";
    await reorderExperiences(ids, staffEmail);
    safeRevalidatePath("/");
    safeRevalidatePath("/admin/content");

    return { success: true, message: "Experiences reordered." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reorder experiences";
    return { success: false, error: msg };
  }
}

// ============================================================
// Media Upload Action
// ============================================================

export async function uploadContentImageAction(
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const auth = await requireAdminSession();
  if (!auth.authorized || !auth.user) {
    return { success: false, error: auth.error || "Unauthorized" };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file provided in upload request." };
  }

  const validation = validateImageUpload(file.size, file.type);
  if (!validation.valid) {
    return { success: false, error: validation.error || "Invalid file" };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await saveUploadedImage(buffer, file.name, file.type);

    return {
      success: true,
      message: "Image uploaded successfully to persistent storage.",
      data: { url: result.url },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to upload image";
    return { success: false, error: msg };
  }
}
