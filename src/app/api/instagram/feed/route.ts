import { NextRequest, NextResponse } from "next/server";
import { getInstagramFeed } from "@/lib/instagram/provider";

export const dynamic = "force-dynamic";

/**
 * GET /api/instagram/feed
 *
 * Public endpoint to fetch the Instagram gallery feed.
 * Tokens and secret credentials remain strictly server-side.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const refreshParam = searchParams.get("refresh");

    let limit = 8;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = Math.min(parsed, 24);
      }
    }

    const forceRefresh = refreshParam === "true" || refreshParam === "1";

    const feed = await getInstagramFeed({
      limit,
      forceRefresh,
    });

    return NextResponse.json(feed, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[API:Instagram] Unexpected error:", errorMsg);

    return NextResponse.json(
      {
        success: false,
        data: [],
        isMock: false,
        username: "devstays.jaipur",
        profileUrl: "https://instagram.com/devstays.jaipur",
        timestamp: new Date().toISOString(),
        error: "Failed to retrieve Instagram feed. Please try again later.",
      },
      { status: 500 }
    );
  }
}
