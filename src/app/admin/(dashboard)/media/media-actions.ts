"use server";

import { requireAdminSession } from "@/auth";
import { revalidatePath as nextRevalidatePath } from "next/cache";
import { saveUploadedMedia, validateMediaUpload } from "@/lib/storage";
import {
  createMediaAsset,
  updateAssetMetadata,
  deleteMediaAsset,
  getAssetUsage,
  syncCatalogMedia,
  extractDimensions,
  AssetUsageResult,
} from "@/lib/media/media-service";
import { prisma } from "@/lib/prisma";
import { MediaType } from "@prisma/client";

function safeRevalidatePath(path: string) {
  try {
    nextRevalidatePath(path);
  } catch {
    // Graceful fallback for non-Next request contexts like standalone tests
  }
}

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * Server action to upload single or multiple media assets securely.
 */
export async function uploadMediaAction(formData: FormData): Promise<ActionResult<{ url: string; id: string; fileName: string }>> {
  try {
    const auth = await requireAdminSession();
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "Unauthorized" };
    }

    const file = formData.get("file") as File | null;
    if (!file || typeof file === "string") {
      return { success: false, error: "No file was provided for upload" };
    }

    const originalFilename = file.name || "unnamed_asset";
    const mimeType = file.type || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate size and mime type
    const validation = validateMediaUpload(buffer.length, mimeType);
    if (!validation.valid || !validation.mediaType) {
      return { success: false, error: validation.error || "File type or size is invalid" };
    }

    // Attempt dimension extraction
    let width: number | undefined;
    let height: number | undefined;
    const clientWidth = formData.get("width");
    const clientHeight = formData.get("height");

    if (clientWidth && clientHeight) {
      width = parseInt(String(clientWidth), 10) || undefined;
      height = parseInt(String(clientHeight), 10) || undefined;
    }

    if (!width || !height) {
      const extracted = extractDimensions(buffer, mimeType);
      width = extracted.width;
      height = extracted.height;
    }

    // Save to persistent storage with unique collision-free name
    const uploaded = await saveUploadedMedia(buffer, originalFilename, mimeType);

    // Read custom metadata overrides from form if submitted
    const title = (formData.get("title") as string) || originalFilename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const altText = (formData.get("altText") as string) || undefined;
    const caption = (formData.get("caption") as string) || undefined;
    const description = (formData.get("description") as string) || undefined;

    // Create database asset record
    const asset = await createMediaAsset({
      url: uploaded.url,
      fileName: uploaded.fileName,
      originalFilename,
      title,
      altText,
      caption,
      description,
      mediaType: validation.mediaType === "VIDEO" ? MediaType.VIDEO : MediaType.IMAGE,
      mimeType,
      fileSize: uploaded.size,
      width,
      height,
      uploadedBy: auth.user.email || "staff@devstay.internal",
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userEmail: auth.user.email || "staff@devstay.internal",
        action: "UPLOAD_MEDIA_ASSET",
        entityType: "MediaAsset",
        entityId: asset.id,
        metadata: {
          url: asset.url,
          fileName: asset.fileName,
          originalFilename,
          fileSize: uploaded.size,
          mimeType,
        },
      },
    });

    safeRevalidatePath("/admin/media");
    safeRevalidatePath("/admin/gallery");

    return {
      success: true,
      message: `Asset "${originalFilename}" uploaded successfully.`,
      data: {
        url: asset.url,
        id: asset.id,
        fileName: asset.fileName,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to upload asset";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server action to update asset title, alt text, caption, and description.
 */
export async function updateMediaMetadataAction(
  id: string,
  metadata: {
    title?: string | null;
    altText?: string | null;
    caption?: string | null;
    description?: string | null;
  }
): Promise<ActionResult> {
  try {
    const auth = await requireAdminSession();
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "Unauthorized" };
    }

    const updated = await updateAssetMetadata(id, metadata, auth.user.email || undefined);
    safeRevalidatePath("/admin/media");

    return {
      success: true,
      message: "Asset metadata updated successfully.",
      data: updated,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update asset metadata";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server action to safely delete a media asset. Blocked if actively referenced.
 */
export async function deleteMediaAction(id: string): Promise<ActionResult<{ deletedId: string }>> {
  try {
    const auth = await requireAdminSession();
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "Unauthorized" };
    }

    const result = await deleteMediaAsset(id, auth.user.email || undefined);
    safeRevalidatePath("/admin/media");
    safeRevalidatePath("/admin/gallery");

    return {
      success: true,
      message: "Media asset deleted successfully.",
      data: result,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete media asset";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server action to inspect usage references for an asset before deleting or replacing.
 */
export async function getMediaUsageAction(assetUrl: string): Promise<ActionResult<AssetUsageResult>> {
  try {
    const auth = await requireAdminSession();
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "Unauthorized" };
    }

    const usage = await getAssetUsage(assetUrl);
    return {
      success: true,
      data: usage,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to scan asset usage";
    return { success: false, error: errorMsg };
  }
}

/**
 * Server action to synchronize existing static and property assets into the media catalog.
 */
export async function syncMediaCatalogAction(): Promise<ActionResult<{ addedCount: number }>> {
  try {
    const auth = await requireAdminSession();
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "Unauthorized" };
    }

    const result = await syncCatalogMedia();
    safeRevalidatePath("/admin/media");

    return {
      success: true,
      message: `Catalog synchronized. Added ${result.addedCount} new asset(s).`,
      data: result,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to synchronize catalog";
    return { success: false, error: errorMsg };
  }
}
