import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { MediaType, Prisma } from "@prisma/client";
import { deleteUploadedMedia, getUploadDirectory } from "@/lib/storage";

export interface MediaAssetQueryParams {
  query?: string;
  mediaType?: "ALL" | "IMAGE" | "VIDEO";
  dateRange?: "ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR";
  sortBy?: "newest" | "oldest" | "filename" | "size_desc";
  page?: number;
  limit?: number;
}

export interface UsageReference {
  type: string;
  title: string;
  location: string;
  details?: string;
}

export interface AssetUsageResult {
  inUse: boolean;
  totalReferences: number;
  references: UsageReference[];
}

/**
 * Extracts width and height from common image formats (PNG, JPEG) buffers without external dependencies.
 */
export function extractDimensions(buffer: Buffer, mimeType: string): { width?: number; height?: number } {
  try {
    if (mimeType === "image/png" && buffer.length >= 24) {
      // PNG header: bytes 16..19 is width, 20..23 is height
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      if (width > 0 && height > 0) return { width, height };
    }

    if ((mimeType === "image/jpeg" || mimeType === "image/jpg") && buffer.length > 4) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        // SOF0 (0xC0) through SOF2 (0xC2) markers contain dimensions
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          if (width > 0 && height > 0) return { width, height };
          break;
        }
        // Move to next marker
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }
  } catch (err) {
    console.warn("[MediaService] Failed to parse dimensions:", err);
  }
  return {};
}

/**
 * Retrieves paginated media assets with full-text search, filtering, and sorting.
 */
