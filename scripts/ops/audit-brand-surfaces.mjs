#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 * Slate360 Brand Audit Scanner
 *
 * Detects user-visible surfaces that still use:
 *  - Old/legacy logo or icon paths
 *  - Hardcoded hex colors instead of CSS variables or tokens
 *  - The old brand name format ("SLATE 360" vs "Slate360")
 *
 * Usage:
 *   node scripts/ops/audit-brand-surfaces.mjs
 *   node scripts/ops/audit-brand-surfaces.mjs --json
 *   node scripts/ops/audit-brand-surfaces.mjs --fix-inventory
 *
 * Options:
 *   --json            Output results as JSON
 *   --fix-inventory   Update ops/surface-inventory.json brandMigrated flags
 * ═══════════════════════════════════════════════════════════════
 */
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const JSON_MODE = process.argv.includes("--json");
const FIX_INVENTORY = process.argv.includes("--fix-inventory");

/* ── Patterns to detect ──────────────────────────────────────── */

const LEGACY_LOGO_PATTERNS = [
  /SLATE 360-Color/i,
  /Color Reversed Lockup/i,
  /Color Lockup \(1\)/i,
  /Color Text \(1\)/i,
  /Color icon \(1\)/i,
  /\/logo\.svg/,
  /\/favicon\.svg/,
  /\/uploads\/favicon\.svg/,
];

const HARDCODED_HEX_PATTERNS = [
  // Old navy/blue accent hardcodes (NOT #18181b which is a valid graphite)
  { pattern: /#1e3a5f/gi, label: "old-navy-blue" },
  { pattern: /#1a365d/gi, label: "old-navy-dark" },
  { pattern: /#2b6cb0/gi, label: "old-blue-accent" },
  // Orange accent from v0 that should be gold
  { pattern: /#E04400/gi, label: "old-orange-accent" },
  { pattern: /#e04400/gi, label: "old-orange-accent" },
  // Any inline #D4AF37 in JSX (should use var(--slate-gold) or token)
  { pattern: /(?:style=\{[^}]*|style="[^"]*|bg-\[)#D4AF37/gi, label: "inline-gold-hex" },
  // Any inline #6366F1 (should use module token or var)
  { pattern: /(?:bg-\[|text-\[|border-\[)#6366F1\]/gi, label: "inline-indigo-hex" },
];

const OLD_BRAND_NAME = /SLATE\s+360(?!-context)/g;

/* ── File scanning ───────────────────────────────────────────── */

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".jsx", ".js", ".css", ".html", ".md"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "out", "build", "dist", "coverage", ".turbo", ".vercel", "playwright-report", "test-results"]);

async function* walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walkFiles(full);
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

/* ── Analysis ────────────────────────────────────────────────── */

async function scanFile(filePath) {
  const content = await readFile(filePath, "utf8");
  const relative = path.relative(ROOT, filePath);
  const findings = [];

  // Legacy logo paths
  for (const pat of LEGACY_LOGO_PATTERNS) {
    const matches = content.match(pat);
    if (matches) {
      findings.push({
        file: relative,
        type: "legacy-logo",
        detail: matches[0],
        count: matches.length,
      });
    }
  }

  // Hardcoded hex colors (only in source files, not CSS token definitions)
  if (!relative.endsWith("globals.css") && !relative.includes("design-system/tokens")) {
    for (const { pattern, label } of HARDCODED_HEX_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        findings.push({
          file: relative,
          type: "hardcoded-color",
          detail: label,
          count: matches.length,
        });
      }
    }
  }

  // Old brand name format
  const nameMatches = content.match(OLD_BRAND_NAME);
  if (nameMatches) {
    // Exclude file paths and context references
    const realMatches = nameMatches.filter(m => !m.includes("context"));
    if (realMatches.length > 0) {
      findings.push({
        file: relative,
        type: "old-brand-name",
        detail: "SLATE 360",
        count: realMatches.length,
      });
    }
  }

  return findings;
}

/* ── Main ────────────────────────────────────────────────────── */

async function main() {
  const allFindings = [];
  let filesScanned = 0;

  for await (const filePath of walkFiles(ROOT)) {
    const findings = await scanFile(filePath);
    allFindings.push(...findings);
    filesScanned++;
  }

  // Group by type
  const byType = {};
  for (const f of allFindings) {
    (byType[f.type] ??= []).push(f);
  }

  // Surface inventory check
  let inventoryStatus = null;
  try {
    const inv = JSON.parse(await readFile(path.join(ROOT, "ops/surface-inventory.json"), "utf8"));
    const totalSurfaces = inv.surfaces.length + inv.sharedShells.length + inv.emailSurfaces.length;
    const migrated = [
      ...inv.surfaces.filter(s => s.brandMigrated),
      ...inv.sharedShells.filter(s => s.brandMigrated),
      ...inv.emailSurfaces.filter(s => s.brandMigrated),
    ].length;
    inventoryStatus = { totalSurfaces, migrated, remaining: totalSurfaces - migrated };
  } catch {
    inventoryStatus = { error: "ops/surface-inventory.json not found" };
  }

  if (JSON_MODE) {
    console.log(JSON.stringify({ filesScanned, findings: allFindings, byType, inventoryStatus }, null, 2));
    return;
  }

  // Human-readable output
  console.log(`\n[brand-audit] Scanned ${filesScanned} files\n`);

  if (allFindings.length === 0) {
    console.log("✅ No legacy branding issues found!\n");
  } else {
    for (const [type, findings] of Object.entries(byType)) {
      const icon = type === "legacy-logo" ? "🖼️" : type === "hardcoded-color" ? "🎨" : "📛";
      console.log(`${icon}  ${type} (${findings.length} hits):`);
      for (const f of findings) {
        console.log(`   ${f.file} — ${f.detail} (×${f.count})`);
      }
      console.log();
    }
  }

  if (inventoryStatus && !inventoryStatus.error) {
    const pct = Math.round((inventoryStatus.migrated / inventoryStatus.totalSurfaces) * 100);
    console.log(`📊 Surface inventory: ${inventoryStatus.migrated}/${inventoryStatus.totalSurfaces} migrated (${pct}%)\n`);
  }

  console.log(`Total issues: ${allFindings.length}`);
  process.exit(allFindings.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[brand-audit] Fatal:", err.message);
  process.exit(2);
});
