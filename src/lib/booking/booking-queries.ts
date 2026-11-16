import { prisma } from "@/lib/prisma";
import { BookingStatus, PaymentStatus, Prisma } from "@prisma/client";
import { calculateCancellationRefund } from "./booking-cancellation";
import { getBookingActivityTimeline } from "./booking-operations";

export interface BookingListFilterParams {
  search?: string;
  status?: string; // "ALL" | BookingStatus | "PAYMENT_COMPLETED"
  paymentStatus?: string; // "ALL" | PaymentStatus
  propertyId?: string;
  listingOptionId?: string;
  checkInFrom?: string; // ISO date string
  checkInTo?: string; // ISO date string
  dateType?: "check_in" | "check_out" | "created_at";
  page?: number;
  pageSize?: number;
}

export interface BookingListSummaryCounts {
  totalAll: number;
  pendingCount: number;
  confirmedCount: number;
  checkedInCount: number;
  checkedOutCount: number;
  cancelledCount: number;
  paymentPendingCount: number;
  paymentCompletedCount: number;
  refundPendingCount: number;
  refundedCount: number;
}

/**
 * High-performance paginated search and filter query for reservations.
 */
export async function getBookingsList(params: BookingListFilterParams) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 10));
  const skip = (page - 1) * pageSize;

  const where: Prisma.BookingWhereInput = {};

  // Text search on Reference, Customer Name, Email, or Phone
  if (params.search?.trim()) {
    const s = params.search.trim();
    where.OR = [
      { bookingReference: { contains: s, mode: "insensitive" } },
      { customerName: { contains: s, mode: "insensitive" } },
      { customerEmail: { contains: s, mode: "insensitive" } },
      { customerPhone: { contains: s, mode: "insensitive" } },
    ];
  }

  // Status Filter
  if (params.status && params.status !== "ALL") {
    if (params.status === "PENDING") {
      where.status = { in: [BookingStatus.PENDING_HOLD, BookingStatus.PAYMENT_PENDING] };
    } else if (params.status === "CHECKED_OUT_COMPLETED") {
      where.status = { in: [BookingStatus.CHECKED_OUT, BookingStatus.COMPLETED] };
    } else if (params.status === "PAYMENT_COMPLETED") {
      where.payments = { some: { status: PaymentStatus.CAPTURED } };
    } else if (Object.values(BookingStatus).includes(params.status as BookingStatus)) {
      where.status = params.status as BookingStatus;
    }
  }

  // Payment Status Filter
  if (params.paymentStatus && params.paymentStatus !== "ALL") {
    if (Object.values(PaymentStatus).includes(params.paymentStatus as PaymentStatus)) {
      where.payments = {
        some: { status: params.paymentStatus as PaymentStatus },
      };
    }
  }

  // Property & Configuration
  if (params.propertyId) {
    where.propertyId = params.propertyId;
  }
  if (params.listingOptionId) {
    where.listingOptionId = params.listingOptionId;
  }

  // Date Range Filtering
  if (params.checkInFrom || params.checkInTo) {
    const fromDate = params.checkInFrom ? new Date(params.checkInFrom) : undefined;
    const toDate = params.checkInTo ? new Date(params.checkInTo) : undefined;

    if (params.dateType === "check_out") {
      where.checkOutDate = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      };
    } else if (params.dateType === "created_at") {
      where.createdAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      };
    } else {
      where.checkInDate = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDate ? { lte: toDate } : {}),
      };
    }
  }

  // Execute Count & Paginated Fetch Concurrently
  const [
    bookings,
    totalRecords,
    totalAll,
    pendingCount,
    confirmedCount,
    checkedInCount,
    checkedOutCount,
    cancelledCount,
    paymentPendingCount,
    paymentCompletedCount,
    refundPendingCount,
    refundedCount,
  ] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        property: {
          select: { id: true, name: true, city: true, slug: true },
        },
        listingOption: {
          select: { id: true, title: true, slug: true, maxGuests: true },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        refunds: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.booking.count({ where }),
    prisma.booking.count(),
    prisma.booking.count({
      where: { status: { in: [BookingStatus.PENDING_HOLD, BookingStatus.PAYMENT_PENDING] } },
    }),
    prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
    prisma.booking.count({ where: { status: BookingStatus.CHECKED_IN } }),
    prisma.booking.count({
      where: { status: { in: [BookingStatus.CHECKED_OUT, BookingStatus.COMPLETED] } },
    }),
    prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
    prisma.booking.count({ where: { status: BookingStatus.PAYMENT_PENDING } }),
    prisma.booking.count({
      where: { payments: { some: { status: PaymentStatus.CAPTURED } } },
    }),
    prisma.booking.count({ where: { status: BookingStatus.REFUND_PENDING } }),
    prisma.booking.count({ where: { status: BookingStatus.REFUNDED } }),
  ]);

  const counts: BookingListSummaryCounts = {
    totalAll,
    pendingCount,
    confirmedCount,
    checkedInCount,
    checkedOutCount,
    cancelledCount,
    paymentPendingCount,
    paymentCompletedCount,
    refundPendingCount,
    refundedCount,
  };

  return {
    bookings,
    pagination: {
      page,
      pageSize,
      totalRecords,
      totalPages: Math.ceil(totalRecords / pageSize) || 1,
    },
    counts,
  };
}

