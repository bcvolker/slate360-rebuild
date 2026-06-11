import { chromium } from "@playwright/test";

const baseUrl = "http://127.0.0.1:3017";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`${baseUrl}/dev/screens?screen=capture-plans&device=mobile&frameW=390&frameH=844`, {
  waitUntil: "domcontentloaded",
  timeout: 120_000,
});
await page.waitForTimeout(8000);

const press = await page.evaluate(async () => {
  const container = document.querySelector(".leaflet-container");
  const map = window.__devPlanLeafletMap;
  const imageSize = window.__devPlanImageSize;
  if (!container || !map || !imageSize) return null;
  const xr = 0.42;
  const yr = 0.38;
  const rect = container.getBoundingClientRect();
  const clientX = rect.left + rect.width * xr;
  const clientY = rect.top + rect.height * yr;
  container.dispatchEvent(
    new PointerEvent("pointerdown", {
      bubbles: true,
      clientX,
      clientY,
      pointerId: 1,
      pointerType: "touch",
      button: 0,
    }),
  );
  await new Promise((resolve) => setTimeout(resolve, 580));
  container.dispatchEvent(
    new PointerEvent("pointerup", {
      bubbles: true,
      clientX,
      clientY,
      pointerId: 1,
      pointerType: "touch",
      button: 0,
    }),
  );
  await new Promise((resolve) => setTimeout(resolve, 500));
  const marker = document.querySelector('[data-plan-pin-marker="session"]');
  const xPct = Number.parseFloat(marker?.getAttribute("data-plan-pin-x-pct") ?? "NaN");
  const yPct = Number.parseFloat(marker?.getAttribute("data-plan-pin-y-pct") ?? "NaN");
  const pressLatLng = map.containerPointToLatLng([clientX - rect.left, clientY - rect.top]);
  const xFromPress = (pressLatLng.lng / imageSize.width) * 100;
  const yFromPress = (pressLatLng.lat / imageSize.height) * 100;
  return { xPct, yPct, xFromPress, yFromPress, pressLatLng, imageSize };
});

console.log(JSON.stringify(press, null, 2));
await browser.close();
