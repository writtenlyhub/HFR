import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBookingHold } from "@/lib/booking/shared-inventory";

const holdSchema = z.object({
  listingOptionId: z.string().optional(),
  listingOptionSlug: z.string().optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-in date format (YYYY-MM-DD)"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid check-out date format (YYYY-MM-DD)"),
  guestCount: z.number().int().min(1, "Guest count must be at least 1").default(1),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().optional(),
  specialRequests: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = holdSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      listingOptionId,
      listingOptionSlug,
      checkIn,
      checkOut,
      guestCount,
      customerName,
      customerEmail,
      customerPhone,
      specialRequests,
      idempotencyKey,
    } = parsed.data;

    const result = await createBookingHold({
      listingOptionId,
      listingOptionSlug,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guestCount,
      customerName,
      customerEmail,
      customerPhone,
      specialRequests,
      idempotencyKey,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.error?.includes("reserved") || result.error?.includes("held") ? 409 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error("[API create-hold] Internal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error creating temporary hold",
      },
      { status: 500 }
    );
  }
}
