import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type FullConfig, type Page } from "@playwright/test";

const STORAGE_KEY = "slate360-last-build";

async function readBuildKey(page: Page): Promise<string | null> {
  // SWRegistrar writes the key and then reloads once. The reload can destroy
  // the execution context between the wait and the read. Retry that read only.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.waitForLoadState("load", { timeout: 30_000 });
      await page.waitForFunction(
        (key) => window.localStorage.getItem(key) !== null,
        STORAGE_KEY,
        { timeout: 30_000 },
      );
      return await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
    } catch {
      if (attempt === 2) return null;
    }
  }
  return null;
}

/**
 * Seeds the one localStorage key `SWRegistrar` uses to decide whether to
 * reload on first visit. Production `next start` has already compiled every
 * route, so this is not a dev-server prewarm.
 *
 * Each Playwright test gets a fresh browser context. Without this seed, the
 * app treats the empty profile as a new deploy and calls `location.reload()`
 * once. Saving only this key keeps tests unauthenticated.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = String(
    config.projects[0]?.use?.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3110",
  );
  const origin = new URL(baseURL).origin;
  const storagePath = path.join(process.cwd(), "e2e", "vnext", ".runtime", "storage-state.json");
  mkdirSync(path.dirname(storagePath), { recursive: true });

  const browser = await chromium.launch({
    args: ["--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox"],
  });

  try {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const response = await page.goto("/preview/vnext/client", {
      waitUntil: "load",
      timeout: 60_000,
    });
    if (!response || !response.ok()) {
      throw new Error(
        `vNext production server was not ready: /preview/vnext/client returned HTTP ${response?.status() ?? "no response"}.`,
      );
    }

    const value = await readBuildKey(page);
    if (!value) {
      throw new Error("vNext server did not record slate360-last-build; refusing to start the suite.");
    }

    writeFileSync(
      storagePath,
      JSON.stringify(
        {
          cookies: [],
          origins: [{ origin, localStorage: [{ name: STORAGE_KEY, value }] }],
        },
        null,
        2,
      ),
    );
    await context.close();
  } finally {
    await browser.close();
  }
}