/**
 * Retrieves full booking details with related records, activity timeline, and cancellation policy calculations.
 */
export async function getBookingDetails(bookingIdOrReference: string) {
  const booking = await prisma.booking.findFirst({
    where: {
      OR: [{ id: bookingIdOrReference }, { bookingReference: bookingIdOrReference }],
    },
    include: {
      property: true,
      listingOption: true,
      inventoryGroup: true,
      guests: {
        orderBy: { isPrimary: "desc" },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
      refunds: {
        orderBy: { createdAt: "desc" },
      },
      availabilityBlocks: true,
    },
  });

  if (!booking) return null;

  // Captured payment for calculations
  const capturedPayment = booking.payments.find((p) => p.status === PaymentStatus.CAPTURED);
  const paidAmount = capturedPayment ? Number(capturedPayment.amount) : 0;

  // Policy calculation
  const cancellationPolicy = calculateCancellationRefund(
    booking.checkInDate,
    Number(booking.totalAmount),
    paidAmount
  );

  // Timeline
  const activityTimeline = await getBookingActivityTimeline(booking.id);

  return {
    ...booking,
    paidAmount,
    cancellationPolicy,
    activityTimeline,
  };
}

/**
 * Aggregates real operational metrics for the `/admin/dashboard` command center.
 */
export async function getDashboardOperationalMetrics() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const next7Days = new Date(today);
  next7Days.setDate(next7Days.getDate() + 7);

  const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const [
    todayArrivals,
    todayDepartures,
    inHouseGuests,
    recentReservations,
    upcomingReservations,
    monthlyRevenueAgg,
    activeBookingsCount,
  ] = await Promise.all([
    // Today's Arrivals
    prisma.booking.findMany({
      where: {
        checkInDate: { gte: today, lt: tomorrow },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      },
      include: {
        property: { select: { name: true, city: true } },
        listingOption: { select: { title: true } },
      },
      orderBy: { checkInDate: "asc" },
    }),

    // Today's Departures
    prisma.booking.findMany({
      where: {
        checkOutDate: { gte: today, lt: tomorrow },
        status: {
          in: [BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT, BookingStatus.COMPLETED],
        },
      },
      include: {
        property: { select: { name: true, city: true } },
        listingOption: { select: { title: true } },
      },
      orderBy: { checkOutDate: "asc" },
    }),

    // Current in-house stays
    prisma.booking.findMany({
      where: {
        status: BookingStatus.CHECKED_IN,
      },
      include: {
        property: { select: { name: true, city: true } },
        listingOption: { select: { title: true } },
      },
    }),

    // Recent 5 reservations
    prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        property: { select: { name: true, city: true } },
        listingOption: { select: { title: true } },
        payments: { where: { status: PaymentStatus.CAPTURED }, take: 1 },
      },
    }),

    // Upcoming 7 days reservations
    prisma.booking.findMany({
      where: {
        checkInDate: { gte: today, lte: next7Days },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      },
      take: 6,
      orderBy: { checkInDate: "asc" },
      include: {
        property: { select: { name: true, city: true } },
        listingOption: { select: { title: true } },
      },
    }),

    // Monthly verified revenue
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: PaymentStatus.CAPTURED,
        verifiedAt: { gte: startOfMonth },
      },
    }),

    // Active Bookings
    prisma.booking.count({
      where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] } },
    }),
  ]);

  return {
    todayArrivals,
    todayDepartures,
    inHouseGuests,
    recentReservations,
    upcomingReservations,
    monthlyRevenue: Number(monthlyRevenueAgg._sum.amount || 0),
    activeBookingsCount,
  };
}
