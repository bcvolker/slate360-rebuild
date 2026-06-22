#!/usr/bin/env node
/**
 * Design guardrails — enforces docs/design/GRAPHITE_GLASS.md.
 *
 * Each rule GROUP scans production source (app/, components/, lib/) for an
 * off-system pattern and is gated by its own only-shrink allow-list in
 * ops/design-allowlist.json. New files matching a pattern fail immediately;
 * entries whose files are now clean are reported as stale.
 *
 * Rule groups:
 *  - amber       legacy amber/copper accents (classes, hex, AND rgba form)
 *  - brandHex    hardcoded brand-color hex in components (breaks white-label /
 *                theming — use var(--primary) / var(--graphite-primary) / etc.)
 *  - orange      off-brand orange-* Tailwind classes
 *
 * The allow-lists may only SHRINK. Regenerate after a kill pass with:
 *   node scripts/ops/check-design-guardrails.mjs --update
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const scanRoots = ["app", "components", "lib"];
const allowlistPath = path.join(repoRoot, "ops/design-allowlist.json");
const updateMode = process.argv.includes("--update");

/**
 * @typedef {Object} RuleGroup
 * @property {string} key            stable id
 * @property {string} allowKey       key in the allow-list JSON
 * @property {string} label          human label for messages
 * @property {Set<string>} exts      file extensions this group scans
 * @property {string[]} [excludePaths] path fragments to skip (e.g. token files)
 * @property {RegExp[]} patterns      any match = violation
 * @property {string} hint           remediation guidance printed on failure
 */

/** @type {RuleGroup[]} */
const ruleGroups = [
  {
    key: "amber",
    allowKey: "legacyAmberFiles",
    label: "amber / legacy-accent",
    exts: new Set([".ts", ".tsx", ".css"]),
    patterns: [
      /\bamber-(?:50|[1-9]00|950)\b|\bbtn-amber-\w+|\bshadow-amber-glow\b/,
      /#(?:F59E0B|FBBF24|D97706|B45309|92400E|FFB020|FCD34D)\b/i,
      // rgba form the class/hex rules used to miss (drop-shadows, gradients):
      /rgba\(\s*245,\s*158,\s*11|rgba\(\s*251,\s*191,\s*36|rgba\(\s*217,\s*119,\s*6/,
    ],
    hint: "Use --graphite-primary / --twin360-blue, and muted-graphite chips for warnings — never amber.",
  },
  {
    key: "brandHex",
    allowKey: "legacyBrandHexFiles",
    label: "hardcoded brand-color hex",
    exts: new Set([".ts", ".tsx"]),
    // Token files legitimately DEFINE these literals; everything else consumes vars.
    excludePaths: ["lib/design-system/", "lib/pwa/"],
    patterns: [/#(?:00E699|00CC88|3B82F6|2563EB|3D8EFF|3580E6)\b/i],
    hint: "Use var(--primary) / var(--graphite-primary) / var(--twin360-blue) so white-label + theming apply everywhere.",
  },
  {
    key: "orange",
    allowKey: "legacyOrangeFiles",
    label: "off-brand orange accent",
    exts: new Set([".ts", ".tsx"]),
    patterns: [/\borange-(?:50|[1-9]00|950)\b/],
    hint: "Orange is off-brand. Use semantic tokens: red destructive, emerald success, muted-graphite warning.",
  },
];

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
    .catch(() => ({}));

  const allFiles = [];
  for (const root of scanRoots) {
    await walk(path.join(repoRoot, root), allFiles);
  }

  // Read each file once; test every applicable rule group against it.
  const sources = new Map();
  for (const absPath of allFiles) {
    const ext = path.extname(absPath);
    if (!ruleGroups.some((g) => g.exts.has(ext))) continue;
    sources.set(toRel(absPath), await readFile(absPath, "utf8"));
  }

  /** @type {Record<string, string[]>} key → violating rel paths */
  const violationsByGroup = {};
  for (const group of ruleGroups) {
    const hits = [];
    for (const [relPath, source] of sources) {
      const ext = path.extname(relPath);
      if (!group.exts.has(ext)) continue;
      if (group.excludePaths?.some((frag) => relPath.includes(frag))) continue;
      if (group.patterns.some((p) => p.test(source))) hits.push(relPath);
    }
    violationsByGroup[group.key] = hits.sort();
  }

  if (updateMode) {
    const next = {
      _comment:
        "Design ratchets — see docs/design/GRAPHITE_GLASS.md. Each list may only shrink. Regenerate after a kill pass with: node scripts/ops/check-design-guardrails.mjs --update",
    };
    for (const group of ruleGroups) next[group.allowKey] = violationsByGroup[group.key];
    await writeFile(allowlistPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    const counts = ruleGroups.map((g) => `${g.key}=${violationsByGroup[g.key].length}`).join(", ");
    console.log(`[design-guardrails] Wrote allow-lists (${counts})`);
    return;
  }

  let failed = false;
  const summary = [];
  for (const group of ruleGroups) {
    const allowed = new Set(allowlist[group.allowKey] ?? []);
    const current = violationsByGroup[group.key];
    const currentSet = new Set(current);
    const newViolations = current.filter((f) => !allowed.has(f));
    const stale = [...allowed].filter((f) => !currentSet.has(f));

    if (stale.length > 0) {
      console.warn(`[design-guardrails] Stale ${group.key} allow-list entries (now clean — run --update to drop):`);
      for (const entry of stale) console.warn(`  - ${entry}`);
    }
    if (newViolations.length > 0) {
      failed = true;
      console.error(`\n[design-guardrails] FAILED — new ${group.label} usage (banned):`);
      for (const f of newViolations) console.error(`  - ${f}`);
      console.error(`  → ${group.hint}`);
    }
    summary.push(`${group.key}: ${allowed.size} legacy (${stale.length} stale)`);
  }

  if (failed) process.exit(1);

  console.log(`\n[design-guardrails] PASS`);
  console.log(`No new off-system usage. Ratchets — ${summary.join(" · ")}.`);
}

main().catch((error) => {
  console.error("[design-guardrails] Unexpected error", error);
  process.exit(1);
});
