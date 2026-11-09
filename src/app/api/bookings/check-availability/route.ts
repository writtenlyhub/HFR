import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAvailability } from "@/lib/booking/shared-inventory";

const querySchema = z.object({
  propertySlug: z.string().optional(),
  propertyId: z.string().optional(),
  listingOptionId: z.string().optional(),
  listingOptionSlug: z.string().optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-in date format (YYYY-MM-DD)"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-out date format (YYYY-MM-DD)"),
  guestCount: z.coerce.number().int().min(1, "Guest count must be at least 1").default(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request parameters",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { propertySlug, propertyId, listingOptionId, listingOptionSlug, checkIn, checkOut, guestCount } =
      parsed.data;

    const result = await checkAvailability({
      propertySlug,
      propertyId,
      listingOptionId,
      listingOptionSlug,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guestCount,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error("[API check-availability] Internal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error checking availability",
      },
      { status: 500 }
    );
  }
}
