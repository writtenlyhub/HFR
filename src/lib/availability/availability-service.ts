import { prisma } from "@/lib/prisma";
import { BlockReason, BookingStatus } from "@prisma/client";
import { throttledCleanupExpiredHolds, normalizeDate } from "@/lib/booking/shared-inventory";
import { formatDateKey } from "@/lib/pricing/pricing-engine";

export type DayAvailabilityStatus =
  | "AVAILABLE"
  | "BOOKED"
  | "PENDING_HOLD"
  | "ADMIN_MAINTENANCE"
  | "SEASONAL_CLOSURE"
  | "ADMIN_BLOCKED"
  | "EXTERNAL_RESERVATION";

export interface DayAvailabilityDetail {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  isWeekend: boolean;
  status: DayAvailabilityStatus;
  isAvailable: boolean;
  blockId?: string;
  bookingId?: string;
  bookingReference?: string;
  customerName?: string;
  guestCount?: number;
  totalAmount?: number;
  bookingStatus?: string;
  blockReason?: string;
  notes?: string;
  externalPlatform?: string;
  externalSummary?: string;
  externalUid?: string;
  expiresAt?: string;
}

export interface MonthAvailabilitySummary {
  propertyId: string;
  propertyName: string;
  inventoryGroupId: string;
  year: number;
  month: number;
  totalDays: number;
  availableDays: number;
  bookedDays: number;
  heldDays: number;
  blockedDays: number;
  externalDays: number;
  days: DayAvailabilityDetail[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Normalizes date to UTC midnight.
 */
export function normalizeDateOnly(input: string | Date): Date {
  return normalizeDate(input);
}

/**
 * Evaluates the full availability state for every day of a calendar month
 * respecting hierarchical shared inventory.
 */
export async function getCalendarMonthAvailability(
  propertyId: string,
  listingOptionId: string | null,
  year: number,
  month: number // 1..12
): Promise<MonthAvailabilitySummary> {
  // Prune expired holds first
  await throttledCleanupExpiredHolds();

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      inventoryGroups: true,
      listingOptions: true,
    },
  });

  if (!property || property.inventoryGroups.length === 0) {
    throw new Error(`Property or InventoryGroup not found for ID: ${propertyId}`);
  }

  // Hierarchical Shared Inventory Footprint
  const inventoryGroup = property.inventoryGroups[0];
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const now = new Date();

  // Query all active availability blocks for this inventory group covering this month
  const blocks = await prisma.availabilityBlock.findMany({
    where: {
      inventoryGroupId: inventoryGroup.id,
      startDate: { lte: endOfMonth },
      endDate: { gte: startOfMonth },
      OR: [
        { reason: { not: BlockReason.BOOKING_HOLD } },
        {
          reason: BlockReason.BOOKING_HOLD,
          expiresAt: { gt: now },
        },
      ],
    },
    include: {
      booking: {
        select: {
          id: true,
          bookingReference: true,
          customerName: true,
          customerEmail: true,
          guestCount: true,
          totalAmount: true,
          status: true,
          source: true,
        },
      },
      externalCalendarConnection: {
        select: {
          platform: true,
          connectionName: true,
        },
      },
      externalCalendarEvent: {
        select: {
          summary: true,
          externalUid: true,
        },
      },
    },
  });

  const days: DayAvailabilityDetail[] = [];
  let availableDays = 0;
  let bookedDays = 0;
  let heldDays = 0;
  let blockedDays = 0;
  let externalDays = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const currentDay = new Date(Date.UTC(year, month - 1, d, 0, 0, 0, 0));
    const nextDay = new Date(Date.UTC(year, month - 1, d + 1, 0, 0, 0, 0));
    const dateStr = formatDateKey(currentDay);
    const dayOfWeek = DAY_NAMES[currentDay.getUTCDay()];
    const isWeekend = currentDay.getUTCDay() === 5 || currentDay.getUTCDay() === 6;

    // Check if any block overlaps this night (currentDay to nextDay)
    const matchingBlock = blocks.find((b) => {
      const bStart = normalizeDateOnly(b.startDate).getTime();
      const bEnd = normalizeDateOnly(b.endDate).getTime();
      const cTime = currentDay.getTime();
      return cTime >= bStart && cTime < bEnd;
    });

    if (!matchingBlock) {
      availableDays++;
      days.push({
        date: dateStr,
        dayOfWeek,
        isWeekend,
        status: "AVAILABLE",
        isAvailable: true,
      });
      continue;
    }

    // Classify block status
    let status: DayAvailabilityStatus = "ADMIN_BLOCKED";
    const reason = matchingBlock.reason;

    if (reason === BlockReason.BOOKING_CONFIRMED) {
      status = "BOOKED";
      bookedDays++;
    } else if (reason === BlockReason.BOOKING_HOLD) {
      status = "PENDING_HOLD";
      heldDays++;
    } else if (reason === BlockReason.ADMIN_MAINTENANCE) {
      status = "ADMIN_MAINTENANCE";
      blockedDays++;
    } else if (reason === BlockReason.SEASONAL_CLOSURE) {
      status = "SEASONAL_CLOSURE";
      blockedDays++;
    } else if (
      reason === BlockReason.EXTERNAL_AIRBNB ||
      reason === BlockReason.EXTERNAL_CALENDAR ||
      reason === BlockReason.EXTERNAL_BOOKING
    ) {
      status = "EXTERNAL_RESERVATION";
      externalDays++;
    } else {
      status = "ADMIN_BLOCKED";
      blockedDays++;
    }

    days.push({
      date: dateStr,
      dayOfWeek,
      isWeekend,
      status,
      isAvailable: false,
      blockId: matchingBlock.id,
      bookingId: matchingBlock.booking?.id,
      bookingReference: matchingBlock.booking?.bookingReference,
      customerName: matchingBlock.booking?.customerName,
      guestCount: matchingBlock.booking?.guestCount,
      totalAmount: matchingBlock.booking?.totalAmount ? Number(matchingBlock.booking.totalAmount) : undefined,
      bookingStatus: matchingBlock.booking?.status,
      blockReason: matchingBlock.reason,
      notes: matchingBlock.notes || undefined,
      externalPlatform: matchingBlock.externalCalendarConnection?.platform,
      externalSummary: matchingBlock.externalCalendarEvent?.summary || undefined,
      externalUid: matchingBlock.externalCalendarEvent?.externalUid || undefined,
      expiresAt: matchingBlock.expiresAt?.toISOString(),
    });
  }

  return {
    propertyId,
    propertyName: property.name,
    inventoryGroupId: inventoryGroup.id,
    year,
    month,
    totalDays: daysInMonth,
    availableDays,
    bookedDays,
    heldDays,
    blockedDays,
    externalDays,
    days,
  };
}

