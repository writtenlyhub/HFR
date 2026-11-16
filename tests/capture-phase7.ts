import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { syncCatalogMedia } from "../src/lib/media/media-service";

const ARTIFACT_DIR = "C:/Users/iamvr/.gemini/antigravity/brain/78c9cbcf-0812-4ff7-a053-964a85c3d722";

async function runPhase7Capture() {
  console.log("=== Phase 7 Visual Verification Capture Starting ===");

  // Ensure DB catalog is synchronized with existing assets
  await syncCatalogMedia();

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page: Page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1.5 });

  try {
    // 1. Log in as admin
    console.log("Navigating to /admin/login...");
    await page.goto("http://localhost:3000/admin/login", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 1000));

    await page.waitForSelector("input[type='email']", { timeout: 10000 });
    await page.type("input[type='email']", "admin@devstaysjaipur.com");
    await page.type("input[type='password']", "Admin@HFR2026!");
    await page.click("button[type='submit']");

    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));

    // 2. Media Gallery Dashboard (Grid View)
    console.log("Navigating to /admin/media (Grid View)...");
    await page.goto("http://localhost:3000/admin/media", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 2500));

    const p75Path = path.join(ARTIFACT_DIR, "75_admin_media_library_grid_view.png");
    await page.screenshot({ path: p75Path, fullPage: true });
    console.log(`Saved: ${p75Path}`);

    // 3. Media Gallery Dashboard (List View)
    console.log("Switching to List View...");
    await page.evaluate(() => {
      const listBtn = document.querySelector("button[aria-label='List View']") as HTMLButtonElement | null;
      if (listBtn) listBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1500));

    const p76Path = path.join(ARTIFACT_DIR, "76_admin_media_library_list_view.png");
    await page.screenshot({ path: p76Path, fullPage: true });
    console.log(`Saved: ${p76Path}`);

    // 4. Asset Details Drawer & Live Usage Inspector
    console.log("Switching back to Grid View & opening Asset Details Drawer...");
    await page.evaluate(() => {
      const gridBtn = document.querySelector("button[aria-label='Grid View']") as HTMLButtonElement | null;
      if (gridBtn) gridBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Click on the first asset card to open drawer
    await page.evaluate(() => {
      const firstCard = document.querySelector(".grid > div") as HTMLElement | null;
      if (firstCard) firstCard.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    const p77Path = path.join(ARTIFACT_DIR, "77_admin_media_details_drawer_and_usage.png");
    await page.screenshot({ path: p77Path, fullPage: true });
    console.log(`Saved: ${p77Path}`);

    // 5. Deletion Safeguard Modal
    console.log("Triggering Deletion Safeguard Modal...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const deleteBtn = buttons.find((b) => b.textContent?.includes("Delete Asset"));
      if (deleteBtn) deleteBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const p79Path = path.join(ARTIFACT_DIR, "79_admin_media_deletion_safeguard_modal.png");
    await page.screenshot({ path: p79Path, fullPage: true });
    console.log(`Saved: ${p79Path}`);

    // 6. Media Picker Modal in Content Editor
    console.log("Navigating to /admin/content and opening MediaPickerModal...");
    await page.goto("http://localhost:3000/admin/content", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Switch to Homepage Hero Tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const heroBtn = buttons.find((b) => b.textContent?.includes("Homepage Hero"));
      if (heroBtn) heroBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Click "Library" button next to Background Video or Poster Image
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const libraryBtn = buttons.find((b) => b.textContent?.includes("Library"));
      if (libraryBtn) libraryBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    const p78Path = path.join(ARTIFACT_DIR, "78_admin_media_picker_modal.png");
    await page.screenshot({ path: p78Path, fullPage: true });
    console.log(`Saved: ${p78Path}`);

    console.log("=== All 5 Visual Evidence Screenshots Captured Successfully! ===");
  } catch (err) {
    console.error("Puppeteer capture failed:", err);
  } finally {
    await browser.close();
  }
}

runPhase7Capture()
  .catch((err) => {
    console.error("Capture script execution failed:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
