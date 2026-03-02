#!/usr/bin/env node
import { chromium, devices } from "@playwright/test";

const BASE_URL = process.env.DIAG_BASE_URL || "https://www.slate360.ai";
const EMAIL = process.env.DIAG_ACCOUNT_EMAIL;
const PASSWORD = process.env.DIAG_ACCOUNT_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: "Missing DIAG_ACCOUNT_EMAIL or DIAG_ACCOUNT_PASSWORD",
        hint: "Set DIAG_ACCOUNT_EMAIL and DIAG_ACCOUNT_PASSWORD in your env before running.",
      },
      null,
      2
    )
  );
  process.exit(1);
}

async function runDesktopChecks(browser, report) {
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();

  const sandboxResponses = [];
  page.on("response", async (resp) => {
    if (resp.url().includes("/api/projects/sandbox")) {
      let text = "";
      try {
        text = await resp.text();
      } catch {
        // ignore
      }
      sandboxResponses.push({
        status: resp.status(),
        snippet: text.slice(0, 240),
      });
    }
  });

  await page.goto(`${BASE_URL}/login?redirectTo=%2Fslatedrop`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/slatedrop/, { timeout: 30000 });

  const accountOverviewRes = await page.request.get(`${BASE_URL}/api/account/overview`);
  const accountOverviewJson = await accountOverviewRes.json().catch(() => ({}));
  report.accountOverview = {
    status: accountOverviewRes.status(),
    hasProfile: Boolean(accountOverviewJson?.profile?.email),
    role: accountOverviewJson?.profile?.role ?? null,
    tier: accountOverviewJson?.billing?.tier ?? null,
    error: accountOverviewJson?.error ?? null,
  };

  const uploadReserveRes = await page.request.post(`${BASE_URL}/api/slatedrop/upload-url`, {
    data: {
      filename: `diag-${Date.now()}.txt`,
      contentType: "text/plain",
      size: 5,
      folderId: "general",
      folderPath: "General",
    },
  });
  const uploadReserveJson = await uploadReserveRes.json().catch(() => ({}));

  let putStatus = null;
  let completeStatus = null;
  let completeBody = null;

  if (uploadReserveRes.ok() && uploadReserveJson?.uploadUrl && uploadReserveJson?.fileId) {
    const putRes = await fetch(uploadReserveJson.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: "hello",
    });
    putStatus = putRes.status;

    const completeRes = await page.request.post(`${BASE_URL}/api/slatedrop/complete`, {
      data: { fileId: uploadReserveJson.fileId },
    });
    completeStatus = completeRes.status();
    completeBody = await completeRes.json().catch(() => ({}));
  }

  report.uploadFlow = {
    reserveStatus: uploadReserveRes.status(),
    reserveError: uploadReserveJson?.error ?? null,
    putStatus,
    completeStatus,
    completeOk: completeBody?.ok === true,
    completeError: completeBody?.error ?? null,
  };

  await page.goto(`${BASE_URL}/slatedrop`, { waitUntil: "networkidle" });
  const projectSandboxButton = page.getByRole("button", { name: /Project Sandbox/ }).first();
  if (await projectSandboxButton.count()) {
    await projectSandboxButton.click();
  }

  await page.waitForTimeout(2500);

  const aside = page.locator("aside").first();
  await aside.waitFor({ state: "visible", timeout: 15000 });

  const sidebarText = await aside.innerText();
  const depth1Buttons = await page.evaluate(() =>
    Array.from(document.querySelectorAll("aside button")).filter((button) =>
      ((button).style?.paddingLeft || "").includes("28px")
    ).length
  );

  const before = await aside.evaluate((el) => ({
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  await aside.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const after = await aside.evaluate((el) => ({
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));

  report.sidebarDesktop = {
    projectSandboxVisible: await projectSandboxButton.count(),
    depth1Buttons,
    containsProjectWord: sidebarText.includes("Project"),
    containsRuntimeMarkers: sidebarText.includes("Runtime") || sidebarText.includes("Project"),
    overflowExists: before.scrollHeight > before.clientHeight,
    scrollMoved: after.scrollTop > before.scrollTop,
    before,
    after,
    recentSandboxResponses: sandboxResponses.slice(-3),
  };

  await context.close();
}

async function runMobileChecks(browser, report) {
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login?redirectTo=%2Fslatedrop`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/slatedrop/, { timeout: 30000 });

  const headerButtons = page.locator("header button");
  if ((await headerButtons.count()) > 0) {
    await headerButtons.first().click();
  }

  const aside = page.locator("aside").first();
  await aside.waitFor({ state: "visible", timeout: 15000 });

  const before = await aside.evaluate((el) => ({
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  await aside.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const after = await aside.evaluate((el) => ({
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));

  report.sidebarMobile = {
    overflowExists: before.scrollHeight > before.clientHeight,
    scrollMoved: after.scrollTop > before.scrollTop,
    before,
    after,
  };

  await context.close();
}

(async () => {
  const report = {
    ok: true,
    baseUrl: BASE_URL,
    accountOverview: null,
    uploadFlow: null,
    sidebarDesktop: null,
    sidebarMobile: null,
    errors: [],
  };

  const browser = await chromium.launch({ headless: true });
  try {
    await runDesktopChecks(browser, report);
    await runMobileChecks(browser, report);
  } catch (error) {
    report.ok = false;
    report.errors.push(String(error?.stack || error));
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) process.exit(1);
})();
