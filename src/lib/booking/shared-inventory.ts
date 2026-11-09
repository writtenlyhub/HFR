import { prisma } from "@/lib/prisma";
import { BookingStatus, BlockReason, BookingSource } from "@prisma/client";
import crypto from "crypto";

export interface CheckAvailabilityParams {
  propertySlug?: string;
  propertyId?: string;
  listingOptionId?: string;
  listingOptionSlug?: string;
  checkInDate: string | Date; // YYYY-MM-DD
  checkOutDate: string | Date; // YYYY-MM-DD
  guestCount: number;
}

export interface PricingBreakdown {
  nights: number;
  basePricePerNight: number;
  cleaningFee: number;
  taxPercentage: number;
  baseAmount: number;
  taxesAmount: number;
  totalAmount: number;
  currency: string;
}

export interface AvailabilityResult {
  available: boolean;
  reason?: string;
  pricing?: PricingBreakdown;
  selectedOption?: {
    id: string;
    slug: string;
    title: string;
    maxGuests: number;
    bedroomCount: number;
    bathroomCount: number;
    basePricePerNight: number;
  };
  sharedInventoryBlocked: boolean;
  allConfigurations: Array<{
    id: string;
    slug: string;
    title: string;
    maxGuests: number;
    basePricePerNight: number;
    isAvailable: boolean;
    reason?: string;
  }>;
}

export interface CreateHoldParams {
  listingOptionId?: string;
  listingOptionSlug?: string;
  checkInDate: string | Date;
  checkOutDate: string | Date;
  guestCount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  specialRequests?: string;
  idempotencyKey?: string;
}

export interface HoldResult {
  success: boolean;
  holdId?: string;
  holdToken?: string;
  bookingReference?: string;
  holdExpiresAt?: Date;
  expiresInSeconds?: number;
  pricing?: PricingBreakdown;
  error?: string;
}

/**
 * Normalizes a date to UTC midnight for consistent day-boundary checks.
 */
export function normalizeDate(input: string | Date): Date {
  if (typeof input === "string") {
    const parts = input.split("T")[0].split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  }
  return new Date(
    Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0, 0)
  );
}

/**
 * Cleans up any expired holds in PostgreSQL that are past their expiration timestamp.
 */
export async function cleanupExpiredHolds(): Promise<number> {
  const now = new Date();

  // Find expired holds
  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.PENDING_HOLD,
      holdExpiresAt: { lte: now },
    },
    select: { id: true, bookingReference: true },
  });

  if (expiredBookings.length === 0) return 0;

  const ids = expiredBookings.map((b) => b.id);

  await prisma.$transaction(async (tx) => {
    // 1. Delete associated availability blocks
    await tx.availabilityBlock.deleteMany({
      where: {
        bookingId: { in: ids },
        reason: BlockReason.BOOKING_HOLD,
      },
    });

    // 2. Mark bookings as HOLD_EXPIRED
    await tx.booking.updateMany({
      where: { id: { in: ids } },
      data: { status: BookingStatus.HOLD_EXPIRED },
    });

    // 3. Log audit entries
    for (const b of expiredBookings) {
      await tx.auditLog.create({
        data: {
          action: "HOLD_EXPIRED_CLEANUP",
          entityType: "Booking",
          entityId: b.id,
          metadata: { bookingReference: b.bookingReference },
        },
      });
    }
  });

  return expiredBookings.length;
}

/**
 * Checks availability against PostgreSQL shared inventory rules.
 */