export async function getMediaAssets(params: MediaAssetQueryParams = {}) {
  const {
    query,
    mediaType = "ALL",
    dateRange = "ALL",
    sortBy = "newest",
    page = 1,
    limit = 24,
  } = params;

  const where: Prisma.MediaAssetWhereInput = {};

  if (query && query.trim().length > 0) {
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    where.AND = tokens.map((token) => ({
      OR: [
        { fileName: { contains: token, mode: "insensitive" } },
        { originalFilename: { contains: token, mode: "insensitive" } },
        { title: { contains: token, mode: "insensitive" } },
        { altText: { contains: token, mode: "insensitive" } },
        { caption: { contains: token, mode: "insensitive" } },
        { description: { contains: token, mode: "insensitive" } },
      ],
    }));
  }

  if (mediaType && mediaType !== "ALL") {
    where.mediaType = mediaType as MediaType;
  }

  if (dateRange && dateRange !== "ALL") {
    const now = new Date();
    let startDate: Date | undefined;

    if (dateRange === "TODAY") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateRange === "WEEK") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "MONTH") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (dateRange === "YEAR") {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    }

    if (startDate) {
      where.createdAt = { gte: startDate };
    }
  }

  let orderBy: Prisma.MediaAssetOrderByWithRelationInput = { createdAt: "desc" };
  if (sortBy === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (sortBy === "filename") {
    orderBy = { fileName: "asc" };
  } else if (sortBy === "size_desc") {
    orderBy = { fileSize: "desc" };
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [total, assets] = await Promise.all([
    prisma.mediaAsset.count({ where }),
    prisma.mediaAsset.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  return {
    assets,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Retrieves a single media asset by ID.
 */
export async function getAssetById(id: string) {
  return prisma.mediaAsset.findUnique({
    where: { id },
  });
}

/**
 * Retrieves a single media asset by URL.
 */
export async function getAssetByUrl(url: string) {
  return prisma.mediaAsset.findUnique({
    where: { url },
  });
}

/**
 * Creates or catalogs a media asset in the database.
 */
export async function createMediaAsset(data: {
  url: string;
  fileName: string;
  originalFilename: string;
  title?: string | null;
  altText?: string | null;
  caption?: string | null;
  description?: string | null;
  mediaType: MediaType;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  uploadedBy?: string | null;
}) {
  return prisma.mediaAsset.upsert({
    where: { url: data.url },
    create: {
      url: data.url,
      fileName: data.fileName,
      originalFilename: data.originalFilename,
      title: data.title ?? data.originalFilename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
      altText: data.altText,
      caption: data.caption,
      description: data.description,
      mediaType: data.mediaType,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      width: data.width,
      height: data.height,
      uploadedBy: data.uploadedBy,
    },
    update: {
      title: data.title !== undefined ? data.title : undefined,
      altText: data.altText !== undefined ? data.altText : undefined,
      caption: data.caption !== undefined ? data.caption : undefined,
      description: data.description !== undefined ? data.description : undefined,
      fileSize: data.fileSize,
      width: data.width !== undefined ? data.width : undefined,
      height: data.height !== undefined ? data.height : undefined,
    },
  });
}

/**
 * Updates metadata for an asset.
 */
export async function updateAssetMetadata(
  id: string,
  metadata: {
    title?: string | null;
    altText?: string | null;
    caption?: string | null;
    description?: string | null;
  },
  userEmail?: string
) {
  const existing = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Media asset with ID "${id}" not found`);
  }

  const updated = await prisma.mediaAsset.update({
    where: { id },
    data: {
      title: metadata.title !== undefined ? metadata.title : existing.title,
      altText: metadata.altText !== undefined ? metadata.altText : existing.altText,
      caption: metadata.caption !== undefined ? metadata.caption : existing.caption,
      description: metadata.description !== undefined ? metadata.description : existing.description,
    },
  });

  await prisma.auditLog.create({
    data: {
      userEmail: userEmail || "admin@devstay.internal",
      action: "UPDATE_MEDIA_METADATA",
      entityType: "MediaAsset",
      entityId: id,
      metadata: {
        assetUrl: existing.url,
        fileName: existing.fileName,
        changes: metadata,
      },
    },
  });

  return updated;
}

/**
 * Performs deep usage scan across all DevStay entities:
 * - PropertyImage
 * - Property (ogImageUrl)
 * - ListingOption (coverImage)
 * - Testimonial (guestImageUrl)
 * - ExperienceItem (imageUrl)
 * - SiteContent (JSON content and draftContent)
 */
export async function getAssetUsage(assetUrl: string): Promise<AssetUsageResult> {
  const references: UsageReference[] = [];

  const [propertyImages, propertiesOg, listingOptions, testimonials, experiences, siteContents] =
    await Promise.all([
      prisma.propertyImage.findMany({
        where: { url: assetUrl },
        include: {
          property: { select: { id: true, name: true, slug: true } },
          listingOption: { select: { id: true, title: true } },
        },
      }),
      prisma.property.findMany({
        where: { ogImageUrl: assetUrl },
        select: { id: true, name: true, slug: true },
      }),
      prisma.listingOption.findMany({
        where: { coverImage: assetUrl },
        select: { id: true, title: true, slug: true, property: { select: { name: true } } },
      }),
      prisma.testimonial.findMany({
        where: { guestImageUrl: assetUrl },
        select: { id: true, guestName: true },
      }),
      prisma.experienceItem.findMany({
        where: { imageUrl: assetUrl },
        select: { id: true, title: true, category: true },
      }),
      prisma.siteContent.findMany(),
    ]);

  for (const img of propertyImages) {
    const parent = img.listingOption
      ? `${img.property.name} › ${img.listingOption.title}`
      : img.property.name;
    references.push({
      type: img.isCover ? "Property Cover Image" : "Property Gallery Image",
      title: parent,
      location: `/admin/properties/${img.property.id}`,
      details: img.caption ? `Caption: "${img.caption}"` : undefined,
    });
  }

  for (const p of propertiesOg) {
    references.push({
      type: "Property SEO Open Graph Image",
      title: p.name,
      location: `/admin/properties/${p.id}`,
    });
  }

  for (const opt of listingOptions) {
    references.push({
      type: "Accommodation Cover Image",
      title: `${opt.property?.name || "Property"} › ${opt.title}`,
      location: `/accommodations/${opt.slug}`,
    });
  }

  for (const t of testimonials) {
    references.push({
      type: "Guest Testimonial Avatar",
      title: t.guestName,
      location: "/admin/content#testimonials",
    });
  }

  for (const exp of experiences) {
    references.push({
      type: `Experience Card (${exp.category || "Neighborhood"})`,
      title: exp.title,
      location: "/admin/content#experiences",
    });
  }

  for (const sc of siteContents) {
    const publishedStr = JSON.stringify(sc.content || {});
    const draftStr = sc.draftContent ? JSON.stringify(sc.draftContent) : "";
    if (publishedStr.includes(assetUrl) || draftStr.includes(assetUrl)) {
      references.push({
        type: "Site Content Section",
        title: `CMS Section: ${sc.sectionKey.toUpperCase()}`,
        location: `/admin/content#${sc.sectionKey}`,
        details: sc.hasDraft ? "Used in active draft/published version" : "Used in published content",
      });
    }
  }

  return {
    inUse: references.length > 0,
    totalReferences: references.length,
    references,
  };
}

/**
 * Deletes a media asset safely.
 * Enforces zero references before allowing physical file deletion and record removal.
 */
export async function deleteMediaAsset(id: string, userEmail?: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) {
    throw new Error(`Media asset with ID "${id}" does not exist`);
  }

  // Check usage across all properties and CMS sections
  const usage = await getAssetUsage(asset.url);
  if (usage.inUse) {
    const referenceSummary = usage.references
      .map((r) => `• [${r.type}] ${r.title} (${r.location})`)
      .join("\n");
    throw new Error(
      `Cannot delete "${asset.fileName}" because it is actively used in ${usage.totalReferences} place(s):\n${referenceSummary}\n\nPlease replace or detach this asset from those sections before deleting.`
    );
  }

  // Delete physical storage file if located in /uploads/
  await deleteUploadedMedia(asset.url);

  // Delete database record
  await prisma.mediaAsset.delete({ where: { id } });

  // Log audit record
  await prisma.auditLog.create({
    data: {
      userEmail: userEmail || "admin@devstay.internal",
      action: "DELETE_MEDIA_ASSET",
      entityType: "MediaAsset",
      entityId: id,
      metadata: {
        url: asset.url,
        fileName: asset.fileName,
        originalFilename: asset.originalFilename,
        mediaType: asset.mediaType,
      },
    },
  });

  return { success: true, deletedId: id };
}