/**
 * Checks for conflicts before creating an administrative availability block.
 */
export async function checkBlockCollisions(
  inventoryGroupId: string,
  startDate: Date,
  endDate: Date
) {
  const now = new Date();

  // 1. Confirmed bookings
  const confirmedConflicts = await prisma.booking.findMany({
    where: {
      inventoryGroupId,
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      checkInDate: { lt: endDate },
      checkOutDate: { gt: startDate },
    },
    select: {
      id: true,
      bookingReference: true,
      customerName: true,
      checkInDate: true,
      checkOutDate: true,
      status: true,
    },
  });

  // 2. Active holds
  const holdConflicts = await prisma.booking.findMany({
    where: {
      inventoryGroupId,
      status: BookingStatus.PENDING_HOLD,
      holdExpiresAt: { gt: now },
      checkInDate: { lt: endDate },
      checkOutDate: { gt: startDate },
    },
    select: {
      id: true,
      bookingReference: true,
      customerName: true,
      checkInDate: true,
      checkOutDate: true,
      holdExpiresAt: true,
    },
  });

  // 3. Existing blocks
  const existingBlocks = await prisma.availabilityBlock.findMany({
    where: {
      inventoryGroupId,
      startDate: { lt: endDate },
      endDate: { gt: startDate },
      reason: {
        in: [
          BlockReason.ADMIN_MAINTENANCE,
          BlockReason.SEASONAL_CLOSURE,
          BlockReason.ADMIN_BLOCKED,
          BlockReason.EXTERNAL_AIRBNB,
          BlockReason.EXTERNAL_CALENDAR,
        ],
      },
    },
    select: {
      id: true,
      reason: true,
      notes: true,
      startDate: true,
      endDate: true,
    },
  });

  return {
    hasConfirmedBooking: confirmedConflicts.length > 0,
    confirmedConflicts,
    hasActiveHold: holdConflicts.length > 0,
    holdConflicts,
    hasExistingBlocks: existingBlocks.length > 0,
    existingBlocks,
  };
}
