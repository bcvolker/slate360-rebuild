#!/usr/bin/env node
/**
 * Scoped TypeScript check — limits compilation roots so isolated work (e.g. marketing)
 * does not require a full-repo `tsc --noEmit` pass (avoids OOM on local Windows agents).
 *
 * TypeScript still follows imports from scoped entry files, but unreachable app areas
 * are not typechecked unless pulled in by the import graph.
 *
 * Usage:
 *   npm run typecheck:changed
 *       → .ts/.tsx changed vs merge-base with main (or origin/main)
 *
 *   npm run typecheck:changed -- app/(public)
 *       → all TS/TSX under a directory
 *
 *   npm run typecheck:changed -- app/(public)/_components/marketing-showcase.tsx
 *       → explicit file(s)
 *
 *   npm run typecheck:changed -- --git
 *       → same as default (changed files only)
 *
 *   npm run typecheck:changed -- --git --base=main
 *       → diff against a specific base branch
 *
 * Full-project type safety remains enforced in CI: `.github/workflows/typecheck.yml`
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const SCOPED_CONFIG = path.join(repoRoot, "tsconfig.typecheck-scoped.json");
const TS_EXTENSIONS = new Set([".ts", ".tsx", ".mts"]);

function toPosix(relPath) {
  return relPath.split(path.sep).join("/");
}

function parseArgs(argv) {
  const raw = argv.slice(2);
  const paths = [];
  let gitMode = raw.length === 0;
  let base = "main";

  for (const arg of raw) {
    if (arg === "--git") {
      gitMode = true;
      continue;
    }
    if (arg.startsWith("--base=")) {
      base = arg.slice("--base=".length);
      continue;
    }
    if (arg.startsWith("-")) {
      console.error(`Unknown flag: ${arg}`);
      process.exit(2);
    }
    paths.push(arg);
  }

  return { gitMode, base, paths };
}

function runGit(command) {
  try {
    return execSync(command, { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function resolveGitBase(base) {
  const candidates = [base, `origin/${base}`];
  for (const candidate of candidates) {
    const sha = runGit(`git rev-parse --verify ${candidate}`);
    if (sha) return candidate;
  }
  return base;
}

function gitChangedFiles(base) {
  const resolvedBase = resolveGitBase(base);
  const mergeBase = runGit(`git merge-base HEAD ${resolvedBase}`);
  const range = mergeBase ? `${mergeBase}...HEAD` : resolvedBase;
  const output = runGit(`git diff --name-only --diff-filter=ACMRTUXB ${range}`);
  if (!output) return [];

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => TS_EXTENSIONS.has(path.extname(file)))
    .filter((file) => existsSync(path.join(repoRoot, file)));
}

function walkTsFiles(dirPath, out) {
  if (!existsSync(dirPath)) return;
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const abs = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(abs, out);
      continue;
    }
    const ext = path.extname(entry.name);
    if (TS_EXTENSIONS.has(ext)) {
      out.push(toPosix(path.relative(repoRoot, abs)));
    }
  }
}

function expandPathInputSafe(input) {
  const normalized = input.replace(/\\/g, "/").replace(/\/+$/, "");
  const abs = path.isAbsolute(normalized)
    ? normalized
    : path.join(repoRoot, normalized);

  if (!existsSync(abs)) {
    console.error(`Path not found: ${input}`);
    process.exit(1);
  }

  const ext = path.extname(abs);
  if (TS_EXTENSIONS.has(ext)) {
    return [toPosix(path.relative(repoRoot, abs))];
  }

  const out = [];
  walkTsFiles(abs, out);
  if (out.length === 0) {
    console.error(`No TypeScript files under: ${input}`);
    process.exit(1);
  }
  return out;
}

function directoryGlobs(paths) {
  const globs = new Set(["next-env.d.ts"]);
  for (const rel of paths) {
    const normalized = rel.replace(/\\/g, "/");
    if (TS_EXTENSIONS.has(path.extname(normalized))) {
      globs.add(normalized);
      continue;
    }
    globs.add(`${normalized}/**/*.ts`);
    globs.add(`${normalized}/**/*.tsx`);
    globs.add(`${normalized}/**/*.mts`);
  }
  return [...globs];
}

function buildScopedConfig({ gitMode, base, paths }) {
  let include;

  if (gitMode) {
    const changed = gitChangedFiles(base);
    if (changed.length === 0) {
      return null;
    }
    include = ["next-env.d.ts", ...changed];
    console.log(`Scoped typecheck (git vs ${resolveGitBase(base)}): ${changed.length} file(s)`);
    for (const file of changed) console.log(`  • ${file}`);
  } else if (paths.length === 1 && !paths[0].includes("*")) {
    const abs = path.join(repoRoot, paths[0].replace(/\\/g, "/"));
    const ext = path.extname(abs);
    if (TS_EXTENSIONS.has(ext)) {
      include = ["next-env.d.ts", toPosix(path.relative(repoRoot, abs))];
      console.log(`Scoped typecheck (file): ${include[1]}`);
    } else {
      include = directoryGlobs([paths[0].replace(/\\/g, "/")]);
      console.log(`Scoped typecheck (directory): ${paths[0]}`);
      for (const glob of include.slice(1)) console.log(`  • ${glob}`);
    }
  } else if (paths.length > 0) {
    const files = new Set(["next-env.d.ts"]);
    for (const input of paths) {
      for (const file of expandPathInputSafe(input)) {
        files.add(file);
      }
    }
    include = [...files];
    console.log(`Scoped typecheck (${include.length - 1} file(s))`);
    for (const file of include.slice(1)) console.log(`  • ${file}`);
  } else {
    process.exit(2);
  }

  const baseConfig = JSON.parse(readFileSync(path.join(repoRoot, "tsconfig.json"), "utf8"));
  const scoped = {
    extends: "./tsconfig.json",
    compilerOptions: {
      ...baseConfig.compilerOptions,
      incremental: true,
      tsBuildInfoFile: ".tsbuildinfo-scoped",
    },
    include,
  };

  writeFileSync(SCOPED_CONFIG, `${JSON.stringify(scoped, null, 2)}\n`, "utf8");
  return SCOPED_CONFIG;
}

function main() {
  const { gitMode, base, paths } = parseArgs(process.argv);
  const configPath = buildScopedConfig({ gitMode, base, paths });

  if (!configPath) {
    console.log("Scoped typecheck: no changed TypeScript files — skipping.");
    process.exit(0);
  }

  const result = spawnSync("npx", ["tsc", "--noEmit", "-p", configPath], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: true,
  });

  process.exit(result.status ?? 1);
}

main();
