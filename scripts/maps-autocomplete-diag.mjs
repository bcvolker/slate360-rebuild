// Quick runtime diagnostic — run with: node scripts/maps-autocomplete-diag.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  page.on("console", (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  console.log(`Loading ${BASE}/deploy-check/maps-diag ...`);
  await page.goto(`${BASE}/deploy-check/maps-diag`, { waitUntil: "networkidle", timeout: 30000 });

  // Wait for Google Maps JS to load
  await page.waitForTimeout(6000);

  // Read the on-page diagnostic log
  const diagLog = await page.locator(".bg-gray-900").textContent();
  console.log("\n=== ON-PAGE DIAGNOSTIC LOG ===");
  console.log(diagLog);

  // Type and test
  await page.fill('input[placeholder="Type an address..."]', "1600 Pennsylvania Ave");
  await page.click("text=Test");
  await page.waitForTimeout(4000);

  const diagLogAfter = await page.locator(".bg-gray-900").textContent();
  console.log("\n=== AFTER TEST CLICK ===");
  console.log(diagLogAfter);

  // Check results
  const results = await page.locator("text=Results:").count();
  console.log(`\n=== RESULTS VISIBLE: ${results > 0} ===`);
  if (results > 0) {
    const text = await page.locator("text=Results:").locator("..").textContent();
    console.log(text);
  }

  // Browser console
  console.log("\n=== BROWSER CONSOLE ===");
  logs.forEach((l) => console.log(l));

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
