#!/usr/bin/env node
/**
 * Cross-platform production build (Windows-safe).
 * Sets NODE_ENV and NEXT_TELEMETRY_DISABLED before invoking `next build`.
 */
import { spawnSync } from "node:child_process";

process.env.NODE_ENV = "production";
process.env.NEXT_TELEMETRY_DISABLED = "1";

const result = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(result.status === 0 ? 0 : result.status ?? 1);
