// One-off PWA icon generator.
// Usage: node scripts/gen-pwa-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve("public/uploads/slate360-icon-cobalt-v2.svg");
const svg = readFileSync(src);

const targets = [
  { out: "public/uploads/icon-192.png", size: 192, pad: 0 },
  { out: "public/uploads/icon-512.png", size: 512, pad: 0 },
  // maskable: 10% safe zone on each side
  { out: "public/uploads/icon-512-maskable.png", size: 512, pad: 0.1 },
];

for (const { out, size, pad } of targets) {
  const inner = Math.round(size * (1 - pad * 2));
  const border = Math.round((size - inner) / 2);
  const rendered = await sharp(svg, { density: 512 })
    .resize(inner, inner, { fit: "contain", background: { r: 11, g: 15, b: 21, alpha: 1 } })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 11, g: 15, b: 21, alpha: 1 }, // #0B0F15 brand dark
    },
  })
    .composite([{ input: rendered, top: border, left: border }])
    .png()
    .toFile(resolve(out));
  console.log(`wrote ${out} (${size}x${size}, pad=${pad})`);
}
