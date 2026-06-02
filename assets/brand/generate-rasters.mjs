#!/usr/bin/env node
/**
 * Generate PWA / favicon rasters from assets/brand/slate360-icon.svg.
 * Usage: node assets/brand/generate-rasters.mjs
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(resolve(__dirname, "slate360-icon.svg"));
const BG = { r: 11, g: 15, b: 21, alpha: 1 }; // #0B0F15

async function renderSquarePng({ out, size, pad = 0 }) {
  const inner = Math.round(size * (1 - pad * 2));
  const border = Math.round((size - inner) / 2);
  const rendered = await sharp(svg, { density: 512 })
    .resize(inner, inner, { fit: "contain", background: BG })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: rendered, top: border, left: border }])
    .png()
    .toFile(out);
}

const targets = [
  { out: resolve(__dirname, "slate360-icon.png"), size: 512, pad: 0 },
  { out: resolve(process.cwd(), "public/uploads/icon-192.png"), size: 192, pad: 0 },
  { out: resolve(process.cwd(), "public/uploads/icon-512.png"), size: 512, pad: 0 },
  {
    out: resolve(process.cwd(), "public/uploads/icon-512-maskable.png"),
    size: 512,
    pad: 0.1,
  },
  {
    out: resolve(process.cwd(), "public/uploads/apple-touch-icon.png"),
    size: 180,
    pad: 0,
  },
  { out: resolve(process.cwd(), "public/uploads/favicon-32.png"), size: 32, pad: 0 },
  { out: resolve(process.cwd(), "public/uploads/favicon-16.png"), size: 16, pad: 0 },
];

for (const target of targets) {
  await renderSquarePng(target);
  console.log(`wrote ${target.out} (${target.size}x${target.size})`);
}

// Legacy .ico path — single 32px PNG payload for browsers that still probe /favicon.ico
await sharp(svg, { density: 512 })
  .resize(32, 32, { fit: "contain", background: BG })
  .png()
  .toFile(resolve(process.cwd(), "public/favicon.ico"));

console.log("wrote public/favicon.ico (32x32 PNG payload)");
