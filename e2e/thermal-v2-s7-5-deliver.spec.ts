import { test, expect, type Page } from "@playwright/test";

/**
 * S7.5 Deliver composer + Radiometric Live Link (roster slice #7). The
 * composer runs against /preview/thermal-v2 (mocked backend, same pattern as
 * every other thermal-v2 spec). The hover-temperature feature lives in the
 * public share page, which resolves its token server-side (RSC) and can't be
 * Playwright-mocked directly — tested via /preview/thermal-share-slide, a
 * harness that renders the same client component with a mockable client-side
 * grid fetch. See thermal-v2-r1-reliability.spec.ts for warmBuildIdThenGoto.
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page, path: string = URL) {
  await page.goto(path);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(path);
}

test.describe("Thermal V2 S7.5 Deliver composer", () => {
  test.use({ serviceWorkers: "block" });

  test("creating a share link shows it in the saved-links home", async ({ page }) => {
    let created = false;
    await page.route("**/api/ops/thermal/sessions/preview/share", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          links: created
            ? [{ id: "l1", token: "tok1", url: "https://slate360.ai/share/thermal/tok1", role: "view", label: "For ASU", expires_at: null, max_views: null, view_count: 0, is_revoked: false, last_viewed_at: null, created_at: new Date(0).toISOString() }]
            : [],
        }),
      }),
    );
    await page.route("**/api/ops/thermal/share/create", async (route) => {
      created = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ token: "tok1" }) });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Deliver" }).click();
    await expect(page.getByText("No share links yet")).toBeVisible();

    await page.getByPlaceholder("Label (optional)").fill("For ASU");
    await page.getByRole("button", { name: "Create link" }).click();

    await expect(page.getByText("Saved links (1)")).toBeVisible();
    await expect(page.getByText("https://slate360.ai/share/thermal/tok1")).toBeVisible();
  });

  test("Q&A inbox lists a client question and sends a reply", async ({ page }) => {
    let replied = false;
    await page.route("**/api/ops/thermal/sessions/preview/questions", async (route) => {
      if (route.request().method() === "POST") {
        replied = true;
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reply: { id: "r1" } }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          questions: [
            { id: "q1", parent_id: null, author_name: "ASU Facilities", body: "Is the leak still active?", is_owner_reply: false, status: "open", capture_id: null, created_at: new Date(0).toISOString() },
          ],
        }),
      });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Deliver" }).click();
    await page.getByRole("button", { name: "Q&A inbox" }).click();

    await expect(page.getByText("Is the leak still active?")).toBeVisible();
    await page.getByPlaceholder("Reply…").fill("Not anymore — repaired last week.");
    await page.getByRole("button", { name: "Send" }).click();

    await expect.poll(() => replied, { timeout: 3000 }).toBe(true);
  });

  test("data exports section links to the real export formats", async ({ page }) => {
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Deliver" }).click();
    await page.getByRole("button", { name: "Data exports" }).click();

    await expect(page.getByRole("link", { name: /Spreadsheet \(\.csv\)/ })).toHaveAttribute("href", /format=csv/);
    await expect(page.getByRole("link", { name: /Raw data \(\.json\)/ })).toHaveAttribute("href", /format=json/);
  });

  test("no page scroll at 1280x800 and 1440x900", async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 800 });
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Deliver" }).click();
    let scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1280x800").toBe(false);

    await page.setViewportSize({ width: 1440, height: 900 });
    scrollable = await page.evaluate(() => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1);
    expect(scrollable, "page scrolled at 1440x900").toBe(false);
  });
});

test.describe("Radiometric Live Link hover temperature", () => {
  test.use({ serviceWorkers: "block" });

  test("hovering the shared image shows a real per-pixel temperature", async ({ page }) => {
    await page.route("**/api/share/thermal/preview-token/grid/a", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ width: 4, height: 4, minC: 20, maxC: 40, temps: Array(16).fill(0).map((_, i) => 20 + i) }),
      }),
    );

    await page.goto("/preview/thermal-share-slide");
    const img = page.locator("img");
    await expect(img).toBeVisible();
    await expect(page.getByText("Hover to read temperature")).toBeVisible();

    const box = await img.boundingBox();
    if (!box) throw new Error("image not laid out");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    // Anchored regex — the findings list text also happens to contain "°F"-adjacent wording.
    await expect(page.getByText(/^\d+\.\d°F$/)).toBeVisible();
  });
});
