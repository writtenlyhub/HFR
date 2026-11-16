"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/auth";
import { revalidatePath as nextRevalidatePath } from "next/cache";
import {
  calculateReservationPricing,
  getCalendarMonthPricing,
  normalizeDateOnly,
  formatDateKey,
  ReservationPricingCalculation,
  NightlyRateDetail,
} from "@/lib/pricing/pricing-engine";

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

export interface UpdateListingPricingInput {
  listingOptionId: string;
  basePricePerNight: number;
  weekendPricePerNight?: number | null;
  cleaningFee?: number;
  taxPercentage?: number;
  minStayNights?: number;
  extraGuestCharge?: number;
  standardGuests?: number | null;
}

export interface CreatePricingRuleInput {
  propertyId: string;
  listingOptionId?: string | null;
  name: string;
  ruleType?: "SEASONAL" | "HOLIDAY" | "OVERRIDE";
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  pricePerNight?: number | null;
  multiplier?: number | null;
  minStayNights?: number;
  isActive?: boolean;
}

export interface UpdatePricingRuleInput {
  ruleId: string;
  name?: string;
  ruleType?: "SEASONAL" | "HOLIDAY" | "OVERRIDE";
  description?: string;
  startDate?: string;
  endDate?: string;
  pricePerNight?: number | null;
  multiplier?: number | null;
  minStayNights?: number;
  isActive?: boolean;
}

/**
 * Updates base pricing, weekend rates, taxes, and length-of-stay minimums on a listing option.
 */
