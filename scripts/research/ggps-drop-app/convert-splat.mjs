#!/usr/bin/env node
/**
 * Convert a Gaussian PLY into Twin-ready formats.
 * Default: SPZ v3 for the Spark / Twin viewer.
 *
 *   node convert-splat.mjs --in cloud.ply --out dest.spz --format spz
 *   formats: spz | ply | splat | html
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] || "").trim() : fallback;
}

const input = arg("in");
const format = (arg("format", "spz") || "spz").toLowerCase();
let output = arg("out");
if (!input || !fs.existsSync(input)) {
  console.error("usage: node convert-splat.mjs --in file.ply [--out file] [--format spz|ply|splat|html]");
  process.exit(1);
}
const ext = { spz: ".spz", ply: ".ply", splat: ".splat", html: ".html" }[format] || ".spz";
if (!output) output = input.replace(/\.ply$/i, ext);
if (format === "ply") {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(input, output);
  console.log("[convert] ply", output);
  process.exit(0);
}
fs.mkdirSync(path.dirname(output), { recursive: true });
const args = ["-y", "@playcanvas/splat-transform@2.7.1", "-w", input, "--filter-nan", output];
if (format === "spz") args.push("--spz-version", "3");
const proc = spawnSync("npx.cmd", args, { encoding: "utf8", shell: true, timeout: 180_000 });
if (proc.status !== 0 || !fs.existsSync(output)) {
  process.stderr.write(proc.stdout || "");
  process.stderr.write(proc.stderr || "");
  console.error("splat-transform failed");
  process.exit(proc.status || 1);
}
console.log("[convert]", format, output, "bytes", fs.statSync(output).size);
