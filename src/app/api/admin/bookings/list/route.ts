import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/auth";
import { getBookingsList } from "@/lib/booking/booking-queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const paymentStatus = searchParams.get("paymentStatus") || undefined;
  const propertyId = searchParams.get("propertyId") || undefined;
  const listingOptionId = searchParams.get("listingOptionId") || undefined;
  const checkInFrom = searchParams.get("checkInFrom") || undefined;
  const checkInTo = searchParams.get("checkInTo") || undefined;
  const dateType = (searchParams.get("dateType") as "check_in" | "check_out" | "created_at") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

  try {
    const result = await getBookingsList({
      search,
      status,
      paymentStatus,
      propertyId,
      listingOptionId,
      checkInFrom,
      checkInTo,
      dateType,
      page,
      pageSize,
    });

    // Serialize Decimals and Dates to JSON-safe primitives
    const serializedBookings = result.bookings.map((b) => ({
      id: b.id,
      bookingReference: b.bookingReference,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      customerPhone: b.customerPhone,
      specialRequests: b.specialRequests,
      status: b.status,
      checkInDate: b.checkInDate.toISOString(),
      checkOutDate: b.checkOutDate.toISOString(),
      nights: b.nights,
      guestCount: b.guestCount,
      currency: b.currency,
      baseAmount: Number(b.baseAmount),
      taxesAmount: Number(b.taxesAmount),
      totalAmount: Number(b.totalAmount),
      refundAmount: b.refundAmount ? Number(b.refundAmount) : null,
      checkedInAt: b.checkedInAt ? b.checkedInAt.toISOString() : null,
      checkedOutAt: b.checkedOutAt ? b.checkedOutAt.toISOString() : null,
      checkInNotes: b.checkInNotes,
      checkOutNotes: b.checkOutNotes,
      internalNotes: b.internalNotes,
      cancellationReason: b.cancellationReason,
      cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
      property: {
        id: b.property.id,
        name: b.property.name,
        city: b.property.city,
        slug: b.property.slug,
      },
      listingOption: {
        id: b.listingOption.id,
        title: b.listingOption.title,
        slug: b.listingOption.slug,
        maxGuests: b.listingOption.maxGuests,
      },
      payments: b.payments.map((p) => ({
        id: p.id,
        razorpayOrderId: p.razorpayOrderId,
        razorpayPaymentId: p.razorpayPaymentId,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        method: p.method,
        verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
      })),
      refunds: b.refunds.map((r) => ({
        id: r.id,
        razorpayRefundId: r.razorpayRefundId,
        amount: Number(r.amount),
        status: r.status,
        reason: r.reason,
        processedAt: r.processedAt ? r.processedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json({
      success: true,
      bookings: serializedBookings,
      pagination: result.pagination,
      counts: result.counts,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Admin API] Failed to fetch bookings list:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
