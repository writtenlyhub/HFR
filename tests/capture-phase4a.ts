import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import { prisma } from "../src/lib/prisma";

const ARTIFACT_DIR = "C:/Users/iamvr/.gemini/antigravity/brain/78c9cbcf-0812-4ff7-a053-964a85c3d722";

async function runCapture() {
  console.log("=== Phase 4A Visual Verification Capture Starting ===");

  const mainProperty = await prisma.property.findUnique({
    where: { slug: "dev-stays-jaipur" },
    include: { listingOptions: true },
  });

  if (!mainProperty || mainProperty.listingOptions.length === 0) {
    throw new Error("dev-stays-jaipur not found in database.");
  }

  const primaryOption = mainProperty.listingOptions[0];

  // Seed sample seasonal & holiday rules for rich calendar presentation
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-indexed

  // Sample Rule 1: Mid-month Seasonal Surge
  const dStart = new Date(Date.UTC(currentYear, currentMonth, 10));
  const dEnd = new Date(Date.UTC(currentYear, currentMonth, 16));
  await prisma.pricingRule.upsert({
    where: { id: "sample-seasonal-rule-1" },
    update: {
      startDate: dStart,
      endDate: dEnd,
      pricePerNight: 13500,
      minStayNights: 2,
      isActive: true,
    },
    create: {
      id: "sample-seasonal-rule-1",
      propertyId: mainProperty.id,
      listingOptionId: primaryOption.id,
      name: "Jaipur Heritage Cultural Week",
      ruleType: "SEASONAL",
      startDate: dStart,
      endDate: dEnd,
      pricePerNight: 13500,
      minStayNights: 2,
      isActive: true,
    },
  });

  // Sample Rule 2: Holiday Festival Peak
  const hStart = new Date(Date.UTC(currentYear, currentMonth, 22));
  const hEnd = new Date(Date.UTC(currentYear, currentMonth, 25));
  await prisma.pricingRule.upsert({
    where: { id: "sample-holiday-rule-1" },
    update: {
      startDate: hStart,
      endDate: hEnd,
      pricePerNight: 17500,
      minStayNights: 3,
      isActive: true,
    },
    create: {
      id: "sample-holiday-rule-1",
      propertyId: mainProperty.id,
      listingOptionId: primaryOption.id,
      name: "Palace Festival Long Weekend",
      ruleType: "HOLIDAY",
      startDate: hStart,
      endDate: hEnd,
      pricePerNight: 17500,
      minStayNights: 3,
      isActive: true,
    },
  });

  // Sample Rule 3: Single-Date Special Override
  const oDate = new Date(Date.UTC(currentYear, currentMonth, 14));
  await prisma.pricingRule.upsert({
    where: { id: "sample-override-rule-1" },
    update: {
      startDate: oDate,
      endDate: oDate,
      pricePerNight: 19500,
      isActive: true,
    },
    create: {
      id: "sample-override-rule-1",
      propertyId: mainProperty.id,
      listingOptionId: primaryOption.id,
      name: "Royal Courtyard Gala Override",
      ruleType: "OVERRIDE",
      startDate: oDate,
      endDate: oDate,
      pricePerNight: 19500,
      minStayNights: 1,
      isActive: true,
    },
  });

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page: Page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1.5 });

  try {
    // 1. Log in as admin
    console.log("Navigating to /admin/login...");
    await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 800));

    await page.waitForSelector("input[type='email']", { timeout: 10000 });
    await page.type("input[type='email']", "admin@devstaysjaipur.com");
    await page.type("input[type='password']", "Admin@HFR2026!");
    await page.click("button[type='submit']");

    await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));

    // 2. Pricing Dashboard - Calendar Tab
    console.log("Navigating to /admin/pricing...");
    await page.goto("http://localhost:3000/admin/pricing", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1500));

    const p56Path = path.join(ARTIFACT_DIR, "56_admin_pricing_calendar_overview.png");
    await page.screenshot({ path: p56Path, fullPage: true });
    console.log(`Saved: ${p56Path}`);

    // 3. Switch to Rules Tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const match = buttons.find((b) => b.textContent?.includes("Seasonal & Holiday Rules"));
      if (match) match.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const p57Path = path.join(ARTIFACT_DIR, "57_admin_pricing_seasonal_rules_tab.png");
    await page.screenshot({ path: p57Path, fullPage: true });
    console.log(`Saved: ${p57Path}`);

    // 4. Switch to Base & Weekend Settings Tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const match = buttons.find((b) => b.textContent?.includes("Base & Weekend Rate Settings"));
      if (match) match.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const p58Path = path.join(ARTIFACT_DIR, "58_admin_pricing_settings_tab.png");
    await page.screenshot({ path: p58Path, fullPage: true });
    console.log(`Saved: ${p58Path}`);

    // 5. Switch to Calculator Tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const match = buttons.find((b) => b.textContent?.includes("Price Breakdown Calculator"));
      if (match) match.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const p59Path = path.join(ARTIFACT_DIR, "59_admin_pricing_calculator_tab.png");
    await page.screenshot({ path: p59Path, fullPage: true });
    console.log(`Saved: ${p59Path}`);

  } finally {
    await browser.close();
    console.log("=== Phase 4A Visual Verification Capture Completed ===");
  }
}

runCapture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
