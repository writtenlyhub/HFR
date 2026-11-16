import { prisma } from "@/lib/prisma";
import { ListingOption, PricingRule } from "@prisma/client";

export type RuleType = "SEASONAL" | "HOLIDAY" | "OVERRIDE" | "CUSTOM";

export interface NightlyRateDetail {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  isWeekend: boolean; // Friday or Saturday night
  appliedRate: number;
  rateType: "BASE" | "WEEKEND" | "SEASONAL" | "HOLIDAY" | "OVERRIDE";
  ruleId?: string;
  ruleName?: string;
  baseRate: number;
  weekendRate?: number;
  multiplier?: number;
  minStayNights: number;
}

export interface ReservationPricingCalculation {
  nights: number;
  nightlyRates: NightlyRateDetail[];
  averageNightlyRate: number;
  baseNightlyTotal: number;
  extraGuestCount: number;
  extraGuestChargePerNight: number;
  extraGuestTotal: number;
  cleaningFee: number;
  taxPercentage: number;
  taxableAmount: number;
  taxesAmount: number;
  totalAmount: number;
  currency: string;
  requiredMinStay: number;
  meetsMinStay: boolean;
  minStayError?: string;
}

export interface CalculatePricingInput {
  propertyId: string;
  listingOptionId: string;
  checkInDate: string | Date;
  checkOutDate: string | Date;
  guestCount?: number;
  prefetchedOption?: ListingOption;
  prefetchedRules?: PricingRule[];
}

/**
 * Normalizes a date string or object to UTC midnight.
 */
