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

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

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

/**
 * Removes an uploaded image file from persistent storage if it exists.
 */
export async function deleteUploadedImage(url: string): Promise<boolean> {
  try {
    if (!url.startsWith("/uploads/")) {
      return false;
    }
    const fileName = path.basename(url);
    const uploadDir = getUploadDirectory();
    const filePath = path.join(uploadDir, fileName);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.warn(`[Storage] Failed to delete image at ${url}:`, err);
    return false;
  }
}
