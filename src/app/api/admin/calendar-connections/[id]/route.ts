import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateCalendarUrl } from "@/lib/calendar/ical-import";
import { requireAdminSession } from "@/auth";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return NextResponse.json(
      { success: false, error: authCheck.error },
      { status: authCheck.status }
    );
  }

  try {
    const params = await props.params;
    const { id } = params;

    const connection = await prisma.externalCalendarConnection.findUnique({
      where: { id },
      include: {
        inventoryGroup: true,
        listingOption: true,
        events: {
          orderBy: { startDate: "asc" },
          take: 100,
        },
        syncLogs: {
          orderBy: { startedAt: "desc" },
          take: 20,
        },
        availabilityBlocks: {
          take: 50,
          orderBy: { startDate: "asc" },
        },
      },
    });

    if (!connection) {
      return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, connection });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to retrieve connection:", message);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve connection details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return NextResponse.json(
      { success: false, error: authCheck.error },
      { status: authCheck.status }
    );
  }

  try {
    const params = await props.params;
    const { id } = params;
    const body = await request.json();

    const existing = await prisma.externalCalendarConnection.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 });
    }

    const { connectionName, importUrl, isActive, syncIntervalMinutes } = body;

    const updateData: Record<string, unknown> = {};

    if (connectionName !== undefined && typeof connectionName === "string") {
      updateData.connectionName = connectionName.trim();
    }

    if (isActive !== undefined && typeof isActive === "boolean") {
      updateData.isActive = isActive;
      if (isActive) {
        updateData.isArchived = false;
      }
    }

    if (syncIntervalMinutes !== undefined) {
      updateData.syncIntervalMinutes = Math.max(5, parseInt(String(syncIntervalMinutes), 10) || 15);
    }

    if (importUrl !== undefined) {
      if (importUrl === null || importUrl === "") {
        updateData.importUrl = null;
      } else {
        const cleanUrl = String(importUrl).trim();
        const urlCheck = await validateCalendarUrl(cleanUrl, {
          allowLocalForTesting: process.env.NODE_ENV !== "production",
        });
        if (!urlCheck.valid) {
          return NextResponse.json(
            { success: false, error: `Invalid or unsafe calendar URL: ${urlCheck.reason}` },
            { status: 400 }
          );
        }
        updateData.importUrl = cleanUrl;
      }
    }

    const updated = await prisma.externalCalendarConnection.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, connection: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to update connection:", message);
    return NextResponse.json(
      { success: false, error: message || "Failed to update connection" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  const authCheck = await requireAdminSession();
  if (!authCheck.authorized) {
    return NextResponse.json(
      { success: false, error: authCheck.error },
      { status: authCheck.status }
    );
  }

  try {
    const params = await props.params;
    const { id } = params;

    const existing = await prisma.externalCalendarConnection.findUnique({
      where: { id },
      include: {
        _count: {
          select: { availabilityBlocks: true, events: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Connection not found" }, { status: 404 });
    }

    // Safety Invariant (Priority 3):
    // Disconnecting a calendar MUST NOT reopen dates occupied by external reservations!
    // We soft-delete / archive the connection (isArchived: true, isActive: false)
    // while preserving all existing AvailabilityBlock records on DEV-MAIN-ESTATE.
    const updated = await prisma.externalCalendarConnection.update({
      where: { id },
      data: {
        isActive: false,
        isArchived: true,
        lastSyncStatus: "DISCONNECTED",
        lastSyncError: `Disconnected by administrator on ${new Date().toISOString()}. Existing reservation blocks preserved.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Connection "${existing.connectionName}" safely disconnected and archived. ${existing._count.availabilityBlocks} existing reservation blocks preserved.`,
      connection: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to disconnect calendar connection:", message);
    return NextResponse.json(
      { success: false, error: message || "Failed to disconnect calendar connection" },
      { status: 500 }
    );
  }
}
