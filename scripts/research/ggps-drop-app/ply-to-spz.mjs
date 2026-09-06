#!/usr/bin/env node
/**
 * Pack a Gaussian PLY into Spark-compatible SPZ v3 for the Twin viewer.
 *   node scripts/research/ggps-drop-app/ply-to-spz.mjs --in cloud.ply --out cloud.spz
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] || "").trim() : "";
}

const input = arg("in");
const output = arg("out") || (input ? input.replace(/\.ply$/i, ".spz") : "");
if (!input || !fs.existsSync(input)) {
  console.error("usage: node ply-to-spz.mjs --in file.ply [--out file.spz]");
  process.exit(1);
}
fs.mkdirSync(path.dirname(output), { recursive: true });

const proc = spawnSync(
  "npx.cmd",
  ["-y", "@playcanvas/splat-transform@2.7.1", "-w", input, "--filter-nan", output, "--spz-version", "3"],
  { encoding: "utf8", shell: true, timeout: 180_000 },
);
if (proc.status !== 0 || !fs.existsSync(output)) {
  process.stderr.write(proc.stdout || "");
  process.stderr.write(proc.stderr || "");
  console.error("splat-transform failed");
  process.exit(proc.status || 1);
}
console.log("[ggps-drop] spz", output, "bytes", fs.statSync(output).size);
