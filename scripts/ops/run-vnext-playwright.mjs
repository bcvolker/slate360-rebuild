#!/usr/bin/env node
/**
 * Runs the vNext Playwright suite against a production-mode server.
 *
 * Sequence: production build → `next start` on a dedicated port → Playwright
 * → stop only the server this process spawned.
 *
 * Extra CLI args are forwarded to Playwright (used for targeted checks).
 * Set VNEXT_SKIP_BUILD=1 to reuse an existing `.next` build.
 * Set VNEXT_TEST_PORT to override the default port (3110).
 */
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNEXT_TEST_PORT || 3110);
// "localhost", not "127.0.0.1": Next's middleware (next start -H 127.0.0.1, confirmed via direct
// curl with an explicit Host: 127.0.0.1 header — reproducible independent of Playwright/the
// browser) always builds its redirect Location using "localhost" regardless of the incoming
// request's Host. Navigating here as 127.0.0.1 while every auth-redirect Location says
// "localhost" makes them different origins, so CSP's connect-src 'self' correctly refuses the
// second one — a real console error, but one that only exists because THIS harness starts on the
// "wrong" hostname; in production both sides are always the same "https://www.slate360.ai"
// origin, so the mismatch cannot occur there. Matching the harness's own hostname to what the
// server always redirects to removes the mismatch without touching any redirect-construction code.
const baseURL = `http://localhost:${port}`;
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const playwrightCli = path.join(root, "node_modules", "@playwright", "test", "cli.js");
const logPath = path.join(root, "test-results", "vnext-next-start.log");

function portInUse(checkPort) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(true));
    server.once("listening", () => {
      server.close(() => resolve(false));
    });
    server.listen(checkPort, "127.0.0.1");
  });
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = "no response";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return response.status;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${url} (${lastError})`);
}

function stopServerTree(child) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  child.kill("SIGTERM");
}

function runBuild() {
  console.log("[vnext-playwright] production build");
  const build = spawnSync(process.execPath, [path.join(root, "scripts", "ops", "next-production-build.mjs")], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

async function main() {
  // Read by next.config.ts to skip the Strict-Transport-Security header — see the comment there.
  // Set before runBuild() too: headers() is evaluated at build time, not just at `next start`.
  process.env.VNEXT_E2E_SERVER = "1";

  const freeGb = os.freemem() / 1024 ** 3;
  console.log(`[vnext-playwright] free physical memory: ${freeGb.toFixed(2)} GB`);
  console.log(`[vnext-playwright] server: next start ${baseURL}`);

  if (await portInUse(port)) {
    console.error(
      `[vnext-playwright] port ${port} is already in use. ` +
        "This runner will not kill an unrelated process. Free the port or set VNEXT_TEST_PORT.",
    );
    process.exit(1);
  }

  if (process.env.VNEXT_SKIP_BUILD === "1") {
    console.log("[vnext-playwright] VNEXT_SKIP_BUILD=1, reusing existing .next output");
  } else {
    runBuild();
  }

  mkdirSync(path.dirname(logPath), { recursive: true });
  const logStream = createWriteStream(logPath, { flags: "w" });
  const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  server.stdout?.pipe(logStream);
  server.stderr?.pipe(logStream);

  let stopped = false;
  const shutdown = () => {
    if (stopped) return;
    stopped = true;
    stopServerTree(server);
    logStream.end();
  };
  process.on("exit", shutdown);
  process.on("SIGINT", () => {
    shutdown();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    shutdown();
    process.exit(143);
  });

  server.once("exit", (code) => {
    if (!stopped) {
      console.error(`[vnext-playwright] next start exited early (code ${code ?? "null"}). Log: ${logPath}`);
    }
  });

  try {
    const status = await waitForHttp(`${baseURL}/preview/vnext/client`, 90_000);
    console.log(`[vnext-playwright] ready HTTP ${status} pid ${server.pid}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error(`[vnext-playwright] server log: ${logPath}`);
    shutdown();
    process.exit(1);
  }

  const storagePath = path.join(root, "e2e", "vnext", ".runtime", "storage-state.json");
  mkdirSync(path.dirname(storagePath), { recursive: true });
  writeFileSync(storagePath, JSON.stringify({ cookies: [], origins: [] }));

  const forwarded = process.argv.slice(2);
  const playwrightArgs = [
    playwrightCli,
    "test",
    ...(forwarded.length > 0 ? forwarded : ["e2e/vnext"]),
    "--config=playwright.vnext.config.ts",
    "--project=desktop-chromium",
    "--workers=1",
  ];
  const playwright = spawnSync(process.execPath, playwrightArgs, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseURL,
      PLAYWRIGHT_VNEXT_SERVER: "production",
    },
  });

  shutdown();
  process.exit(playwright.status ?? 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
