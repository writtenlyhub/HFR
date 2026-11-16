import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/auth";
import { getMediaAssets } from "@/lib/media/media-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminSession();
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || undefined;
    const typeParam = searchParams.get("type");
    const mediaType = (typeParam === "IMAGE" || typeParam === "VIDEO" ? typeParam : "ALL") as "ALL" | "IMAGE" | "VIDEO";
    const sortByParam = searchParams.get("sortBy") as "newest" | "oldest" | "filename" | "size_desc" | null;
    const sortBy = sortByParam || "newest";
    const limit = parseInt(searchParams.get("limit") || "60", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    const result = await getMediaAssets({
      query,
      mediaType,
      sortBy,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
