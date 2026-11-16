"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/auth";
import { BookingStatus } from "@prisma/client";
import { revalidatePath as nextRevalidatePath } from "next/cache";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/storage";

function safeRevalidatePath(path: string) {
  try {
    nextRevalidatePath(path);
  } catch {
    // Gracefully ignore during CLI integration tests where static generation store is not active
  }
}

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  errors?: string[];
  data?: T;
}

export interface PublishingValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates whether a property meets all required criteria to be published live.
 */
export async function validatePropertyForPublish(
  propertyId: string
): Promise<PublishingValidationResult> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      listingOptions: true,
      images: true,
    },
  });

  if (!property) {
    return { valid: false, errors: ["Property not found."] };
  }

  const errors: string[] = [];

  // 1. Identity validation
  if (!property.name || property.name.trim().length < 3) {
    errors.push("Property Name must be at least 3 characters.");
  }
  if (!property.description || property.description.trim().length < 30) {
    errors.push(
      "Property Description must be at least 30 characters (currently " +
        (property.description ? property.description.trim().length : 0) +
        ")."
    );
  }

  // 2. Address validation
  if (!property.address || !property.address.trim()) {
    errors.push("Street Address is required.");
  }
  if (!property.city || !property.city.trim()) {
    errors.push("City is required.");
  }
  if (!property.postalCode || !property.postalCode.trim()) {
    errors.push("Postal Code is required.");
  }

  // 3. Operational Policies
  if (!property.checkInTime || !property.checkInTime.trim()) {
    errors.push("Check-In Time is required.");
  }
  if (!property.checkOutTime || !property.checkOutTime.trim()) {
    errors.push("Check-Out Time is required.");
  }
  if (!property.cancellationPolicy || !property.cancellationPolicy.trim()) {
    errors.push("Cancellation Policy is required.");
  }

  // 4. Room Configurations & Pricing
  if (!property.listingOptions || property.listingOptions.length === 0) {
    errors.push("Property must have at least one sellable room configuration.");
  } else {
    const activeConfigs = property.listingOptions.filter((c) => c.isActive);
    if (activeConfigs.length === 0) {
      errors.push("At least one room configuration must be set to Active.");
    }
    for (const config of property.listingOptions) {
      if (Number(config.basePricePerNight) <= 0) {
        errors.push(`Configuration "${config.title}" must have a base price greater than 0.`);
      }
      if (config.maxGuests <= 0) {
        errors.push(`Configuration "${config.title}" must have a guest capacity greater than 0.`);
      }
    }
  }

  // 5. Photography
  if (!property.images || property.images.length === 0) {
    errors.push("Property must have at least one uploaded photograph.");
  } else {
    const hasCover = property.images.some((img) => img.isCover);
    if (!hasCover) {
      errors.push("A primary cover photograph must be selected.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Publishes a property live after verifying all publishing constraints.
 */
export async function publishPropertyWithValidation(
  propertyId: string
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const validation = await validatePropertyForPublish(propertyId);
  if (!validation.valid) {
    return {
      success: false,
      error: "Cannot publish property. Please resolve the validation requirements.",
      errors: validation.errors,
    };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const prop = await tx.property.update({
        where: { id: propertyId },
        data: {
          isActive: true,
          isArchived: false,
          archivedAt: null,
          archivedReason: null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PROPERTY_PUBLISH_VALIDATED",
          entityType: "Property",
          entityId: propertyId,
          userId: authCheck.user?.id,
          userEmail: authCheck.user?.email,
          metadata: { name: prop.name, slug: prop.slug },
        },
      });

      return prop;
    });

    safeRevalidatePath("/admin/properties");
    safeRevalidatePath(`/admin/properties/${propertyId}`);
    safeRevalidatePath(`/properties/${updated.slug}`);
    safeRevalidatePath("/");

    return {
      success: true,
      message: `"${updated.name}" is now Published live and accepting bookings!`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to publish property: ${msg}` };
  }
}

/**
 * Safely archives a property, verifying that no active or upcoming reservations exist.
 */
export async function archiveProperty(
  propertyId: string,
  reason?: string
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return { success: false, error: "Property not found." };
    }

    // Safety Policy: Check for active or upcoming reservations
    const now = new Date();
    const activeBookings = await prisma.booking.findMany({
      where: {
        propertyId,
        status: {
          in: [
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.PENDING_HOLD,
          ],
        },
        checkOutDate: { gte: now },
      },
      select: {
        id: true,
        bookingReference: true,
        checkInDate: true,
        checkOutDate: true,
      },
    });

    if (activeBookings.length > 0) {
      return {
        success: false,
        error: `Cannot archive "${property.name}": There are ${activeBookings.length} active or upcoming reservation(s) (including ${activeBookings[0].bookingReference}). Please honor, complete, or reassign all reservations before archiving.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id: propertyId },
        data: {
          isArchived: true,
          isActive: false,
          archivedAt: new Date(),
          archivedReason: reason?.trim() || "Archived by staff administrator",
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PROPERTY_ARCHIVE",
          entityType: "Property",
          entityId: propertyId,
          userId: authCheck.user?.id,
          userEmail: authCheck.user?.email,
          metadata: {
            name: property.name,
            reason: reason || "Standard staff archival",
          },
        },
      });
    });

    safeRevalidatePath("/admin/properties");
    safeRevalidatePath(`/admin/properties/${propertyId}`);
    safeRevalidatePath("/");

    return {
      success: true,
      message: `"${property.name}" has been safely archived. Historical records remain preserved.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to archive property: ${msg}` };
  }
}

