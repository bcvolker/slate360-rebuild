#!/usr/bin/env node
/**
 * PLY → SPZ v3 using the same PlayCanvas tool as the production twin worker.
 * Does not reimplement splat serialization.
 *
 *   node engine/ply-to-spz.mjs <in.ply> <out.spz>
 *   node engine/ply-to-spz.mjs --self-test
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SPLAT_TRANSFORM_PKG } from "./presets.mjs";

const OPACITY_TIERS = [0.05, 0.15, 0.30];
const SCALE_CAP = 0.3;

function npxArgv(args) {
  const cli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
  if (!existsSync(cli)) {
    throw new Error(`npx-cli.js not found next to ${process.execPath}`);
  }
  return { cmd: process.execPath, argv: [cli, "-y", ...args] };
}

function runNpx(args) {
  const { cmd, argv } = npxArgv(args);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, argv, { stdio: "inherit", windowsHide: true });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`npx exited ${code}`))));
  });
}

export async function plyToSpz(plyPath, spzPath) {
  let lastErr = null;
  for (const op of OPACITY_TIERS) {
    try {
      await runNpx([
        SPLAT_TRANSFORM_PKG,
        "-w",
        plyPath,
        "--filter-nan",
        "--filter-value",
        `opacity,gte,${op}`,
        "--filter-value",
        `scale_0,lte,${SCALE_CAP}`,
        "--filter-value",
        `scale_1,lte,${SCALE_CAP}`,
        "--filter-value",
        `scale_2,lte,${SCALE_CAP}`,
        spzPath,
        "--spz-version",
        "3",
      ]);
      const st = await stat(spzPath);
      if (st.size > 0) return { filterMode: "opacity_tier", opacityFloor: op, bytes: st.size };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("splat-transform produced no output");
}

async function selfTest() {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "s360-spz-"));
  const src = "https://sparkjs.dev/assets/splats/butterfly.spz";
  const inSpz = path.join(tmp, "in.spz");
  const ply = path.join(tmp, "mid.ply");
  const outSpz = path.join(tmp, "out.spz");
  const res = await fetch(src);
  if (!res.ok) throw new Error(`download ${src} failed: ${res.status}`);
  await writeFile(inSpz, Buffer.from(await res.arrayBuffer()));
  await runNpx([SPLAT_TRANSFORM_PKG, inSpz, ply]);
  const result = await plyToSpz(ply, outSpz);
  await rm(tmp, { recursive: true, force: true });
  console.log(JSON.stringify({ ok: true, ...result, note: "roundtrip via butterfly.spz" }));
}

const args = process.argv.slice(2);
const isCli = process.argv[1]?.replaceAll("\\", "/").endsWith("engine/ply-to-spz.mjs");
if (isCli && args[0] === "--self-test") {
  selfTest().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (isCli && args.length >= 2) {
  plyToSpz(args[0], args[1])
    .then((r) => console.log(JSON.stringify(r)))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}


