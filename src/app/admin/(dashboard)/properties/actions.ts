"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/auth";
import { revalidatePath } from "next/cache";

export interface PropertyActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Toggles a property between PUBLISHED (isActive = true) and DRAFT (isActive = false).
 */
export async function togglePropertyPublish(
  propertyId: string,
  currentlyActive: boolean
): Promise<PropertyActionResult> {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return { success: false, error: authCheck.error };
  }

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { listingOptions: true },
    });

    if (!property) {
      return { success: false, error: "Property not found" };
    }

    const nextState = !currentlyActive;

    // Safety validation before publishing: property must have at least one configuration
    if (nextState && property.listingOptions.length === 0) {
      return {
        success: false,
        error: "Cannot publish a property without at least one room configuration.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.property.update({
        where: { id: propertyId },
        data: { isActive: nextState },
      });

      await tx.auditLog.create({
        data: {
          action: nextState ? "PROPERTY_PUBLISH" : "PROPERTY_UNPUBLISH",
          entityType: "Property",
          entityId: propertyId,
          userId: authCheck.user?.id,
          userEmail: authCheck.user?.email,
          metadata: {
            propertyName: property.name,
            previousState: currentlyActive,
            newState: nextState,
          },
        },
      });
    });

    revalidatePath("/admin/properties");
    revalidatePath("/admin/dashboard");
    revalidatePath(`/admin/properties/${propertyId}`);
    revalidatePath("/");

    return {
      success: true,
      message: `Property is now ${nextState ? "Published live" : "saved as Draft"}.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to update status: ${msg}` };
  }
}
