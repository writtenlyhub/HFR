import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import { getMediaAssets, syncCatalogMedia } from "@/lib/media/media-service";
import { prisma } from "@/lib/prisma";
import { MediaLibraryView } from "./media-library-view";

export const dynamic = "force-dynamic";

interface MediaPageProps {
  searchParams?: Promise<{
    q?: string;
    type?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function AdminMediaPage({ searchParams }: MediaPageProps) {
  const auth = await requireAdminSession();
  if (!auth.authorized) {
    redirect("/admin/login?callbackUrl=/admin/media");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const query = resolvedParams.q;
  const mediaType = (resolvedParams.type === "IMAGE" || resolvedParams.type === "VIDEO"
    ? resolvedParams.type
    : "ALL") as "ALL" | "IMAGE" | "VIDEO";
  const sortBy = (resolvedParams.sort || "newest") as
    | "newest"
    | "oldest"
    | "filename"
    | "size_desc";
  const page = parseInt(resolvedParams.page || "1", 10) || 1;

  // If the media asset table is completely empty, trigger an initial sync
  const assetCount = await prisma.mediaAsset.count();
  if (assetCount === 0) {
    await syncCatalogMedia();
  }

  // Fetch paginated assets
  const result = await getMediaAssets({
    query,
    mediaType,
    sortBy,
    page,
    limit: 60,
  });

  // Calculate statistics across all assets
  const [totalCount, imageCount, videoCount, sizeAggregate] = await Promise.all([
    prisma.mediaAsset.count(),
    prisma.mediaAsset.count({ where: { mediaType: "IMAGE" } }),
    prisma.mediaAsset.count({ where: { mediaType: "VIDEO" } }),
    prisma.mediaAsset.aggregate({ _sum: { fileSize: true } }),
  ]);

  const stats = {
    totalCount,
    imageCount,
    videoCount,
    totalSizeBytes: sizeAggregate._sum.fileSize || 0,
  };

  return (
    <MediaLibraryView
      initialAssets={result.assets as any}
      total={result.total}
      currentPage={result.page}
      totalPages={result.totalPages}
      stats={stats}
    />
  );
}
