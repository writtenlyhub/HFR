"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/auth";
import { BlockReason, BookingStatus } from "@prisma/client";
import { revalidatePath as nextRevalidatePath } from "next/cache";
import {
  getCalendarMonthAvailability,
  checkBlockCollisions,
  normalizeDateOnly,
  MonthAvailabilitySummary,
} from "@/lib/availability/availability-service";
import { syncCalendarConnection, SyncResult } from "@/lib/calendar/sync-service";
import { formatDateKey } from "@/lib/pricing/pricing-engine";

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
  data?: T;
}

export interface CreateBlockInput {
  propertyId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (check-out boundary)
  reason: "ADMIN_MAINTENANCE" | "SEASONAL_CLOSURE" | "ADMIN_BLOCKED";
  notes?: string;
}

/**
 * Creates an administrative, maintenance, or seasonal availability block on shared inventory.
 * Strictly prevents collisions with confirmed guest reservations or active holds.
 */
export async function createDateBlock(input: CreateBlockInput): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  const start = normalizeDateOnly(input.startDate);
  const end = normalizeDateOnly(input.endDate);

  if (start.getTime() >= end.getTime()) {
    return {
      success: false,
      error: "End date must be strictly after start date (minimum 1 night).",
    };
  }

  try {
    const property = await prisma.property.findUnique({
      where: { id: input.propertyId },
      include: { inventoryGroups: true },
    });

    if (!property || property.inventoryGroups.length === 0) {
      return { success: false, error: "Property or physical inventory group not found." };
    }

    const inventoryGroup = property.inventoryGroups[0];

    // Pre-flight Collision Check
    const collisions = await checkBlockCollisions(inventoryGroup.id, start, end);

    if (collisions.hasConfirmedBooking) {
      const firstConflict = collisions.confirmedConflicts[0];
      return {
        success: false,
        error: `Cannot block dates: A confirmed reservation already exists (${firstConflict.bookingReference} for ${firstConflict.customerName}). Confirmed reservations must never be overwritten.`,
      };
    }

    if (collisions.hasActiveHold) {
      const firstHold = collisions.holdConflicts[0];
      return {
        success: false,
        error: `Cannot block dates: A 15-minute guest checkout hold is currently active (${firstHold.bookingReference}). Please wait for the hold to conclude or expire.`,
      };
    }

    let blockReason: BlockReason = BlockReason.ADMIN_BLOCKED;
    if (input.reason === "ADMIN_MAINTENANCE") {
      blockReason = BlockReason.ADMIN_MAINTENANCE;
    } else if (input.reason === "SEASONAL_CLOSURE") {
      blockReason = BlockReason.SEASONAL_CLOSURE;
    }

    const created = await prisma.$transaction(async (tx) => {
      const block = await tx.availabilityBlock.create({
        data: {
          inventoryGroupId: inventoryGroup.id,
          startDate: start,
          endDate: end,
          reason: blockReason,
          notes: input.notes?.trim() || null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "AVAILABILITY_BLOCK_CREATED",
          entityType: "AvailabilityBlock",
          entityId: block.id,
          userId: auth.user?.id,
          userEmail: auth.user?.email,
          metadata: {
            propertyId: property.id,
            propertyName: property.name,
            inventoryGroupCode: inventoryGroup.code,
            reason: block.reason,
            startDate: formatDateKey(start),
            endDate: formatDateKey(end),
            notes: block.notes,
          },
        },
      });

      return block;
    });

    safeRevalidatePath("/admin/calendar");
    safeRevalidatePath("/admin/calendar-sync");
    safeRevalidatePath(`/admin/properties/${property.id}`);
    safeRevalidatePath(`/properties/${property.slug}`);
    safeRevalidatePath("/");

    return {
      success: true,
      message: `Availability block (${input.reason.replace("_", " ")}) successfully applied from ${formatDateKey(start)} to ${formatDateKey(end)}.`,
      data: created,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to create availability block: ${msg}` };
  }
}

/**
 * Removes a manual availability block, returning the dates to available inventory.
 * Strictly forbids removing blocks tied to active confirmed bookings.
 */
export async function removeDateBlock(blockId: string): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const block = await prisma.availabilityBlock.findUnique({
      where: { id: blockId },
      include: {
        inventoryGroup: {
          include: { property: true },
        },
        booking: true,
      },
    });

    if (!block) {
      return { success: false, error: "Availability block not found." };
    }

    if (
      block.reason === BlockReason.BOOKING_CONFIRMED ||
      block.reason === BlockReason.BOOKING_HOLD
    ) {
      return {
        success: false,
        error:
          "Cannot remove an availability block tied to a guest booking. Manage reservation cancellations through the Bookings management module.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.availabilityBlock.delete({ where: { id: blockId } });

      await tx.auditLog.create({
        data: {
          action: "AVAILABILITY_BLOCK_REMOVED",
          entityType: "AvailabilityBlock",
          entityId: blockId,
          userId: auth.user?.id,
          userEmail: auth.user?.email,
          metadata: {
            reason: block.reason,
            startDate: formatDateKey(block.startDate),
            endDate: formatDateKey(block.endDate),
            notes: block.notes,
            inventoryGroupCode: block.inventoryGroup.code,
            propertyName: block.inventoryGroup.property.name,
          },
        },
      });
    });

    safeRevalidatePath("/admin/calendar");
    safeRevalidatePath("/admin/calendar-sync");
    safeRevalidatePath(`/admin/properties/${block.inventoryGroup.property.id}`);
    safeRevalidatePath(`/properties/${block.inventoryGroup.property.slug}`);
    safeRevalidatePath("/");

    return {
      success: true,
      message: "Availability block successfully removed. Dates are now open for reservations.",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to remove availability block: ${msg}` };
  }
}

/**
 * Triggers manual synchronization of an external iCal channel.
 */
export async function triggerExternalCalendarSync(connectionId: string): Promise<ActionResult<SyncResult>> {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const result = await syncCalendarConnection(connectionId);

    await prisma.auditLog.create({
      data: {
        action: "MANUAL_CALENDAR_SYNC_TRIGGERED",
        entityType: "ExternalCalendarConnection",
        entityId: connectionId,
        userId: auth.user?.id,
        userEmail: auth.user?.email,
        metadata: {
          success: result.success,
          eventsProcessed: result.eventsProcessed,
          eventsCreated: result.eventsCreated,
          conflictsDetected: result.conflictsDetected,
        },
      },
    });

    safeRevalidatePath("/admin/calendar");
    safeRevalidatePath("/admin/calendar-sync");

    return {
      success: result.success,
      message: `Synchronized ${result.connectionName}: ${result.eventsProcessed} events processed, ${result.eventsCreated} new blocks added.`,
      data: result,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Synchronization failed: ${msg}` };
  }
}

/**
 * Fetches complete monthly availability summary on demand.
 */
export async function fetchMonthAvailability(
  propertyId: string,
  listingOptionId: string | null,
  year: number,
  month: number
): Promise<ActionResult<MonthAvailabilitySummary>> {
  try {
    const summary = await getCalendarMonthAvailability(propertyId, listingOptionId, year, month);
    return { success: true, data: summary };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to fetch availability: ${msg}` };
  }
}
