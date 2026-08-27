import { createWriteStream } from "node:fs";
import { mkdir, writeFile, copyFile, access } from "node:fs/promises";
import path from "node:path";
import { classifyError } from "./errors.mjs";
import { buildRealCaptureYaml } from "./odgs-config.mjs";
import { validateReconstruction } from "./validate.mjs";
import { workingResolution } from "./presets.mjs";

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("CANCELLED"));
    });
  });
}

const STAGES = [
  ["preparing", "Preparing"],
  ["extracting", "Extracting Frames"],
  ["dataset", "Building Dataset"],
  ["tracking", "Tracking"],
  ["mapping", "Mapping"],
  ["exporting_ply", "Exporting PLY"],
  ["creating_spz", "Creating SPZ"],
  ["validating", "Validating"],
];

/**
 * Simulated ODGS job so the UI can be exercised on a machine without WSL/CUDA.
 * Writes a real run folder + diagnostics. Copies the Spark sample SPZ when available.
 */
export async function runMockJob(job, runRoot, { emit, log, signal, sampleSpzUrl } = {}) {
  const logsDir = path.join(runRoot, "logs");
  await mkdir(logsDir, { recursive: true });
  const procLog = createWriteStream(path.join(logsDir, "processor.log"), { flags: "a" });
  const writeLog = (line) => {
    const row = `${new Date().toISOString()} ${line}`;
    procLog.write(`${row}\n`);
    log?.(row);
  };

  try {
    writeLog("MOCK MODE: WSL/ODGS not ready on this machine. Orchestration only.");
    writeLog(`job ${JSON.stringify({ quality: job.quality, input: job.input })}`);

    const yaml = buildRealCaptureYaml({
      datasetPath: path.join(runRoot, "frames").replaceAll("\\", "/"),
      saveDir: path.join(runRoot, "odgs").replaceAll("\\", "/"),
      width: 960,
      height: 480,
    });
    await writeFile(path.join(runRoot, "config.yml"), yaml);

    const totalFrames = Math.round((job.maxSeconds || 60) * (job.frameRate || 2));
    for (let i = 0; i < STAGES.length; i++) {
      if (signal?.aborted) throw new Error("CANCELLED");
      const [id, label] = STAGES[i];
      emit?.({ stage: id, label, progress: i / STAGES.length, frame: Math.min(totalFrames, i * 40), total: totalFrames });
      writeLog(`stage ${label}`);
      await sleep(400, signal);
    }

    const validation = validateReconstruction({
      gaussianCount: 0,
      hasPly: false,
    });
    validation.verdict = "WARNING";
    validation.flags = [
      {
        id: "mock_run",
        level: "WARNING",
        message: "Mock run on a machine without ODGS. No reconstruction was produced.",
      },
    ];

    const sampleDest = path.join(runRoot, "model.spz");
    let sampleNote = "no sample splat copied";
    try {
      const url = sampleSpzUrl || "https://sparkjs.dev/assets/splats/butterfly.spz";
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        await writeFile(sampleDest, buf);
        sampleNote = `copied diagnostic sample splat (${buf.length} bytes) so View tab can be tested`;
      }
    } catch {
      sampleNote = "sample splat download failed (offline?)";
    }

    const res = workingResolution(7680, 3840, job.imageDownsample || 8);
    const runStats = {
      mock: true,
      total_time_sec: null,
      quality: job.quality,
      workingResolution: res,
      note: "GPU timings will be filled on the RTX 3090.",
    };
    await writeFile(path.join(runRoot, "run_stats.json"), JSON.stringify(runStats, null, 2));
    await writeFile(path.join(runRoot, "validation.json"), JSON.stringify(validation, null, 2));
    await writeFile(
      path.join(runRoot, "manifest.json"),
      JSON.stringify(
        {
          ...job,
          mock: true,
          sampleSplat: sampleNote,
          output: {
            ply: null,
            spz: sampleDest,
          },
        },
        null,
        2,
      ),
    );

    emit?.({
      stage: "complete",
      label: "Complete (mock)",
      progress: 1,
      mock: true,
      outputDir: runRoot,
      ply: null,
      spz: sampleDest,
      validation,
    });
    writeLog("mock complete");
    procLog.end();
    return { mock: true, outputDir: runRoot, spz: sampleDest, ply: null, validation };
  } catch (err) {
    const classified = classifyError(err.message);
    await writeFile(path.join(runRoot, "error.json"), JSON.stringify(classified, null, 2));
    emit?.({ stage: "error", error: classified });
    procLog.end();
    throw err;
  }
}

export async function copyIfExists(src, dest) {
  try {
    await access(src);
    await copyFile(src, dest);
    return true;
  } catch {
    return false;
  }
}
