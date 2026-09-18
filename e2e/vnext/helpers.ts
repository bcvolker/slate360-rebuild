import { expect, type Page } from "@playwright/test";

const TOUCH_MIN = 44;

const ALLOWED_CONSOLE = [
  /Download the React DevTools/i,
  /bad HTTP response code \(404\) was received when fetching the script/i,
];
const ALLOWED_FAILED_REQUEST = [
  /net::ERR_ABORTED/i,
  /favicon\.ico/i,
  /webpack-hmr/i,
  /_next\/webpack-hmr/i,
];
const ALLOWED_HTTP = [
  /favicon\.ico/i,
  /\/__nextjs_original-stack-frames/i,
  /\/_next\/static\//i,
];

export type RuntimeHealth = {
  assertClean: () => void;
};

export function attachRuntimeHealth(page: Page): RuntimeHealth {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (ALLOWED_CONSOLE.some((pattern) => pattern.test(text))) return;
    errors.push(`console.error: ${text}`);
  });

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "unknown";
    const url = request.url();
    if (ALLOWED_FAILED_REQUEST.some((pattern) => pattern.test(`${url} ${failure}`))) return;
    errors.push(`requestfailed: ${url} ${failure}`);
  });

  page.on("response", (response) => {
    const status = response.status();
    if (status < 400) return;
    const url = response.url();
    if (ALLOWED_HTTP.some((pattern) => pattern.test(url))) return;
    errors.push(`http ${status}: ${url}`);
  });

  return {
    assertClean: () => {
      expect(errors, errors.join("\n")).toEqual([]);
    },
  };
}

export async function assertNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    metrics.scrollWidth,
    `horizontal overflow: scrollWidth=${metrics.scrollWidth} innerWidth=${metrics.innerWidth}`,
  ).toBeLessThanOrEqual(metrics.innerWidth + 1);
}

export async function assertNamedTouchTargets(page: Page, rootSelector: string) {
  const locator = page.locator(`${rootSelector} a, ${rootSelector} button`);
  const count = await locator.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    const target = locator.nth(index);
    if (!(await target.isVisible())) continue;
    const name = ((await target.getAttribute("aria-label")) ?? (await target.innerText())).trim();
    expect(name, `interactive control #${index} needs an accessible name`).not.toBe("");
    const box = await target.boundingBox();
    expect(box, `${name} bounding box`).not.toBeNull();
    if (!box) continue;
    expect(box.height, `${name} height`).toBeGreaterThanOrEqual(TOUCH_MIN);
    expect(box.width, `${name} width`).toBeGreaterThanOrEqual(TOUCH_MIN);
  }
}

export async function openOwnerMenu(page: Page) {
  const shell = page.locator("[data-vnext-shell='owner']");
  await expect(shell).toBeVisible({ timeout: 30_000 });
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toBeVisible();
  const dialog = page.getByRole("dialog", { name: "Menu" });

  await expect(async () => {
    if (page.url().includes("/preview/vnext/owner") === false) {
      throw new Error(`unexpected url ${page.url()}`);
    }
    if (!(await dialog.isVisible().catch(() => false))) {
      try {
        await menu.click({ force: true, timeout: 2_000 });
      } catch {
        await menu.evaluate((node) => (node as HTMLButtonElement).click());
      }
    }
    expect(await dialog.isVisible()).toBe(true);
    expect(await dialog.getByRole("button", { name: "Close" }).isVisible()).toBe(true);
    expect(await menu.getAttribute("aria-expanded")).toBe("true");
  }).toPass({ timeout: 20_000, intervals: [200, 400, 800] });

  return { menu, dialog };
}

export const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1280", width: 1280, height: 800 },
  { name: "768", width: 768, height: 1024 },
  { name: "390", width: 390, height: 844 },
] as const;

export const LEGACY_LANDINGS = [
  "/app",
  "/dashboard",
  "/site-walk",
  "/twin",
  "/thermal-studio",
  "/slatedrop",
];
