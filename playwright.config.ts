import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100";
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  // Warms every vNext preview route once before the suite runs, so no test's
  // first hit to a route races Next dev's on-demand compilation. See
  // e2e/vnext/global-setup.ts and docs/vnext/SLATE360_UI_PHASE1_REVIEW_PROTOCOL.md.
  globalSetup: "./e2e/vnext/global-setup.ts",
  fullyParallel: true,
  timeout: 60_000,
  // A modest, centralized raise (from 10s), not a substitute for the route-warming/onDemandEntries
  // fixes above — dev-server response latency under this suite's own load has been directly
  // measured up to several seconds even for an already-compiled route. This absorbs that variance
  // without masking a genuinely broken assertion; it is one number changed once, not a sleep added
  // per test.
  expect: {
    timeout: 15_000,
  },
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: skipWebServer
    ? undefined
    : {
        // Dedicated port for tests avoids collisions with manual local dev servers.
        command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
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
    {
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
        launchOptions: {
          args: ["--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox"],
        },
      },
    },
  ],
});
