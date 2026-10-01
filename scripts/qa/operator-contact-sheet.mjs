import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const BASE =
  process.env.MONDAY_PROOF_BASE ??
  "https://slate360-rebuild-git-feature-monday-commercial-757527-slate360.vercel.app";
const TOKEN = "S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269";
const CLIP = "f278d37f-1c2f-4511-aef5-437b3992d39d";
const OUT = path.resolve("docs/ops/monday-release/operator");

async function main() {
  await mkdir(OUT, { recursive: true });
  const erpUrl = `${BASE}/api/spatial-walkthrough/public/${TOKEN}/media?clip=${CLIP}&kind=poster`;
  const heroUrl = `${BASE}/api/spatial-walkthrough/public/${TOKEN}/media?clip=${CLIP}&kind=hero`;
  const erpRes = await fetch(erpUrl);
  const heroRes = await fetch(heroUrl);
  if (!erpRes.ok || !heroRes.ok) {
    console.log("FAIL fetch", erpRes.status, heroRes.status);
    process.exit(1);
  }
  const erp = Buffer.from(await erpRes.arrayBuffer());
  const hero = Buffer.from(await heroRes.arrayBuffer());
  const meta = await sharp(erp).metadata();
  const w = meta.width ?? 2;
  const h = meta.height ?? 2;
  const strips = [
    ["nadir", { left: Math.floor(w * 0.35), top: Math.floor(h * 0.78), width: Math.floor(w * 0.3), height: Math.floor(h * 0.2) }],
    ["rear-left", { left: 0, top: Math.floor(h * 0.35), width: Math.floor(w * 0.18), height: Math.floor(h * 0.35) }],
    ["rear-right", { left: Math.floor(w * 0.82), top: Math.floor(h * 0.35), width: Math.floor(w * 0.18), height: Math.floor(h * 0.35) }],
    ["center-safe", { left: Math.floor(w * 0.28), top: Math.floor(h * 0.18), width: Math.floor(w * 0.44), height: Math.floor(h * 0.46) }],
  ];
  const tiles = [];
  for (const [name, region] of strips) {
    const buf = await sharp(erp).extract(region).resize(480, 270, { fit: "cover" }).jpeg({ quality: 78 }).toBuffer();
    const file = path.join(OUT, `${name}.jpg`);
    await writeFile(file, buf);
    tiles.push({ name, file });
    console.log(name, file);
  }
  await writeFile(path.join(OUT, "hero.jpg"), await sharp(hero).jpeg({ quality: 82 }).toBuffer());
  const sheet = await sharp({
    create: { width: 960, height: 540, channels: 3, background: { r: 11, g: 15, b: 21 } },
  })
    .composite(
      await Promise.all(
        tiles.slice(0, 4).map(async (t, i) => ({
          input: await sharp(t.file).resize(480, 270).toBuffer(),
          left: (i % 2) * 480,
          top: Math.floor(i / 2) * 270,
        })),
      ),
    )
    .jpeg({ quality: 80 })
    .toBuffer();
  await writeFile(path.join(OUT, "contact-sheet.jpg"), sheet);
  console.log("CONTACT_SHEET", path.join(OUT, "contact-sheet.jpg"));
  console.log("RESULT FAIL_IF_OPERATOR_VISIBLE_IN_NADIR_OR_REAR");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
