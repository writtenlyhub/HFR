import { prisma } from "@/lib/prisma";
import { getBookingsList } from "@/lib/booking/booking-queries";
import { BookingsListView, SerializedBooking } from "./bookings-list-view";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const [bookingsResult, properties] = await Promise.all([
    getBookingsList({ page: 1, pageSize: 10 }),
    prisma.property.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        name: true,
        listingOptions: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const serializedBookings: SerializedBooking[] = bookingsResult.bookings.map((b) => ({
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

  return (
    <BookingsListView
      initialBookings={serializedBookings}
      initialPagination={bookingsResult.pagination}
      initialCounts={bookingsResult.counts}
      properties={properties}
    />
  );
}