/**
 * Restores an archived property back to Draft state.
 */
export async function restoreProperty(propertyId: string): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return { success: false, error: "Property not found." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id: propertyId },
        data: {
          isArchived: false,
          isActive: false, // Restores as DRAFT for safe review before publishing
          archivedAt: null,
          archivedReason: null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PROPERTY_RESTORE",
          entityType: "Property",
          entityId: propertyId,
          userId: authCheck.user?.id,
          userEmail: authCheck.user?.email,
          metadata: { name: property.name },
        },
      });
    });

    safeRevalidatePath("/admin/properties");
    safeRevalidatePath(`/admin/properties/${propertyId}`);

    return {
      success: true,
      message: `"${property.name}" restored to Draft status. Review and publish when ready.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to restore property: ${msg}` };
  }
}

/**
 * Updates SEO metadata and handles slug changes with automatic 308 redirect preservation.
 */
export async function updatePropertySEO(
  propertyId: string,
  data: {
    slug: string;
    seoTitle?: string;
    seoDescription?: string;
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImageUrl?: string;
  }
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    const current = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, slug: true, previousSlugs: true },
    });

    if (!current) {
      return { success: false, error: "Property not found." };
    }

    const cleanNewSlug = data.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!cleanNewSlug || cleanNewSlug.length < 3) {
      return { success: false, error: "Valid URL slug (at least 3 characters) is required." };
    }

    // Check if slug changed
    let updatedPreviousSlugs = current.previousSlugs;
    if (cleanNewSlug !== current.slug) {
      // Check collision with another property
      const collision = await prisma.property.findUnique({
        where: { slug: cleanNewSlug },
      });
      if (collision && collision.id !== propertyId) {
        return {
          success: false,
          error: `URL slug "${cleanNewSlug}" is already in use by another property.`,
        };
      }

      // Add old slug to previousSlugs if not already in history
      if (!updatedPreviousSlugs.includes(current.slug)) {
        updatedPreviousSlugs = [...updatedPreviousSlugs, current.slug];
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id: propertyId },
        data: {
          slug: cleanNewSlug,
          previousSlugs: updatedPreviousSlugs,
          seoTitle: data.seoTitle?.trim() || null,
          seoDescription: data.seoDescription?.trim() || null,
          canonicalUrl: data.canonicalUrl?.trim() || null,
          ogTitle: data.ogTitle?.trim() || null,
          ogDescription: data.ogDescription?.trim() || null,
          ogImageUrl: data.ogImageUrl?.trim() || null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PROPERTY_UPDATE_SEO",
          entityType: "Property",
          entityId: propertyId,
          userId: authCheck.user?.id,
          userEmail: authCheck.user?.email,
          metadata: {
            slugChanged: cleanNewSlug !== current.slug,
            oldSlug: current.slug,
            newSlug: cleanNewSlug,
          },
        },
      });
    });

    safeRevalidatePath("/admin/properties");
    safeRevalidatePath(`/admin/properties/${propertyId}`);
    safeRevalidatePath(`/properties/${cleanNewSlug}`);

    return {
      success: true,
      message: "SEO metadata and URL slug updated successfully.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to update SEO: ${msg}` };
  }
}

/**
 * Handles multiple image uploads using the persistent storage abstraction.
 */
export async function uploadPropertyImages(
  propertyId: string,
  formData: FormData
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const files = formData.getAll("files") as File[];
  if (!files || files.length === 0) {
    return { success: false, error: "No image files provided." };
  }

  try {
    const existingImagesCount = await prisma.propertyImage.count({
      where: { propertyId },
    });

    const createdRecords = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || file.size === 0) continue;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save to persistent volume
      const result = await saveUploadedImage(buffer, file.name, file.type);

      // First uploaded image becomes cover if property currently has no cover image
      const isCover = existingImagesCount === 0 && i === 0;

      const imgRecord = await prisma.propertyImage.create({
        data: {
          propertyId,
          url: result.url,
          caption: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
          altText: `DevStay photograph of ${file.name.replace(/\.[^/.]+$/, "")}`,
          isCover,
          sortOrder: existingImagesCount + i + 1,
        },
      });

      createdRecords.push(imgRecord);
    }

    await prisma.auditLog.create({
      data: {
        action: "PROPERTY_UPLOAD_IMAGES",
        entityType: "Property",
        entityId: propertyId,
        userId: authCheck.user?.id,
        userEmail: authCheck.user?.email,
        metadata: { uploadedCount: createdRecords.length },
      },
    });

    safeRevalidatePath(`/admin/properties/${propertyId}`);
    safeRevalidatePath("/admin/properties");

    return {
      success: true,
      message: `Successfully uploaded ${createdRecords.length} photograph(s) to persistent storage.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Upload failed: ${msg}` };
  }
}

