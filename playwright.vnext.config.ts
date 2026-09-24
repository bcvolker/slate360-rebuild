import path from "node:path";
import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3110";

/**
 * vNext regression config. The server is production `next start`, owned by
 * `scripts/ops/run-vnext-playwright.mjs` (see `npm run test:vnext`).
 * This config does not launch `next dev`.
 */
export default defineConfig({
  testDir: "./e2e/vnext",
  globalSetup: "./e2e/vnext/global-setup.ts",
  fullyParallel: true,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    // global-setup seeds slate360-last-build so SWRegistrar does not reload
    // each fresh context. Service workers stay enabled: blocking them makes
    // Serwist's production registrar throw (registration.waiting on undefined).
    storageState: path.join("e2e", "vnext", ".runtime", "storage-state.json"),
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          args: ["--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox"],
        },
      },
    },
  ],
});
