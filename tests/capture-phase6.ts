import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { seedInitialCmsDataIfEmpty, DEFAULT_CMS_CONTENT } from "../src/lib/content/content-service";

const ARTIFACT_DIR = "C:/Users/iamvr/.gemini/antigravity/brain/78c9cbcf-0812-4ff7-a053-964a85c3d722";

async function runCapture() {
  console.log("=== Phase 6 Visual Verification Capture Starting ===");

  // Ensure DB has initial CMS data
  await seedInitialCmsDataIfEmpty("admin@devstaysjaipur.com");

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

    // 2. CMS Overview Dashboard
    console.log("Navigating to /admin/content (Overview)...");
    await page.goto("http://localhost:3000/admin/content", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 2000));

    const p69Path = path.join(ARTIFACT_DIR, "69_admin_content_overview_dashboard.png");
    await page.screenshot({ path: p69Path, fullPage: true });
    console.log(`Saved: ${p69Path}`);

    // 3. Homepage Hero Tab
    console.log("Switching to Homepage Hero Tab...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const heroBtn = buttons.find((b) => b.textContent?.includes("Homepage Hero"));
      if (heroBtn) heroBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const p70Path = path.join(ARTIFACT_DIR, "70_admin_content_homepage_hero_editor.png");
    await page.screenshot({ path: p70Path, fullPage: true });
    console.log(`Saved: ${p70Path}`);

    // 4. About DevStay Tab
    console.log("Switching to About DevStay Tab...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const aboutBtn = buttons.find((b) => b.textContent?.includes("About DevStay"));
      if (aboutBtn) aboutBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const p71Path = path.join(ARTIFACT_DIR, "71_admin_content_about_and_story_editor.png");
    await page.screenshot({ path: p71Path, fullPage: true });
    console.log(`Saved: ${p71Path}`);

    // 5. Testimonials Tab
    console.log("Switching to Testimonials Tab...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const testBtn = buttons.find((b) => b.textContent?.includes("Testimonials"));
      if (testBtn) testBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const p72Path = path.join(ARTIFACT_DIR, "72_admin_content_testimonials_and_reviews.png");
    await page.screenshot({ path: p72Path, fullPage: true });
    console.log(`Saved: ${p72Path}`);

    // 6. FAQs Tab
    console.log("Switching to FAQs Tab...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const faqBtn = buttons.find((b) => b.textContent?.includes("FAQs"));
      if (faqBtn) faqBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const p73Path = path.join(ARTIFACT_DIR, "73_admin_content_faqs_and_contact.png");
    await page.screenshot({ path: p73Path, fullPage: true });
    console.log(`Saved: ${p73Path}`);

    // 7. Public Website Rendered with CMS Content
    console.log("Navigating to Public Website Homepage (http://localhost:3000/)...");
    await page.goto("http://localhost:3000/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await new Promise((r) => setTimeout(r, 2000));

    const p74Path = path.join(ARTIFACT_DIR, "74_public_website_rendered_with_cms.png");
    await page.screenshot({ path: p74Path, fullPage: true });
    console.log(`Saved: ${p74Path}`);

    console.log("=== Phase 6 Visual Verification Capture Completed ===");
  } catch (err) {
    console.error("Visual capture error:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

runCapture().catch((err) => {
  console.error("Fatal capture error:", err);
  process.exit(1);
});
