import { chromium, type FullConfig } from "@playwright/test";

/**
 * Every route the vNext regression suite (e2e/vnext/*.spec.ts) visits,
 * including the auth-redirect-only ones. Next.js dev mode compiles each
 * route on its first request ("on-demand entries"); on a cold server this
 * can take several seconds per route (measured: ~11s for the very first
 * route hit overall, ~2s for each subsequent distinct route). Two distinct
 * failure modes trace back to this:
 *
 * 1. A test that only waits for `domcontentloaded` and then immediately
 *    interacts can race that compile/hydration window on ITS OWN route's
 *    first hit.
 * 2. Less obviously: compiling ANY route updates Next dev's shared HMR
 *    build manifest, which can push a reload to OTHER currently-open pages
 *    connected over the same dev server's HMR websocket — even pages on an
 *    unrelated route. Observed directly: an owner-drawer test's dialog
 *    (confirmed open) was found closed moments later, with a page snapshot
 *    matching a freshly-reloaded page, not an app-driven close. Warming
 *    only the interactive `/preview/vnext/*` routes wasn't enough — a
 *    still-uncompiled `/vnext/*` auth-redirect route hit later in the same
 *    suite run could still trigger this. Warming every route once here, via
 *    a real page load (not just the HTML document, so the client JS bundle
 *    is fetched and hydration is exercised too), before any numbered test
 *    runs, means no route compiles for the first time — and no manifest
 *    update fires — anywhere during the actual suite run.
 *
 * Extend this list when a new spec starts visiting a route it doesn't
 * already cover. See docs/vnext/SLATE360_UI_PHASE1_REVIEW_PROTOCOL.md.
 */
const WARM_ROUTES = [
  "/preview/vnext/client",
  "/preview/vnext/owner",
  "/preview/vnext/owner-menu",
  "/preview/vnext/portfolio-empty",
  "/preview/vnext/portfolio-error",
  "/preview/vnext/portfolio-loading",
  "/preview/vnext/project",
  "/preview/vnext/project/explore",
  "/preview/vnext/project/items",
  "/preview/vnext/project/documents",
  "/preview/vnext/project/history",
  "/preview/vnext/project-sparse",
  "/preview/vnext/project-loading",
  "/preview/vnext/project-error",
  "/vnext",
  "/vnext/account",
  "/vnext/projects",
  "/vnext/projects/11111111-1111-4111-8111-111111111111",
  "/vnext/projects/11111111-1111-4111-8111-111111111111/explore",
  "/vnext/projects/11111111-1111-4111-8111-111111111111/items",
  "/vnext/projects/11111111-1111-4111-8111-111111111111/documents",
  "/vnext/projects/11111111-1111-4111-8111-111111111111/history",
  "/vnext/ops",
  "/vnext/ops/clients",
  "/vnext/ops/projects",
  "/vnext/ops/processing",
  "/vnext/ops/qa",
  "/vnext/ops/shares",
  "/vnext/ops/settings",
  "/vnext/ops/account",
] as const;

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ baseURL });
    for (const route of WARM_ROUTES) {
      const response = await page.goto(route, { waitUntil: "networkidle", timeout: 60_000 });
      if (!response || !response.ok()) {
        throw new Error(
          `vNext route prewarm failed: ${route} returned HTTP ${response?.status() ?? "no response"}. ` +
            "The dev server must serve every route in WARM_ROUTES successfully before the suite runs.",
        );
      }
    }

    // Re-verify (not just re-hit) the redirect-only index once more, confirming its full chain
    // (/vnext -> /vnext/projects -> /login, unauthenticated) resolves stably before the timed
    // suite starts. This is the exact case that raced immediately after the warming burst: the
    // warming loop's *last* request and the suite's *first* request landing on the same URL back
    // to back. A second, verified pass — not a blind delay — confirms the dev server has fully
    // settled that route's redirect chain, not just that it once returned 200 while compiling.
    const verify = await page.goto("/vnext", { waitUntil: "networkidle", timeout: 60_000 });
    const verifyUrl = new URL(page.url());
    if (!verify || !verify.ok() || verifyUrl.pathname !== "/login") {
      throw new Error(
        `vNext route prewarm verification failed: /vnext did not settle to a stable unauthenticated ` +
          `redirect (landed on ${verifyUrl.pathname}, status ${verify?.status() ?? "no response"}).`,
      );
    }

    // One centralized settle pause, not a per-test sleep: webpack's on-disk output (module/RSC
    // manifest writes) can lag slightly behind the HTTP response that already returned 200 for a
    // route. Give that a moment to fully flush before the timed suite starts hammering the server
    // with the next ~30 minutes' worth of requests.
    await page.waitForTimeout(3_000);

    await page.close();
  } finally {
    await browser.close();
  }
}
