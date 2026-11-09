import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:/Users/iamvr/.gemini/antigravity/brain/78c9cbcf-0812-4ff7-a053-964a85c3d722";
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "detail_screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function capture() {
  console.log("Starting Puppeteer screenshot capture for Accommodation Detail Pages...");

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page: Page = await browser.newPage();

  // Desktop viewport
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  const routes = [
    {
      name: "01_property_overview",
      url: "http://localhost:3000/properties/dev-stays-jaipur",
      title: "Dev Stays Jaipur - Property Overview",
    },
    {
      name: "02_royal_suite_desktop",
      url: "http://localhost:3000/properties/dev-stays-jaipur/royal-suite",
      title: "Royal Suite (Main Bedroom) Detail Page",
    },
    {
      name: "03_courtyard_wing_desktop",
      url: "http://localhost:3000/properties/dev-stays-jaipur/courtyard-wing",
      title: "Courtyard Wing (2 Bedrooms) Detail Page",
    },
    {
      name: "04_full_estate_desktop",
      url: "http://localhost:3000/properties/dev-stays-jaipur/full-estate",
      title: "Full Estate Buyout (Whole Villa) Detail Page",
    },
  ];

  for (const item of routes) {
    console.log(`Navigating to ${item.url}...`);
    await page.goto(item.url, { waitUntil: "networkidle0", timeout: 30000 });
    // Allow any smooth animations to settle
    await new Promise((r) => setTimeout(r, 1200));

    // Full page screenshot
    const fullPath = path.join(SCREENSHOT_DIR, `${item.name}_full.png`);
    await page.screenshot({ path: fullPath, fullPage: true });
    console.log(`  -> Saved ${fullPath}`);

    // Above-the-fold viewport screenshot
    const viewportPath = path.join(SCREENSHOT_DIR, `${item.name}_viewport.png`);
    await page.screenshot({ path: viewportPath, fullPage: false });
    console.log(`  -> Saved ${viewportPath}`);
  }

  // Mobile viewport: iPhone 14 / modern smartphone
  console.log("Switching to Mobile Viewport (390 x 844)...");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

  console.log("Navigating to Mobile Royal Suite...");
  await page.goto("http://localhost:3000/properties/dev-stays-jaipur/royal-suite", { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1200));

  const mobilePath = path.join(SCREENSHOT_DIR, "05_royal_suite_mobile_viewport.png");
  await page.screenshot({ path: mobilePath, fullPage: false });
  console.log(`  -> Saved ${mobilePath}`);

  const mobileFullPath = path.join(SCREENSHOT_DIR, "05_royal_suite_mobile_full.png");
  await page.screenshot({ path: mobileFullPath, fullPage: true });
  console.log(`  -> Saved ${mobileFullPath}`);

  // Test Lightbox trigger
  console.log("Testing Lightbox modal trigger on desktop...");
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false, hasTouch: false });
  await page.goto("http://localhost:3000/properties/dev-stays-jaipur/royal-suite", { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1000));

  // Click on "View all photos" button
  const viewPhotosBtn = await page.$("button ::-p-text(View all)");
  if (viewPhotosBtn) {
    await viewPhotosBtn.click();
    await new Promise((r) => setTimeout(r, 800));
    const lightboxPath = path.join(SCREENSHOT_DIR, "06_royal_suite_lightbox.png");
    await page.screenshot({ path: lightboxPath, fullPage: false });
    console.log(`  -> Saved ${lightboxPath}`);
  }

  await browser.close();
  console.log("Screenshot capture complete!");
}

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});

