import { createWriteStream } from "node:fs";
import { mkdir, writeFile, readdir, stat, readFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { classifyError } from "./errors.mjs";
import { collectEnvironment } from "./env.mjs";

const execFileAsync = promisify(execFile);

export async function writeEnvironmentSnapshot(runRoot, env) {
  const dir = path.join(runRoot, "environment");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "versions.txt"), JSON.stringify(env, null, 2));
  await writeFile(
    path.join(dir, "gpu.txt"),
    `${env.gpu?.detail || "unknown"}\n${env.driver?.detail || ""}\nmockMode=${env.mockMode}\n`,
  );
}

export async function exportDiagnosticsZip(runRoot) {
  const zipPath = path.join(runRoot, "diagnostics.zip");
  const env = await collectEnvironment();
  await writeEnvironmentSnapshot(runRoot, env);

  const archiverMod = await importArchiver();
  if (!archiverMod) {
    await writeFile(
      path.join(runRoot, "diagnostics-manifest.txt"),
      [
        "diagnostics.zip requires the optional 'archiver' package.",
        "Included instead: this folder's logs/, screenshots/, *.json, config.yml",
        `runRoot=${runRoot}`,
      ].join("\n"),
    );
    return { zipPath: runRoot, folderFallback: true };
  }

  const output = createWriteStream(zipPath);
  const archive = archiverMod.default("zip", { zlib: { level: 9 } });
  archive.pipe(output);

  const include = [
    "manifest.json",
    "config.yml",
    "run_stats.json",
    "validation.json",
    "error.json",
  ];
  for (const name of include) {
    const p = path.join(runRoot, name);
    try {
      await stat(p);
      archive.file(p, { name });
    } catch {
      /* skip */
    }
  }
  archive.directory(path.join(runRoot, "logs"), "logs");
  archive.directory(path.join(runRoot, "screenshots"), "screenshots");
  archive.directory(path.join(runRoot, "environment"), "environment");
  await archive.finalize();
  await new Promise((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
  });
  return { zipPath, folderFallback: false };
}

async function importArchiver() {
  try {
    return await import("archiver");
  } catch {
    return null;
  }
}

export async function openFolder(dir) {
  if (process.platform === "win32") {
    await execFileAsync("explorer.exe", [dir], { windowsHide: true });
    return;
  }
  await execFileAsync("xdg-open", [dir]);
}

export async function saveModelAs(src, dest) {
  const { copyFile } = await import("node:fs/promises");
  await copyFile(src, dest);
}

export async function listRunFiles(runRoot) {
  const names = await readdir(runRoot).catch(() => []);
  const out = {};
  for (const name of names) {
    out[name] = path.join(runRoot, name);
  }
  try {
    out.manifest = JSON.parse(await readFile(path.join(runRoot, "manifest.json"), "utf8"));
  } catch {
    /* ignore */
  }
  return out;
}