export async function checkAvailability(
  params: CheckAvailabilityParams
): Promise<AvailabilityResult> {
  // First, prune any stale expired holds
  await cleanupExpiredHolds();

  const checkIn = normalizeDate(params.checkInDate);
  const checkOut = normalizeDate(params.checkOutDate);
  const now = new Date();

  // Validation
  if (checkIn.getTime() >= checkOut.getTime()) {
    return {
      available: false,
      reason: "Check-out date must be strictly after check-in date.",
      sharedInventoryBlocked: false,
      allConfigurations: [],
    };
  }

  // 1. Fetch Property & all configurations
  const property = await prisma.property.findFirst({
    where: params.propertyId
      ? { id: params.propertyId }
      : { slug: params.propertySlug || "dev-stays-jaipur" },
    include: {
      inventoryGroups: true,
      listingOptions: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!property || property.inventoryGroups.length === 0) {
    return {
      available: false,
      reason: "Property or inventory configuration not found.",
      sharedInventoryBlocked: false,
      allConfigurations: [],
    };
  }

  // The shared physical estate inventory group
  const inventoryGroup = property.inventoryGroups[0];

  // 2. Check for overlapping blocks on the shared inventory group
  // Half-open interval: block.startDate < checkOut AND block.endDate > checkIn
  const overlappingBlocks = await prisma.availabilityBlock.findMany({
    where: {
      inventoryGroupId: inventoryGroup.id,
      startDate: { lt: checkOut },
      endDate: { gt: checkIn },
      OR: [
        { reason: { not: BlockReason.BOOKING_HOLD } }, // Confirmed, external, maintenance are always active
        {
          reason: BlockReason.BOOKING_HOLD,
          expiresAt: { gt: now }, // Active hold not yet expired
        },
      ],
    },
    include: {
      booking: true,
    },
  });

  const isSharedInventoryBlocked = overlappingBlocks.length > 0;

  // Find target configuration
  let targetOption = property.listingOptions[0];
  if (params.listingOptionId) {
    const found = property.listingOptions.find((o) => o.id === params.listingOptionId);
    if (found) targetOption = found;
  } else if (params.listingOptionSlug) {
    const found = property.listingOptions.find((o) => o.slug === params.listingOptionSlug);
    if (found) targetOption = found;
  }

  // Calculate pricing
  const nights = Math.max(
    1,
    Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  );
  const baseRate = Number(targetOption.basePricePerNight);
  const cleaningFee = Number(targetOption.cleaningFee);
  const taxPct = Number(targetOption.taxPercentage);

  const baseAmount = baseRate * nights;
  const taxableTotal = baseAmount + cleaningFee;
  const taxesAmount = Math.round((taxableTotal * taxPct) / 100);
  const totalAmount = taxableTotal + taxesAmount;

  const pricing: PricingBreakdown = {
    nights,
    basePricePerNight: baseRate,
    cleaningFee,
    taxPercentage: taxPct,
    baseAmount,
    taxesAmount,
    totalAmount,
    currency: "INR",
  };

  // Evaluate each configuration
  const allConfigs = property.listingOptions.map((opt) => {
    let isOptAvailable = !isSharedInventoryBlocked;
    let optReason: string | undefined = undefined;

    if (isSharedInventoryBlocked) {
      const activeHold = overlappingBlocks.find(
        (b) => b.reason === BlockReason.BOOKING_HOLD
      );
      if (activeHold) {
        optReason = "Dates are currently under temporary reservation hold.";
      } else {
        optReason = "Dates are fully booked by an exclusive reservation.";
      }
    } else if (params.guestCount > opt.maxGuests) {
      isOptAvailable = false;
      optReason = `Exceeds max capacity (${opt.maxGuests} guests maximum).`;
    }

    return {
      id: opt.id,
      slug: opt.slug,
      title: opt.title,
      maxGuests: opt.maxGuests,
      basePricePerNight: Number(opt.basePricePerNight),
      isAvailable: isOptAvailable,
      reason: optReason,
    };
  });

  // Evaluate selected configuration
  let available = !isSharedInventoryBlocked;
  let reason: string | undefined = undefined;

  if (isSharedInventoryBlocked) {
    const holdBlock = overlappingBlocks.find(
      (b) => b.reason === BlockReason.BOOKING_HOLD
    );
    reason = holdBlock
      ? "These dates are currently held by another customer. Please check back shortly or choose alternate dates."
      : "The estate is already reserved for overlapping dates.";
  } else if (params.guestCount > targetOption.maxGuests) {
    available = false;
    reason = `Selected configuration accommodates up to ${targetOption.maxGuests} guests. You requested ${params.guestCount} guests.`;
  }

  return {
    available,
    reason,
    pricing,
    selectedOption: {
      id: targetOption.id,
      slug: targetOption.slug,
      title: targetOption.title,
      maxGuests: targetOption.maxGuests,
      bedroomCount: targetOption.bedroomCount,
      bathroomCount: targetOption.bathroomCount,
      basePricePerNight: baseRate,
    },
    sharedInventoryBlocked: isSharedInventoryBlocked,
    allConfigurations: allConfigs,
  };
}

/**
 * Creates a 15-minute temporary inventory hold using PostgreSQL transactions and row-level locking.
 */
export async function createBookingHold(params: CreateHoldParams): Promise<HoldResult> {
  const checkIn = normalizeDate(params.checkInDate);
  const checkOut = normalizeDate(params.checkOutDate);

  if (checkIn.getTime() >= checkOut.getTime()) {
    return {
      success: false,
      error: "Check-out date must be after check-in date.",
    };
  }

  // Idempotency check: if an idempotency key was sent and already holds this booking
  if (params.idempotencyKey) {
    const existing = await prisma.booking.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing && existing.status === BookingStatus.PENDING_HOLD) {
      const now = new Date();
      if (existing.holdExpiresAt && existing.holdExpiresAt > now) {
        return {
          success: true,
          holdId: existing.id,
          holdToken: existing.holdToken || undefined,
          bookingReference: existing.bookingReference,
          holdExpiresAt: existing.holdExpiresAt,
          expiresInSeconds: Math.max(
            0,
            Math.floor((existing.holdExpiresAt.getTime() - now.getTime()) / 1000)
          ),
          pricing: {
            nights: existing.nights,
            basePricePerNight: Number(existing.baseAmount) / existing.nights,
            cleaningFee: 0,
            taxPercentage: 12,
            baseAmount: Number(existing.baseAmount),
            taxesAmount: Number(existing.taxesAmount),
            totalAmount: Number(existing.totalAmount),
            currency: existing.currency,
          },
        };
      }
    }
  }

  // 1. Fetch target listing configuration and property
  const listingOption = await prisma.listingOption.findFirst({
    where: params.listingOptionId
      ? { id: params.listingOptionId }
      : { slug: params.listingOptionSlug || "full-estate-buyout" },
    include: {
      property: true,
      inventoryGroup: true,
    },
  });

  if (!listingOption) {
    return {
      success: false,
      error: "Accommodation configuration not found.",
    };
  }

  if (params.guestCount > listingOption.maxGuests) {
    return {
      success: false,
      error: `Capacity exceeded: This option supports up to ${listingOption.maxGuests} guests.`,
    };
  }

  const inventoryGroupId = listingOption.inventoryGroupId;
  const nights = Math.max(
    1,
    Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  );

  const baseRate = Number(listingOption.basePricePerNight);
  const cleaningFee = Number(listingOption.cleaningFee);
  const taxPct = Number(listingOption.taxPercentage);
  const baseAmount = baseRate * nights;
  const taxableTotal = baseAmount + cleaningFee;
  const taxesAmount = Math.round((taxableTotal * taxPct) / 100);
  const totalAmount = taxableTotal + taxesAmount;

  const now = new Date();
  const holdExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15-minute hold

  // Generate unique booking reference: HFR-YYYY-XXXXXX and secure unguessable hold token
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const bookingReference = `HFR-${new Date().getFullYear()}-${randomSuffix}`;
  const holdToken = crypto.randomBytes(32).toString("hex");

  try {
    // 2. Transaction with PostgreSQL Row-Level Lock
    const booking = await prisma.$transaction(
      async (tx) => {
        // PESSIMISTIC ROW-LEVEL LOCK: Lock the shared inventory group record
        // This serializes any concurrent attempts to book or hold the same physical inventory!
        const lockedInventory = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM inventory_groups 
          WHERE id = ${inventoryGroupId} 
          FOR UPDATE
        `;

        if (!lockedInventory || lockedInventory.length === 0) {
          throw new Error("INVENTORY_NOT_FOUND");
        }

        // Check for conflicting availability blocks within the locked transaction
        // Half-open interval: block.startDate < checkOut AND block.endDate > checkIn
        const conflicts = await tx.availabilityBlock.findMany({
          where: {
            inventoryGroupId,
            startDate: { lt: checkOut },
            endDate: { gt: checkIn },
            OR: [
              { reason: { not: BlockReason.BOOKING_HOLD } },
              {
                reason: BlockReason.BOOKING_HOLD,
                expiresAt: { gt: now },
              },
            ],
          },
        });

        if (conflicts.length > 0) {
          throw new Error("INVENTORY_UNAVAILABLE");
        }

        // Create the booking record in PENDING_HOLD status
        const newBooking = await tx.booking.create({
          data: {
            bookingReference,
            propertyId: listingOption.propertyId,
            listingOptionId: listingOption.id,
            inventoryGroupId,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            nights,
            guestCount: params.guestCount,
            customerName: params.customerName,
            customerEmail: params.customerEmail,
            customerPhone: params.customerPhone || null,
            specialRequests: params.specialRequests || null,
            status: BookingStatus.PENDING_HOLD,
            holdExpiresAt,
            holdToken,
            idempotencyKey: params.idempotencyKey || null,
            currency: "INR",
            baseAmount,
            taxesAmount,
            totalAmount,
            source: BookingSource.DIRECT_WEB,
          },
        });

        // Create the associated availability block on the SHARED inventory group
        await tx.availabilityBlock.create({
          data: {
            inventoryGroupId,
            bookingId: newBooking.id,
            startDate: checkIn,
            endDate: checkOut,
            reason: BlockReason.BOOKING_HOLD,
            expiresAt: holdExpiresAt,
            notes: `Temporary 15-minute hold for ${bookingReference} (${params.customerName})`,
          },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            userEmail: params.customerEmail,
            action: "HOLD_CREATED",
            entityType: "Booking",
            entityId: newBooking.id,
            metadata: {
              bookingReference,
              checkIn: checkIn.toISOString(),
              checkOut: checkOut.toISOString(),
              totalAmount,
              holdExpiresAt: holdExpiresAt.toISOString(),
            },
          },
        });

        return newBooking;
      },
      {
        timeout: 10000, // 10 second transaction timeout
      }
    );

    // Schedule automated BullMQ background hold expiration
    try {
      const { scheduleHoldExpiration } = await import("@/lib/queue/hold-queue");
      await scheduleHoldExpiration(booking.id, booking.bookingReference);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[BookingEngine] BullMQ schedule failed, relying on DB cleanup:", msg);
    }

    return {
      success: true,
      holdId: booking.id,
      holdToken: booking.holdToken || holdToken,
      bookingReference: booking.bookingReference,
      holdExpiresAt: booking.holdExpiresAt!,
      expiresInSeconds: 15 * 60,
      pricing: {
        nights,
        basePricePerNight: baseRate,
        cleaningFee,
        taxPercentage: taxPct,
        baseAmount,
        taxesAmount,
        totalAmount,
        currency: "INR",
      },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "";
    if (errorMsg === "INVENTORY_UNAVAILABLE") {
      return {
        success: false,
        error:
          "These dates were just reserved or held by another guest. Please select alternative dates.",
      };
    }
    console.error("[BookingEngine] Hold creation failed:", error);
    return {
      success: false,
      error: "An unexpected error occurred while locking inventory. Please try again.",
    };
  }
}

/**
 * Releases a hold when it expires or is cancelled.
 */
export async function releaseHold(bookingId: string): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    // Acquire row-level lock on the booking to serialize against payment confirmation
    const locked = await tx.$queryRaw<Array<{ id: string; status: string; booking_reference: string }>>`
      SELECT id, status, booking_reference FROM bookings WHERE id = ${bookingId} FOR UPDATE
    `;

    if (!locked || locked.length === 0) return false;
    const booking = locked[0];

    // Only release if still in PENDING_HOLD (never release a confirmed or paying booking!)
    if (booking.status !== BookingStatus.PENDING_HOLD) {
      return false;
    }

    // Delete availability blocks
    await tx.availabilityBlock.deleteMany({
      where: {
        bookingId,
        reason: BlockReason.BOOKING_HOLD,
      },
    });

    // Update status
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.HOLD_EXPIRED,
      },
    });

    await tx.auditLog.create({
      data: {
        action: "HOLD_RELEASED",
        entityType: "Booking",
        entityId: bookingId,
        metadata: { bookingReference: booking.booking_reference },
      },
    });

    return true;
  });
}
