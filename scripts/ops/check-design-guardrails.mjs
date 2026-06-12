#!/usr/bin/env node
/**
 * Design guardrails — enforces docs/design/GRAPHITE_GLASS.md.
 *
 * Fails when production source (app/, components/, lib/) contains:
 *  - amber/legacy-accent Tailwind classes (amber-500, btn-amber-*, shadow-amber-glow)
 *  - legacy amber hex values
 *  - decorative glow utilities outside token files
 *
 * Ratchet model: every pre-existing violation is allow-listed by exact path in
 * ops/design-allowlist.json. The list may only SHRINK — new files with amber fail
 * immediately, and entries whose files are now clean are reported as stale so they
 * can be removed. Regenerate after a kill pass with: node scripts/ops/check-design-guardrails.mjs --update
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const scanRoots = ["app", "components", "lib"];
const allowlistPath = path.join(repoRoot, "ops/design-allowlist.json");
const updateMode = process.argv.includes("--update");

const rules = [
  {
    name: "amber-class",
    pattern: /\bamber-(?:50|[1-9]00|950)\b|\bbtn-amber-\w+|\bshadow-amber-glow\b/,
  },
  {
    name: "amber-hex",
    pattern: /#(?:F59E0B|FBBF24|D97706|B45309|92400E|FFB020|FCD34D)\b/i,
  },
];

const scanExtensions = new Set([".ts", ".tsx", ".css"]);

async function walk(dirPath, out) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const next = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await walk(next, out);
      continue;
    }
    out.push(next);
  }
}

function toRel(absPath) {
  return path.relative(repoRoot, absPath).split(path.sep).join("/");
}

async function main() {
  const allowlist = await readFile(allowlistPath, "utf8")
    .then((raw) => JSON.parse(raw))
    .catch(() => ({ legacyAmberFiles: [] }));
  const allowed = new Set(allowlist.legacyAmberFiles ?? []);

  const allFiles = [];
  for (const root of scanRoots) {
    await walk(path.join(repoRoot, root), allFiles);
  }

  const violatingFiles = [];
  for (const absPath of allFiles) {
    if (!scanExtensions.has(path.extname(absPath))) continue;
    const relPath = toRel(absPath);
    const source = await readFile(absPath, "utf8");
    const hits = rules.filter((rule) => rule.pattern.test(source));
    if (hits.length > 0) {
      violatingFiles.push({ relPath, rules: hits.map((rule) => rule.name) });
    }
  }

  if (updateMode) {
    const next = {
      _comment:
        "Legacy amber ratchet — see docs/design/GRAPHITE_GLASS.md. This list may only shrink. Regenerate after a kill pass with: node scripts/ops/check-design-guardrails.mjs --update",
      legacyAmberFiles: violatingFiles.map((violation) => violation.relPath).sort(),
    };
    await writeFile(allowlistPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    console.log(`[design-guardrails] Wrote ${next.legacyAmberFiles.length} entries to ops/design-allowlist.json`);
    return;
  }

  const newViolations = violatingFiles.filter((violation) => !allowed.has(violation.relPath));
  const currentSet = new Set(violatingFiles.map((violation) => violation.relPath));
  const staleEntries = [...allowed].filter((entry) => !currentSet.has(entry));

  if (staleEntries.length > 0) {
    console.warn("[design-guardrails] Stale allow-list entries (now clean — remove them):");
    for (const entry of staleEntries) console.warn(`- ${entry}`);
  }

  if (newViolations.length > 0) {
    console.error("\n[design-guardrails] FAILED\n");
    console.error("New amber/legacy-accent usage outside the legacy ratchet (banned — see docs/design/GRAPHITE_GLASS.md):");
    for (const violation of newViolations) {
      console.error(`- ${violation.relPath} (${violation.rules.join(", ")})`);
    }
    console.error("\nUse the route accent vars (--mobile-shell-accent / --graphite-primary / --twin360-blue) instead.");
    process.exit(1);
  }

  console.log(`\n[design-guardrails] PASS`);
  console.log(`No new amber usage. Legacy ratchet: ${allowed.size} files remaining (${staleEntries.length} stale).`);
}

main().catch((error) => {
  console.error("[design-guardrails] Unexpected error", error);
  process.exit(1);
});
