import { expect, type Locator, type Page } from "@playwright/test";

const TOUCH_MIN = 44;

const ALLOWED_CONSOLE = [
  /Download the React DevTools/i,
  /bad HTTP response code \(404\) was received when fetching the script/i,
];
// Next dev-server-only artifacts, unrelated to application code, observed
// independent of any change in this repo:
// - Next's HMR/on-demand-entries client can rarely throw this parsing a
//   truncated internal websocket message. See attachRuntimeHealth's wrapped
//   `goto` below for how the resulting error-overlay page state is recovered.
// - Each dev-server start generates a new build id (next.config.ts
//   `generateBuildId`), which can invalidate a service worker instance the
//   browser already registered from an earlier navigation's build,
//   producing a benign "script ... Not found" update-check failure.
const ALLOWED_PAGEERROR = [
  /Unexpected end of JSON input/i,
  /Failed to update a ServiceWorker for scope.*Not found/i,
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
    if (ALLOWED_PAGEERROR.some((pattern) => pattern.test(error.message))) return;
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

  // Recover from a known transient Next dev-server failure on navigation:
  // either its own error overlay (a `<nextjs-portal>` element covering the
  // whole page) or a bare HTTP 500 from the dev server itself — both
  // observed on routes proven-good by global-setup's own prewarming, and
  // both gone on an immediate retry. Fully inside the same await chain the
  // test already performs (`await page.goto(...)`), so there is no
  // background race with the test's own next action (an earlier
  // `page.on("load", ...)` version raced the test and made things worse —
  // reverted). A short settle pause before the retry (not a substitute for
  // it — see the settle pause in global-setup.ts) matters here specifically:
  // an immediate re-navigation was observed to sometimes trip a *different*
  // Next dev bug ("Invariant: Expected clientReferenceManifest to be
  // defined. This is a bug in Next.js.") by re-requesting the route while
  // its manifest was still being written. The failed attempt's own
  // console/response/pageerror listeners above still fire and record into
  // `errors` before this code ever runs — on a successful retry, roll
  // `errors` back to before this navigation so a fully-recovered page
  // doesn't fail assertClean() over an attempt the test never actually saw.
  const originalGoto = page.goto.bind(page);
  page.goto = (async (...args: Parameters<Page["goto"]>) => {
    const errorsBeforeNavigation = errors.length;
    const response = await originalGoto(...args);
    try {
      const status = response?.status() ?? 0;
      // The overlay can be triggered by an async HMR/websocket event that arrives shortly
      // *after* domcontentloaded, not necessarily as part of the initial load — check status
      // immediately, but give a delayed overlay a moment to actually appear before deciding.
      let hasOverlay = (await page.locator("nextjs-portal").count()) > 0;
      if (!hasOverlay && status < 500) {
        await page.waitForTimeout(800);
        hasOverlay = (await page.locator("nextjs-portal").count()) > 0;
      }
      if (status >= 500 || hasOverlay) {
        errors.length = errorsBeforeNavigation;
        await page.waitForTimeout(1_500);
        return await originalGoto(...args);
      }
    } catch {
      // Best-effort only — if the page navigated away already, there's nothing to recover.
    }
    return response;
  }) as Page["goto"];

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

/**
 * Like openOwnerMenu, but also waits for the dialog's nav links to be fully
 * populated, and recovers by reopening if they briefly disappear. Observed
 * cause: Next dev-mode HMR can trigger a full page reload mid-test (a
 * websocket rebuild/rescync event, not an application bug — confirmed by
 * inspecting a failure snapshot: a freshly-loaded, dialog-closed page, not a
 * closed-by-app-logic state). openOwnerMenu's own check only confirms the
 * dialog shell + Close button were visible at one instant; this helper
 * additionally confirms the expected nav links are present, and if a reload
 * wipes that state, it reopens rather than failing on the first miss.
 */
export async function openOwnerMenuWithNavLinks(page: Page, expectedLinkCount: number) {
  let result: { menu: Locator; dialog: Locator } | undefined;

  await expect(async () => {
    result = await openOwnerMenu(page);
    const count = await result.dialog.getByRole("link").count();
    expect(
      count,
      "owner menu dialog nav-link count (0 here usually means a dev-server HMR reload reset the page mid-check; openOwnerMenu will reopen on retry)",
    ).toBe(expectedLinkCount);
  }).toPass({ timeout: 30_000, intervals: [300, 600, 1000] });

  return result as { menu: Locator; dialog: Locator };
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
