#!/usr/bin/env node
/**
 * Extract stills from a 2D walk video for Postshot (Phase L0).
 *
 *   node scripts/local-splat/extract-frames.mjs --video room.mov --out frames --fps 2
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1]?.trim() || fallback) : fallback;
}

function findFfmpeg() {
  const hit = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (hit.status === 0) return "ffmpeg";
  const guesses = [
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
  ];
  return guesses.find((p) => fs.existsSync(p)) ?? null;
}

const video = arg("video");
const outDir = arg("out");
const fps = Number(arg("fps", "2"));
if (!video || !outDir || !fs.existsSync(video)) {
  console.error("usage: node scripts/local-splat/extract-frames.mjs --video <file> --out <dir> [--fps 2]");
  process.exit(1);
}
if (!Number.isFinite(fps) || fps <= 0 || fps > 8) {
  console.error("--fps must be between 0 and 8");
  process.exit(1);
}

const ffmpeg = findFfmpeg();
if (!ffmpeg) {
  console.error("ffmpeg not on PATH. Install it, then re-run.");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const pattern = path.join(outDir, "frame_%05d.jpg");
const result = spawnSync(
  ffmpeg,
  [
    "-y",
    "-i",
    video,
    "-vf",
    `fps=${fps}`,
    "-q:v",
    "2",
    pattern,
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);

const count = fs.readdirSync(outDir).filter((n) => /\.jpe?g$/i.test(n)).length;
console.log(`[local-splat] wrote ${count} frames to ${outDir}`);
console.log("[local-splat] delete obvious blur, then open that folder in Postshot.");
