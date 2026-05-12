#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app", "components"];
const TEXT_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".md", ".mdx", ".css"]);

const PATTERNS = [
  /coming\s*soon/i,
  /placeholder/i,
  /lorem/i,
  /\bdemo\b/i,
  /\bsample\b/i,
  /\bfake\b/i,
  /\bmock(?:ed|s)?\b/i,
  /\bdisabled\b/i,
  /AI[-\s]?powered/i,
  /\bbeta\b/i,
  /\btesting\b/i,
  /360\s*Tours/i,
  /Design\s*Studio/i,
  /Content\s*Studio/i,
  /Geospatial/i,
  /Virtual\s*Studio/i,
  /Analytics/i,
  /Tour\s*Builder/i,
];

const ignoredPathParts = new Set(["node_modules", ".next", "dist", "build", "coverage"]);

async function walk(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true }).catch(() => []);
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);
    const parts = relativePath.split(path.sep);
    if (parts.some((part) => ignoredPathParts.has(part))) continue;

    if (entry.isDirectory()) {
      files.push(...await walk(relativePath));
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(relativePath);
    }
  }

  return files;
}

function hasRisk(line) {
  return PATTERNS.some((pattern) => pattern.test(line));
}

const files = (await Promise.all(SCAN_DIRS.map((dir) => walk(dir)))).flat();
const findings = [];

for (const file of files) {
  const text = await readFile(path.join(ROOT, file), "utf8").catch(() => "");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (hasRisk(line)) findings.push(`${file.replaceAll(path.sep, "/")}:${index + 1}`);
  });
}

if (findings.length > 0) {
  process.stdout.write(`${findings.join("\n")}\n`);
  process.stderr.write(`Found ${findings.length} release-surface risk line(s).\n`);
  process.exit(1);
}
