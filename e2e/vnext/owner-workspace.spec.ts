import { test, expect } from "@playwright/test";
import { VIEWPORTS, assertNamedTouchTargets, assertNoHorizontalOverflow, attachRuntimeHealth } from "./helpers";

const DIR = "docs/vnext/screenshots/slice-9";
const HOME = "/preview/vnext/owner";
const CLIENTS = "/preview/vnext/owner/clients";
const PROJECTS = "/preview/vnext/owner/projects";

test.describe("vNext owner workspace", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  test("home lists a failed job and does not treat an omitted service as missing", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(HOME, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-attention='capture-cap-smith']")).toContainText("Room 213 failed");
    await expect(page.locator("[data-vnext-attention='capture-cap-smith'] a")).toHaveAttribute("href", "/vnext/projects/smith");
    const payne = page.locator("[data-vnext-owner-project='payne']");
    await expect(payne).toContainText("Included: Reality · 360 · Plans");
    await expect(payne).toContainText("Client can see: Reality · Plans");
    await expect(payne).not.toContainText("Thermal");
    await expect(page.locator("[data-vnext-owner-project='harbor']")).not.toContainText("Thermal");
    await expect(page.getByText("Thermal missing")).toHaveCount(0);
    health.assertClean();
  });

  test("a clear home does not invent work", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${HOME}/clear`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-attention-empty]")).toHaveText("Nothing needs attention right now.");
    await expect(page.locator("[data-vnext-attention]")).toHaveCount(0);
    await page.screenshot({ path: `${DIR}/home-clear-1440.png` });
    health.assertClean();
  });

  test("clients keep distinct names and open their projects", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(CLIENTS, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-owner-client='ucl']")).toContainText("2 projects");
    await expect(page.locator("[data-vnext-owner-client='abc construction']")).toBeVisible();
    await expect(page.locator("[data-vnext-owner-client='abc construction llc']")).toBeVisible();
    await page.locator("[data-vnext-owner-client='ucl'] a").click();
    await expect(page).toHaveURL(/clients\/ucl/);
    await expect(page.locator("[data-vnext-owner-project='payne']")).toBeVisible();
    await expect(page.locator("[data-vnext-owner-project='library']")).toBeVisible();
    await page.goBack();
    await expect(page.locator("[data-vnext-owner-clients]")).toBeVisible();
    health.assertClean();
  });

  test("projects search, filter, and keep the query across back and refresh", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PROJECTS, { waitUntil: "networkidle" });
    await page.getByLabel("Search projects").fill("Oakland");
    await expect(page).toHaveURL(/q=Oakland/);
    await expect(page.locator("[data-vnext-owner-project='smith']")).toBeVisible();
    await expect(page.locator("[data-vnext-owner-project='payne']")).toHaveCount(0);
    await page.goBack();
    await expect(page.locator("[data-vnext-owner-project='payne']")).toBeVisible();
    await page.goto(`${PROJECTS}?attention=1`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-owner-project='smith']")).toBeVisible();
    await expect(page.locator("[data-vnext-owner-project='harbor']")).toHaveCount(0);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-attention-filter]")).toHaveAttribute("aria-pressed", "true");
    health.assertClean();
  });

  test("scope editing persists and does not publish an empty thermal service", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${PROJECTS}/payne`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-vnext-scope-capability='thermal']")).not.toBeChecked();
    await expect(page.locator("[data-vnext-service-line='thermal']")).toHaveCount(0);
    await expect(page.getByText(/missing/i)).toHaveCount(0);
    await page.locator("[data-vnext-scope-capability='thermal']").check();
    await page.locator("[data-vnext-scope-save]").click();
    await expect(page).toHaveURL(/included=.*thermal/);
    await expect(page.locator("[data-vnext-scope-capability='thermal']")).toBeChecked();
    await expect(page.locator("[data-vnext-service-line='thermal']")).toContainText("Not ready");
    await expect(page.locator("[data-vnext-service-line='thermal']")).not.toContainText("Client visible");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("[data-vnext-scope-capability='thermal']")).toBeChecked();
    await page.goto(`${PROJECTS}/north`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-service-line='thermal']")).toContainText("Ready internally");
    await expect(page.locator("[data-vnext-service-line='thermal']")).not.toContainText("Client visible");
    health.assertClean();
  });

  test("captures owner screens and stays within the viewport", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(HOME, { waitUntil: "domcontentloaded" });
      await assertNoHorizontalOverflow(page);
      if (viewport.name === "1440" || viewport.name === "1280" || viewport.name === "768" || viewport.name === "390") {
        await page.screenshot({ path: `${DIR}/home-${viewport.name}.png`, fullPage: true });
      }
      if (viewport.name === "1440" || viewport.name === "390") {
        await assertNamedTouchTargets(page, "[data-vnext-shell='owner']");
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(CLIENTS, { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: `${DIR}/clients-1440.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(CLIENTS, { waitUntil: "domcontentloaded" });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${DIR}/clients-390.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(PROJECTS, { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: `${DIR}/projects-1440.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PROJECTS, { waitUntil: "domcontentloaded" });
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: `${DIR}/projects-390.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${PROJECTS}/payne`, { waitUntil: "domcontentloaded" });
    await page.screenshot({ path: `${DIR}/scope-1440.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${PROJECTS}/payne`, { waitUntil: "domcontentloaded" });
    await assertNoHorizontalOverflow(page);
    await assertNamedTouchTargets(page, "[data-vnext-scope-editor]");
    await page.screenshot({ path: `${DIR}/scope-390.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/preview/vnext/owner/clients-empty", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-clients-empty]")).toHaveText("No clients are available yet.");
    await page.goto("/preview/vnext/owner/projects-empty", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-vnext-projects-empty]")).toHaveText("No projects are available yet.");
    health.assertClean();
  });
});
