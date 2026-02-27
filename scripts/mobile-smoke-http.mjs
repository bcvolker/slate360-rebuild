import { spawn } from "node:child_process";
import process from "node:process";

const HOST = "127.0.0.1";
const PORT = 3111;
const BASE = `http://${HOST}:${PORT}`;
const START_TIMEOUT_MS = 120_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status >= 200 && res.status < 500) {
        return;
      }
    } catch {}
    await sleep(1000);
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log(`[smoke] Starting Next dev server on ${BASE}`);
  const server = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", HOST, "--port", String(PORT)],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  server.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    if (text.includes("ready") || text.includes("Ready")) {
      process.stdout.write(`[dev] ${text}`);
    }
  });
  server.stderr.on("data", (chunk) => {
    process.stderr.write(`[dev-err] ${chunk}`);
  });

  let shutdownInProgress = false;
  const cleanup = async () => {
    if (shutdownInProgress) return;
    shutdownInProgress = true;
    if (!server.killed) {
      server.kill("SIGTERM");
      await sleep(500);
      if (!server.killed) server.kill("SIGKILL");
    }
  };

  process.on("SIGINT", async () => {
    await cleanup();
    process.exit(1);
  });
  process.on("SIGTERM", async () => {
    await cleanup();
    process.exit(1);
  });

  try {
    await waitForServer(`${BASE}/`, START_TIMEOUT_MS);
    console.log("[smoke] Server ready, running checks...");

    const homeRes = await fetch(`${BASE}/`, { redirect: "manual" });
    const homeHtml = await homeRes.text();
    assert(homeRes.status === 200, `Homepage expected 200, got ${homeRes.status}`);
    assert(homeHtml.includes("See it. Experience it."), "Homepage hero copy missing");
    assert(homeHtml.includes("overflow-x-hidden"), "Homepage overflow guard class missing");

    const dashboardRes = await fetch(`${BASE}/dashboard`, { redirect: "manual" });
    assert(dashboardRes.status === 307, `Dashboard expected 307 redirect, got ${dashboardRes.status}`);
    assert(
      (dashboardRes.headers.get("location") || "").includes("/login?redirectTo=%2Fdashboard"),
      "Dashboard redirectTo query is incorrect"
    );

    const hubRes = await fetch(`${BASE}/project-hub`, { redirect: "manual" });
    assert(hubRes.status === 307, `Project Hub expected 307 redirect, got ${hubRes.status}`);
    assert(
      (hubRes.headers.get("location") || "").includes("/login?redirectTo=%2Fproject-hub"),
      "Project Hub redirectTo query is incorrect"
    );

    const designRes = await fetch(`${BASE}/features/design-studio`, { redirect: "manual" });
    const designHtml = await designRes.text();
    assert(designRes.status === 200, `Design Studio expected 200, got ${designRes.status}`);
    assert(designHtml.includes("Design Studio"), "Design Studio title missing");
    assert(designHtml.includes("Try Demo"), "Design Studio demo CTA missing");

    console.log("[smoke] ✅ Mobile smoke checks passed");
  } finally {
    await cleanup();
  }
}

run().catch((error) => {
  console.error(`[smoke] ❌ ${error.message}`);
  process.exit(1);
});
