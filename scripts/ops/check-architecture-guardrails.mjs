#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const scanRoots = ["app", "components", "lib"];
const allowlistPath = path.join(repoRoot, "ops/architecture-allowlist.json");

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
    out.push(next);
  }
}

function toPosix(relPath) {
  return relPath.split(path.sep).join("/");
}

function toRel(absPath) {
  return toPosix(path.relative(repoRoot, absPath));
}

function globToRegExp(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function isAllowedRoute(relPath, allowlistGlobs) {
  return allowlistGlobs.some((glob) => globToRegExp(glob).test(relPath));
}

function hasAuthPattern(source) {
  return (
    source.includes("withAuth(") ||
    source.includes("withProjectAuth(") ||
    source.includes("auth.getUser(") ||
    source.includes("resolveServerOrgContext(") ||
    source.includes("getAuthenticatedOrgContext(") ||
    source.includes("hasValidSecret(")
  );
}

async function main() {
  const allowlist = await readJson(allowlistPath).catch(() => ({ publicApiRoutesWithoutUserAuth: [] }));
  const publicRouteGlobs = allowlist.publicApiRoutesWithoutUserAuth ?? [];

  const allFiles = [];
  for (const root of scanRoots) {
    await walk(path.join(repoRoot, root), allFiles);
  }

  const importViolations = [];
  const apiAuthViolations = [];

  for (const absPath of allFiles) {
    const relPath = toRel(absPath);
    const isTsFile = relPath.endsWith(".ts") || relPath.endsWith(".tsx");
    if (!isTsFile) continue;

    const source = await readFile(absPath, "utf8");

    // Rule: lib/ and components/ must not import from app/
    if (relPath.startsWith("lib/") || relPath.startsWith("components/")) {
      const hasForbiddenImport =
        source.includes("from '@/app/") ||
        source.includes('from "@/app/') ||
        source.includes("from '../app/") ||
        source.includes('from "../app/') ||
        source.includes("from '../../app/") ||
        source.includes('from "../../app/');
      if (hasForbiddenImport) {
        importViolations.push(relPath);
      }
    }

    // Rule: API routes should have explicit auth handling unless allowlisted
    if (relPath.startsWith("app/api/") && relPath.endsWith("/route.ts")) {
      if (isAllowedRoute(relPath, publicRouteGlobs)) continue;
      if (!hasAuthPattern(source)) {
        apiAuthViolations.push(relPath);
      }
    }
  }

  if (importViolations.length > 0 || apiAuthViolations.length > 0) {
    console.error("\n[architecture-guardrails] FAILED\n");

    if (importViolations.length > 0) {
      console.error("Forbidden imports from app/ into lib/components:");
      for (const relPath of importViolations) {
        console.error(`- ${relPath}`);
      }
      console.error("");
    }

    if (apiAuthViolations.length > 0) {
      console.error("API routes missing auth pattern (withAuth/withProjectAuth/auth.getUser):");
      for (const relPath of apiAuthViolations) {
        console.error(`- ${relPath}`);
      }
      console.error("");
      console.error("If route is intentionally public, add it to ops/architecture-allowlist.json");
    }

    process.exit(1);
  }

  console.log("\n[architecture-guardrails] PASS");
  console.log("No forbidden import-direction or API auth-pattern violations found.");
}

main().catch((error) => {
  console.error("[architecture-guardrails] Unexpected error", error);
  process.exit(1);
});
