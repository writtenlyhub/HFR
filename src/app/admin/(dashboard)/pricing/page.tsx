import { prisma } from "@/lib/prisma";
import {
  getCalendarMonthPricing,
  formatDateKey,
  NightlyRateDetail,
} from "@/lib/pricing/pricing-engine";
import {
  PricingDashboardView,
  SerializedProperty,
  SerializedPricingRule,
} from "./pricing-dashboard-view";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const properties = await prisma.property.findMany({
    where: { isArchived: false },
    orderBy: { createdAt: "asc" },
    include: {
      listingOptions: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const serializedProperties: SerializedProperty[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    listingOptions: p.listingOptions.map((opt) => ({
      id: opt.id,
      propertyId: opt.propertyId,
      slug: opt.slug,
      title: opt.title,
      maxGuests: opt.maxGuests,
      bedroomCount: opt.bedroomCount,
      bathroomCount: opt.bathroomCount,
      basePricePerNight: Number(opt.basePricePerNight),
      weekendPricePerNight: opt.weekendPricePerNight
        ? Number(opt.weekendPricePerNight)
        : null,
      cleaningFee: Number(opt.cleaningFee),
      taxPercentage: Number(opt.taxPercentage),
      minStayNights: opt.minStayNights,
      extraGuestCharge: Number(opt.extraGuestCharge),
      standardGuests: opt.standardGuests,
    })),
  }));

  const pricingRules = await prisma.pricingRule.findMany({
    orderBy: { startDate: "asc" },
  });

  const serializedRules: SerializedPricingRule[] = pricingRules.map((r) => ({
    id: r.id,
    propertyId: r.propertyId,
    listingOptionId: r.listingOptionId,
    name: r.name,
    ruleType: r.ruleType,
    description: r.description,
    startDate: formatDateKey(r.startDate),
    endDate: formatDateKey(r.endDate),
    pricePerNight: r.pricePerNight ? Number(r.pricePerNight) : null,
    multiplier: r.multiplier,
    minStayNights: r.minStayNights,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
  }));

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1; // 1..12

  let initialCalendarPricing: NightlyRateDetail[] = [];
  if (
    serializedProperties.length > 0 &&
    serializedProperties[0].listingOptions.length > 0
  ) {
    try {
      initialCalendarPricing = await getCalendarMonthPricing(
        serializedProperties[0].id,
        serializedProperties[0].listingOptions[0].id,
        currentYear,
        currentMonth
      );
    } catch (e) {
      console.warn("Failed to load initial calendar pricing:", e);
    }
  }

  return (
    <PricingDashboardView
      properties={serializedProperties}
      initialRules={serializedRules}
      initialCalendarPricing={initialCalendarPricing}
      currentYear={currentYear}
      currentMonth={currentMonth}
    />
  );
}
