import puppeteer from "puppeteer";
import path from "path";

const outDir = "C:\\Users\\iamvr\\.gemini\\antigravity\\brain\\78c9cbcf-0812-4ff7-a053-964a85c3d722";

const viewports = [
  { name: "desktop_1440", width: 1440, height: 900 },
  { name: "laptop_1280", width: 1280, height: 800 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "mobile_390", width: 390, height: 844 },
];

async function capture() {
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  for (const vp of viewports) {
    console.log(`Setting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 2, // retina quality
    });

    await page.goto("http://localhost:3000", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait a brief moment for web fonts and images to settle
    await new Promise((r) => setTimeout(r, 1500));

    const filepath = path.join(outDir, `${vp.name}.png`);
    await page.screenshot({
      path: filepath,
      fullPage: true,
    });
    console.log(`Saved screenshot: ${filepath}`);
  }

  await browser.close();
  console.log("All screenshots captured successfully!");
}

capture().catch((e) => {
  console.error("Error capturing screenshots:", e);
  process.exit(1);
});

