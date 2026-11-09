import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateCalendarUrl } from "@/lib/calendar/ical-import";
import { syncCalendarConnection } from "@/lib/calendar/sync-service";
import { CalendarPlatform } from "@prisma/client";
import { requireAdminSession } from "@/auth";

export async function GET() {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return NextResponse.json(
      { success: false, error: authCheck.error },
      { status: authCheck.status }
    );
  }

  try {
    const connections = await prisma.externalCalendarConnection.findMany({
      include: {
        inventoryGroup: {
          select: { id: true, name: true, code: true },
        },
        listingOption: {
          select: { id: true, title: true, slug: true },
        },
        _count: {
          select: {
            events: true,
            availabilityBlocks: true,
            syncLogs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, connections });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to list calendar connections:", message);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve calendar connections" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return NextResponse.json(
      { success: false, error: authCheck.error },
      { status: authCheck.status }
    );
  }

  try {
    const body = await request.json();
    const {
      inventoryGroupId,
      listingOptionId,
      platform = CalendarPlatform.AIRBNB,
      connectionName,
      externalListingId,
      importUrl,
      syncIntervalMinutes = 15,
      autoSync = true,
    } = body;

    if (!connectionName || !connectionName.trim()) {
      return NextResponse.json(
        { success: false, error: "Connection name is required" },
        { status: 400 }
      );
    }

    // Resolve inventoryGroupId: if not provided, look up Dev Stays Main Estate
    let targetInventoryGroupId = inventoryGroupId;
    if (!targetInventoryGroupId) {
      const defaultGroup = await prisma.inventoryGroup.findFirst({
        where: { code: "DEV-MAIN-ESTATE" },
      });
      if (!defaultGroup) {
        return NextResponse.json(
          { success: false, error: "Default inventory group not found" },
          { status: 400 }
        );
      }
      targetInventoryGroupId = defaultGroup.id;
    }

    // SSRF URL Validation if importUrl is provided
    if (importUrl && importUrl.trim()) {
      const urlCheck = await validateCalendarUrl(importUrl.trim(), {
        allowLocalForTesting: process.env.NODE_ENV !== "production",
      });
      if (!urlCheck.valid) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid or unsafe calendar URL: ${urlCheck.reason}`,
          },
          { status: 400 }
        );
      }
    }

    const cleanImportUrl = importUrl ? importUrl.trim() : null;

    // Check if an archived connection with this importUrl already exists to reactivate without duplicate blocks
    let connection;
    const existingArchived = cleanImportUrl
      ? await prisma.externalCalendarConnection.findFirst({
          where: {
            importUrl: cleanImportUrl,
            isArchived: true,
          },
        })
      : null;

    if (existingArchived) {
      connection = await prisma.externalCalendarConnection.update({
        where: { id: existingArchived.id },
        data: {
          connectionName: connectionName.trim(),
          platform: platform as CalendarPlatform,
          inventoryGroupId: targetInventoryGroupId,
          listingOptionId: listingOptionId || null,
          externalListingId: externalListingId || null,
          syncIntervalMinutes: Math.max(5, parseInt(String(syncIntervalMinutes), 10) || 15),
          isActive: true,
          isArchived: false,
          lastSyncError: null,
        },
        include: {
          inventoryGroup: true,
          listingOption: true,
        },
      });
    } else {
      connection = await prisma.externalCalendarConnection.create({
        data: {
          inventoryGroupId: targetInventoryGroupId,
          listingOptionId: listingOptionId || null,
          platform: platform as CalendarPlatform,
          connectionName: connectionName.trim(),
          externalListingId: externalListingId || null,
          importUrl: cleanImportUrl,
          syncIntervalMinutes: Math.max(5, parseInt(String(syncIntervalMinutes), 10) || 15),
          isActive: true,
          isArchived: false,
        },
        include: {
          inventoryGroup: true,
          listingOption: true,
        },
      });
    }

    let initialSyncResult = null;
    if (autoSync && connection.importUrl) {
      try {
        initialSyncResult = await syncCalendarConnection(connection.id, {
          allowLocalForTesting: process.env.NODE_ENV !== "production",
        });
      } catch (syncErr: unknown) {
        const syncMsg = syncErr instanceof Error ? syncErr.message : String(syncErr);
        console.warn(`Initial sync for new connection ${connection.id} encountered error:`, syncMsg);
      }
    }

    return NextResponse.json({
      success: true,
      connection,
      initialSyncResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to create calendar connection:", message);
    return NextResponse.json(
      { success: false, error: message || "Failed to create calendar connection" },
      { status: 500 }
    );
  }
}
