import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:/Users/iamvr/.gemini/antigravity/brain/78c9cbcf-0812-4ff7-a053-964a85c3d722";
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "navbar_screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function verifyNavbar() {
  console.log("==========================================================");
  console.log("  HOTEL FEDERATION — CLEAN NAVBAR VERIFICATION SUITE");
  console.log("==========================================================\n");

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page: Page = await browser.newPage();

  // Test 1: Desktop Viewport (1440x900)
  console.log("[1/6] Loading Homepage on Desktop (1440x900)...");
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1000));

  // Capture top header
  const desktopHeaderPath = path.join(SCREENSHOT_DIR, "01_desktop_navbar_top.png");
  await page.screenshot({ path: desktopHeaderPath, clip: { x: 0, y: 0, width: 1440, height: 180 } });
  console.log(`  -> Saved ${desktopHeaderPath}`);

  // Test 2: Check all 9 section links exist in desktop nav
  console.log("[2/6] Verifying all 9 sections in Desktop Nav...");
  const navLinks = await page.$$eval("nav[aria-label='Main Navigation'] a", (links) =>
    links.map((l) => ({ text: l.textContent?.trim(), href: l.getAttribute("href") }))
  );
  console.log("  Found desktop navigation links:", navLinks);

  const expectedLabels = [
    "Overview",
    "Gallery",
    "Accommodations",
    "The Estate",
    "Reviews",
    "Location",
    "Host",
    "Guidelines",
    "Contact",
  ];

  for (const expected of expectedLabels) {
    const found = navLinks.some((l) => l.text === expected);
    if (!found) {
      throw new Error(`Missing expected nav link: ${expected}`);
    }
  }
  console.log("  ✓ All 9 sections present in Desktop Nav!");

  // Test 3: Scroll and verify Scroll-Spy & Scrolled Header Elevation
  console.log("[3/6] Testing Scroll-Spy & Header elevation on scroll...");
  await page.evaluate(() => {
    const reviewsEl = document.getElementById("reviews");
    if (reviewsEl) reviewsEl.scrollIntoView({ behavior: "instant" });
  });
  await new Promise((r) => setTimeout(r, 1000));

  const scrolledHeaderPath = path.join(SCREENSHOT_DIR, "02_desktop_navbar_scrolled_reviews.png");
  await page.screenshot({ path: scrolledHeaderPath, clip: { x: 0, y: 0, width: 1440, height: 180 } });
  console.log(`  -> Saved ${scrolledHeaderPath}`);

  // Test 4: Mobile Viewport (390x844)
  console.log("[4/6] Testing Mobile Viewport (390x844)...");
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto("http://localhost:3000", { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 800));

  const mobileTopPath = path.join(SCREENSHOT_DIR, "03_mobile_navbar_closed.png");
  await page.screenshot({ path: mobileTopPath, clip: { x: 0, y: 0, width: 390, height: 140 } });
  console.log(`  -> Saved ${mobileTopPath}`);

  // Test 5: Open Mobile Menu Drawer
  console.log("[5/6] Opening Mobile Navigation Drawer...");
  const hamburgerBtn = await page.$("button[aria-label='Toggle navigation menu']");
  if (!hamburgerBtn) {
    throw new Error("Mobile menu toggle button not found!");
  }
  await hamburgerBtn.click();
  await new Promise((r) => setTimeout(r, 800));

  const mobileOpenPath = path.join(SCREENSHOT_DIR, "04_mobile_menu_open_drawer.png");
  await page.screenshot({ path: mobileOpenPath, fullPage: false });
  console.log(`  -> Saved ${mobileOpenPath}`);

  const mobileLinks = await page.$$eval("nav[aria-label='Mobile Navigation'] a", (links) =>
    links.map((l) => l.textContent?.trim())
  );
  console.log("  Mobile drawer links found:", mobileLinks);
  if (mobileLinks.length !== 9) {
    throw new Error(`Expected 9 mobile navigation links, found: ${mobileLinks.length}`);
  }
  console.log("  ✓ All 9 numbered sections verified in Mobile Drawer!");

  // Test 6: Cross-route navigation on Room Detail Page
  console.log("[6/6] Testing Navigation on Room Detail Page (/properties/dev-stays-jaipur/royal-suite)...");
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false, hasTouch: false });
  await page.goto("http://localhost:3000/properties/dev-stays-jaipur/royal-suite", {
    waitUntil: "networkidle0",
    timeout: 30000,
  });
  await new Promise((r) => setTimeout(r, 800));

  const detailNavLinks = await page.$$eval("nav[aria-label='Main Navigation'] a", (links) =>
    links.map((l) => l.getAttribute("href"))
  );
  console.log("  Detail page nav hrefs:", detailNavLinks);
  const allCrossPageLinks = detailNavLinks.every((href) => href && href.startsWith("/#"));
  if (!allCrossPageLinks) {
    throw new Error("Detail page links must point to /#section for seamless cross-page navigation!");
  }
  console.log("  ✓ All detail page nav links correctly formatted with '/#section' prefix!");

  const detailHeaderPath = path.join(SCREENSHOT_DIR, "05_room_detail_navbar.png");
  await page.screenshot({ path: detailHeaderPath, clip: { x: 0, y: 0, width: 1440, height: 180 } });
  console.log(`  -> Saved ${detailHeaderPath}`);

  await browser.close();
  console.log("\n==========================================================");
  console.log("  ALL NAVBAR VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  console.log("==========================================================");
}

verifyNavbar().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

