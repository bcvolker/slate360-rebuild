import { test, expect } from "@playwright/test";

/**
 * Route Health — smoke tests for every public and auth-gated route.
 *
 * Public routes should return 200.
 * Auth-gated routes should redirect to /login (302/307 → /login).
 * No route should return 500 (server error).
 *
 * Also checks for placeholder/mock text that shouldn't ship to users.
 */

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/privacy",
  "/terms",
];

const AUTH_GATED_ROUTES = [
  "/dashboard",
  "/slatedrop",
  "/analytics",
  "/integrations",
  "/my-account",
  "/plans",
  "/market",
];

// These keywords in visible page text indicate unfinished UI.
const BANNED_TEXT_PATTERNS = [
  /under construction/i,
  /placeholder for/i,
  /lorem ipsum/i,
  /TODO:/,
  /FIXME:/,
  /mock data/i,
  /\$128,400/, // known old mock MRR
  /\$79\/mo/, // old Creator price
  /\$199\/mo/, // old Model price
];

test.describe("Public routes — return 200 and render", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} returns 200`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
    });
  }
});

test.describe("Auth-gated routes — redirect to login", () => {
  for (const route of AUTH_GATED_ROUTES) {
    test(`${route} redirects to /login`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/login/);
    });
  }
});

test.describe("Landing page — no placeholder text", () => {
  test("homepage has no banned placeholder text", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const bodyText = await page.locator("body").innerText();
    for (const pattern of BANNED_TEXT_PATTERNS) {
      expect(bodyText, `Found banned text: ${pattern}`).not.toMatch(pattern);
    }
  });

  test("all nav links point to real routes (no href=#)", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const deadLinks = await page.locator('a[href="#"]').count();
    expect(deadLinks, "Found href='#' dead links").toBe(0);
  });

  test("pricing section shows real prices", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const pricingSection = page.locator("#pricing");
    if (await pricingSection.count()) {
      const text = await pricingSection.innerText();
      expect(text).toMatch(/\$\d+/); // should contain dollar amounts
      expect(text).not.toContain("TBD");
    }
  });
});

test.describe("Login page — form is functional", () => {
  test("login form has email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test("login form submit button exists and is not disabled", async ({ page }) => {
    await page.goto("/login");
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")');
    await expect(submitBtn.first()).toBeVisible();
    await expect(submitBtn.first()).toBeEnabled();
  });
});

test.describe("Signup page — form is functional", () => {
  test("signup form renders with required fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });
});
