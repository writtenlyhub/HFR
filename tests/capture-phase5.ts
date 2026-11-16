import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { BookingStatus, PaymentStatus, BlockReason } from "@prisma/client";

const ARTIFACT_DIR = "C:/Users/iamvr/.gemini/antigravity/brain/78c9cbcf-0812-4ff7-a053-964a85c3d722";

async function runCapture() {
  console.log("=== Phase 5 Visual Verification Capture Starting ===");

  const mainProperty = await prisma.property.findUnique({
    where: { slug: "dev-stays-jaipur" },
    include: {
      inventoryGroups: true,
      listingOptions: true,
    },
  });

  if (!mainProperty || mainProperty.inventoryGroups.length === 0) {
    throw new Error("dev-stays-jaipur not found in database.");
  }

  const primaryGroup = mainProperty.inventoryGroups[0];
  const primaryOption = mainProperty.listingOptions[0];

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();

  // 1. Seed Confirmed VIP Reservation for visual capture
  const b1In = new Date(Date.UTC(currentYear, currentMonth, 18));
  const b1Out = new Date(Date.UTC(currentYear, currentMonth, 21));
  const sampleBooking1 = await prisma.booking.upsert({
    where: { bookingReference: "DEV-VIP-ROYAL-78" },
    update: {
      checkInDate: b1In,
      checkOutDate: b1Out,
      status: BookingStatus.CONFIRMED,
      totalAmount: 63720,
    },
    create: {
      bookingReference: "DEV-VIP-ROYAL-78",
      propertyId: mainProperty.id,
      listingOptionId: primaryOption.id,
      inventoryGroupId: primaryGroup.id,
      checkInDate: b1In,
      checkOutDate: b1Out,
      nights: 3,
      guestCount: 4,
      adultCount: 3,
      childCount: 1,
      customerName: "Princess Padmanjali Devi",
      customerEmail: "padmanjali@royalestate.in",
      customerPhone: "+91 98290 88888",
      specialRequests: "Airport transfer in vintage car, organic breakfast basket on private veranda.",
      internalNotes: "VIP Heritage Member. Concierge to present traditional welcome garland upon arrival.",
      status: BookingStatus.CONFIRMED,
      currency: "INR",
      baseAmount: 54000,
      taxesAmount: 9720,
      totalAmount: 63720,
    },
  });

  // Ensure Payment record exists
  await prisma.payment.upsert({
    where: { razorpayOrderId: "order_p5_visual_78" },
    update: {
      status: PaymentStatus.CAPTURED,
      amount: 63720,
    },
    create: {
      bookingId: sampleBooking1.id,
      razorpayOrderId: "order_p5_visual_78",
      razorpayPaymentId: "pay_rzp_live_8948201",
      amount: 63720,
      currency: "INR",
      status: PaymentStatus.CAPTURED,
      method: "Razorpay (HDFC NetBanking)",
      verifiedAt: new Date(),
    },
  });

  // 2. Seed In-House Stays for Dashboard Focus
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  await prisma.booking.upsert({
    where: { bookingReference: "DEV-TODAY-ARRIV-01" },
    update: {
      checkInDate: today,
      checkOutDate: dayAfterTomorrow,
      status: BookingStatus.CONFIRMED,
    },
    create: {
      bookingReference: "DEV-TODAY-ARRIV-01",
      propertyId: mainProperty.id,
      listingOptionId: primaryOption.id,
      inventoryGroupId: primaryGroup.id,
      checkInDate: today,
      checkOutDate: dayAfterTomorrow,
      nights: 2,
      guestCount: 2,
      customerName: "Raja Digvijay Singh",
      customerEmail: "digvijay@estate.in",
      customerPhone: "+91 98290 77777",
      status: BookingStatus.CONFIRMED,
      currency: "INR",
      baseAmount: 28000,
      taxesAmount: 5040,
      totalAmount: 33040,
    },
  });

  await prisma.booking.upsert({
    where: { bookingReference: "DEV-INHOUSE-02" },
    update: {
      checkInDate: new Date(today.getTime() - 24 * 60 * 60 * 1000),
      checkOutDate: tomorrow,
      status: BookingStatus.CHECKED_IN,
      checkedInAt: new Date(),
      checkInNotes: "Checked in by Aparna. Upgraded to heritage wing.",
    },
    create: {
      bookingReference: "DEV-INHOUSE-02",
      propertyId: mainProperty.id,
      listingOptionId: primaryOption.id,
      inventoryGroupId: primaryGroup.id,
      checkInDate: new Date(today.getTime() - 24 * 60 * 60 * 1000),
      checkOutDate: tomorrow,
      nights: 2,
      guestCount: 2,
      customerName: "Lord Arthur Wellesley",
      customerEmail: "arthur@ukconsulate.org",
      customerPhone: "+44 7911 123456",
      status: BookingStatus.CHECKED_IN,
      checkedInAt: new Date(),
      checkInNotes: "Checked in by Aparna. Upgraded to heritage wing.",
      currency: "INR",
      baseAmount: 32000,
      taxesAmount: 5760,
      totalAmount: 37760,
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
    await page.goto("http://localhost:3000/admin/login", { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));

    await page.waitForSelector("input[type='email']", { timeout: 10000 });
    await page.type("input[type='email']", "admin@devstaysjaipur.com");
    await page.type("input[type='password']", "Admin@HFR2026!");
    await page.click("button[type='submit']");

    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));

    // 2. Dashboard Command Center
    console.log("Navigating to /admin/dashboard...");
    await page.goto("http://localhost:3000/admin/dashboard", { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    const p64Path = path.join(ARTIFACT_DIR, "64_admin_dashboard_operations_command_center.png");
    await page.screenshot({ path: p64Path, fullPage: true });
    console.log(`Saved: ${p64Path}`);

    // 3. Bookings List Overview
    console.log("Navigating to /admin/bookings...");
    await page.goto("http://localhost:3000/admin/bookings", { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1800));

    const p65Path = path.join(ARTIFACT_DIR, "65_admin_bookings_list_overview.png");
    await page.screenshot({ path: p65Path, fullPage: true });
    console.log(`Saved: ${p65Path}`);

    // 4. Click Inspect on VIP reservation to open Drawer
    console.log("Opening Booking Details Drawer...");
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("tr"));
      const matchRow = rows.find((r) => r.textContent?.includes("DEV-VIP-ROYAL-78"));
      if (matchRow) {
        const inspectBtn = matchRow.querySelector("button");
        if (inspectBtn) inspectBtn.click();
      }
    });
    await new Promise((r) => setTimeout(r, 1200));

    const p66Path = path.join(ARTIFACT_DIR, "66_admin_booking_details_drawer_financial.png");
    await page.screenshot({ path: p66Path, fullPage: true });
    console.log(`Saved: ${p66Path}`);

    // 5. Open Cancellation Modal
    console.log("Opening Cancellation Modal...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const cancelBtn = buttons.find((b) => b.textContent?.includes("Cancel Reservation"));
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const p67Path = path.join(ARTIFACT_DIR, "67_admin_booking_cancellation_modal.png");
    await page.screenshot({ path: p67Path, fullPage: true });
    console.log(`Saved: ${p67Path}`);

    // Close cancellation modal
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const backBtn = buttons.find((b) => b.textContent?.includes("Go Back"));
      if (backBtn) backBtn.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // 6. Standalone Booking Details Page
    console.log(`Navigating to /admin/bookings/${sampleBooking1.id}...`);
    await page.goto(`http://localhost:3000/admin/bookings/${sampleBooking1.id}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 1500));

    const p68Path = path.join(ARTIFACT_DIR, "68_admin_booking_standalone_detail_page.png");
    await page.screenshot({ path: p68Path, fullPage: true });
    console.log(`Saved: ${p68Path}`);

  } finally {
    await browser.close();
    console.log("=== Phase 5 Visual Verification Capture Completed ===");
  }
}

runCapture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
