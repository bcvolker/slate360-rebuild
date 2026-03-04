#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const repoRoot = process.cwd();

async function readJson(relPath) {
  const absolute = path.join(repoRoot, relPath);
  const raw = await readFile(absolute, "utf8");
  return JSON.parse(raw);
}

function runCommand(command) {
  return new Promise((resolve) => {
    const child = spawn(command, {
      shell: true,
      stdio: "inherit",
      env: process.env,
    });

    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

function isBlockedByBugGate(bugRegistry, gateConfig) {
  const blocked = [];
  const requiredStatuses = new Set((gateConfig.requiredStatuses ?? []).map((s) => String(s).toLowerCase()));
  const blockedSeverities = new Set((gateConfig.blockedSeverities ?? []).map((s) => String(s).toLowerCase()));

  for (const bug of bugRegistry.bugs ?? []) {
    const severity = String(bug.severity ?? "").toLowerCase();
    const status = String(bug.status ?? "").toLowerCase();
    if (blockedSeverities.has(severity) && !requiredStatuses.has(status)) {
      blocked.push({ id: bug.id, severity: bug.severity, status: bug.status, title: bug.title });
    }
  }

  return blocked;
}

async function main() {
  const releaseGates = await readJson("ops/release-gates.json");
  const bugRegistry = await readJson("ops/bug-registry.json");

  const blockedByBugs = isBlockedByBugGate(bugRegistry, releaseGates.bugGate ?? {});
  if (blockedByBugs.length > 0) {
    console.error("\n[verify:release] Blocked by bug gate:\n");
    for (const bug of blockedByBugs) {
      console.error(`- ${bug.id} (${bug.severity}, ${bug.status}): ${bug.title}`);
    }
    process.exit(1);
  }

  const checks = releaseGates.checks ?? [];
  for (const check of checks) {
    const command = String(check.command ?? "").trim();
    if (!command) continue;

    console.log(`\n[verify:release] Running ${check.id}: ${command}`);
    const code = await runCommand(command);
    const required = Boolean(check.required);

    if (code !== 0 && required) {
      console.error(`\n[verify:release] Required check failed: ${check.id}`);
      process.exit(code);
    }

    if (code !== 0 && !required) {
      console.warn(`\n[verify:release] Optional check failed (continuing): ${check.id}`);
    }
  }

  console.log("\n[verify:release] All required gates passed.");
}

main().catch((error) => {
  console.error("[verify:release] Unexpected error", error);
  process.exit(1);
});