export async function updateListingPricingSettings(
  input: UpdateListingPricingInput
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  // 1. Server-side validations
  if (input.basePricePerNight <= 0) {
    return { success: false, error: "Base nightly price must be greater than ₹0." };
  }
  if (
    input.weekendPricePerNight !== undefined &&
    input.weekendPricePerNight !== null &&
    input.weekendPricePerNight < 0
  ) {
    return { success: false, error: "Weekend price cannot be negative." };
  }
  if (input.cleaningFee !== undefined && input.cleaningFee < 0) {
    return { success: false, error: "Cleaning fee cannot be negative." };
  }
  if (
    input.taxPercentage !== undefined &&
    (input.taxPercentage < 0 || input.taxPercentage > 50)
  ) {
    return { success: false, error: "Tax percentage must be between 0% and 50%." };
  }
  if (input.minStayNights !== undefined && input.minStayNights < 1) {
    return { success: false, error: "Minimum stay must be at least 1 night." };
  }
  if (input.extraGuestCharge !== undefined && input.extraGuestCharge < 0) {
    return { success: false, error: "Extra guest charge cannot be negative." };
  }

  try {
    const existing = await prisma.listingOption.findUnique({
      where: { id: input.listingOptionId },
      include: { property: true },
    });

    if (!existing) {
      return { success: false, error: "Listing option not found." };
    }

    const previousData = {
      basePricePerNight: Number(existing.basePricePerNight),
      weekendPricePerNight: existing.weekendPricePerNight ? Number(existing.weekendPricePerNight) : null,
      cleaningFee: Number(existing.cleaningFee),
      taxPercentage: Number(existing.taxPercentage),
      minStayNights: existing.minStayNights,
      extraGuestCharge: Number(existing.extraGuestCharge),
      standardGuests: existing.standardGuests,
    };

    const updated = await prisma.$transaction(async (tx) => {
      const opt = await tx.listingOption.update({
        where: { id: input.listingOptionId },
        data: {
          basePricePerNight: input.basePricePerNight,
          weekendPricePerNight: input.weekendPricePerNight ?? null,
          cleaningFee: input.cleaningFee ?? existing.cleaningFee,
          taxPercentage: input.taxPercentage ?? existing.taxPercentage,
          minStayNights: input.minStayNights ?? existing.minStayNights,
          extraGuestCharge: input.extraGuestCharge ?? existing.extraGuestCharge,
          standardGuests: input.standardGuests ?? existing.standardGuests,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PRICING_SETTINGS_UPDATED",
          entityType: "ListingOption",
          entityId: opt.id,
          userId: auth.user?.id,
          userEmail: auth.user?.email,
          metadata: {
            configurationTitle: opt.title,
            propertyId: opt.propertyId,
            previous: previousData,
            updated: {
              basePricePerNight: Number(opt.basePricePerNight),
              weekendPricePerNight: opt.weekendPricePerNight ? Number(opt.weekendPricePerNight) : null,
              cleaningFee: Number(opt.cleaningFee),
              taxPercentage: Number(opt.taxPercentage),
              minStayNights: opt.minStayNights,
              extraGuestCharge: Number(opt.extraGuestCharge),
              standardGuests: opt.standardGuests,
            },
          },
        },
      });

      return opt;
    });

    safeRevalidatePath("/admin/pricing");
    safeRevalidatePath(`/admin/properties/${existing.propertyId}`);
    safeRevalidatePath(`/properties/${existing.property.slug}`);
    safeRevalidatePath("/");

    return {
      success: true,
      message: `Pricing for "${updated.title}" successfully saved.`,
      data: updated,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to update pricing: ${msg}` };
  }
}

/**
 * Creates a new seasonal rule, holiday premium, or date override.
 */
export async function createPricingRule(
  input: CreatePricingRuleInput
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  if (!input.name || input.name.trim().length < 3) {
    return { success: false, error: "Rule name must be at least 3 characters." };
  }

  const start = normalizeDateOnly(input.startDate);
  const end = normalizeDateOnly(input.endDate);

  if (start.getTime() > end.getTime()) {
    return { success: false, error: "Start date must be before or equal to end date." };
  }

  const hasFixedPrice = input.pricePerNight !== null && input.pricePerNight !== undefined;
  const hasMultiplier = input.multiplier !== null && input.multiplier !== undefined;

  if (!hasFixedPrice && !hasMultiplier) {
    return {
      success: false,
      error: "You must provide either a fixed Nightly Price (₹) or a Rate Multiplier (e.g. 1.25x).",
    };
  }

  if (hasFixedPrice && input.pricePerNight! <= 0) {
    return { success: false, error: "Fixed price per night must be greater than ₹0." };
  }

  if (hasMultiplier && input.multiplier! <= 0) {
    return { success: false, error: "Multiplier must be greater than 0 (e.g. 1.20 for +20%)." };
  }

  const minStay = input.minStayNights && input.minStayNights > 1 ? input.minStayNights : 1;
  const ruleType = input.ruleType || "SEASONAL";

  try {
    const property = await prisma.property.findUnique({
      where: { id: input.propertyId },
    });
    if (!property) {
      return { success: false, error: "Property not found." };
    }

    // Check for overlapping rules to provide transparency
    const overlapping = await prisma.pricingRule.findMany({
      where: {
        propertyId: input.propertyId,
        listingOptionId: input.listingOptionId || null,
        isActive: true,
        ruleType,
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    let overlapNotice = "";
    if (overlapping.length > 0) {
      overlapNotice = ` Notice: ${overlapping.length} overlapping ${ruleType.toLowerCase()} rule(s) exist. Precedence hierarchy will apply narrower date range and newest rules.`;
    }

    const created = await prisma.$transaction(async (tx) => {
      const rule = await tx.pricingRule.create({
        data: {
          propertyId: input.propertyId,
          listingOptionId: input.listingOptionId || null,
          name: input.name.trim(),
          ruleType,
          description: input.description?.trim() || null,
          startDate: start,
          endDate: end,
          pricePerNight: hasFixedPrice ? input.pricePerNight : null,
          multiplier: hasMultiplier ? input.multiplier : null,
          minStayNights: minStay,
          isActive: input.isActive ?? true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PRICING_RULE_CREATED",
          entityType: "PricingRule",
          entityId: rule.id,
          userId: auth.user?.id,
          userEmail: auth.user?.email,
          metadata: {
            name: rule.name,
            ruleType: rule.ruleType,
            propertyId: rule.propertyId,
            listingOptionId: rule.listingOptionId,
            startDate: formatDateKey(start),
            endDate: formatDateKey(end),
            pricePerNight: rule.pricePerNight ? Number(rule.pricePerNight) : null,
            multiplier: rule.multiplier,
            minStayNights: rule.minStayNights,
          },
        },
      });

      return rule;
    });

    safeRevalidatePath("/admin/pricing");
    safeRevalidatePath(`/admin/properties/${input.propertyId}`);
    safeRevalidatePath("/");

    return {
      success: true,
      message: `Pricing rule "${created.name}" created successfully.${overlapNotice}`,
      data: created,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to create pricing rule: ${msg}` };
  }
}

/**
 * Updates an existing pricing rule.
 */
