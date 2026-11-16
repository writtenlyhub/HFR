process.env.TEST_ADMIN_BYPASS = "true";

import { prisma } from "../src/lib/prisma";
import fs from "fs";
import path from "path";
import { MediaType } from "@prisma/client";
import {
  validateMediaUpload,
  saveUploadedMedia,
  deleteUploadedMedia,
  getUploadDirectory,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_MEDIA_SIZE_BYTES,
} from "../src/lib/storage";
import {
  getMediaAssets,
  getAssetById,
  getAssetByUrl,
  createMediaAsset,
  updateAssetMetadata,
  deleteMediaAsset,
  getAssetUsage,
  syncCatalogMedia,
  extractDimensions,
} from "../src/lib/media/media-service";
import {
  uploadMediaAction,
  updateMediaMetadataAction,
  deleteMediaAction,
  getMediaUsageAction,
  syncMediaCatalogAction,
} from "../src/app/admin/(dashboard)/media/media-actions";
import { attachMediaAssetToProperty } from "../src/app/admin/(dashboard)/properties/phase3-actions";

async function runPhase7Tests() {
  console.log("\n========================================================");
  console.log("  DEVSTAY ADMIN DASHBOARD — PHASE 7 MEDIA GALLERY TESTS");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: unknown, testName: string, detail?: string) {
    if (Boolean(condition)) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  const staffEmail = "admin@devstaysjaipur.com";

  // -----------------------------------------------------------
  // 1. Admin Authentication & Role Authorization
  // -----------------------------------------------------------
  console.log("1. Admin Authentication & Authorization Enforcement:");
  {
    // Temporarily disable bypass to verify 401 unauthorized
    process.env.TEST_ADMIN_BYPASS = "false";

    const emptyFormData = new FormData();
    const uploadRes = await uploadMediaAction(emptyFormData);
    assert(
      uploadRes.success === false && uploadRes.error?.includes("Unauthorized"),
      "Media upload requires staff administrator authentication"
    );

    const updateRes = await updateMediaMetadataAction("nonexistent-id", { title: "Test" });
    assert(
      updateRes.success === false && updateRes.error?.includes("Unauthorized"),
      "Metadata updates require staff administrator authentication"
    );

    const deleteRes = await deleteMediaAction("nonexistent-id");
    assert(
      deleteRes.success === false && deleteRes.error?.includes("Unauthorized"),
      "Asset deletion requires staff administrator authentication"
    );

    const usageRes = await getMediaUsageAction("/uploads/test.jpg");
    assert(
      usageRes.success === false && usageRes.error?.includes("Unauthorized"),
      "Asset usage inspection requires staff administrator authentication"
    );

    // Restore bypass for operational testing
    process.env.TEST_ADMIN_BYPASS = "true";
  }

  // -----------------------------------------------------------
  // 2. Upload Image File Validation & Storage
  // -----------------------------------------------------------
  console.log("\n2. Image File Validation & Persistent Storage:");
  {
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
      0x00, 0x00, 0x00, 0x0d, // IHDR chunk length (13)
      0x49, 0x48, 0x44, 0x52, // "IHDR"
      0x00, 0x00, 0x07, 0x80, // width: 1920
      0x00, 0x00, 0x04, 0x38, // height: 1080
      0x08, 0x06, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, // CRC placeholder
    ]);

    const result = await saveUploadedMedia(validPngBuffer, "villa_exterior_test.png", "image/png");
    assert(
      result.url.startsWith("/uploads/") && result.mediaType === "IMAGE",
      "Valid PNG saves to persistent storage directory with unique URL"
    );

    const uploadDir = getUploadDirectory();
    const physicalPath = path.join(uploadDir, result.fileName);
    assert(fs.existsSync(physicalPath), "Physical file exists on persistent storage volume");

    // Clean up temporary test file
    await deleteUploadedMedia(result.url);
  }

  // -----------------------------------------------------------
  // 3. Reject Unsupported MIME Types
  // -----------------------------------------------------------
  console.log("\n3. Unsupported MIME Type Rejection:");
  {
    const invalidExe = validateMediaUpload(1024, "application/x-msdownload");
    assert(
      invalidExe.valid === false && invalidExe.error?.includes("Unsupported file type"),
      "Rejects binary executables (.exe)"
    );

    const invalidPdf = validateMediaUpload(1024, "application/pdf");
    assert(
      invalidPdf.valid === false && invalidPdf.error?.includes("Unsupported file type"),
      "Rejects PDF documents from media gallery"
    );

    const invalidZip = validateMediaUpload(1024, "application/zip");
    assert(
      invalidZip.valid === false && invalidZip.error?.includes("Unsupported file type"),
      "Rejects archive files (.zip)"
    );
  }

  // -----------------------------------------------------------
  // 4. Reject Oversized Uploads (> 8 MB)
  // -----------------------------------------------------------
  console.log("\n4. Maximum 8 MB File Size Validation:");
  {
    const oversizedBytes = 9 * 1024 * 1024; // 9 MB
    const oversizedCheck = validateMediaUpload(oversizedBytes, "image/jpeg");
    assert(
      oversizedCheck.valid === false && oversizedCheck.error?.includes("exceeds the 8 MB maximum limit"),
      "Rejects files larger than 8 MB with explicit size error"
    );

    const allowedBytes = 7.5 * 1024 * 1024; // 7.5 MB
    const allowedCheck = validateMediaUpload(allowedBytes, "image/jpeg");
    assert(allowedCheck.valid === true, "Permits files under 8 MB");
  }

  // -----------------------------------------------------------
  // 5. Video File Upload Support (MP4 & WebM)
  // -----------------------------------------------------------
  console.log("\n5. Video File Upload Support:");
  {
    const videoBuffer = Buffer.from("simulated_mp4_video_payload_devstay");
    const videoResult = await saveUploadedMedia(videoBuffer, "villa_walkthrough.mp4", "video/mp4");

    assert(
      videoResult.mediaType === "VIDEO" && videoResult.url.endsWith(".mp4"),
      "Successfully validates and saves MP4 video files"
    );

    // Save as MediaAsset
    const videoAsset = await createMediaAsset({
      url: videoResult.url,
      fileName: videoResult.fileName,
      originalFilename: "villa_walkthrough.mp4",
      title: "Jaipur Sanctuary Walkthrough Tour",
      mediaType: MediaType.VIDEO,
      mimeType: "video/mp4",
      fileSize: videoResult.size,
      uploadedBy: staffEmail,
    });

    assert(
      videoAsset.mediaType === MediaType.VIDEO && videoAsset.title === "Jaipur Sanctuary Walkthrough Tour",
      "MediaAsset database record correctly stores VIDEO type and metadata"
    );

    // Cleanup video asset
    await deleteMediaAsset(videoAsset.id, staffEmail);
  }

  // -----------------------------------------------------------
  // 6. Metadata Editing & Audit Logging
  // -----------------------------------------------------------
  console.log("\n6. Metadata Editing & Audit Trail:");
  {
    const testAsset = await prisma.mediaAsset.create({
      data: {
        url: `/uploads/test_meta_${Date.now()}.jpg`,
        fileName: `test_meta_${Date.now()}.jpg`,
        originalFilename: "original_photo.jpg",
        title: "Initial Title",
        altText: "Initial Alt",
        mediaType: MediaType.IMAGE,
        mimeType: "image/jpeg",
        fileSize: 10240,
        uploadedBy: staffEmail,
      },
    });

    const updated = await updateAssetMetadata(
      testAsset.id,
      {
        title: "Updated Royal Suite Master Bedroom",
        altText: "Spacious master bedroom overlooking royal courtyard at DevStay Jaipur",
        caption: "Courtyard view morning sunlight",
        description: "Photograph captured during golden hour for Phase 7 showcase.",
      },
      staffEmail
    );

    assert(
      updated.title === "Updated Royal Suite Master Bedroom" &&
      updated.altText?.includes("overlooking royal courtyard"),
      "Asset metadata updated in database"
    );

    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: "MediaAsset",
        entityId: testAsset.id,
        action: "UPDATE_MEDIA_METADATA",
      },
      orderBy: { createdAt: "desc" },
    });

    assert(
      Boolean(audit) && audit?.userEmail === staffEmail,
      "Logs UPDATE_MEDIA_METADATA audit record with staff email"
    );

    await prisma.mediaAsset.delete({ where: { id: testAsset.id } });
  }

  // -----------------------------------------------------------
  // 7. Search & Filtering Capabilities
  // -----------------------------------------------------------
  console.log("\n7. Search & Filtering Capabilities:");
  {
    const stamp = Date.now();
    const assetA = await prisma.mediaAsset.create({
      data: {
        url: `/uploads/search_palace_${stamp}.jpg`,
        fileName: `search_palace_${stamp}.jpg`,
        originalFilename: `palace_front_${stamp}.jpg`,
        title: `Majestic Amber Fort View ${stamp}`,
        mediaType: MediaType.IMAGE,
        mimeType: "image/jpeg",
        fileSize: 50000,
      },
    });

    const assetB = await prisma.mediaAsset.create({
      data: {
        url: `/uploads/search_aerial_${stamp}.mp4`,
        fileName: `search_aerial_${stamp}.mp4`,
        originalFilename: `jaipur_drone_${stamp}.mp4`,
        title: `Aerial Drone Jaipur Sunset ${stamp}`,
        mediaType: MediaType.VIDEO,
        mimeType: "video/mp4",
        fileSize: 90000,
      },
    });

    // Search by title keyword
    const searchRes = await getMediaAssets({ query: `Amber Fort ${stamp}` });
    assert(
      searchRes.assets.some((a) => a.id === assetA.id) &&
      !searchRes.assets.some((a) => a.id === assetB.id),
      "Full-text search locates assets by title query"
    );

    // Filter by type VIDEO
    const videoFilterRes = await getMediaAssets({
      query: `${stamp}`,
      mediaType: "VIDEO",
    });
    assert(
      videoFilterRes.assets.some((a) => a.id === assetB.id) &&
      !videoFilterRes.assets.some((a) => a.id === assetA.id),
      "Filters assets by mediaType: VIDEO"
    );

    await prisma.mediaAsset.deleteMany({
      where: { id: { in: [assetA.id, assetB.id] } },
    });
  }

  // -----------------------------------------------------------
  // 8. Sorting Functionality
  // -----------------------------------------------------------
  console.log("\n8. Asset Sorting (Newest, Oldest, Filename, Size):");
  {
    const stamp = Date.now();
    const smallAsset = await prisma.mediaAsset.create({
      data: {
        url: `/uploads/sort_a_${stamp}.jpg`,
        fileName: `a_sort_${stamp}.jpg`,
        originalFilename: "a.jpg",
        mediaType: MediaType.IMAGE,
        mimeType: "image/jpeg",
        fileSize: 1000,
      },
    });

    const largeAsset = await prisma.mediaAsset.create({
      data: {
        url: `/uploads/sort_z_${stamp}.jpg`,
        fileName: `z_sort_${stamp}.jpg`,
        originalFilename: "z.jpg",
        mediaType: MediaType.IMAGE,
        mimeType: "image/jpeg",
        fileSize: 999999,
      },
    });

    const sortedBySize = await getMediaAssets({
      query: `sort_${stamp}`,
      sortBy: "size_desc",
    });
    assert(
      sortedBySize.assets[0]?.id === largeAsset.id,
      "Sorting by size_desc places largest file first"
    );

    const sortedByName = await getMediaAssets({
      query: `sort_${stamp}`,
      sortBy: "filename",
    });
    assert(
      sortedByName.assets[0]?.id === smallAsset.id,
      "Sorting by filename places alphabetical A-Z first"
    );

    await prisma.mediaAsset.deleteMany({
      where: { id: { in: [smallAsset.id, largeAsset.id] } },
    });
  }

  // -----------------------------------------------------------
  // 9. Dimension Extraction for Images
  // -----------------------------------------------------------
  console.log("\n9. Image Header Dimension Extraction:");
  {
    const pngSample = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x05, 0x00, // 1280 width
      0x00, 0x00, 0x02, 0xd0, // 720 height
      0x08, 0x06, 0x00, 0x00, 0x00,
    ]);

    const dims = extractDimensions(pngSample, "image/png");
    assert(
      dims.width === 1280 && dims.height === 720,
      `Correctly extracts PNG dimensions from binary header (1280×720)`
    );
  }

  // -----------------------------------------------------------
  // 10. Media API Query Endpoint Structure
  // -----------------------------------------------------------
  console.log("\n10. Media Query Endpoint & Pagination Structure:");
  {
    const res = await getMediaAssets({ page: 1, limit: 10 });
    assert(
      Array.isArray(res.assets) &&
      typeof res.total === "number" &&
      res.page === 1 &&
      res.totalPages >= 1,
      "Returns structured response with assets array, total, page, and totalPages"
    );
  }

  // -----------------------------------------------------------
  // 11. Usage Scanning Across Properties & Content
  // -----------------------------------------------------------
  console.log("\n11. Deep Asset Usage Scanning Across DevStay Models:");
  {
    const uniqueUrl = `/uploads/test_used_asset_${Date.now()}.jpg`;

    // Create media asset
    const asset = await prisma.mediaAsset.create({
      data: {
        url: uniqueUrl,
        fileName: path.basename(uniqueUrl),
        originalFilename: "villa_courtyard.jpg",
        mediaType: MediaType.IMAGE,
        mimeType: "image/jpeg",
        fileSize: 50000,
      },
    });

    // Check usage when unused
    const initialUsage = await getAssetUsage(uniqueUrl);
    assert(initialUsage.inUse === false && initialUsage.totalReferences === 0, "Identifies completely unused asset");

    // Attach to a property gallery
    const property = await prisma.property.findFirst();
    let attachedImgId: string | null = null;

    if (property) {
      const pImg = await prisma.propertyImage.create({
        data: {
          propertyId: property.id,
          url: uniqueUrl,
          caption: "Courtyard Garden Test",
          isCover: false,
        },
      });
      attachedImgId = pImg.id;

      const activeUsage = await getAssetUsage(uniqueUrl);
      assert(
        activeUsage.inUse === true &&
        activeUsage.references.some((r) => r.type.includes("Property") && r.location.includes(property.id)),
        "Identifies active reference in PropertyImage gallery"
      );
    }

    // Clean up attachment and asset
    if (attachedImgId) {
      await prisma.propertyImage.delete({ where: { id: attachedImgId } });
    }
    await prisma.mediaAsset.delete({ where: { id: asset.id } });
  }

  // -----------------------------------------------------------
  // 12. Safe Deletion Block When In Active Use
  // -----------------------------------------------------------
  console.log("\n12. Safe Deletion Guard (Blocks Deletion of Referenced Media):");
  {
    const inUseUrl = `/uploads/locked_active_${Date.now()}.jpg`;
    const asset = await prisma.mediaAsset.create({
      data: {
        url: inUseUrl,
        fileName: path.basename(inUseUrl),
        originalFilename: "locked.jpg",
        mediaType: MediaType.IMAGE,
        mimeType: "image/jpeg",
        fileSize: 40000,
      },
    });

    const property = await prisma.property.findFirst();
    if (property) {
      const pImg = await prisma.propertyImage.create({
        data: {
          propertyId: property.id,
          url: inUseUrl,
          caption: "Active locked image",
        },
      });

      let deletionBlocked = false;
      let blockedMessage = "";

      try {
        await deleteMediaAsset(asset.id, staffEmail);
      } catch (err: unknown) {
        deletionBlocked = true;
        blockedMessage = err instanceof Error ? err.message : String(err);
      }

      assert(
        deletionBlocked && blockedMessage.includes("actively used"),
        "Blocks deletion and provides detailed list of referenced locations"
      );

      // Verify record still exists
      const stillThere = await prisma.mediaAsset.findUnique({ where: { id: asset.id } });
      assert(Boolean(stillThere), "Database record preserved following blocked deletion attempt");

      await prisma.propertyImage.delete({ where: { id: pImg.id } });
      await prisma.mediaAsset.delete({ where: { id: asset.id } });
    }
  }

  // -----------------------------------------------------------
  // 13. Safe Deletion of Unused Asset
  // -----------------------------------------------------------
  console.log("\n13. Safe Deletion of Unused Asset with Audit Log:");
  {
    const dummyBuffer = Buffer.from("dummy_unreferenced_content");
    const uploaded = await saveUploadedMedia(dummyBuffer, "to_delete_test.png", "image/png");

    const asset = await createMediaAsset({
      url: uploaded.url,
      fileName: uploaded.fileName,
      originalFilename: "to_delete_test.png",
      mediaType: MediaType.IMAGE,
      mimeType: "image/png",
      fileSize: uploaded.size,
      uploadedBy: staffEmail,
    });

    const deleteResult = await deleteMediaAsset(asset.id, staffEmail);
    assert(deleteResult.success === true, "Successfully deletes unreferenced media asset");

    const recordCheck = await prisma.mediaAsset.findUnique({ where: { id: asset.id } });
    assert(recordCheck === null, "Database record removed from media_assets table");

    const physicalPath = path.join(getUploadDirectory(), uploaded.fileName);
    assert(!fs.existsSync(physicalPath), "Physical file deleted from persistent storage volume");

    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: "MediaAsset",
        entityId: asset.id,
        action: "DELETE_MEDIA_ASSET",
      },
    });
    assert(Boolean(audit), "Logs DELETE_MEDIA_ASSET action in system AuditLog");
  }

  // -----------------------------------------------------------
  // 14. Path Traversal Attack Neutralization
  // -----------------------------------------------------------
  console.log("\n14. Directory Traversal Security Defense:");
  {
    const traversalA = await deleteUploadedMedia("/uploads/../../package.json");
    assert(traversalA === false, "Neutralizes parent directory traversal attack (/uploads/../../)");

    const traversalB = await deleteUploadedMedia("../../../etc/passwd");
    assert(traversalB === false, "Neutralizes relative traversal path attack");

    const traversalC = await deleteUploadedMedia("C:\\Windows\\System32\\calc.exe");
    assert(traversalC === false, "Neutralizes absolute OS path attack");
  }

  // -----------------------------------------------------------
  // 15. Catalog Auto-Synchronization & Property Integration
  // -----------------------------------------------------------
  console.log("\n15. Catalog Synchronization & Property Gallery Reuse:");
  {
    const syncRes = await syncCatalogMedia();
    assert(
      typeof syncRes.addedCount === "number",
      "syncCatalogMedia() executes without errors and catalogs existing images"
    );

    // Verify properties can attach an existing catalog asset
    const property = await prisma.property.findFirst();
    const existingAsset = await prisma.mediaAsset.findFirst({
      where: { mediaType: MediaType.IMAGE },
    });

    if (property && existingAsset) {
      const attachRes = await attachMediaAssetToProperty(
        property.id,
        existingAsset.url,
        "Attached from Media Library",
        "DevStay Villa Suite"
      );

      assert(attachRes.success === true, "Successfully attaches media asset directly to property gallery");

      if (attachRes.data && (attachRes.data as any).id) {
        await prisma.propertyImage.delete({ where: { id: (attachRes.data as any).id } });
      }
    }
  }

  console.log("\n--------------------------------------------------------");
  console.log(`Phase 7 Test Suite Complete: ${passed} passed, ${failed} failed.`);
  console.log("--------------------------------------------------------\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7Tests()
  .catch((err) => {
    console.error("Phase 7 test execution error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
