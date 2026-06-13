#!/usr/bin/env node
/**
 * Golden-file harness for thermal extract.py (local dev).
 *
 * Usage:
 *   node scripts/ops/validate-thermal-extract.mjs path/to/radiometric.jpg
 *   node scripts/ops/validate-thermal-extract.mjs path/to/file.jpg --expect-radiometric --min-temp=-20 --max-temp=120
 *
 * Requires Python + exiftool + workers/modal/thermal-analysis on PYTHONPATH.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerDir = path.join(__dirname, "../../workers/modal/thermal-analysis");

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { input: positional[0], flags };
}

const { input, flags } = parseArgs(process.argv.slice(2));

if (!input) {
  console.error(
    "Usage: node scripts/ops/validate-thermal-extract.mjs <path-to-rjpeg> [--expect-radiometric] [--min-temp=N] [--max-temp=N]",
  );
  process.exit(1);
}

const script = `
import json, sys
from pathlib import Path
sys.path.insert(0, r"${workerDir.replace(/\\/g, "\\\\")}")
from extract import run_exiftool_json, extract_raw_matrix, build_quality_metrics
p = Path(r"${input.replace(/\\/g, "\\\\")}")
meta = run_exiftool_json(p)
temp, extract_meta = extract_raw_matrix(p, meta)
quality = build_quality_metrics(temp, meta, extract_meta)
print(json.dumps({"quality": quality, "extract": extract_meta}, indent=2))
`;

const result = spawnSync("python", ["-c", script], { encoding: "utf8" });
if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

console.log(result.stdout);

let payload;
try {
  payload = JSON.parse(result.stdout);
} catch {
  console.error("Could not parse extract output as JSON");
  process.exit(1);
}

const quality = payload.quality ?? {};
const extract = payload.extract ?? {};
const errors = [];

if (flags["expect-radiometric"] && !quality.is_radiometric) {
  errors.push("Expected radiometric file but is_radiometric=false");
}

const minTemp = flags["min-temp"] != null ? Number(flags["min-temp"]) : null;
const maxTemp = flags["max-temp"] != null ? Number(flags["max-temp"]) : null;
const maxDetected = quality.max_temp_c;

if (minTemp != null && Number.isFinite(maxDetected) && maxDetected < minTemp) {
  errors.push(`max_temp_c ${maxDetected} below --min-temp ${minTemp}`);
}
if (maxTemp != null && Number.isFinite(maxDetected) && maxDetected > maxTemp) {
  errors.push(`max_temp_c ${maxDetected} above --max-temp ${maxTemp}`);
}

if (flags["expect-absolute"] && !extract.absolute_celsius) {
  errors.push("Expected absolute_celsius=true");
}

if (errors.length) {
  console.error("\nAssertion failures:");
  for (const err of errors) console.error(`  • ${err}`);
  process.exit(2);
}

console.error("\nOK — extract metrics within expected bounds.");
console.error(
  `  radiometric=${quality.is_radiometric} absolute=${Boolean(extract.absolute_celsius)} max=${maxDetected}°C score=${quality.confidence_score}`,
);
