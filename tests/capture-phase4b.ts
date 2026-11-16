import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import { prisma } from "../src/lib/prisma";

const ARTIFACT_DIR = "C:/Users/iamvr/.gemini/antigravity/brain/78c9cbcf-0812-4ff7-a053-964a85c3d722";

async function runCapture() {
  console.log("=== Phase 4B Visual Verification Capture Starting ===");

  const mainProperty = await prisma.property.findUnique({
    where: { slug: "dev-stays-jaipur" },
    include: {
      inventoryGroups: true,
      listingOptions: true,
    },
  });

  if (!mainProperty || mainProperty.inventoryGroups.length === 0) {
    throw new Error("dev-stays-jaipur not found with inventory groups.");
  }

  const primaryGroup = mainProperty.inventoryGroups[0];
  const primaryOption = mainProperty.listingOptions[0];

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-indexed

  // Seed sample blocks and bookings for visual demonstration in the current month
  // 1. Confirmed booking (days 18-21)
  const bStart = new Date(Date.UTC(currentYear, currentMonth, 18));
  const bEnd = new Date(Date.UTC(currentYear, currentMonth, 21));
  const sampleBooking = await prisma.booking.upsert({
    where: { bookingReference: "DEV-SAMPLE-VISUAL" },
    update: {
      checkInDate: bStart,
      checkOutDate: bEnd,
      status: "CONFIRMED",
    },
    create: {
      bookingReference: "DEV-SAMPLE-VISUAL",
      propertyId: mainProperty.id,
      listingOptionId: primaryOption.id,
      inventoryGroupId: primaryGroup.id,
      checkInDate: bStart,
      checkOutDate: bEnd,
      nights: 3,
      guestCount: 4,
      customerName: "Maharaja Vikramaditya",
      customerEmail: "vikram@royalestate.in",
      customerPhone: "+91 98290 12345",
      status: "CONFIRMED",
      currency: "INR",
      baseAmount: 54000,
      taxesAmount: 9720,
      totalAmount: 63720,
    },
  });

  await prisma.availabilityBlock.upsert({
    where: { id: "sample-block-confirmed-booking" },
    update: {
      startDate: bStart,
      endDate: bEnd,
      bookingId: sampleBooking.id,
      reason: "BOOKING_CONFIRMED",
      notes: "Direct VIP reservation Maharaja Vikramaditya",
    },
    create: {
      id: "sample-block-confirmed-booking",
      inventoryGroupId: primaryGroup.id,
      bookingId: sampleBooking.id,
      startDate: bStart,
      endDate: bEnd,
      reason: "BOOKING_CONFIRMED",
      notes: "Direct VIP reservation Maharaja Vikramaditya",
    },
  });

  // 2. Admin Maintenance block (days 7-9)
  const mStart = new Date(Date.UTC(currentYear, currentMonth, 7));
  const mEnd = new Date(Date.UTC(currentYear, currentMonth, 9));
  await prisma.availabilityBlock.upsert({
    where: { id: "sample-block-maintenance" },
    update: {
      startDate: mStart,
      endDate: mEnd,
      reason: "ADMIN_MAINTENANCE",
      notes: "Heritage courtyard water pavilion restoration and filter overhaul",
    },
    create: {
      id: "sample-block-maintenance",
      inventoryGroupId: primaryGroup.id,
      startDate: mStart,
      endDate: mEnd,
      reason: "ADMIN_MAINTENANCE",
      notes: "Heritage courtyard water pavilion restoration and filter overhaul",
    },
  });

  // 3. Admin Block / Private event (days 26-28)
  const pStart = new Date(Date.UTC(currentYear, currentMonth, 26));
  const pEnd = new Date(Date.UTC(currentYear, currentMonth, 28));
  await prisma.availabilityBlock.upsert({
    where: { id: "sample-block-admin-private" },
    update: {
      startDate: pStart,
      endDate: pEnd,
      reason: "ADMIN_BLOCKED",
      notes: "Private Family Gathering & Founder Property Inspection",
    },
    create: {
      id: "sample-block-admin-private",
      inventoryGroupId: primaryGroup.id,
      startDate: pStart,
      endDate: pEnd,
      reason: "ADMIN_BLOCKED",
      notes: "Private Family Gathering & Founder Property Inspection",
    },
  });

  // 4. External Channel Connection & Sync Event (days 2-4)
  const extConn = await prisma.externalCalendarConnection.upsert({
    where: { id: "sample-airbnb-conn" },
    update: {
      connectionName: "Airbnb Villa Listing Sync",
      platform: "AIRBNB",
      isActive: true,
      lastSyncStatus: "SUCCESS",
      lastSyncedAt: new Date(),
    },
    create: {
      id: "sample-airbnb-conn",
      inventoryGroupId: primaryGroup.id,
      connectionName: "Airbnb Villa Listing Sync",
      platform: "AIRBNB",
      importUrl: "https://www.airbnb.com/calendar/ical/sample.ics",
      isActive: true,
      lastSyncStatus: "SUCCESS",
      lastSyncedAt: new Date(),
    },
  });

  const extStart = new Date(Date.UTC(currentYear, currentMonth, 2));
  const extEnd = new Date(Date.UTC(currentYear, currentMonth, 4));
  await prisma.availabilityBlock.upsert({
    where: { id: "sample-block-external-airbnb" },
    update: {
      startDate: extStart,
      endDate: extEnd,
      reason: "EXTERNAL_AIRBNB",
      externalCalendarConnectionId: extConn.id,
      notes: "Airbnb Reservation: HM4829XQ7 (Guest: Charlotte Dupuis)",
    },
    create: {
      id: "sample-block-external-airbnb",
      inventoryGroupId: primaryGroup.id,
      startDate: extStart,
      endDate: extEnd,
      reason: "EXTERNAL_AIRBNB",
      externalCalendarConnectionId: extConn.id,
      notes: "Airbnb Reservation: HM4829XQ7 (Guest: Charlotte Dupuis)",
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

    // 2. Calendar Overview
    console.log("Navigating to /admin/calendar...");
    await page.goto("http://localhost:3000/admin/calendar", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 2000));

    const p60Path = path.join(ARTIFACT_DIR, "60_admin_availability_calendar_overview.png");
    await page.screenshot({ path: p60Path, fullPage: true });
    console.log(`Saved: ${p60Path}`);

    // 3. Day Inspector Modal (Click day 19 or 20 which is booked)
    console.log("Opening Day Inspector Modal...");
    const dayClicked = await page.evaluate(() => {
      // Find day button for day 19
      const dayButtons = Array.from(document.querySelectorAll("button"));
      const bookedDayBtn = dayButtons.find((b) => {
        const text = b.textContent || "";
        return text.includes("19") && (text.includes("Booked") || text.includes("CONFIRMED"));
      });
      if (bookedDayBtn) {
        bookedDayBtn.click();
        return true;
      }
      return false;
    });

    if (dayClicked) {
      await new Promise((r) => setTimeout(r, 1000));
      const p61Path = path.join(ARTIFACT_DIR, "61_admin_availability_day_inspector_modal.png");
      await page.screenshot({ path: p61Path, fullPage: true });
      console.log(`Saved: ${p61Path}`);

      // Close inspector modal
      await page.evaluate(() => {
        const closeBtns = Array.from(document.querySelectorAll("button"));
        const close = closeBtns.find((b) => b.textContent?.includes("Close"));
        if (close) close.click();
      });
      await new Promise((r) => setTimeout(r, 600));
    }

    // 4. Create Block Dialog
    console.log("Opening Create Date Block Dialog...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const createBtn = buttons.find((b) => b.textContent?.includes("Create Date Block"));
      if (createBtn) createBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const p62Path = path.join(ARTIFACT_DIR, "62_admin_availability_create_block_modal.png");
    await page.screenshot({ path: p62Path, fullPage: true });
    console.log(`Saved: ${p62Path}`);

    // Close create block modal
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const cancelBtn = buttons.find((b) => b.textContent?.includes("Cancel"));
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // 5. Connected Channels & Sync Drawer
    console.log("Opening Connected Channels Drawer...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const syncBtn = buttons.find((b) => b.textContent?.includes("Connected Channels & Sync"));
      if (syncBtn) syncBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const p63Path = path.join(ARTIFACT_DIR, "63_admin_availability_sync_channels_drawer.png");
    await page.screenshot({ path: p63Path, fullPage: true });
    console.log(`Saved: ${p63Path}`);

  } finally {
    await browser.close();
    console.log("=== Phase 4B Visual Verification Capture Completed ===");
  }
}

runCapture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
