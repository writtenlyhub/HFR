"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/auth";
import { revalidatePath } from "next/cache";

export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Updates general property details (identity and location).
 */
export async function updatePropertyGeneral(
  propertyId: string,
  data: {
    name: string;
    headline?: string;
    description: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude?: number | null;
    longitude?: number | null;
  }
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const prop = await tx.property.update({
        where: { id: propertyId },
        data: {
          name: data.name.trim(),
          headline: data.headline?.trim() || null,
          description: data.description.trim(),
          address: data.address.trim(),
          city: data.city.trim(),
          state: data.state.trim(),
          country: data.country.trim(),
          postalCode: data.postalCode.trim(),
          latitude: data.latitude || null,
          longitude: data.longitude || null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PROPERTY_UPDATE_GENERAL",
          entityType: "Property",
          entityId: propertyId,
          userId: authCheck.user?.id,
          userEmail: authCheck.user?.email,
          metadata: { name: prop.name, city: prop.city },
        },
      });

      return prop;
    });

    revalidatePath(`/admin/properties/${propertyId}`);
    revalidatePath("/admin/properties");
    revalidatePath(`/properties/${updated.slug}`);
    revalidatePath("/");

    return { success: true, message: "General information updated successfully." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to update: ${msg}` };
  }
}

/**
 * Updates property operational policies, check-in times and house rules.
 */
export async function updatePropertyPolicies(
  propertyId: string,
  data: {
    checkInTime: string;
    checkOutTime: string;
    houseRules?: string;
    cancellationPolicy?: string;
  }
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id: propertyId },
        data: {
          checkInTime: data.checkInTime.trim(),
          checkOutTime: data.checkOutTime.trim(),
          houseRules: data.houseRules?.trim() || null,
          cancellationPolicy: data.cancellationPolicy?.trim() || null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PROPERTY_UPDATE_POLICIES",
          entityType: "Property",
          entityId: propertyId,
          userId: authCheck.user?.id,
          userEmail: authCheck.user?.email,
        },
      });
    });

    revalidatePath(`/admin/properties/${propertyId}`);
    revalidatePath("/admin/properties");

    return { success: true, message: "Policies and hours updated successfully." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to update policies: ${msg}` };
  }
}

/**
 * Updates a specific ListingOption (room configuration) while strictly preserving
 * its physical inventory group relation.
 */
export async function updateListingConfiguration(
  propertyId: string,
  configId: string,
  data: {
    title: string;
    bedroomCount: number;
    bathroomCount: number;
    maxGuests: number;
    basePricePerNight: number;
    weekendPricePerNight?: number | null;
    cleaningFee?: number;
    taxPercentage?: number;
    summary?: string;
    description?: string;
    isActive: boolean;
  }
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const config = await tx.listingOption.update({
        where: { id: configId },
        data: {
          title: data.title.trim(),
          bedroomCount: data.bedroomCount,
          bathroomCount: data.bathroomCount,
          maxGuests: data.maxGuests,
          basePricePerNight: data.basePricePerNight,
          weekendPricePerNight: data.weekendPricePerNight || null,
          cleaningFee: data.cleaningFee || 0,
          taxPercentage: data.taxPercentage || 12,
          summary: data.summary?.trim() || null,
          description: data.description?.trim() || "",
          isActive: data.isActive,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "CONFIGURATION_UPDATE",
          entityType: "ListingOption",
          entityId: configId,
          userId: authCheck.user?.id,
          userEmail: authCheck.user?.email,
          metadata: {
            title: config.title,
            basePrice: data.basePricePerNight,
            isActive: data.isActive,
          },
        },
      });
    });

    revalidatePath(`/admin/properties/${propertyId}`);
    revalidatePath("/admin/properties");
    revalidatePath("/");

    return { success: true, message: "Room configuration updated successfully." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to update configuration: ${msg}` };
  }
}

/**
 * Adds an amenity to the property.
 */
export async function addPropertyAmenity(
  propertyId: string,
  name: string
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  const cleanName = name.trim();
  if (!cleanName) {
    return { success: false, error: "Amenity name cannot be empty." };
  }

  try {
    await prisma.amenity.create({
      data: {
        propertyId,
        name: cleanName,
        isFeatured: true,
      },
    });

    revalidatePath(`/admin/properties/${propertyId}`);
    return { success: true, message: `Added "${cleanName}".` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to add amenity: ${msg}` };
  }
}

/**
 * Removes an amenity from the property.
 */
export async function removePropertyAmenity(
  propertyId: string,
  amenityId: string
): Promise<ActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    await prisma.amenity.delete({
      where: { id: amenityId },
    });

    revalidatePath(`/admin/properties/${propertyId}`);
    return { success: true, message: "Amenity removed." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to remove amenity: ${msg}` };
  }
}
