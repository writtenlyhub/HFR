import { prisma } from "@/lib/prisma";
import {
  getCalendarMonthAvailability,
  MonthAvailabilitySummary,
} from "@/lib/availability/availability-service";
import {
  AvailabilityCalendarView,
  SerializedProperty,
  SerializedCalendarConnection,
  SerializedConflict,
} from "./availability-calendar-view";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  const properties = await prisma.property.findMany({
    where: { isArchived: false },
    orderBy: { createdAt: "asc" },
    include: {
      inventoryGroups: {
        select: { id: true, name: true, code: true },
      },
      listingOptions: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, slug: true, title: true, maxGuests: true },
      },
    },
  });

  const serializedProperties: SerializedProperty[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    inventoryGroups: p.inventoryGroups,
    listingOptions: p.listingOptions,
  }));

  const connections = await prisma.externalCalendarConnection.findMany({
    where: { isArchived: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      connectionName: true,
      platform: true,
      importUrl: true,
      exportToken: true,
      isActive: true,
      lastSyncedAt: true,
      lastSyncStatus: true,
      lastSyncError: true,
    },
  });

  const serializedConnections: SerializedCalendarConnection[] = connections.map((c) => ({
    id: c.id,
    connectionName: c.connectionName,
    platform: c.platform,
    importUrl: c.importUrl,
    exportToken: c.exportToken,
    isActive: c.isActive,
    lastSyncedAt: c.lastSyncedAt ? c.lastSyncedAt.toISOString() : null,
    lastSyncStatus: c.lastSyncStatus,
    lastSyncError: c.lastSyncError,
  }));

  const conflicts = await prisma.auditLog.findMany({
    where: { action: "CALENDAR_SYNC_CONFLICT_DETECTED" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const serializedConflicts: SerializedConflict[] = conflicts.map((c) => ({
    id: c.id,
    action: c.action,
    createdAt: c.createdAt.toISOString(),
    metadata: (c.metadata as SerializedConflict["metadata"]) || {},
  }));

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1; // 1..12

  let initialAvailability: MonthAvailabilitySummary = {
    propertyId: properties[0]?.id || "",
    propertyName: properties[0]?.name || "",
    inventoryGroupId: properties[0]?.inventoryGroups[0]?.id || "",
    year: currentYear,
    month: currentMonth,
    totalDays: 30,
    availableDays: 30,
    bookedDays: 0,
    heldDays: 0,
    blockedDays: 0,
    externalDays: 0,
    days: [],
  };

  if (properties.length > 0 && properties[0].inventoryGroups.length > 0) {
    try {
      initialAvailability = await getCalendarMonthAvailability(
        properties[0].id,
        null,
        currentYear,
        currentMonth
      );
    } catch (e) {
      console.warn("Failed to prefetch calendar availability:", e);
    }
  }

  return (
    <AvailabilityCalendarView
      properties={serializedProperties}
      initialAvailability={initialAvailability}
      connections={serializedConnections}
      conflicts={serializedConflicts}
      currentYear={currentYear}
      currentMonth={currentMonth}
    />
  );
}
