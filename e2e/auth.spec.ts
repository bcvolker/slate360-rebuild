import { test, expect } from "@playwright/test";

test.describe("Auth — smoke tests", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/login/);
    await expect(page.locator("form")).toBeVisible();
  });

  test("signup page renders", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveURL(/signup/);
    await expect(page.locator("form")).toBeVisible();
  });

  test("unauthenticated user is redirected from dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test("forgot-password page renders", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page).toHaveURL(/forgot-password/);
  });
});
