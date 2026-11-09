import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BookingStatus, BlockReason } from "@prisma/client";
import ical, { ICalCalendarMethod } from "ical-generator";

export async function GET(
  _request: Request,
  props: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const params = await props.params;
    const token = params.token;

    if (!token) {
      return new NextResponse("Token is required", { status: 400 });
    }

    // 1. Validate connection by export token
    const connection = await prisma.externalCalendarConnection.findUnique({
      where: { exportToken: token },
      include: {
        inventoryGroup: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!connection || !connection.isActive) {
      return new NextResponse("Calendar feed not found or inactive", { status: 404 });
    }

    const inventoryGroupId = connection.inventoryGroupId;
    const propertyName = connection.inventoryGroup.property.name || "Dev Stays Jaipur";

    // 2. Query all confirmed reservations on this inventory group
    const confirmedBookings = await prisma.booking.findMany({
      where: {
        inventoryGroupId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      },
      select: {
        id: true,
        bookingReference: true,
        checkInDate: true,
        checkOutDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 3. Query all non-booking availability blocks (admin blocks or blocks from other channels)
    const availabilityBlocks = await prisma.availabilityBlock.findMany({
      where: {
        inventoryGroupId,
        bookingId: null,
        // Do not echo blocks back that originated from this exact connection
        OR: [
          { externalCalendarConnectionId: null },
          { externalCalendarConnectionId: { not: connection.id } },
        ],
        reason: {
          in: [
            BlockReason.EXTERNAL_CALENDAR,
            BlockReason.EXTERNAL_AIRBNB,
            BlockReason.EXTERNAL_BOOKING,
            BlockReason.ADMIN_MAINTENANCE,
            BlockReason.SEASONAL_CLOSURE,
          ],
        },
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        reason: true,
        createdAt: true,
      },
    });

    // 4. Generate iCalendar structure
    const calendar = ical({
      name: `${propertyName} - Availability Feed`,
      prodId: {
        company: "Hotel Federation Rajasthan",
        product: "Dev Stays Jaipur Reservation System",
        language: "EN",
      },
      method: ICalCalendarMethod.PUBLISH,
      timezone: "UTC",
    });

    // 5. Add confirmed bookings (Strictly no guest PII: no names, emails, phones, or prices)
    for (const b of confirmedBookings) {
      calendar.createEvent({
        id: `reservation-${b.bookingReference}@devstaysjaipur.com`,
        start: b.checkInDate,
        end: b.checkOutDate,
        summary: `Reserved - ${propertyName}`,
        description: `Confirmed reservation on shared estate inventory. Reference: ${b.bookingReference}`,
        created: b.createdAt,
        lastModified: b.updatedAt,
        allDay: true,
      });
    }

    // 6. Add availability blocks
    for (const blk of availabilityBlocks) {
      calendar.createEvent({
        id: `block-${blk.id}@devstaysjaipur.com`,
        start: blk.startDate,
        end: blk.endDate,
        summary: `Unavailable - ${propertyName}`,
        description: "Dates blocked on estate calendar.",
        created: blk.createdAt,
        allDay: true,
      });
    }

    const icsContent = calendar.toString();

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="dev-stays-availability-${connection.platform.toLowerCase()}.ics"`,
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to generate iCal export feed:", message);
    return new NextResponse("Internal Server Error generating calendar feed", { status: 500 });
  }
}
