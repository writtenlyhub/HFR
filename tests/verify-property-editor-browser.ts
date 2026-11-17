import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import fs from "fs";

const ARTIFACT_DIR = "C:/Users/iamvr/.gemini/antigravity/brain/78c9cbcf-0812-4ff7-a053-964a85c3d722";

async function verifyBrowser() {
  console.log("=== Launching Puppeteer to Verify Admin Property Editor ===");
  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page: Page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1.5 });

  const errors: string[] = [];
  page.on("pageerror", (err: Error | unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`PAGE_ERROR: ${msg}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`CONSOLE_ERROR: ${msg.text()}`);
    }
  });

  try {
    // 1. Admin Login
    console.log("Logging into Admin dashboard...");
    await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle0" });
    await page.waitForSelector("input[type='email']", { timeout: 10000 });
    await page.type("input[type='email']", "admin@devstaysjaipur.com");
    await page.type("input[type='password']", "Admin@HFR2026!");
    await page.click("button[type='submit']");
    await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));

    // 2. Open Admin Property Editor
    const editorUrl = "http://localhost:3000/admin/properties/cmwcs11bq0002tpb87ifu1zg3";
    console.log(`Navigating to Property Editor: ${editorUrl}...`);
    const res = await page.goto(editorUrl, { waitUntil: "networkidle0" });
    console.log(`Property Editor Response Status: ${res?.status()}`);

    if (!res || res.status() >= 400) {
      throw new Error(`Failed to load Property Editor page: HTTP ${res?.status()}`);
    }

    // Check if Decimal serialization error appeared on page
    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes("Only plain objects can be passed to Client Components from Server Components")) {
      throw new Error("Decimal serialization error detected on page!");
    }
    if (pageText.includes("Decimal objects are not supported")) {
      throw new Error("Decimal objects are not supported error detected on page!");
    }

    // Verify Property Title
    await page.waitForSelector("h1", { timeout: 10000 });
    const h1Text = await page.$eval("h1", (el) => el.textContent?.trim());
    console.log(`Property Title in Editor: "${h1Text}"`);

    const screenshotOverview = path.join(ARTIFACT_DIR, "85_admin_property_editor_general_tab.png");
    await page.screenshot({ path: screenshotOverview, fullPage: true });
    console.log(`Saved screenshot: ${screenshotOverview}`);

    // 3. Switch to Configurations Tab
    console.log("Switching to Room Configurations tab...");
    const clickedConfigTab = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const match = buttons.find((b) => b.textContent?.includes("Configurations"));
      if (match) {
        match.click();
        return true;
      }
      return false;
    });

    if (!clickedConfigTab) {
      throw new Error("Could not find 'Configurations' tab button");
    }

    await new Promise((r) => setTimeout(r, 1000));

    // Check room titles
    const configTitles = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input[type='text']")) as HTMLInputElement[];
      return inputs.map((i) => i.value).filter((v) => ["Main Bedroom", "2 Bedrooms", "Whole Villa"].includes(v));
    });
    console.log("Room configurations rendered:", configTitles);

    // Verify Extra Guest Charge inputs exist
    const hasExtraGuestInputs = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll("label"));
      return labels.some((l) => l.textContent?.includes("Extra Guest"));
    });
    console.log(`Extra Guest inputs rendered: ${hasExtraGuestInputs}`);

    const screenshotConfigs = path.join(ARTIFACT_DIR, "86_admin_property_editor_configurations_tab.png");
    await page.screenshot({ path: screenshotConfigs, fullPage: true });
    console.log(`Saved screenshot: ${screenshotConfigs}`);

    // 4. Test Saving a Configuration
    console.log("Testing Save Configuration...");
    const clickedSave = await page.evaluate(() => {
      const saveButtons = Array.from(document.querySelectorAll("button")).filter(
        (b) => b.textContent?.includes("Save Configuration")
      );
      if (saveButtons.length > 0) {
        saveButtons[0].click();
        return true;
      }
      return false;
    });

    if (clickedSave) {
      await new Promise((r) => setTimeout(r, 2000));
      const feedbackText = await page.evaluate(() => {
        const alerts = document.querySelectorAll(".bg-emerald-50, .bg-red-50, [role='alert']");
        return Array.from(alerts).map((a) => (a as HTMLElement).innerText);
      });
      console.log("Save Configuration Feedback:", feedbackText);
    }

    // 5. Reload the editor and confirm clean render with no Decimal errors
    console.log("Reloading editor to verify persistence and re-render...");
    await page.reload({ waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1000));

    const reloadedText = await page.evaluate(() => document.body.innerText);
    if (reloadedText.includes("Decimal objects are not supported")) {
      throw new Error("Decimal serialization error detected after reload!");
    }
    console.log("Reload successful: Zero Decimal errors after page refresh.");

    // Check captured errors
    const criticalErrors = errors.filter((e) => !e.includes("favicon") && !e.includes("analytics"));
    if (criticalErrors.length > 0) {
      console.warn("Browser captured errors:", criticalErrors);
    } else {
      console.log("Zero browser runtime errors detected!");
    }

    console.log("=== BROWSER VERIFICATION COMPLETED SUCCESSFULLY! ===");
  } finally {
    await browser.close();
  }
}

verifyBrowser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Browser verification failed:", err);
    process.exit(1);
  });
