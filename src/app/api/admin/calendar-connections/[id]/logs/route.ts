import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const logs = await prisma.calendarSyncLog.findMany({
      where: { connectionId: id },
      orderBy: { startedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to retrieve sync logs:", message);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve sync logs" },
      { status: 500 }
    );
  }
}
