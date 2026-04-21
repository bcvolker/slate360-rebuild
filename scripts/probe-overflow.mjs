/* eslint-disable */
/**
 * Quick Playwright overflow probe — runs against the live dev server at
 * http://127.0.0.1:3100, hits the given URL at iPhone 13 viewport, and
 * prints every element wider than the viewport.
 *
 * Usage: node scripts/probe-overflow.mjs /login
 */
import { chromium, devices } from "playwright";

const path = process.argv[2] || "/login";
const url = `http://127.0.0.1:3100${path}`;

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 13"],
});
const page = await context.newPage();

console.log(`→ ${url}`);
await page.goto(url, { waitUntil: "networkidle" });

const result = await page.evaluate(() => {
  const innerW = window.innerWidth;
  const docScrollW = document.documentElement.scrollWidth;
  const bodyScrollW = document.body.scrollWidth;
  const offenders = [];
  document.body.querySelectorAll("*").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.right > innerW + 1 || r.left < -1) {
      offenders.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || "").toString().slice(0, 200),
        id: el.id,
        w: Math.round(r.width),
        left: Math.round(r.left),
        right: Math.round(r.right),
      });
    }
  });
  offenders.sort((a, b) => b.right - a.right);
  return { innerW, docScrollW, bodyScrollW, offenders: offenders.slice(0, 12) };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