/**
 * Attaches an existing media asset from the central gallery to a property.
 */
export async function attachMediaAssetToProperty(
  propertyId: string,
  assetUrl: string,
  caption?: string,
  altText?: string
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    const existingCount = await prisma.propertyImage.count({ where: { propertyId } });
    const isCover = existingCount === 0;

    const img = await prisma.propertyImage.create({
      data: {
        propertyId,
        url: assetUrl,
        caption: caption || "Property Gallery Image",
        altText: altText || "DevStay luxury accommodation photograph",
        isCover,
        sortOrder: existingCount + 1,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "PROPERTY_ATTACH_MEDIA",
        entityType: "Property",
        entityId: propertyId,
        userId: authCheck.user?.id,
        userEmail: authCheck.user?.email,
        metadata: { url: assetUrl, isCover },
      },
    });

    safeRevalidatePath(`/admin/properties/${propertyId}`);
    return { success: true, message: "Media asset attached to property gallery.", data: img };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to attach media: ${msg}` };
  }
}

/**
 * Sets an image as the designated primary cover photograph for the property.
 */
export async function setCoverImage(
  propertyId: string,
  imageId: string
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Clear cover flag on all images of this property
      await tx.propertyImage.updateMany({
        where: { propertyId },
        data: { isCover: false },
      });

      // 2. Set target image as cover
      await tx.propertyImage.update({
        where: { id: imageId },
        data: { isCover: true },
      });

      await tx.auditLog.create({
        data: {
          action: "PROPERTY_SET_COVER_IMAGE",
          entityType: "PropertyImage",
          entityId: imageId,
          userId: authCheck.user?.id,
          userEmail: authCheck.user?.email,
          metadata: { propertyId },
        },
      });
    });

    safeRevalidatePath(`/admin/properties/${propertyId}`);
    safeRevalidatePath("/admin/properties");
    safeRevalidatePath("/");

    return { success: true, message: "Cover image set successfully." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to set cover image: ${msg}` };
  }
}

/**
 * Deletes a property image and cleans up the persistent file from disk.
 */
export async function deletePropertyImage(
  propertyId: string,
  imageId: string
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    const image = await prisma.propertyImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return { success: false, error: "Image not found." };
    }

    const wasCover = image.isCover;

    await prisma.$transaction(async (tx) => {
      // 1. Delete DB record
      await tx.propertyImage.delete({
        where: { id: imageId },
      });

      // 2. If it was cover, designate another image as cover if one exists
      if (wasCover) {
        const nextCandidate = await tx.propertyImage.findFirst({
          where: { propertyId },
          orderBy: { sortOrder: "asc" },
        });
        if (nextCandidate) {
          await tx.propertyImage.update({
            where: { id: nextCandidate.id },
            data: { isCover: true },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: "PROPERTY_DELETE_IMAGE",
          entityType: "PropertyImage",
          entityId: imageId,
          userId: authCheck.user?.id,
          userEmail: authCheck.user?.email,
          metadata: { propertyId, url: image.url },
        },
      });
    });

    // Clean up physical file if it was uploaded
    await deleteUploadedImage(image.url);

    safeRevalidatePath(`/admin/properties/${propertyId}`);
    safeRevalidatePath("/admin/properties");
    safeRevalidatePath("/");

    return { success: true, message: "Photograph deleted successfully." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to delete image: ${msg}` };
  }
}

/**
 * Updates an image's caption, alt text, or category.
 */
export async function updateImageDetails(
  propertyId: string,
  imageId: string,
  data: {
    caption?: string;
    altText?: string;
    category?: string;
  }
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    await prisma.propertyImage.update({
      where: { id: imageId },
      data: {
        caption: data.caption?.trim() || null,
        altText: data.altText?.trim() || null,
        category: data.category?.trim() || null,
      },
    });

    safeRevalidatePath(`/admin/properties/${propertyId}`);

    return { success: true, message: "Image details updated." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to update image details: ${msg}` };
  }
}

/**
 * Updates the gallery sort order for all images.
 */
export async function reorderPropertyImages(
  propertyId: string,
  orderedImageIds: string[]
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < orderedImageIds.length; i++) {
        await tx.propertyImage.update({
          where: { id: orderedImageIds[i] },
          data: { sortOrder: i + 1 },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "PROPERTY_REORDER_IMAGES",
          entityType: "Property",
          entityId: propertyId,
          userId: authCheck.user?.id,
          userEmail: authCheck.user?.email,
          metadata: { count: orderedImageIds.length },
        },
      });
    });

    safeRevalidatePath(`/admin/properties/${propertyId}`);
    safeRevalidatePath("/");

    return { success: true, message: "Gallery order saved." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to reorder images: ${msg}` };
  }
}
