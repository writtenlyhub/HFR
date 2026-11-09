import { NextResponse } from "next/server";
import { syncCalendarConnection } from "@/lib/calendar/sync-service";
import { requireAdminSession } from "@/auth";

export async function POST(
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

    const result = await syncCalendarConnection(id, {
      allowLocalForTesting: process.env.NODE_ENV !== "production",
    });

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Manual sync failed:", message);
    return NextResponse.json(
      {
        success: false,
        error: message || "Manual sync failed",
      },
      { status: 500 }
    );
  }
}
