#!/usr/bin/env node
/**
 * Print local preview context: branch, commit, cleanliness, URLs, cache-bust suffix.
 * No secrets, no network calls.
 *
 * Usage: npm run preview:info
 */

import { execSync } from "node:child_process";
import os from "node:os";

function git(args) {
  try {
    return execSync(`git ${args}`, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function main() {
  const branch = git("rev-parse --abbrev-ref HEAD") ?? "(unknown)";
  const commit = git("rev-parse HEAD") ?? "(unknown)";
  const shortCommit = git("rev-parse --short HEAD") ?? "(unknown)";
  const porcelain = git("status --porcelain") ?? "";
  const isClean = porcelain.length === 0;

  const upstream = git("rev-parse --abbrev-ref --symbolic-full-name @{u} 2>nul") ?? null;
  let pushStatus = "no upstream configured";
  if (upstream) {
    const counts = git(`rev-list --left-right --count ${upstream}...HEAD`);
    if (counts) {
      const [behind, ahead] = counts.split(/\s+/).map(Number);
      if (ahead === 0 && behind === 0) pushStatus = "in sync with remote";
      else if (ahead > 0 && behind === 0) pushStatus = `${ahead} commit(s) ahead (unpushed)`;
      else if (ahead === 0 && behind > 0) pushStatus = `${behind} commit(s) behind remote`;
      else pushStatus = `ahead ${ahead}, behind ${behind}`;
    }
  }

  const port = process.env.PORT ?? "3000";
  const localBase = `http://localhost:${port}`;
  const cacheBust = `?v=${shortCommit}`;

  const ifaces = os.networkInterfaces();
  const lanIps = [];
  for (const entries of Object.values(ifaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        lanIps.push(entry.address);
      }
    }
  }

  const repo = git("config --get remote.origin.url");
  const prCompare =
    repo && branch !== "main"
      ? `https://github.com/bcvolker/slate360-rebuild/compare/main...${encodeURIComponent(branch)}?expand=1`
      : null;

  console.log("\n[preview:info] Slate360 preview context\n");
  console.log(`  Branch:        ${branch}`);
  console.log(`  Commit:        ${commit}`);
  console.log(`  Short commit:  ${shortCommit}`);
  console.log(`  Working tree:  ${isClean ? "clean" : "dirty (uncommitted changes)"}`);
  console.log(`  Remote:        ${pushStatus}`);

  console.log("\n  Local URLs:");
  console.log(`    ${localBase}/app`);
  console.log(`    ${localBase}/site-walk`);
  console.log(`    ${localBase}/dashboard`);
  console.log(`    ${localBase}/login`);

  console.log("\n  Cache-bust suffix:");
  console.log(`    ${cacheBust}`);
  console.log(`    ${localBase}/app${cacheBust}`);
  console.log(`    ${localBase}/site-walk${cacheBust}`);

  if (lanIps.length > 0) {
    console.log("\n  Phone (same Wi‑Fi, dev server on 0.0.0.0):");
    console.log("    npm run dev -- --hostname 0.0.0.0 --port " + port);
    for (const ip of lanIps.slice(0, 3)) {
      console.log(`    http://${ip}:${port}/app${cacheBust}`);
    }
  }

  if (prCompare) {
    console.log("\n  Open PR (if none exists):");
    console.log(`    ${prCompare}`);
  }

  console.log("\n  Vercel preview:");
  console.log("    Created when a PR is opened and Vercel deploys — see bot comment on the PR.");
  console.log("    Production: https://www.slate360.ai (main only — do not use for branch WIP)");

  console.log("\n  Service worker:");
  console.log("    Disabled in local dev. Preview/prod: kill-switch SW clears caches on activate.");
  console.log("    Use private tab + ?v= hash when testing PR previews on a phone.\n");
}

main();
