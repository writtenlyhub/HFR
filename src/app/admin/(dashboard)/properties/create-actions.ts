"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/auth";
import { revalidatePath } from "next/cache";

export interface CreatePropertyInput {
  name: string;
  slug: string;
  headline?: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  checkInTime?: string;
  checkOutTime?: string;
  houseRules?: string;
  cancellationPolicy?: string;
  isActive: boolean; // false = DRAFT, true = PUBLISHED
  // Initial configuration to ensure physical inventory isolation
  initialConfigTitle: string;
  initialBedrooms: number;
  initialBathrooms: number;
  initialMaxGuests: number;
  initialBasePrice: number;
  selectedAmenities?: string[];
}

export interface CreatePropertyResult {
  success: boolean;
  propertyId?: string;
  slug?: string;
  error?: string;
}

export async function createNewProperty(
  input: CreatePropertyInput
): Promise<CreatePropertyResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  // 1. Rigorous input validation
  const cleanName = input.name.trim();
  const cleanSlug = input.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!cleanName || cleanName.length < 3) {
    return { success: false, error: "Property name must be at least 3 characters." };
  }

  if (!cleanSlug || cleanSlug.length < 3) {
    return { success: false, error: "Valid URL slug is required (alphanumeric and dashes)." };
  }

  if (!input.address.trim() || !input.city.trim() || !input.postalCode.trim()) {
    return { success: false, error: "Complete address, city, and postal code are required." };
  }

  if (input.initialBasePrice <= 0) {
    return { success: false, error: "Base nightly price must be greater than zero." };
  }

  // 2. Slug uniqueness check
  const existing = await prisma.property.findUnique({
    where: { slug: cleanSlug },
  });
  if (existing) {
    return {
      success: false,
      error: `A property with slug "${cleanSlug}" already exists. Please choose a unique slug.`,
    };
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Step A: Create Property record
      const prop = await tx.property.create({
        data: {
          name: cleanName,
          slug: cleanSlug,
          headline: input.headline?.trim() || null,
          description: input.description.trim() || "A luxury hospitality retreat in Rajasthan.",
          address: input.address.trim(),
          city: input.city.trim(),
          state: input.state.trim() || "Rajasthan",
          country: input.country?.trim() || "India",
          postalCode: input.postalCode.trim(),
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          checkInTime: input.checkInTime || "14:00",
          checkOutTime: input.checkOutTime || "11:00",
          houseRules: input.houseRules?.trim() || null,
          cancellationPolicy:
            input.cancellationPolicy?.trim() ||
            "Full refund up to 7 days before check-in. 50% refund between 7 days and 48 hours prior to check-in.",
          isActive: input.isActive,
        },
      });

      // Step B: Create DEDICATED, ISOLATED InventoryGroup
      // Ensures new properties NEVER accidentally share inventory with existing estates!
      const inventoryGroupCode = `${cleanSlug.toUpperCase()}-ESTATE`;
      const inventoryGroup = await tx.inventoryGroup.create({
        data: {
          propertyId: prop.id,
          name: `${cleanName} Physical Estate`,
          code: inventoryGroupCode,
          totalPhysicalUnits: 1,
          description: `Dedicated physical estate footprint for ${cleanName}.`,
        },
      });

      // Step C: Create Primary ListingOption tied to this dedicated InventoryGroup
      const configSlug = `${cleanSlug}-entire-estate`;
      await tx.listingOption.create({
        data: {
          propertyId: prop.id,
          inventoryGroupId: inventoryGroup.id,
          slug: configSlug,
          title: input.initialConfigTitle.trim() || "Entire Estate",
          bedroomCount: input.initialBedrooms || 1,
          bathroomCount: input.initialBathrooms || 1,
          maxGuests: input.initialMaxGuests || 2,
          basePricePerNight: input.initialBasePrice,
          cleaningFee: 0,
          taxPercentage: 12,
          description: `Complete private accommodation at ${cleanName}.`,
          summary: `Private accommodation accommodating up to ${input.initialMaxGuests || 2} guests.`,
          isActive: true,
          sortOrder: 1,
        },
      });

      // Step D: Add default amenities if provided
      if (input.selectedAmenities && input.selectedAmenities.length > 0) {
        for (const amenityName of input.selectedAmenities) {
          await tx.amenity.create({
            data: {
              propertyId: prop.id,
              name: amenityName,
              isFeatured: true,
            },
          });
        }
      }

      // Step E: Create AuditLog
      await tx.auditLog.create({
        data: {
          action: "PROPERTY_CREATE",
          entityType: "Property",
          entityId: prop.id,
          userId: authCheck.user?.id,
          userEmail: authCheck.user?.email,
          metadata: {
            name: prop.name,
            slug: prop.slug,
            inventoryGroupCode,
            status: prop.isActive ? "PUBLISHED" : "DRAFT",
          },
        },
      });

      return prop;
    });

    revalidatePath("/admin/properties");
    revalidatePath("/admin/dashboard");
    revalidatePath("/");

    return {
      success: true,
      propertyId: created.id,
      slug: created.slug,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to create property: ${msg}` };
  }
}
