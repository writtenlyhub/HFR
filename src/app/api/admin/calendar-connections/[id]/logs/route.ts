import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