export function normalizeDateOnly(input: string | Date): Date {
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
 * Formats a Date to YYYY-MM-DD in UTC.
 */
export function formatDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Determines whether a given night falls on a weekend.
 * In Indian hospitality & DevStay conventions, Friday night and Saturday night
 * command the prime weekend rate.
 */
export function isWeekendNight(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 5 || day === 6; // 5 = Friday, 6 = Saturday
}

/**
 * Evaluates the exact nightly rate for a single night according to
 * DevStay's explicit Precedence Hierarchy:
 *
 * 1. Date-Specific Override (Configuration-specific > Property-wide, narrower range > broader)
 * 2. Holiday Premium (Configuration-specific > Property-wide, narrower range > broader)
 * 3. Seasonal Rule (Configuration-specific > Property-wide, fixed price > multiplier)
 * 4. Weekend Rate (Friday & Saturday nights if configured)
 * 5. Base Nightly Rate
 */
export function evaluateSingleNightRate(
  date: Date,
  option: {
    id: string;
    basePricePerNight: number | string | { toNumber?: () => number };
    weekendPricePerNight?: number | string | { toNumber?: () => number } | null;
    minStayNights?: number;
  },
  rules: PricingRule[]
): NightlyRateDetail {
  const dateKey = formatDateKey(date);
  const dayName = DAY_NAMES[date.getUTCDay()];
  const isWeekend = isWeekendNight(date);

  const baseRate = Number(option.basePricePerNight);
  const weekendRate = option.weekendPricePerNight ? Number(option.weekendPricePerNight) : undefined;
  const standardMinStay = option.minStayNights || 1;

  // Filter rules active for this night
  // Note: half-open or closed day bounds: if date is within [startDate, endDate]
  const targetTime = date.getTime();
  const matchingRules = rules.filter((r) => {
    if (!r.isActive) return false;
    const start = normalizeDateOnly(r.startDate).getTime();
    const end = normalizeDateOnly(r.endDate).getTime();
    return targetTime >= start && targetTime <= end;
  });

  // Sort function implementing precedence:
  // 1. ruleType priority: OVERRIDE > HOLIDAY > SEASONAL
  // 2. Specificity: configuration-specific > property-wide
  // 3. Narrower range: smaller (endDate - startDate)
  // 4. Recency: higher createdAt
  const typeRank = (t: string) => {
    switch (t) {
      case "OVERRIDE":
        return 3;
      case "HOLIDAY":
        return 2;
      case "SEASONAL":
        return 1;
      default:
        return 0;
    }
  };

  matchingRules.sort((a, b) => {
    const rankDiff = typeRank(b.ruleType) - typeRank(a.ruleType);
    if (rankDiff !== 0) return rankDiff;

    // Specificity
    const aSpecific = a.listingOptionId === option.id ? 1 : 0;
    const bSpecific = b.listingOptionId === option.id ? 1 : 0;
    if (bSpecific !== aSpecific) return bSpecific - aSpecific;

    // Duration (narrower date range wins)
    const aDur = Math.abs(a.endDate.getTime() - a.startDate.getTime());
    const bDur = Math.abs(b.endDate.getTime() - b.startDate.getTime());
    if (aDur !== bDur) return aDur - bDur;

    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const selectedRule = matchingRules[0];

  if (selectedRule) {
    let appliedRate: number;
    let multiplier: number | undefined = undefined;

    if (selectedRule.pricePerNight !== null && selectedRule.pricePerNight !== undefined) {
      appliedRate = Number(selectedRule.pricePerNight);
    } else if (selectedRule.multiplier !== null && selectedRule.multiplier !== undefined) {
      multiplier = Number(selectedRule.multiplier);
      const rateToMultiply = isWeekend && weekendRate && weekendRate > 0 ? weekendRate : baseRate;
      appliedRate = Math.round(rateToMultiply * multiplier);
    } else {
      appliedRate = isWeekend && weekendRate && weekendRate > 0 ? weekendRate : baseRate;
    }

    const rateType: "OVERRIDE" | "HOLIDAY" | "SEASONAL" =
      selectedRule.ruleType === "OVERRIDE"
        ? "OVERRIDE"
        : selectedRule.ruleType === "HOLIDAY"
        ? "HOLIDAY"
        : "SEASONAL";

    return {
      date: dateKey,
      dayOfWeek: dayName,
      isWeekend,
      appliedRate,
      rateType,
      ruleId: selectedRule.id,
      ruleName: selectedRule.name,
      baseRate,
      weekendRate,
      multiplier,
      minStayNights: Math.max(standardMinStay, selectedRule.minStayNights || 1),
    };
  }

  // No rule applies: check weekend vs base
  if (isWeekend && weekendRate && weekendRate > 0) {
    return {
      date: dateKey,
      dayOfWeek: dayName,
      isWeekend: true,
      appliedRate: weekendRate,
      rateType: "WEEKEND",
      baseRate,
      weekendRate,
      minStayNights: standardMinStay,
    };
  }

  return {
    date: dateKey,
    dayOfWeek: dayName,
    isWeekend,
    appliedRate: baseRate,
    rateType: "BASE",
    baseRate,
    weekendRate,
    minStayNights: standardMinStay,
  };
}

/**
 * Calculates complete, accurate reservation pricing across a date range.
 * Used identically by checkAvailability(), createBookingHold(), and the Admin Pricing UI.
 */
export async function calculateReservationPricing(
  input: CalculatePricingInput
): Promise<ReservationPricingCalculation> {
  const checkIn = normalizeDateOnly(input.checkInDate);
  const checkOut = normalizeDateOnly(input.checkOutDate);

  const nights = Math.max(
    1,
    Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Fetch listing option if not provided
  let option = input.prefetchedOption;
  if (!option) {
    const fetched = await prisma.listingOption.findUnique({
      where: { id: input.listingOptionId },
    });
    if (!fetched) {
      throw new Error(`ListingOption not found for ID: ${input.listingOptionId}`);
    }
    option = fetched;
  }

  // Fetch applicable pricing rules if not provided
  let rules = input.prefetchedRules;
  if (!rules) {
    rules = await prisma.pricingRule.findMany({
      where: {
        propertyId: input.propertyId,
        isActive: true,
        OR: [{ listingOptionId: null }, { listingOptionId: input.listingOptionId }],
        startDate: { lte: checkOut },
        endDate: { gte: checkIn },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Evaluate every night in the reservation
  const nightlyRates: NightlyRateDetail[] = [];
  let requiredMinStay = option.minStayNights || 1;

  for (let i = 0; i < nights; i++) {
    const currentNight = new Date(checkIn.getTime() + i * 24 * 60 * 60 * 1000);
    const detail = evaluateSingleNightRate(currentNight, option, rules);
    nightlyRates.push(detail);
    if (detail.minStayNights > requiredMinStay) {
      requiredMinStay = detail.minStayNights;
    }
  }

  const baseNightlyTotal = nightlyRates.reduce((sum, n) => sum + n.appliedRate, 0);
  const averageNightlyRate = Math.round(baseNightlyTotal / nights);

  // Extra guest charge calculation
  const guestCount = input.guestCount ?? 1;
  const standardGuests = option.standardGuests ?? option.bedroomCount * 2;
  const extraGuestChargePerNight = Number(option.extraGuestCharge || 0);

  let extraGuestCount = 0;
  let extraGuestTotal = 0;
  if (guestCount > standardGuests && extraGuestChargePerNight > 0) {
    extraGuestCount = guestCount - standardGuests;
    extraGuestTotal = extraGuestCount * extraGuestChargePerNight * nights;
  }

  const cleaningFee = Number(option.cleaningFee || 0);
  const taxPercentage = Number(option.taxPercentage || 12);

  const taxableAmount = baseNightlyTotal + extraGuestTotal + cleaningFee;
  const taxesAmount = Math.round((taxableAmount * taxPercentage) / 100);
  const totalAmount = taxableAmount + taxesAmount;

  const meetsMinStay = nights >= requiredMinStay;
  const minStayError = meetsMinStay
    ? undefined
    : `A minimum stay of ${requiredMinStay} nights is required for the selected dates (you requested ${nights} ${
        nights === 1 ? "night" : "nights"
      }).`;

  return {
    nights,
    nightlyRates,
    averageNightlyRate,
    baseNightlyTotal,
    extraGuestCount,
    extraGuestChargePerNight,
    extraGuestTotal,
    cleaningFee,
    taxPercentage,
    taxableAmount,
    taxesAmount,
    totalAmount,
    currency: "INR",
    requiredMinStay,
    meetsMinStay,
    minStayError,
  };
}

/**
 * Returns complete daily pricing for every single day of a calendar month.
 * Powers the interactive Admin Pricing Calendar.
 */
export async function getCalendarMonthPricing(
  propertyId: string,
  listingOptionId: string,
  year: number,
  month: number // 1..12
): Promise<NightlyRateDetail[]> {
  const option = await prisma.listingOption.findUnique({
    where: { id: listingOptionId },
  });

  if (!option) {
    throw new Error(`ListingOption not found for ID: ${listingOptionId}`);
  }

  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 0, 0, 0, 0)); // last day of month

  const rules = await prisma.pricingRule.findMany({
    where: {
      propertyId,
      isActive: true,
      OR: [{ listingOptionId: null }, { listingOptionId }],
      startDate: { lte: endOfMonth },
      endDate: { gte: startOfMonth },
    },
  });

  const daysInMonth = endOfMonth.getUTCDate();
  const result: NightlyRateDetail[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const currentDay = new Date(Date.UTC(year, month - 1, d, 0, 0, 0, 0));
    result.push(evaluateSingleNightRate(currentDay, option, rules));
  }

  return result;
}
