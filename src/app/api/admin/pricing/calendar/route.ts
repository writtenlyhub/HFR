import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/auth";
import { getCalendarMonthPricing } from "@/lib/pricing/pricing-engine";

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("propertyId");
  const listingOptionId = searchParams.get("listingOptionId");
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);

  if (!propertyId || !listingOptionId) {
    return NextResponse.json(
      { success: false, error: "propertyId and listingOptionId are required" },
      { status: 400 }
    );
  }

  try {
    const data = await getCalendarMonthPricing(propertyId, listingOptionId, year, month);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
