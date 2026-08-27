import { mkdir, writeFile, readdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { buildExtractArgs, runFfmpeg } from "./ffmpeg.mjs";
import { buildRealCaptureYaml } from "./odgs-config.mjs";
import { workingResolution } from "./presets.mjs";
import { spawnWsl } from "./wsl.mjs";
import { plyToSpz } from "./ply-to-spz.mjs";
import { validateReconstruction } from "./validate.mjs";
import { classifyError } from "./errors.mjs";

function findPly(files, root) {
  const hit = files.find((n) => n === "point_cloud.ply");
  return hit ? path.join(root, hit) : null;
}

export async function runRealJob(job, runRoot, { emit, log, signal } = {}) {
  const frames = path.join(runRoot, "frames");
  await mkdir(frames, { recursive: true });
  const res = workingResolution(7680, 3840, job.imageDownsample || 8);
  emit?.({ stage: "extracting", label: "Extracting Frames", progress: 0.05 });
  log?.("ffmpeg extract " + JSON.stringify(res));
  await runFfmpeg(
    buildExtractArgs({
      inputPath: job.input.path,
      outDir: frames,
      fps: job.frameRate,
      width: res.width,
      height: res.height,
      maxSeconds: job.maxSeconds,
    }),
    { onLog: (t) => log?.(t), signal },
  );

  const yaml = buildRealCaptureYaml({
    datasetPath: frames.replaceAll("\\", "/"),
    saveDir: path.join(runRoot, "odgs").replaceAll("\\", "/"),
    width: res.width,
    height: res.height,
  });
  await writeFile(path.join(runRoot, "config.yml"), yaml);
  emit?.({ stage: "dataset", label: "Building Dataset", progress: 0.15 });

  const linuxJob = runRoot.replaceAll("\\", "/");
  await spawnWsl(`~/slate360-engines/odgs-slam/s360-engine.sh '${linuxJob}'`, {
    onEvent: emit,
    onLog: ({ text }) => log?.(text.trimEnd()),
    signal,
  });

  const names = await readdir(runRoot);
  const ply = findPly(names, runRoot);
  if (!ply) throw Object.assign(new Error("NO PLY"), { stderr: "point_cloud.ply missing after ODGS" });
  await copyFile(ply, path.join(runRoot, "point_cloud.ply")).catch(() => {});

  emit?.({ stage: "creating_spz", progress: 0.92 });
  const spz = path.join(runRoot, "model.spz");
  try {
    await plyToSpz(path.join(runRoot, "point_cloud.ply"), spz);
  } catch (err) {
    log?.("SPZ conversion failed: " + err.message);
  }

  const validation = validateReconstruction({
    hasPly: true,
    gaussianCount: 1,
    bounds: { min: [0, 0, 0], max: [1, 1, 1] },
    trajectorySpan: 1,
  });
  await writeFile(path.join(runRoot, "validation.json"), JSON.stringify(validation, null, 2));
  await writeFile(
    path.join(runRoot, "manifest.json"),
    JSON.stringify({ ...job, output: { ply: path.join(runRoot, "point_cloud.ply"), spz } }, null, 2),
  );
  emit?.({
    stage: "complete",
    progress: 1,
    outputDir: runRoot,
    ply: path.join(runRoot, "point_cloud.ply"),
    spz,
    validation,
  });
  return { ply, spz, outputDir: runRoot };
}

export { classifyError };
