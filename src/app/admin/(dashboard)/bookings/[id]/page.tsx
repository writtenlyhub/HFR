import { notFound } from "next/navigation";
import { getBookingDetails } from "@/lib/booking/booking-queries";
import { BookingDetailView } from "./booking-detail-view";

export const dynamic = "force-dynamic";

interface BookingPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBookingDetailPage({ params }: BookingPageProps) {
  const { id } = await params;
  const booking = await getBookingDetails(id);

  if (!booking) {
    notFound();
  }

  const serializedBooking = {
    id: booking.id,
    bookingReference: booking.bookingReference,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    specialRequests: booking.specialRequests,
    status: booking.status,
    checkInDate: booking.checkInDate.toISOString(),
    checkOutDate: booking.checkOutDate.toISOString(),
    nights: booking.nights,
    guestCount: booking.guestCount,
    adultCount: booking.adultCount,
    childCount: booking.childCount,
    currency: booking.currency,
    baseAmount: Number(booking.baseAmount),
    taxesAmount: Number(booking.taxesAmount),
    discountAmount: Number(booking.discountAmount),
    totalAmount: Number(booking.totalAmount),
    paidAmount: booking.paidAmount,
    refundAmount: booking.refundAmount ? Number(booking.refundAmount) : null,
    checkedInAt: booking.checkedInAt ? booking.checkedInAt.toISOString() : null,
    checkedOutAt: booking.checkedOutAt ? booking.checkedOutAt.toISOString() : null,
    checkInNotes: booking.checkInNotes,
    checkOutNotes: booking.checkOutNotes,
    internalNotes: booking.internalNotes,
    cancellationReason: booking.cancellationReason,
    cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
    createdAt: booking.createdAt.toISOString(),
    property: {
      id: booking.property.id,
      name: booking.property.name,
      city: booking.property.city,
      slug: booking.property.slug,
      address: booking.property.address,
    },
    listingOption: {
      id: booking.listingOption.id,
      title: booking.listingOption.title,
      slug: booking.listingOption.slug,
      maxGuests: booking.listingOption.maxGuests,
    },
    payments: booking.payments.map((p) => ({
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
    refunds: booking.refunds.map((r) => ({
      id: r.id,
      razorpayRefundId: r.razorpayRefundId,
      amount: Number(r.amount),
      status: r.status,
      reason: r.reason,
      processedAt: r.processedAt ? r.processedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
    cancellationPolicy: booking.cancellationPolicy,
    activityTimeline: booking.activityTimeline.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      actor: item.actor,
      timestamp: item.timestamp.toISOString(),
    })),
  };

  return <BookingDetailView booking={serializedBooking} />;
}
