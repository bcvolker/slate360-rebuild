import { test, expect, type Page } from "@playwright/test";

/**
 * S8-M Motion (roster slice #13) — Timelapse Builder + Video Trim, a quiet
 * Deliver section that takes over the tab as a full-canvas time-ruler editor
 * (doc D4). Runs against /preview/thermal-v2 (6 fixture captures). See
 * thermal-v2-r1-reliability.spec.ts for warmBuildIdThenGoto.
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page) {
  await page.goto(URL);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(URL);
}

async function openMotionSection(page: Page) {
  await warmBuildIdThenGoto(page);
  await page.getByRole("button", { name: "Deliver", exact: true }).click();
  await page.getByRole("button", { name: "Motion", exact: true }).click();
}

test.describe("Thermal V2 S8-M Motion", () => {
  test.use({ serviceWorkers: "block" });

  test("Deliver's Motion section shows the two quiet cards", async ({ page }) => {
    await openMotionSection(page);
    await expect(page.getByRole("button", { name: /^Timelapse Builder/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Video Trim/ })).toBeVisible();
  });

  test("opening Timelapse Builder shows the full-canvas editor with a working ruler", async ({ page }) => {
    await openMotionSection(page);
    await page.getByRole("button", { name: /^Timelapse Builder/ }).click();

    await expect(page.getByRole("button", { name: "← Deliver" })).toBeVisible();
    await expect(page.getByText("Timelapse Builder")).toBeVisible();
    await expect(page.getByText("6 of 6 frames in range")).toBeVisible();
    await expect(page.getByRole("button", { name: /Render time-lapse/ })).toBeVisible();
  });

  test("dragging the in-handle narrows the range, and Render dispatches only that range", async ({ page }) => {
    let dispatchBody: { frameIds?: string[]; mode?: string; settings?: unknown } | null = null;
    await page.route("**/api/ops/thermal/timelapse", async (route) => {
      dispatchBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { dispatched: true, frames: 3 } }) });
    });

    await openMotionSection(page);
    await page.getByRole("button", { name: /^Timelapse Builder/ }).click();

    const inHandle = page.getByTitle("Drag to set the in point");
    const track = inHandle.locator("..");
    const box = await track.boundingBox();
    if (!box) throw new Error("ruler track not found");

    await inHandle.hover();
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.mouse.up();

    await expect(page.getByText(/^\d of 6 frames in range$/)).toBeVisible();
    await expect(page.getByText("3 of 6 frames in range")).toBeVisible();

    await page.getByRole("button", { name: /Render time-lapse/ }).click();
    await expect.poll(() => dispatchBody, { timeout: 3000 }).not.toBeNull();
    expect(dispatchBody!.mode).toBe("timelapse");
    expect(dispatchBody!.frameIds).toEqual(["d", "e", "vis-1"]);
  });

  test("← Deliver keeps the range, and reopening Timelapse Builder shows it unchanged", async ({ page }) => {
    await openMotionSection(page);
    await page.getByRole("button", { name: /^Timelapse Builder/ }).click();

    const inHandle = page.getByTitle("Drag to set the in point");
    const track = inHandle.locator("..");
    const box = await track.boundingBox();
    if (!box) throw new Error("ruler track not found");
    await inHandle.hover();
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.mouse.up();
    await expect(page.getByText("3 of 6 frames in range")).toBeVisible();

    await page.getByRole("button", { name: "← Deliver" }).click();
    await expect(page.getByRole("button", { name: /^Timelapse Builder/ })).toBeVisible();

    await page.getByRole("button", { name: /^Timelapse Builder/ }).click();
    await expect(page.getByText("3 of 6 frames in range")).toBeVisible();
  });

  test("Escape also returns to Deliver", async ({ page }) => {
    await openMotionSection(page);
    await page.getByRole("button", { name: /^Timelapse Builder/ }).click();
    await expect(page.getByRole("button", { name: "← Deliver" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /^Timelapse Builder/ })).toBeVisible();
  });

  test("Video Trim opens its own independent editor", async ({ page }) => {
    await openMotionSection(page);
    await page.getByRole("button", { name: /^Video Trim/ }).click();
    await expect(page.getByText("Video Trim")).toBeVisible();
    await expect(page.getByRole("button", { name: /Render video/ })).toBeVisible();
  });
});
