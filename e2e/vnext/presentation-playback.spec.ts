import { test, expect, type Page } from "@playwright/test";
import { assertNamedTouchTargets, assertNoHorizontalOverflow, attachRuntimeHealth } from "./helpers";

const DIR = "docs/vnext/screenshots/slice-8";
const EXPLORE = "/preview/vnext/project/explore";

async function elapsed(page: Page): Promise<number> {
  const value = await page.locator("[data-vnext-playback-elapsed]").getAttribute("data-vnext-playback-elapsed");
  return Number(value);
}

test.describe("vNext presentation playback", () => {
  test.skip(({ isMobile }) => Boolean(isMobile), "vNext suite owns viewports");

  test("a playing path keeps its clock through presentation", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${EXPLORE}?setup=1`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Views" }).click();
    await expect(page.locator("[data-vnext-path-authoring='preview-reality']")).toBeVisible();
    const source = await page.locator("[data-vnext-active-source]").getAttribute("data-vnext-active-source");
    await page.locator("[data-vnext-path-play]").click();
    await expect(page.locator("[data-vnext-playback]")).toHaveAttribute("data-vnext-playback", "playing");
    await expect.poll(() => elapsed(page)).toBeGreaterThan(0);

    const beforePresent = await elapsed(page);
    await page.getByRole("button", { name: "Present" }).click();
    await expect(page.locator("[data-vnext-explore-present='true']")).toBeVisible();
    await expect(page.locator("[data-vnext-saved-views]")).toHaveCount(0);
    await expect(page.locator("[data-vnext-path-authoring]")).toHaveCount(0);
    await expect(page.locator("[data-vnext-playback]")).toHaveAttribute("data-vnext-playback", "playing");
    await expect(page.locator("[data-vnext-playback-model]")).toHaveAttribute("data-vnext-playback-model", "preview-reality");
    await expect.poll(() => elapsed(page)).toBeGreaterThan(beforePresent);
    await page.screenshot({ path: `${DIR}/presentation-path-playing-1440.png` });
    await assertNoHorizontalOverflow(page);
    await assertNamedTouchTargets(page, "[data-vnext-presentation-playback]");

    await page.locator("[data-vnext-presentation-playback] [data-vnext-path-pause]").click();
    await expect(page.locator("[data-vnext-playback]")).toHaveAttribute("data-vnext-playback", "paused");
    const held = await elapsed(page);
    await page.waitForTimeout(400);
    expect(await elapsed(page)).toBe(held);

    await page.locator("[data-vnext-presentation-playback] [data-vnext-path-play]").click();
    await expect.poll(() => elapsed(page)).toBeGreaterThan(held);

    await page.locator("[data-vnext-presentation-playback] [data-vnext-path-restart]").click();
    await expect(page.locator("[data-vnext-playback-elapsed]")).toHaveAttribute("data-vnext-playback-elapsed", "0");
    await expect(page.locator("[data-vnext-playback]")).toHaveAttribute("data-vnext-playback", "paused");
    await page.locator("[data-vnext-presentation-playback] [data-vnext-path-play]").click();
    await expect.poll(() => elapsed(page)).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Exit presentation" }).click();
    await expect(page.locator("[data-vnext-explore-present='false']")).toBeVisible();
    await expect(page.locator("[data-vnext-saved-views]")).toBeVisible();
    await expect(page.locator("[data-vnext-active-source]")).toHaveAttribute("data-vnext-active-source", source ?? "");
    await expect(page.locator("[data-vnext-playback-model]")).toHaveAttribute("data-vnext-playback-model", "preview-reality");
    health.assertClean();
  });

  test("presentation playback stays usable at phone width", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${EXPLORE}?setup=1`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Views" }).click();
    await page.locator("[data-vnext-path-play]").click();
    await expect.poll(() => elapsed(page)).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Present" }).click();
    await expect(page.locator("[data-vnext-playback]")).toHaveAttribute("data-vnext-playback", "playing");
    await expect(page.locator("[data-vnext-saved-views]")).toHaveCount(0);
    await assertNoHorizontalOverflow(page);
    await assertNamedTouchTargets(page, "[data-vnext-presentation-playback]");
    const exit = await page.getByRole("button", { name: "Exit presentation" }).boundingBox();
    expect(exit?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(exit?.width ?? 0).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `${DIR}/presentation-path-playing-390.png` });
    health.assertClean();
  });

  for (const rep of ["geometry", "360", "plan", "thermal"]) {
    test(`presentation on ${rep} shows no path controls`, async ({ page }) => {
      const health = attachRuntimeHealth(page);
      await page.goto(`${EXPLORE}?rep=${rep}&present=1`, { waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-vnext-explore-present='true']")).toBeVisible();
      await expect(page.locator("[data-vnext-presentation-playback]")).toHaveCount(0);
      await expect(page.locator("[data-vnext-path-play]")).toHaveCount(0);
      await expect(page.locator("[data-vnext-playback]")).toHaveCount(0);
      health.assertClean();
    });
  }

  test("a path for one Reality model does not drive another", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(`${EXPLORE}?setup=1`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Views" }).click();
    await page.locator("[data-vnext-path-play]").click();
    await expect(page.locator("[data-vnext-playback-model]")).toHaveAttribute("data-vnext-playback-model", "preview-reality");
    await expect.poll(() => elapsed(page)).toBeGreaterThan(0);
    await page.getByRole("button", { name: /Above-ceiling plumbing/ }).click();
    await expect(page.locator("[data-vnext-active-source]")).toHaveAttribute("data-vnext-active-source", "model-sep18");
    await expect(page.locator("[data-vnext-playback]")).toHaveCount(0);
    await expect(page.locator("[data-vnext-playback-model='preview-reality']")).toHaveCount(0);
    health.assertClean();
  });

  test("a historical Reality path stays on that source inside presentation", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(`${EXPLORE}?view=sv-history&setup=1`, { waitUntil: "networkidle" });
    await expect(page.locator("[data-vnext-active-source]")).toHaveAttribute("data-vnext-active-source", "model-sep18");
    await page.getByRole("button", { name: "Views" }).click();
    await expect(page.locator("[data-vnext-path-authoring='model-sep18']")).toBeVisible();
    await page.locator("[data-vnext-path-play]").click();
    await page.getByRole("button", { name: "Present" }).click();
    await expect(page.locator("[data-vnext-playback]")).toHaveAttribute("data-vnext-playback", "playing");
    await expect(page.locator("[data-vnext-playback-model]")).toHaveAttribute("data-vnext-playback-model", "model-sep18");
    await expect(page.locator("[data-vnext-active-source]")).toHaveAttribute("data-vnext-active-source", "model-sep18");
    await expect(page.locator("[data-vnext-view-date]")).toHaveText("Sep 18, 2026");
    health.assertClean();
  });

  test("escape leaves presentation without resetting the path", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(`${EXPLORE}?setup=1`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Views" }).click();
    await page.locator("[data-vnext-path-play]").click();
    await expect.poll(() => elapsed(page)).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Present" }).click();
    const during = await elapsed(page);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-vnext-explore-present='false']")).toBeVisible();
    await expect(page.locator("[data-vnext-playback]")).toHaveAttribute("data-vnext-playback", "playing");
    await expect(page.locator("[data-vnext-playback-model]")).toHaveAttribute("data-vnext-playback-model", "preview-reality");
    await expect.poll(() => elapsed(page)).toBeGreaterThanOrEqual(during);
    health.assertClean();
  });

  test("back and forward keep the reality source", async ({ page }) => {
    const health = attachRuntimeHealth(page);
    await page.goto(EXPLORE, { waitUntil: "networkidle" });
    await page.goto(`${EXPLORE}?setup=1`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Views" }).click();
    await page.locator("[data-vnext-path-play]").click();
    await page.getByRole("button", { name: "Present" }).click();
    await expect(page).toHaveURL(/present=1/);
    await page.goBack();
    await expect(page).not.toHaveURL(/present=1/);
    await expect(page.locator("[data-vnext-explore]")).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/present=1/);
    await expect(page.locator("[data-vnext-explore-present='true']")).toBeVisible();
    await expect(page.locator("[data-vnext-active-source]")).toHaveAttribute("data-vnext-active-source", "");
    await expect(page.locator("[data-vnext-playback-model='model-sep18']")).toHaveCount(0);
    health.assertClean();
  });
});