/**
 * Synchronizes and auto-catalogs existing static images and property images
 * into the MediaAsset library if not already present.
 */
export async function syncCatalogMedia() {
  const propertyImages = await prisma.propertyImage.findMany();
  let addedCount = 0;

  for (const img of propertyImages) {
    if (!img.url) continue;
    const existing = await prisma.mediaAsset.findUnique({ where: { url: img.url } });
    if (!existing) {
      const fileName = path.basename(img.url);
      const isVideo = img.url.endsWith(".mp4") || img.url.endsWith(".webm");

      let fileSize = 250000;
      let width = 1920;
      let height = 1080;

      // Try reading local file stats if in public
      try {
        const localPath = path.join(process.cwd(), "public", img.url.replace(/^\//, ""));
        if (fs.existsSync(localPath)) {
          const stat = fs.statSync(localPath);
          fileSize = stat.size;
        }
      } catch {
        // Fallback size
      }

      await prisma.mediaAsset.create({
        data: {
          url: img.url,
          fileName,
          originalFilename: fileName,
          title: img.caption || img.altText || fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
          altText: img.altText || img.caption || "DevStay luxury accommodation",
          caption: img.caption,
          mediaType: isVideo ? MediaType.VIDEO : MediaType.IMAGE,
          mimeType: isVideo ? "video/mp4" : "image/jpeg",
          fileSize,
          width,
          height,
          uploadedBy: "system@devstay.internal",
        },
      });
      addedCount++;
    }
  }

  // Also scan /public/images/ directory if available
  try {
    const imagesDir = path.join(process.cwd(), "public", "images");
    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if ([".jpg", ".jpeg", ".png", ".webp", ".avif", ".mp4", ".webm"].includes(ext)) {
          const url = `/images/${file}`;
          const existing = await prisma.mediaAsset.findUnique({ where: { url } });
          if (!existing) {
            const stat = fs.statSync(path.join(imagesDir, file));
            const isVideo = ext === ".mp4" || ext === ".webm";
            await prisma.mediaAsset.create({
              data: {
                url,
                fileName: file,
                originalFilename: file,
                title: file.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
                altText: file.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
                mediaType: isVideo ? MediaType.VIDEO : MediaType.IMAGE,
                mimeType: isVideo ? "video/mp4" : (ext === ".png" ? "image/png" : "image/jpeg"),
                fileSize: stat.size,
                width: 1920,
                height: 1080,
                uploadedBy: "system@devstay.internal",
              },
            });
            addedCount++;
          }
        }
      }
    }
  } catch (err) {
    console.warn("[MediaService] Notice scanning public/images:", err);
  }

  return { addedCount };
}
