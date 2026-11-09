import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const conflictLogs = await prisma.auditLog.findMany({
      where: { action: "CALENDAR_SYNC_CONFLICT_DETECTED" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const conflictEvents = await prisma.externalCalendarEvent.findMany({
      where: {
        rawMetadata: {
          path: ["hasConflict"],
          equals: true,
        },
      },
      include: {
        connection: {
          select: { id: true, connectionName: true, platform: true },
        },
      },
      orderBy: { startDate: "asc" },
    });

    return NextResponse.json({
      success: true,
      conflictLogs,
      conflictEvents,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to fetch calendar conflicts:", message);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve calendar conflicts" },
      { status: 500 }
    );
  }
}
