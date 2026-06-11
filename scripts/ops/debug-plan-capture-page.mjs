import { chromium } from "@playwright/test";

const baseUrl = process.env.MEASURE_BASE_URL ?? "http://127.0.0.1:3016";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (msg) => {
  if (msg.type() === "error") pageErrors.push(msg.text());
});
await page.goto(`${baseUrl}/dev/screens?screen=capture-plans&device=mobile&frameW=390&frameH=844`, {
  waitUntil: "domcontentloaded",
  timeout: 180_000,
});
await page.waitForTimeout(10_000);
const info = await page.evaluate(() => ({
  hasMobile: Boolean(document.querySelector('[data-dev-device="mobile"]')),
  hasWithPlans: Boolean(document.querySelector('[data-capture-canvas="with-plans"]')),
  hasLeaflet: Boolean(document.querySelector(".leaflet-container")),
  hasLoadingPlan: Boolean(document.body.innerText.includes("Loading plan")),
  bodyText: document.body.innerText.slice(0, 800),
}));
console.log(JSON.stringify({ ...info, pageErrors }, null, 2));
await browser.close();
