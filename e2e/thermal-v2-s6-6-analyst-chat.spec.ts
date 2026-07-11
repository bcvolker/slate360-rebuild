import { test, expect, type Page } from "@playwright/test";

/**
 * S6.6 Analyst chat (roster slice #12) — grounded Q&A drawer that swaps AI
 * Review's/Analyze's right rail (doc §C5). Runs against /preview/thermal-v2,
 * which has fixture "a" with one anomaly (index 0, "hot spot"). See
 * thermal-v2-r1-reliability.spec.ts for warmBuildIdThenGoto.
 */

const URL = "/preview/thermal-v2";

async function warmBuildIdThenGoto(page: Page) {
  await page.goto(URL);
  await page.waitForFunction(() => localStorage.getItem("slate360-last-build") !== null);
  await page.waitForTimeout(500);
  await page.goto(URL);
}

async function mockChat(page: Page, reply: string) {
  await page.route("**/api/ops/thermal/sessions/*/chat*", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ thread: [] }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reply, proposal: null }) });
  });
}

test.describe("Thermal V2 S6.6 Analyst chat", () => {
  test.use({ serviceWorkers: "block" });

  test("toggle swaps the AI Review right rail between Findings and the chat drawer", async ({ page }) => {
    await mockChat(page, "The 14°C delta is well above the 3-5°C typical for solar loading alone.");
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "AI Review" }).click();

    await expect(page.getByRole("button", { name: "Accept ✓" })).toBeVisible();
    await page.getByRole("button", { name: "💬 Ask the analyst" }).click();
    await expect(page.getByPlaceholder("Ask the analyst…")).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept ✓" })).not.toBeVisible();

    await page.getByRole("button", { name: "← Back" }).click();
    await expect(page.getByRole("button", { name: "Accept ✓" })).toBeVisible();
  });

  test("sending a message shows the grounded reply and persists it", async ({ page }) => {
    let postBody: { capture_id?: string; message?: string } | null = null;
    await page.route("**/api/ops/thermal/sessions/*/chat*", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ thread: [] }) });
      }
      postBody = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "That delta is well outside the solar-loading range.", proposal: null }),
      });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "AI Review" }).click();
    await page.getByRole("button", { name: "💬 Ask the analyst" }).click();

    await page.getByPlaceholder("Ask the analyst…").fill("why is finding 1 severe?");
    await page.getByRole("button", { name: "Send", exact: true }).click();

    await expect(page.getByText("why is finding 1 severe?")).toBeVisible();
    await expect(page.getByText("That delta is well outside the solar-loading range.")).toBeVisible();
    expect(postBody?.capture_id).toBe("a");
    expect(postBody?.message).toBe("why is finding 1 severe?");
  });

  test("a revision proposal card's Accept persists via findings_review, same as AI Review's own Accept", async ({ page }) => {
    let reviewPatch: { accepted?: string[]; edits?: Record<string, string> } | null = null;
    await page.route("**/api/ops/thermal/captures/*", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      const body = route.request().postDataJSON() as { findings_review?: typeof reviewPatch };
      if (body?.findings_review) reviewPatch = body.findings_review;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { ok: true } }) });
    });
    await page.route("**/api/ops/thermal/sessions/*/chat*", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ thread: [] }) });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "You're right — that reads as a sun-warmed junction box.", proposal: { anomaly_index: 0, note: "Sun-warmed junction box, not moisture." } }),
      });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "AI Review" }).click();
    await page.getByRole("button", { name: "💬 Ask the analyst" }).click();
    await page.getByPlaceholder("Ask the analyst…").fill("finding 1 is a sun-warmed junction box, not moisture");
    await page.getByRole("button", { name: "Send", exact: true }).click();

    await expect(page.getByText("Proposed revision — finding 1")).toBeVisible();
    await page.getByRole("button", { name: "Accept" }).click();

    await expect.poll(() => reviewPatch, { timeout: 3000 }).not.toBeNull();
    expect(reviewPatch!.accepted).toContain("0");
    expect(reviewPatch!.edits?.["0"]).toBe("Sun-warmed junction box, not moisture.");
  });

  test("Dismiss on a proposal card hides it without touching findings_review", async ({ page }) => {
    let patchCalled = false;
    await page.route("**/api/ops/thermal/captures/*", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      const body = route.request().postDataJSON() as { findings_review?: unknown };
      if (body?.findings_review) patchCalled = true;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { ok: true } }) });
    });
    await page.route("**/api/ops/thermal/sessions/*/chat*", async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ thread: [] }) });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Noted.", proposal: { anomaly_index: 0, note: "Revised note." } }),
      });
    });

    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "AI Review" }).click();
    await page.getByRole("button", { name: "💬 Ask the analyst" }).click();
    await page.getByPlaceholder("Ask the analyst…").fill("actually that's something else");
    await page.getByRole("button", { name: "Send", exact: true }).click();

    await expect(page.getByText("Proposed revision — finding 1")).toBeVisible();
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText("Proposed revision — finding 1")).not.toBeVisible();
    expect(patchCalled).toBe(false);
  });

  test("the chat toggle is also available in Analyze", async ({ page }) => {
    await mockChat(page, "Grounded reply.");
    await page.route("**/api/ops/thermal/captures/*/grid", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ width: 4, height: 4, temps: Array.from({ length: 16 }, (_, i) => 20 + i), minC: 20, maxC: 35, emissivity: 0.95 }) }),
    );
    await warmBuildIdThenGoto(page);
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await page.getByRole("button", { name: "💬 Ask the analyst" }).click();
    await expect(page.getByPlaceholder("Ask the analyst…")).toBeVisible();
  });
});
