#!/usr/bin/env node
import { spawn } from "node:child_process";

function run(command) {
  return new Promise((resolve) => {
    const child = spawn(command, {
      shell: true,
      stdio: "inherit",
      env: process.env,
    });

    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

async function main() {
  console.log("[build-gate] Attempting webpack build...");
  const webpackCode = await run("npx next build --no-lint");
  if (webpackCode === 0) {
    console.log("[build-gate] PASS (webpack)");
    process.exit(0);
  }

  console.warn(`[build-gate] Webpack build failed with code ${webpackCode}. Trying Turbopack fallback...`);
  const turboCode = await run("npx next build --no-lint --turbopack");
  if (turboCode === 0) {
    console.log("[build-gate] PASS (turbopack fallback)");
    process.exit(0);
  }

  console.error(`[build-gate] FAILED. Webpack code=${webpackCode}, Turbopack code=${turboCode}`);
  process.exit(webpackCode || turboCode || 1);
}

main().catch((error) => {
  console.error("[build-gate] Unexpected error", error);
  process.exit(1);
});
