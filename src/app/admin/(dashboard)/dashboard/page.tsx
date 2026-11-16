import { prisma } from "@/lib/prisma";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import Link from "next/link";
import {
  Building2,
  CalendarCheck,
  IndianRupee,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  Plus,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardOverviewPage() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const next7Days = new Date(today);
  next7Days.setDate(next7Days.getDate() + 7);

  const startOfMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
  );

  // 1. Fetch real database statistics concurrently
  const [
    totalProperties,
    publishedProperties,
    activeBookingsCount,
    totalBookingsCount,
    monthlyRevenueAgg,
    upcomingCheckIns,
    upcomingCheckOuts,
    propertiesList,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { isActive: true } }),
    prisma.booking.count({
      where: {
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
      },
    }),
    prisma.booking.count(),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: PaymentStatus.CAPTURED,
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.booking.findMany({
      where: {
        checkInDate: { gte: today, lte: next7Days },
        status: {
          in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN],
        },
      },
      include: {
        property: { select: { name: true, city: true } },
        listingOption: { select: { title: true } },
      },
      orderBy: { checkInDate: "asc" },
      take: 5,
    }),
    prisma.booking.findMany({
      where: {
        checkOutDate: { gte: today, lte: next7Days },
        status: {
          in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN],
        },
      },
      include: {
        property: { select: { name: true, city: true } },
        listingOption: { select: { title: true } },
      },
      orderBy: { checkOutDate: "asc" },
      take: 5,
    }),
    prisma.property.findMany({
      include: {
        listingOptions: { select: { id: true, title: true, basePricePerNight: true } },
        inventoryGroups: { select: { id: true, code: true } },
        images: { where: { isCover: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const monthlyRevenue = Number(monthlyRevenueAgg._sum.amount || 0);
  const draftProperties = totalProperties - publishedProperties;

  return (
    <div className="space-y-8">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-extrabold tracking-tight text-neutral-900">
            Operations Command Center
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 font-normal">
            Real-time hospitality metrics, property availability, and guest arrivals for DevStay.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/properties/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition shadow-xs hover:shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Property</span>
          </Link>

          <Link
            href="/admin/calendar-sync"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <span>iCal Sync</span>
          </Link>
        </div>
      </div>

      {/* KPI Statistic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total & Published Properties */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Properties Managed
            </span>
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {totalProperties}
            </span>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              {publishedProperties} Published
            </span>
          </div>
          <p className="text-[11px] text-neutral-500">
            {draftProperties > 0
              ? `${draftProperties} draft property awaiting review`
              : "All properties currently published live"}
          </p>
        </div>

        {/* Card 2: Active Bookings */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Active Bookings
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-200/60">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {activeBookingsCount}
            </span>
            <span className="text-xs text-neutral-500 font-medium">
              / {totalBookingsCount} lifetime
            </span>
          </div>
          <p className="text-[11px] text-neutral-500">
            Confirmed &amp; in-house guest stays
          </p>
        </div>

        {/* Card 3: Upcoming Check-Ins */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Arrivals (7 Days)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 border border-blue-200/60">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {upcomingCheckIns.length}
            </span>
            <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
              Upcoming
            </span>
          </div>
          <p className="text-[11px] text-neutral-500">
            {upcomingCheckOuts.length} departures scheduled this week
          </p>
        </div>

        {/* Card 4: Monthly Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Month Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 border border-emerald-200/60">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-neutral-500">₹</span>
            <span className="text-3xl font-extrabold text-neutral-900 tracking-tight">
              {monthlyRevenue.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-[11px] text-neutral-500">
            Verified Razorpay settlements for current month
          </p>
        </div>
      </div>

      {/* Two Column Section: Properties Overview & Upcoming Arrivals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Properties & Shared Inventory Footprint (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900 font-serif">
              Properties &amp; Inventory Status
            </h2>
            <Link
              href="/admin/properties"
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 group"
            >
              <span>View All Properties</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900" />
            </Link>
          </div>

          <div className="space-y-3">
            {propertiesList.map((prop) => {
              const coverImg = prop.images[0]?.url || "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg";
              const startingRate = prop.listingOptions.reduce(
                (min, o) => Math.min(min, Number(o.basePricePerNight)),
                Infinity
              );

              return (
                <div
                  key={prop.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs hover:border-neutral-300 transition space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-200">
                        <img
                          src={coverImg}
                          alt={prop.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-neutral-900">
                            {prop.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              prop.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {prop.isActive ? "Published" : "Draft"}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500">
                          {prop.address}, {prop.city} · {prop.postalCode}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/admin/properties/${prop.id}`}
                      className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition"
                    >
                      Manage
                    </Link>
                  </div>

                  {/* Shared Inventory Details */}
                  <div className="pt-3 border-t border-neutral-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-neutral-50">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                        Inventory Code
                      </span>
                      <span className="font-mono font-bold text-neutral-700">
                        {prop.inventoryGroups[0]?.code || "N/A"}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-neutral-50">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                        Configurations
                      </span>
                      <span className="font-bold text-neutral-800">
                        {prop.listingOptions.length} Options
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-neutral-50">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                        Starting Rate
                      </span>
                      <span className="font-bold text-neutral-900">
                        {startingRate !== Infinity
                          ? `₹${startingRate.toLocaleString("en-IN")}`
                          : "Custom"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Upcoming Check-Ins & Check-Outs (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-neutral-900 font-serif">
              Upcoming Arrivals (Next 7 Days)
            </h2>

            <div className="p-5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-3">
              {upcomingCheckIns.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 text-xs space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-neutral-300 mx-auto" />
                  <p>No guest arrivals scheduled for the next 7 days.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {upcomingCheckIns.map((booking) => (
                    <div key={booking.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-900">
                          {booking.customerName}
                        </span>
                        <span className="font-mono font-semibold text-neutral-500">
                          {booking.bookingReference}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-500">
                        <span>
                          {booking.listingOption?.title} · {booking.guestCount} guests
                        </span>
                        <span className="font-medium text-emerald-700">
                          {new Date(booking.checkInDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System Audit Activity */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-900 font-serif">
              Recent Administrative Activity
            </h3>
            <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-2.5">
              {recentAuditLogs.length === 0 ? (
                <p className="text-xs text-neutral-400 py-3 text-center">
                  No administrative actions logged yet.
                </p>
              ) : (
                recentAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between text-xs py-1 border-b border-neutral-100 last:border-b-0"
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold text-neutral-800 block">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {log.userEmail || "System Worker"}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(log.createdAt).toLocaleDateString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