export async function updatePricingRule(
  input: UpdatePricingRuleInput
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const existing = await prisma.pricingRule.findUnique({
      where: { id: input.ruleId },
    });

    if (!existing) {
      return { success: false, error: "Pricing rule not found." };
    }

    const start = input.startDate ? normalizeDateOnly(input.startDate) : existing.startDate;
    const end = input.endDate ? normalizeDateOnly(input.endDate) : existing.endDate;

    if (start.getTime() > end.getTime()) {
      return { success: false, error: "Start date must be before or equal to end date." };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rule = await tx.pricingRule.update({
        where: { id: input.ruleId },
        data: {
          name: input.name !== undefined ? input.name.trim() : existing.name,
          ruleType: input.ruleType ?? existing.ruleType,
          description: input.description !== undefined ? input.description.trim() : existing.description,
          startDate: start,
          endDate: end,
          pricePerNight:
            input.pricePerNight !== undefined
              ? input.pricePerNight
              : existing.pricePerNight,
          multiplier:
            input.multiplier !== undefined ? input.multiplier : existing.multiplier,
          minStayNights:
            input.minStayNights !== undefined
              ? input.minStayNights
              : existing.minStayNights,
          isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PRICING_RULE_UPDATED",
          entityType: "PricingRule",
          entityId: rule.id,
          userId: auth.user?.id,
          userEmail: auth.user?.email,
          metadata: {
            ruleId: rule.id,
            previous: {
              name: existing.name,
              pricePerNight: existing.pricePerNight ? Number(existing.pricePerNight) : null,
              multiplier: existing.multiplier,
              startDate: formatDateKey(existing.startDate),
              endDate: formatDateKey(existing.endDate),
              isActive: existing.isActive,
            },
            updated: {
              name: rule.name,
              pricePerNight: rule.pricePerNight ? Number(rule.pricePerNight) : null,
              multiplier: rule.multiplier,
              startDate: formatDateKey(rule.startDate),
              endDate: formatDateKey(rule.endDate),
              isActive: rule.isActive,
            },
          },
        },
      });

      return rule;
    });

    safeRevalidatePath("/admin/pricing");
    safeRevalidatePath(`/admin/properties/${existing.propertyId}`);
    safeRevalidatePath("/");

    return {
      success: true,
      message: `Pricing rule "${updated.name}" updated successfully.`,
      data: updated,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to update rule: ${msg}` };
  }
}

/**
 * Deletes a pricing rule.
 */
export async function deletePricingRule(ruleId: string): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const existing = await prisma.pricingRule.findUnique({
      where: { id: ruleId },
    });

    if (!existing) {
      return { success: false, error: "Pricing rule not found." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.pricingRule.delete({ where: { id: ruleId } });

      await tx.auditLog.create({
        data: {
          action: "PRICING_RULE_DELETED",
          entityType: "PricingRule",
          entityId: ruleId,
          userId: auth.user?.id,
          userEmail: auth.user?.email,
          metadata: {
            deletedRuleName: existing.name,
            propertyId: existing.propertyId,
            listingOptionId: existing.listingOptionId,
          },
        },
      });
    });

    safeRevalidatePath("/admin/pricing");
    safeRevalidatePath(`/admin/properties/${existing.propertyId}`);
    safeRevalidatePath("/");

    return {
      success: true,
      message: `Pricing rule "${existing.name}" successfully deleted.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to delete rule: ${msg}` };
  }
}

/**
 * Toggles a rule's active state.
 */
export async function togglePricingRule(
  ruleId: string,
  currentlyActive: boolean
): Promise<ActionResult> {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return { success: false, error: auth.error };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const rule = await tx.pricingRule.update({
        where: { id: ruleId },
        data: { isActive: !currentlyActive },
      });

      await tx.auditLog.create({
        data: {
          action: currentlyActive ? "PRICING_RULE_DEACTIVATED" : "PRICING_RULE_ACTIVATED",
          entityType: "PricingRule",
          entityId: rule.id,
          userId: auth.user?.id,
          userEmail: auth.user?.email,
          metadata: { name: rule.name, newState: !currentlyActive },
        },
      });

      return rule;
    });

    safeRevalidatePath("/admin/pricing");

    return {
      success: true,
      message: `Rule "${updated.name}" is now ${updated.isActive ? "Active" : "Disabled"}.`,
      data: updated,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to toggle rule: ${msg}` };
  }
}

/**
 * Quickly creates or updates a date-specific override for single dates or date ranges.
 */
export async function quickDateOverride(params: {
  propertyId: string;
  listingOptionId?: string | null;
  startDate: string;
  endDate: string;
  pricePerNight: number;
  label?: string;
  minStayNights?: number;
}): Promise<ActionResult> {
  return createPricingRule({
    propertyId: params.propertyId,
    listingOptionId: params.listingOptionId || null,
    name: params.label || `Override ${params.startDate} to ${params.endDate}`,
    ruleType: "OVERRIDE",
    startDate: params.startDate,
    endDate: params.endDate,
    pricePerNight: params.pricePerNight,
    minStayNights: params.minStayNights || 1,
    isActive: true,
  });
}

/**
 * Previews exact pricing calculation for any date range and guest count on demand.
 */
export async function previewPricingCalculation(params: {
  propertyId: string;
  listingOptionId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount?: number;
}): Promise<ActionResult<ReservationPricingCalculation>> {
  try {
    const calc = await calculateReservationPricing({
      propertyId: params.propertyId,
      listingOptionId: params.listingOptionId,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      guestCount: params.guestCount ?? 1,
    });

    return {
      success: true,
      data: calc,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Calculation failed: ${msg}` };
  }
}

/**
 * Loads monthly calendar data for the admin pricing view.
 */
export async function fetchMonthlyPricingData(
  propertyId: string,
  listingOptionId: string,
  year: number,
  month: number
): Promise<ActionResult<NightlyRateDetail[]>> {
  try {
    const details = await getCalendarMonthPricing(propertyId, listingOptionId, year, month);
    return { success: true, data: details };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to load calendar pricing: ${msg}` };
  }
}
