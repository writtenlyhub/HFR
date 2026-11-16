import { prisma } from "@/lib/prisma";
import { getDashboardOperationalMetrics } from "@/lib/booking/booking-queries";
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
  LogIn,
  LogOut,
  Users,
  Eye,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardOverviewPage() {
  const [
    operationalMetrics,
    totalProperties,
    publishedProperties,
    propertiesList,
    recentAuditLogs,
  ] = await Promise.all([
    getDashboardOperationalMetrics(),
    prisma.property.count(),
    prisma.property.count({ where: { isActive: true } }),
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

  const {
    todayArrivals,
    todayDepartures,
    inHouseGuests,
    recentReservations,
    upcomingReservations,
    monthlyRevenue,
    activeBookingsCount,
  } = operationalMetrics;

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
            Real-time hospitality metrics, guest arrivals, and verified Razorpay settlements for DevStay.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/bookings"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition shadow-xs hover:shadow-md"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Manage Reservations</span>
          </Link>

          <Link
            href="/admin/calendar"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <span>Availability Calendar</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid: 5 Live Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Today's Arrivals */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Today&apos;s Arrivals
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <LogIn className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">
              {todayArrivals.length}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
              Check-Ins Due
            </span>
          </div>
          <p className="text-[10px] text-neutral-400">Scheduled for today</p>
        </div>

        {/* KPI 2: Today's Departures */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Today&apos;s Departures
            </span>
            <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
              <LogOut className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">
              {todayDepartures.length}
            </span>
            <span className="text-[10px] text-neutral-600 font-semibold bg-neutral-100 px-1.5 py-0.5 rounded">
              Check-Outs Due
            </span>
          </div>
          <p className="text-[10px] text-neutral-400">Scheduled for today</p>
        </div>

        {/* KPI 3: In-House Guests */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              In-House Guests
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">
              {inHouseGuests.length}
            </span>
            <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
              Active Stays
            </span>
          </div>
          <p className="text-[10px] text-neutral-400">Currently staying</p>
        </div>

        {/* KPI 4: Active Confirmed Bookings */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Active Bookings
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <CalendarCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">
              {activeBookingsCount}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
              Confirmed
            </span>
          </div>
          <p className="text-[10px] text-neutral-400">Upcoming &amp; in-house stays</p>
        </div>

        {/* KPI 5: Monthly Verified Revenue */}
        <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Monthly Revenue
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs font-bold text-neutral-400">₹</span>
            <span className="text-2xl font-extrabold text-neutral-900 tracking-tight">
              {monthlyRevenue.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="text-[10px] text-neutral-400">Verified Razorpay payments</p>
        </div>
      </div>

      {/* Today's Operational Focus: Arrivals & Departures */}
      {(todayArrivals.length > 0 || todayDepartures.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Today's Arrivals Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Today&apos;s Scheduled Arrivals ({todayArrivals.length})
                </h3>
              </div>
              <Link href="/admin/bookings" className="text-[11px] font-bold text-emerald-700 hover:underline">
                View All
              </Link>
            </div>

            <div className="divide-y divide-emerald-100">
              {todayArrivals.map((arr) => (
                <div key={arr.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-neutral-900">{arr.customerName}</span>
                    <div className="text-[11px] text-neutral-500 font-mono">
                      {arr.bookingReference} · {arr.listingOption?.title}
                    </div>
                  </div>
                  <Link
                    href={`/admin/bookings?search=${arr.bookingReference}`}
                    className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] transition"
                  >
                    Check In
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Departures Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-neutral-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Today&apos;s Scheduled Departures ({todayDepartures.length})
                </h3>
              </div>
              <Link href="/admin/bookings" className="text-[11px] font-bold text-neutral-700 hover:underline">
                View All
              </Link>
            </div>

            <div className="divide-y divide-neutral-200/60">
              {todayDepartures.map((dep) => (
                <div key={dep.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-neutral-900">{dep.customerName}</span>
                    <div className="text-[11px] text-neutral-500 font-mono">
                      {dep.bookingReference} · {dep.listingOption?.title}
                    </div>
                  </div>
                  <Link
                    href={`/admin/bookings?search=${dep.bookingReference}`}
                    className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-black text-white font-bold text-[10px] transition"
                  >
                    Check Out
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Recent Reservations & Upcoming Arrivals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Recent Reservations (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-900 font-serif">
              Recent Reservations
            </h2>
            <Link
              href="/admin/bookings"
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 group"
            >
              <span>View All Bookings</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900" />
            </Link>
          </div>

          <div className="rounded-2xl bg-white border border-neutral-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/60 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Stay</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {recentReservations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-neutral-400 text-xs">
                        No reservations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentReservations.map((b) => (
                      <tr key={b.id} className="hover:bg-neutral-50/50 transition">
                        <td className="py-3 px-4">
                          <Link
                            href={`/admin/bookings?search=${b.bookingReference}`}
                            className="font-mono font-bold text-neutral-900 hover:underline"
                          >
                            {b.bookingReference}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-neutral-800 block">{b.customerName}</span>
                          <span className="text-[10px] text-neutral-400">{b.listingOption?.title}</span>
                        </td>
                        <td className="py-3 px-4 text-neutral-600 text-[11px]">
                          {new Date(b.checkInDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                          ₹{Number(b.totalAmount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700">
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Properties Inventory Overview */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900 font-serif">
                Properties Managed ({totalProperties})
              </h3>
              <Link href="/admin/properties" className="text-xs text-neutral-500 hover:text-neutral-800">
                Manage Portfolio →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {propertiesList.map((prop) => (
                <div
                  key={prop.id}
                  className="p-3.5 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-xs text-neutral-900">{prop.name}</h4>
                    <span className="text-[10px] text-neutral-400 block">
                      {prop.listingOptions.length} configurations · {prop.inventoryGroups[0]?.code || "ESTATE"}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      prop.isActive ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {prop.isActive ? "Published" : "Draft"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Reservations (7 Days) & Activity Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-neutral-900 font-serif">
              Upcoming Reservations (7 Days)
            </h2>

            <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-2.5">
              {upcomingReservations.length === 0 ? (
                <div className="py-6 text-center text-neutral-400 text-xs space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-neutral-300 mx-auto" />
                  <p>No arrivals scheduled for the upcoming 7 days.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {upcomingReservations.map((booking) => (
                    <div key={booking.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-900">{booking.customerName}</span>
                        <span className="font-mono font-semibold text-neutral-500">
                          {booking.bookingReference}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-500">
                        <span>{booking.listingOption?.title}</span>
                        <span className="font-semibold text-emerald-700">
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
            <div className="p-4 rounded-2xl bg-white border border-neutral-200/80 shadow-2xs space-y-2">
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
                      <span className="font-semibold text-neutral-800 block text-[11px]">
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
