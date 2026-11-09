import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = "C:/Users/iamvr/.gemini/antigravity/brain/78c9cbcf-0812-4ff7-a053-964a85c3d722/qa_screenshots";
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface AuditFinding {
  module: string;
  issue: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  reproduction: string;
  expected: string;
  actual: string;
  evidence: string;
  status: "Open" | "Fixed" | "Retested";
}

const findings: AuditFinding[] = [];

async function auditUI() {
  console.log("==========================================================================");
  console.log("  HOTEL FEDERATION RAJASTHAN — FULL APPLICATION QA AUDIT");
  console.log("==========================================================================\n");

  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page: Page = await browser.newPage();

    // Collect console errors and warnings
    const consoleLogs: string[] = [];
    page.on("console", (msg) => {
      const text = `[${msg.type().toUpperCase()}] ${msg.text()}`;
      consoleLogs.push(text);
      if (msg.type() === "error") {
        console.error("  BROWSER CONSOLE ERROR:", text);
      }
    });

    page.on("pageerror", (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("  BROWSER PAGE EXCEPTION:", msg);
      findings.push({
        module: "Frontend Runtime",
        issue: `Unhandled runtime page error: ${msg}`,
        severity: "High",
        reproduction: "Load page and execute client scripts",
        expected: "Zero unhandled runtime exceptions in browser",
        actual: msg,
        evidence: "Browser window.onerror",
        status: "Open",
      });
    });

    // -------------------------------------------------------------
    // 1. DESKTOP AUDIT (1440x900)
    // -------------------------------------------------------------
    console.log("--- 1. Desktop Layout & Navigation Audit (1440x900) ---");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });

    // Check horizontal scroll / overflow
    const desktopOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    if (desktopOverflow) {
      findings.push({
        module: "Layout / Desktop",
        issue: "Horizontal scroll overflow detected at 1440px desktop viewport",
        severity: "Medium",
        reproduction: "View homepage at 1440px viewport",
        expected: "Page width fits exactly within 1440px without horizontal scrollbar",
        actual: "document.documentElement.scrollWidth exceeds window.innerWidth",
        evidence: "scrollWidth check",
        status: "Open",
      });
    }

    // Capture desktop full page
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "01_desktop_home_full.png"),
      fullPage: true,
    });
    console.log("  ✓ Desktop full page screenshot captured");

    // Check Header & Navigation links
    const navLinks = await page.$$eval("header nav a, header a", (links) =>
      links.map((a) => ({ text: a.textContent?.trim(), href: a.getAttribute("href") }))
    );
    console.log("  Navigation Links found:", navLinks.length, navLinks);

    // -------------------------------------------------------------
    // 2. ACCOMMODATION CARDS AUDIT
    // -------------------------------------------------------------
    console.log("\n--- 2. Accommodation Cards Audit ---");
    const accommodationCards = await page.$$eval(
      '[data-purpose="accommodation-options"] .bg-white.rounded-3xl',
      (cards) =>
        cards.map((c) => {
          const title = c.querySelector("h3")?.textContent?.trim();
          const price = c.querySelector(".text-2xl, .text-xl, .font-black")?.textContent?.trim();
          const badge = c.querySelector(".backdrop-blur-md")?.textContent?.trim();
          const button = c.querySelector("button")?.textContent?.trim();
          return { title, price, badge, button };
        })
    );
    console.log("  Accommodation cards found:", accommodationCards);

    if (accommodationCards.length !== 3) {
      findings.push({
        module: "Accommodations Section",
        issue: `Expected exactly 3 accommodation cards, found ${accommodationCards.length}`,
        severity: "High",
        reproduction: "Inspect accommodations section on homepage",
        expected: "3 configurations: Main Bedroom, 2 Bedrooms, Whole Villa",
        actual: `Found ${accommodationCards.length} cards`,
        evidence: JSON.stringify(accommodationCards),
        status: "Open",
      });
    }

    // -------------------------------------------------------------
    // 3. PHOTO GALLERY & LIGHTBOX AUDIT
    // -------------------------------------------------------------
    console.log("\n--- 3. Photo Gallery & Lightbox Audit ---");
    // Click the first gallery image thumbnail
    const galleryImage = await page.$('[data-purpose="photo-gallery"] img, .group.cursor-pointer');
    if (galleryImage) {
      await galleryImage.click();
      await new Promise((r) => setTimeout(r, 600));

      // Check if lightbox modal opened
      const lightboxOpen = await page.evaluate(() => {
        return !!document.querySelector('.fixed.inset-0.z-50, [role="dialog"]');
      });

      if (lightboxOpen) {
        console.log("  ✓ Lightbox opened successfully on click");
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "02_lightbox_opened.png"),
        });

        // Close lightbox
        const closeBtn = await page.$('.fixed.inset-0.z-50 button, [aria-label="Close"]');
        if (closeBtn) {
          await closeBtn.click();
          await new Promise((r) => setTimeout(r, 400));
          console.log("  ✓ Lightbox closed cleanly");
        }
      } else {
        findings.push({
          module: "Photo Gallery",
          issue: "Clicking photo gallery image did not open lightbox modal",
          severity: "Low",
          reproduction: "Click any thumbnail in Photo Gallery",
          expected: "Interactive full-screen lightbox modal opens with previous/next controls",
          actual: "No modal overlay detected in DOM",
          evidence: "lightbox DOM check",
          status: "Open",
        });
      }
    }

    // -------------------------------------------------------------
    // 4. INTERACTIVE BOOKING ENGINE & HOLD FLOW
    // -------------------------------------------------------------
    console.log("\n--- 4. Interactive Booking Engine Flow in Browser ---");
    // Scroll down to estate story / booking widget
    await page.evaluate(() => {
      const el = document.querySelector("#booking-form, #accommodations, [data-purpose='estate-story']");
      if (el) el.scrollIntoView({ behavior: "instant" });
    });
    await new Promise((r) => setTimeout(r, 600));

    // Capture booking section in view
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "03_booking_widget_view.png"),
    });

    // Check date inputs and pricing breakdown
    const checkInInput = await page.$('input[type="date"]');
    if (checkInInput) {
      console.log("  ✓ Found date picker input in booking widget");
    }

    // Find button by text in DOM
    const btnHandles = await page.$$("button");
    let foundReserveBtn = null;
    for (const btn of btnHandles) {
      const text = await page.evaluate((el) => el.textContent, btn);
      if (text && (text.includes("RESERVE") || text.includes("HOLD") || text.includes("Sanctuary"))) {
        foundReserveBtn = btn;
        break;
      }
    }
    if (foundReserveBtn) {
      console.log("  ✓ Found Reserve button, clicking to trigger guest modal...");
      await foundReserveBtn.click();
      await new Promise((r) => setTimeout(r, 800));

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "04_guest_modal_or_action.png"),
      });

      // Check if guest modal opened
      const modalInput = await page.$('input[placeholder*="Name"], input[type="email"]');
      if (modalInput) {
        console.log("  ✓ Guest Details Modal opened!");
      }
    }

    // -------------------------------------------------------------
    // 5. TABLET VIEWPORT AUDIT (768x1024)
    // -------------------------------------------------------------
    console.log("\n--- 5. Tablet Layout Audit (768x1024) ---");
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });

    const tabletOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    if (tabletOverflow) {
      findings.push({
        module: "Layout / Tablet",
        issue: "Horizontal scroll overflow detected at 768px tablet viewport",
        severity: "Medium",
        reproduction: "View homepage at 768px viewport",
        expected: "Page width fits within 768px without horizontal scrolling",
        actual: "document.documentElement.scrollWidth exceeds 768px",
        evidence: "tablet overflow check",
        status: "Open",
      });
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "05_tablet_view.png"),
      fullPage: true,
    });
    console.log("  ✓ Tablet view screenshot captured");

    // -------------------------------------------------------------
    // 6. MOBILE VIEWPORT AUDIT (390x844)
    // -------------------------------------------------------------
    console.log("\n--- 6. Mobile Layout & Hamburger Menu Audit (390x844) ---");
    await page.setViewport({ width: 390, height: 844 });
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });

    const mobileOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    if (mobileOverflow) {
      findings.push({
        module: "Layout / Mobile",
        issue: "Horizontal scroll overflow detected at 390px mobile viewport",
        severity: "High",
        reproduction: "View homepage on mobile screen (390px)",
        expected: "No horizontal scroll or content clipping",
        actual: "document.documentElement.scrollWidth exceeds 390px",
        evidence: "mobile overflow check",
        status: "Open",
      });
    }

    // Test mobile hamburger menu
    const hamburgerBtn = await page.$('header button[aria-label*="menu" i], header button:has(svg)');
    if (hamburgerBtn) {
      await hamburgerBtn.click();
      await new Promise((r) => setTimeout(r, 400));
      console.log("  ✓ Mobile hamburger menu toggled");

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "06_mobile_menu_open.png"),
      });

      // Close menu
      await hamburgerBtn.click();
      await new Promise((r) => setTimeout(r, 300));
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "07_mobile_home_full.png"),
      fullPage: true,
    });
    console.log("  ✓ Mobile full page screenshot captured");

    // -------------------------------------------------------------
    // 7. ADMIN DASHBOARD AUDIT (/admin/calendar-sync)
    // -------------------------------------------------------------
    console.log("\n--- 7. Admin Calendar Sync Dashboard Audit ---");
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto("http://localhost:3000/admin/calendar-sync", { waitUntil: "networkidle2" });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "08_admin_calendar_sync.png"),
      fullPage: true,
    });
    console.log("  ✓ Admin dashboard screenshot captured");

    // Check if stats bar rendered
    const statsCards = await page.$$eval(".grid.grid-cols-1 .bg-neutral-900\\/60", (cards) =>
      cards.map((c) => ({
        label: c.querySelector(".text-xs")?.textContent?.trim(),
        value: c.querySelector(".text-2xl")?.textContent?.trim(),
      }))
    );
    console.log("  Admin Stats Cards found:", statsCards);

    // Test "Add Channel Feed" button
    const adminButtons = await page.$$("button");
    let addBtn = null;
    for (const b of adminButtons) {
      const txt = await page.evaluate((el) => el.textContent, b);
      if (txt && txt.includes("Add Channel Feed")) {
        addBtn = b;
        break;
      }
    }
    if (addBtn) {
      await addBtn.click();
      await new Promise((r) => setTimeout(r, 400));

      const modalOpen = await page.evaluate(() => {
        return !!document.querySelector("form");
      });
      if (modalOpen) {
        console.log("  ✓ Add Channel Feed Modal opened successfully");
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, "09_admin_add_modal.png"),
        });

        // Close modal
        const formButtons = await page.$$("button");
        for (const b of formButtons) {
          const txt = await page.evaluate((el) => el.textContent, b);
          if (txt && txt.includes("Cancel")) {
            await b.click();
            await new Promise((r) => setTimeout(r, 300));
            break;
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 8. SECURITY & AUTH / REST API AUDIT
    // -------------------------------------------------------------
    console.log("\n--- 8. Security, IDOR & API Authorization Checks ---");
    // Check if sensitive admin routes are protected or unprotected
    const adminApiCheck = await page.evaluate(async () => {
      const res = await fetch("/api/admin/calendar-connections");
      return { status: res.status, ok: res.ok };
    });
    console.log("  /api/admin/calendar-connections response:", adminApiCheck);

    if (adminApiCheck.status === 200) {
      findings.push({
        module: "Security / Authentication",
        issue: "Admin API `/api/admin/calendar-connections` and page `/admin/calendar-sync` are publicly accessible without authentication/session check",
        severity: "High",
        reproduction: "Send GET /api/admin/calendar-connections without session cookies or authorization header",
        expected: "HTTP 401 Unauthorized or HTTP 403 Forbidden for unauthenticated users",
        actual: "HTTP 200 OK — unauthenticated requests can view and configure external calendar feeds",
        evidence: `status: ${adminApiCheck.status}`,
        status: "Open",
      });
    }

    // -------------------------------------------------------------
    // Check Broken Anchor Links
    // -------------------------------------------------------------
    console.log("\n--- 9. Anchor Link Integrity Check ---");
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });
    const brokenAnchors = await page.evaluate(() => {
      const results: string[] = [];
      const links = Array.from(document.querySelectorAll('a[href^="#"]'));
      for (const a of links) {
        const href = a.getAttribute("href");
        if (href && href !== "#") {
          const target = document.querySelector(href);
          if (!target) {
            results.push(href);
          }
        }
      }
      return results;
    });

    if (brokenAnchors.length > 0) {
      findings.push({
        module: "Navigation / Anchors",
        issue: `Broken anchor links detected on homepage: ${brokenAnchors.join(", ")}`,
        severity: "Low",
        reproduction: "Inspect internal anchor links on homepage",
        expected: "All `#section` links match an existing DOM element id",
        actual: `Target element not found in DOM for: ${brokenAnchors.join(", ")}`,
        evidence: JSON.stringify(brokenAnchors),
        status: "Open",
      });
    } else {
      console.log("  ✓ All internal anchor links resolve to valid DOM targets");
    }

    // Summary of console issues
    const consoleErrors = consoleLogs.filter((l) => l.startsWith("[ERROR]"));
    if (consoleErrors.length > 0) {
      findings.push({
        module: "Browser Console",
        issue: `Browser logged ${consoleErrors.length} console errors during audit`,
        severity: "Medium",
        reproduction: "Open DevTools Console during navigation",
        expected: "Clean browser console with 0 error messages",
        actual: consoleErrors.slice(0, 3).join("; "),
        evidence: consoleErrors.join("\n"),
        status: "Open",
      });
    }

  } finally {
    await browser.close();
  }

  // Print all findings
  console.log("\n==========================================================================");
  console.log(`  QA AUDIT COMPLETE: ${findings.length} FINDINGS RECORDED`);
  console.log("==========================================================================");
  for (const f of findings) {
    console.log(`\n[${f.severity.toUpperCase()}] ${f.module}: ${f.issue}`);
    console.log(`  Expected: ${f.expected}`);
    console.log(`  Actual:   ${f.actual}`);
  }

  return findings;
}

auditUI().catch((e) => {
  console.error("Audit script failed:", e);
  process.exit(1);
});
