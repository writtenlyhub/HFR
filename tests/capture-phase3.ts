import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import fs from "fs";
import { prisma } from "../src/lib/prisma";

const ARTIFACT_DIR = "C:/Users/iamvr/.gemini/antigravity/brain/78c9cbcf-0812-4ff7-a053-964a85c3d722";

async function runCapture() {
  console.log("=== Phase 3 Visual Verification Capture Starting ===");

  const mainProperty = await prisma.property.findUnique({
    where: { slug: "dev-stays-jaipur" },
  });

  if (!mainProperty) {
    throw new Error("dev-stays-jaipur not found in database.");
  }

  // Create temporary draft property to capture staff preview banner
  const draftSlug = `preview-estate-${Date.now().toString().slice(-5)}`;
  const draftProp = await prisma.$transaction(async (tx) => {
    const p = await tx.property.create({
      data: {
        name: "DevStay Heritage Palace (Draft Estate)",
        slug: draftSlug,
        headline: "Private Heritage Palace & Sanctuary in Jaipur",
        description: "An extraordinary private heritage palace featuring regal arches, fountains, and courtyards.",
        address: "7 Amber Palace Road, Amber",
        city: "Jaipur",
        state: "Rajasthan",
        country: "India",
        postalCode: "302028",
        checkInTime: "14:00",
        checkOutTime: "11:00",
        houseRules: "No loud parties. Respect heritage architecture.",
        cancellationPolicy: "Full refund 7 days prior.",
        isActive: false, // DRAFT state!
      },
    });

    const ig = await tx.inventoryGroup.create({
      data: {
        propertyId: p.id,
        name: "Palace Physical Inventory",
        code: `${draftSlug.toUpperCase()}-ESTATE`,
        totalPhysicalUnits: 1,
      },
    });

    await tx.listingOption.create({
      data: {
        propertyId: p.id,
        inventoryGroupId: ig.id,
        slug: `${draftSlug}-grand-suite`,
        title: "Complete Palace Buyout",
        bedroomCount: 5,
        bathroomCount: 5,
        maxGuests: 12,
        basePricePerNight: 45000,
        description: "Entire palace private rental.",
        isActive: true,
        sortOrder: 1,
      },
    });

    await tx.propertyImage.create({
      data: {
        propertyId: p.id,
        url: "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
        caption: "Royal Grand Hall",
        altText: "Handcrafted Rajasthani palace hall",
        isCover: true,
        sortOrder: 1,
      },
    });

    return p;
  });

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page: Page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1.5 });

  try {
    // 1. Admin Sign In
    console.log("Navigating to /admin/login...");
    await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 800));

    await page.waitForSelector("input[type='email']", { timeout: 10000 });
    await page.type("input[type='email']", "admin@devstaysjaipur.com");
    await page.type("input[type='password']", "Admin@HFR2026!");
    await page.click("button[type='submit']");

    await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));

    // 2. Portfolio View with Status Tabs (All, Active, Drafts, Archived)
    console.log("Navigating to /admin/properties...");
    await page.goto("http://localhost:3000/admin/properties", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));

    const p51Path = path.join(ARTIFACT_DIR, "51_admin_properties_portfolio_tabs.png");
    await page.screenshot({ path: p51Path, fullPage: true });
    console.log(`Saved: ${p51Path}`);

    // 3. Property Editor - Photography Tab
    const editorUrl = `http://localhost:3000/admin/properties/${mainProperty.id}`;
    console.log(`Navigating to property editor: ${editorUrl}...`);
    await page.goto(editorUrl, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1200));

    // Click on "Photography" tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const match = buttons.find((b) => b.textContent?.includes("Photography"));
      if (match) match.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const p52Path = path.join(ARTIFACT_DIR, "52_admin_property_editor_photography.png");
    await page.screenshot({ path: p52Path, fullPage: true });
    console.log(`Saved: ${p52Path}`);

    // 4. Property Editor - SEO & Social Tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const match = buttons.find((b) => b.textContent?.includes("SEO & Social"));
      if (match) match.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const p53Path = path.join(ARTIFACT_DIR, "53_admin_property_editor_seo.png");
    await page.screenshot({ path: p53Path, fullPage: true });
    console.log(`Saved: ${p53Path}`);

    // 5. Property Editor - Publish & Archival Tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const match = buttons.find((b) => b.textContent?.includes("Publish & Archival"));
      if (match) match.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const p54Path = path.join(ARTIFACT_DIR, "54_admin_property_editor_publish.png");
    await page.screenshot({ path: p54Path, fullPage: true });
    console.log(`Saved: ${p54Path}`);

    // 6. Public Draft Preview (Logged in as Staff Admin)
    const previewUrl = `http://localhost:3000/properties/${draftSlug}`;
    console.log(`Navigating to staff draft preview: ${previewUrl}...`);
    await page.goto(previewUrl, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1200));

    const p55Path = path.join(ARTIFACT_DIR, "55_draft_property_staff_preview.png");
    await page.screenshot({ path: p55Path, fullPage: true });
    console.log(`Saved: ${p55Path}`);

  } finally {
    // Clean up draft property
    await prisma.property.delete({ where: { id: draftProp.id } }).catch(() => {});
    await browser.close();
    console.log("=== Visual Verification Capture Completed ===");
  }
}

runCapture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
