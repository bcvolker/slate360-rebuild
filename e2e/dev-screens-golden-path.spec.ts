import { expect, test } from "@playwright/test";

/**
 * Golden-path seed suite — sandbox smoke tests before wiring the real
 * start-walk → capture → save flow.
 */
test.describe("dev screens golden path", () => {
  test("capture canvas shows four stops and shutter", async ({ page }) => {
    await page.goto("/dev/screens?screen=capture&device=mobile");
    await expect(page.getByLabel("Walk stop tracker")).toContainText("Stops · 4");
    await expect(page.getByLabel("Capture photo")).toBeVisible();
  });

  test("note review keeps note field and save visible on desktop", async ({ page }) => {
    await page.goto("/dev/screens?screen=note-review&device=desktop");
    await expect(page.getByTestId("dev-note-field")).toBeVisible();
    await expect(page.getByTestId("dev-save-button")).toBeVisible();
  });

  test("note review keeps note field and save visible with keyboard", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-chromium",
      "Keyboard layout check targets the mobile viewport project.",
    );

    await page.goto("/dev/screens?screen=note-review&device=mobile&keyboard=280");
    const noteField = page.getByTestId("dev-note-field");
    const saveButton = page.getByTestId("dev-save-button");

    await noteField.click();
    await expect(noteField).toBeVisible();
    await expect(saveButton).toBeVisible();

    const viewport = page.viewportSize();
    const noteBox = await noteField.boundingBox();
    const saveBox = await saveButton.boundingBox();
    expect(viewport).not.toBeNull();
    expect(noteBox).not.toBeNull();
    expect(saveBox).not.toBeNull();
    if (!viewport || !noteBox || !saveBox) return;

    expect(saveBox.y).toBeGreaterThan(noteBox.y);
    expect(saveBox.y + saveBox.height).toBeLessThanOrEqual(viewport.height + 2);
  });
});
