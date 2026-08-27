import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { applyPreset, ENGINE_COMMIT, ENGINE_ID, JOB_SCHEMA } from "./presets.mjs";

export function resolveResearchRoot() {
  const candidates = ["D:\\Slate360Research", "C:\\Slate360Research", path.join(os.homedir(), "Slate360Research")];
  for (const dir of candidates) {
    const drive = path.parse(dir).root;
    if (drive && drive !== "\\" && !existsSync(drive)) continue;
    return dir;
  }
  return path.join(os.homedir(), "Slate360Research");
}

export function runDir(projectName, startedAt = new Date()) {
  const stamp = startedAt.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const safe = String(projectName || "untitled").replace(/[<>:"/\\|?*]+/g, "-").trim() || "untitled";
  return path.join(resolveResearchRoot(), "Projects", safe, "Runs", stamp);
}

export async function ensureRunLayout(root) {
  for (const rel of ["logs", "screenshots", "preview", "frames", "environment"]) {
    await mkdir(path.join(root, rel), { recursive: true });
  }
  return root;
}

export function buildJob({
  projectName = "Untitled",
  inputPath,
  captureType = "unknown",
  quality = "preview",
  studioExport = null,
} = {}) {
  const preset = applyPreset(quality);
  return {
    schema: JOB_SCHEMA,
    projectName,
    engine: ENGINE_ID,
    engineCommit: ENGINE_COMMIT,
    licenseMode: "research-only",
    mode: "phd-research",
    captureType,
    input: { path: inputPath, kind: "equirect_mp4" },
    ...preset,
    studioExport,
    createdAt: new Date().toISOString(),
  };
}
