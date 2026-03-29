import { test, expect } from "@playwright/test";

test("Maps autocomplete diagnostic", async ({ page }) => {
  // Collect all console messages
  const logs: string[] = [];
  page.on("console", (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  await page.goto("http://localhost:3000/deploy-check/maps-diag", {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  // Wait for the diagnostic log area to populate
  await page.waitForTimeout(5000);

  // Grab the on-page diagnostic log
  const diagLog = await page.locator(".bg-gray-900").textContent();
  console.log("=== DIAGNOSTIC LOG ===");
  console.log(diagLog);

  // Type an address and click Test
  await page.fill('input[placeholder="Type an address..."]', "1600 Pennsylvania Ave");
  await page.click("text=Test");

  // Wait for results
  await page.waitForTimeout(3000);

  const diagLogAfter = await page.locator(".bg-gray-900").textContent();
  console.log("\n=== AFTER TEST CLICK ===");
  console.log(diagLogAfter);

  // Check for results
  const resultsDiv = page.locator("text=Results:");
  const hasResults = await resultsDiv.count();
  console.log(`\n=== RESULTS VISIBLE: ${hasResults > 0} ===`);

  if (hasResults > 0) {
    const resultsContent = await resultsDiv.locator("..").textContent();
    console.log(resultsContent);
  }

  // Dump browser console
  console.log("\n=== BROWSER CONSOLE ===");
  logs.forEach((l) => console.log(l));
});
