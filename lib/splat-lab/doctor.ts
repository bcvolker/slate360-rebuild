/**
 * Runs the pipeline's dependency checks and caches the result to
 * tmp/splat-lab/doctor.json so the title-bar dot doesn't re-run a WSL
 * round-trip on every poll. This is what turns "blocked mid-run: package
 * missing" (the py360convert screenshot) into a visible red dot before Run.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { SPLAT_LAB_ROOT } from "@/lib/splat-lab/job-store";
import { WSL_COLMAP_BIN, WSL_DISTRO, WSL_PYTHON, WSL_REPO, WSL_VOCAB_TREE, wslCleanEnv } from "@/lib/splat-lab/wsl";

const execFileAsync = promisify(execFile);
const DOCTOR_PATH = join(SPLAT_LAB_ROOT, "doctor.json");
const CACHE_MS = 30_000;

export type DoctorCheck = { name: string; ok: boolean; detail: string };
export type DoctorReport = { ok: boolean; checkedAt: number; checks: DoctorCheck[] };

// A multi-line script passed inline as a single `wsl -lc '...'` argument does
// not survive Node's Windows process spawning to wsl.exe intact (verified
// 2026-09-12) — always invoke a real script file for anything more than one
// line, per docs/ops/SPLAT_LAB_PARITY_BUILD_PLAN.md Sec 0.
const DOCTOR_SCRIPT = `${WSL_REPO}/workers/local/splat-lab/doctor.sh`;

async function runChecks(): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  const cmd = `${wslCleanEnv()} bash ${JSON.stringify(DOCTOR_SCRIPT)} ` +
    `${JSON.stringify(WSL_PYTHON)} ${JSON.stringify(`${WSL_COLMAP_BIN}/colmap`)} ${JSON.stringify(WSL_VOCAB_TREE)}`;
  try {
    const { stdout } = await execFileAsync(
      "wsl.exe", ["-d", WSL_DISTRO, "--", "bash", "-lc", cmd], { timeout: 20_000 },
    );
    const lines = Object.fromEntries(
      stdout.split("\n").filter((l) => l.includes("=")).map((l) => {
        const idx = l.indexOf("=");
        return [l.slice(0, idx), l.slice(idx + 1)];
      }),
    );
    checks.push({ name: "ffmpeg", ok: lines.FFMPEG === "yes", detail: lines.FFMPEG ?? "unknown" });
    checks.push({ name: "colmap", ok: Boolean(lines.COLMAP) && !lines.COLMAP.includes("missing"),
                 detail: lines.COLMAP ?? "missing" });
    checks.push({ name: "colmap-equirectangular", ok: lines.COLMAP_EQUIRECT === "yes",
                 detail: lines.COLMAP_EQUIRECT ?? "unknown" });
    checks.push({ name: "vocab-tree", ok: lines.VOCAB_TREE === "yes",
                 detail: lines.VOCAB_TREE === "yes" ? "present" : "missing — run scripts/splat-lab/fetch-vocab-tree.sh" });
    checks.push({ name: "python-deps", ok: lines.PY_DEPS === "ok", detail: lines.PY_DEPS ?? "unknown" });
    checks.push({ name: "cuda", ok: lines.CUDA === "yes", detail: lines.CUDA ?? "unknown" });
  } catch (err) {
    checks.push({ name: "wsl", ok: false, detail: `WSL check failed: ${String(err)}` });
  }
  const ok = checks.every((c) => c.ok);
  return { ok, checkedAt: Date.now(), checks };
}

export async function getDoctorReport(force = false): Promise<DoctorReport> {
  if (!force && existsSync(DOCTOR_PATH)) {
    try {
      const cached = JSON.parse(readFileSync(DOCTOR_PATH, "utf-8")) as DoctorReport;
      if (Date.now() - cached.checkedAt < CACHE_MS) return cached;
    } catch { /* fall through to re-run */ }
  }
  const report = await runChecks();
  try {
    mkdirSync(SPLAT_LAB_ROOT, { recursive: true });
    writeFileSync(DOCTOR_PATH, JSON.stringify(report, null, 2), "utf-8");
  } catch { /* best effort */ }
  return report;
}
