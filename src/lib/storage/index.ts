import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface UploadResult {
  url: string;
  fileName: string;
  size: number;
  mimeType: string;
}

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
];

export const ALLOWED_MEDIA_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
];

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_MEDIA_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Validates uploaded media file metadata and byte size.
 */
export function validateMediaUpload(
  size: number,
  mimeType: string
): { valid: boolean; error?: string; mediaType?: "IMAGE" | "VIDEO" } {
  const normalizedMime = mimeType.toLowerCase();
  const isImage = ALLOWED_IMAGE_MIME_TYPES.includes(normalizedMime);
  const isVideo = ALLOWED_VIDEO_MIME_TYPES.includes(normalizedMime);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: `Unsupported file type "${mimeType}". Allowed types: JPEG, PNG, WebP, AVIF, MP4, WebM.`,
    };
  }

  if (size > MAX_MEDIA_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 8 MB maximum limit (received ${(size / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  return { valid: true, mediaType: isVideo ? "VIDEO" : "IMAGE" };
}

/**
 * Validates uploaded image file metadata and byte size.
 */
export function validateImageUpload(
  size: number,
  mimeType: string
): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file type "${mimeType}". Allowed types: JPEG, PNG, WebP, AVIF.`,
    };
  }

  if (size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 8 MB maximum limit (received ${(size / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  return { valid: true };
}

/**
 * Resolves the persistent upload storage directory on the host/volume.
 * Allows mounting persistent Docker volumes via PERSISTENT_STORAGE_DIR.
 * Defaults to `<projectRoot>/public/uploads` for zero-configuration local execution.
 */
export function getUploadDirectory(): string {
  const customDir = process.env.PERSISTENT_STORAGE_DIR;
  if (customDir && customDir.trim().length > 0) {
    if (!fs.existsSync(customDir)) {
      fs.mkdirSync(customDir, { recursive: true });
    }
    return customDir;
  }

  const defaultDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }
  return defaultDir;
}

/**
 * Saves an uploaded image buffer to persistent storage with collision-free unique naming.
 * Returns the public URL path for database storage.
 */
export async function saveUploadedImage(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<UploadResult> {
  const validation = validateImageUpload(buffer.length, mimeType);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid image upload");
  }

  const uploadDir = getUploadDirectory();
  const ext = path.extname(originalFilename).toLowerCase() || (mimeType === "image/png" ? ".png" : ".jpg");
  const randomSuffix = crypto.randomBytes(8).toString("hex");
  const cleanBaseName = path
    .basename(originalFilename, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 30);

  const safeFileName = `${Date.now()}_${cleanBaseName}_${randomSuffix}${ext}`;
  const filePath = path.join(uploadDir, safeFileName);

  await fs.promises.writeFile(filePath, buffer);

  // Return public web accessible path
  const url = `/uploads/${safeFileName}`;

  return {
    url,
    fileName: safeFileName,
    size: buffer.length,
    mimeType,
  };
}

export interface MediaUploadResult extends UploadResult {
  mediaType: "IMAGE" | "VIDEO";
}

/**
 * Saves an uploaded media (image or video) buffer to persistent storage with collision-free unique naming.
 * Returns the public URL path for database storage.
 */
export async function saveUploadedMedia(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<MediaUploadResult> {
  const validation = validateMediaUpload(buffer.length, mimeType);
  if (!validation.valid || !validation.mediaType) {
    throw new Error(validation.error || "Invalid media upload");
  }

  const uploadDir = getUploadDirectory();
  const rawExt = path.extname(originalFilename).toLowerCase();
  const ext = rawExt || (
    mimeType === "video/mp4" ? ".mp4" :
    mimeType === "video/webm" ? ".webm" :
    mimeType === "image/png" ? ".png" :
    mimeType === "image/webp" ? ".webp" :
    mimeType === "image/avif" ? ".avif" : ".jpg"
  );

  const randomSuffix = crypto.randomBytes(8).toString("hex");
  const cleanBaseName = path
    .basename(originalFilename, rawExt)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 30);

  const safeFileName = `${Date.now()}_${cleanBaseName}_${randomSuffix}${ext}`;
  const filePath = path.join(uploadDir, safeFileName);

  // Security check: ensure path is strictly inside uploadDir (anti-traversal)
  const resolvedDir = path.resolve(/*turbopackIgnore: true*/ uploadDir);
  const resolvedFile = path.resolve(/*turbopackIgnore: true*/ filePath);
  if (!resolvedFile.startsWith(resolvedDir)) {
    throw new Error("Invalid file destination path detected");
  }

  await fs.promises.writeFile(filePath, buffer);

  const url = `/uploads/${safeFileName}`;

  return {
    url,
    fileName: safeFileName,
    size: buffer.length,
    mimeType,
    mediaType: validation.mediaType,
  };
}

/**
 * Removes an uploaded media file from persistent storage if it exists.
 * Strictly prevents path traversal attacks.
 */
export async function deleteUploadedMedia(url: string): Promise<boolean> {
  try {
    if (!url || typeof url !== "string" || !url.startsWith("/uploads/")) {
      return false;
    }

    const fileName = path.basename(url);
    // Disallow path traversal characters
    if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
      return false;
    }

    const uploadDir = getUploadDirectory();
    const filePath = path.resolve(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ uploadDir, fileName));
    const resolvedDir = path.resolve(/*turbopackIgnore: true*/ uploadDir);

    if (!filePath.startsWith(resolvedDir)) {
      return false;
    }

    if (fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.warn(`[Storage] Failed to delete media at ${url}:`, err);
    return false;
  }
}

/**
 * Removes an uploaded image file from persistent storage if it exists.
 */
export async function deleteUploadedImage(url: string): Promise<boolean> {
  return deleteUploadedMedia(url);
}
