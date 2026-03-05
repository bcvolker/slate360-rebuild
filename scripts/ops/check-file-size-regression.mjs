#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const baselinePath = path.join(repoRoot, "ops/file-size-baseline.json");
const scanRoots = ["app", "components", "lib"];
const allowedExt = new Set([".ts", ".tsx"]);

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function walk(dirPath, out) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const next = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walk(next, out);
      continue;
    }

    const ext = path.extname(entry.name);
    if (!allowedExt.has(ext)) continue;
    out.push(next);
  }
}

async function countLines(absPath) {
  const raw = await readFile(absPath, "utf8");
  if (raw.length === 0) return 0;
  const newlineCount = (raw.match(/\n/g) ?? []).length;
  if (raw.endsWith("\n")) return newlineCount;
  return newlineCount + 1;
}

function toRel(absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join("/");
}

async function main() {
  const baseline = await readJson(baselinePath);
  const threshold = Number(baseline.threshold ?? 300);
  const baselineFiles = baseline.files ?? {};

  const files = [];
  for (const root of scanRoots) {
    await walk(path.join(repoRoot, root), files);
  }

  const offenders = {};
  for (const absFile of files) {
    const lineCount = await countLines(absFile);
    if (lineCount > threshold) {
      offenders[toRel(absFile)] = lineCount;
    }
  }

  const newOffenders = [];
  const grownOffenders = [];
  const improved = [];

  for (const [file, lines] of Object.entries(offenders)) {
    const baselineLines = baselineFiles[file];
    if (baselineLines == null) {
      newOffenders.push({ file, lines });
      continue;
    }
    if (lines > baselineLines) {
      grownOffenders.push({ file, baselineLines, lines });
    }
  }

  for (const [file, baselineLines] of Object.entries(baselineFiles)) {
    const current = offenders[file];
    if (current == null) {
      improved.push({ file, baselineLines });
    }
  }

  if (newOffenders.length > 0 || grownOffenders.length > 0) {
    console.error("\n[file-size-regression] FAILED\n");
    if (newOffenders.length > 0) {
      console.error("New files over threshold:");
      for (const row of newOffenders) {
        console.error(`- ${row.file}: ${row.lines} lines`);
      }
      console.error("");
    }

    if (grownOffenders.length > 0) {
      console.error("Existing oversized files that grew:");
      for (const row of grownOffenders) {
        console.error(`- ${row.file}: ${row.baselineLines} -> ${row.lines} lines`);
      }
      console.error("");
    }

    console.error("Action: extract code to reduce file size, or intentionally update ops/file-size-baseline.json if growth is approved.");
    process.exit(1);
  }

  console.log("\n[file-size-regression] PASS");
  console.log(`Oversized files tracked: ${Object.keys(offenders).length}`);
  if (improved.length > 0) {
    console.log("Files improved below threshold:");
    for (const row of improved) {
      console.log(`- ${row.file} (baseline ${row.baselineLines})`);
    }
  }
}

main().catch((error) => {
  console.error("[file-size-regression] Unexpected error", error);
  process.exit(1);
});
