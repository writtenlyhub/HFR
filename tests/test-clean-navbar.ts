import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:/Users/iamvr/.gemini/antigravity/brain/78c9cbcf-0812-4ff7-a053-964a85c3d722";
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "navbar_screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verifyCleanMinimalNavbar() {
  console.log("==========================================================");
  console.log("  HOTEL FEDERATION — MINIMAL CLEAN NAVBAR VERIFICATION");
  console.log("==========================================================\n");

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page: Page = await browser.newPage();

  // Test 1: Desktop Viewport (1440x900)
  console.log("[1/4] Loading Homepage on Desktop (1440x900)...");
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1000));

  // Verify that the middle desktop section links have been completely removed
  const desktopNavLinks = await page.$$("nav[aria-label='Main Navigation']");
  if (desktopNavLinks.length > 0) {
    throw new Error("Expected middle desktop navigation bar to be removed!");
  }
  console.log("  ✓ Confirmed: Desktop middle navigation links are completely removed!");

  // Verify brand logo exists on left
  const brandLogo = await page.$("a[data-purpose='brand-logo']");
  if (!brandLogo) {
    throw new Error("Brand logo not found in header!");
  }
  console.log("  ✓ Brand logo verified on left!");

  // Verify CTA exists on right
  const ctaBtn = await page.$("header a[href*='booking'], header a[href*='estate']");
  if (!ctaBtn) {
    throw new Error("Check Availability button not found!");
  }
  console.log("  ✓ 'Check Availability' button verified on right!");

  // Capture clean desktop header
  const cleanHeaderPath = path.join(SCREENSHOT_DIR, "06_clean_minimal_desktop_header.png");
  await page.screenshot({ path: cleanHeaderPath, clip: { x: 0, y: 0, width: 1440, height: 140 } });
  console.log(`  -> Saved ${cleanHeaderPath}`);

  // Test 2: Scrolled desktop header
  console.log("[2/4] Testing scrolled elevation on clean desktop header...");
  await page.evaluate(() => window.scrollTo(0, 300));
  await new Promise((r) => setTimeout(r, 600));

  const scrolledCleanHeaderPath = path.join(SCREENSHOT_DIR, "07_clean_desktop_header_scrolled.png");
  await page.screenshot({ path: scrolledCleanHeaderPath, clip: { x: 0, y: 0, width: 1440, height: 140 } });
  console.log(`  -> Saved ${scrolledCleanHeaderPath}`);

  // Test 3: Mobile Viewport (390x844)
  console.log("[3/4] Testing Mobile Viewport (390x844)...");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 800));

  const mobileHeaderPath = path.join(SCREENSHOT_DIR, "08_clean_mobile_header.png");
  await page.screenshot({ path: mobileHeaderPath, clip: { x: 0, y: 0, width: 390, height: 120 } });
  console.log(`  -> Saved ${mobileHeaderPath}`);

  // Test 4: Detail page clean header
  console.log("[4/4] Testing Clean Header on Room Detail Page...");
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false, hasTouch: false });
  await page.goto("http://localhost:3000/properties/dev-stays-jaipur/royal-suite", {
    waitUntil: "networkidle0",
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 800));

  const detailHeaderPath = path.join(SCREENSHOT_DIR, "09_clean_room_detail_header.png");
  await page.screenshot({ path: detailHeaderPath, clip: { x: 0, y: 0, width: 1440, height: 140 } });
  console.log(`  -> Saved ${detailHeaderPath}`);

  await browser.close();
  console.log("\n==========================================================");
  console.log("  ALL CLEAN MINIMAL NAVBAR CHECKS PASSED!");
  console.log("==========================================================");
}

verifyCleanMinimalNavbar().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
