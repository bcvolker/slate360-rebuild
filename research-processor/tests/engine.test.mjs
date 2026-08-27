import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyPreset, JOB_SCHEMA, workingResolution } from "../engine/presets.mjs";
import { buildJob } from "../engine/job.mjs";
import { classifyError } from "../engine/errors.mjs";
import { validateReconstruction } from "../engine/validate.mjs";
import { buildRealCaptureYaml } from "../engine/odgs-config.mjs";
import { buildExtractArgs } from "../engine/ffmpeg.mjs";
import { wslCommand, parseJsonl } from "../engine/wsl.mjs";

describe("presets", () => {
  it("preview is conservative", () => {
    const p = applyPreset("preview");
    assert.equal(p.imageDownsample, 8);
    assert.equal(p.frameRate, 2);
    assert.equal(p.maxSeconds, 120);
  });
  it("8K downsample 8 is 960x480", () => {
    assert.deepEqual(workingResolution(7680, 3840, 8), { width: 960, height: 480 });
  });
});

describe("job", () => {
  it("marks ODGS research-only", () => {
    const job = buildJob({ projectName: "House Walk", inputPath: "C:\\x.mp4" });
    assert.equal(job.schema, JOB_SCHEMA);
    assert.equal(job.licenseMode, "research-only");
    assert.equal(job.engine, "odgs-slam");
    assert.match(job.engineCommit, /^1efc06fc/);
  });
});

describe("errors", () => {
  it("maps CUDA OOM", () => {
    const e = classifyError("RuntimeError: CUDA out of memory. Tried to allocate");
    assert.equal(e.id, "cuda_oom");
  });
});

describe("validation", () => {
  it("fails missing ply", () => {
    assert.equal(validateReconstruction({ hasPly: false }).verdict, "FAIL");
  });
  it("fails collapsed trajectory", () => {
    const r = validateReconstruction({
      hasPly: true,
      gaussianCount: 8000,
      bounds: { min: [0, 0, 0], max: [8, 3, 6] },
      trajectorySpan: 0.01,
    });
    assert.equal(r.verdict, "FAIL");
  });
  it("does not claim metric scale", () => {
    const r = validateReconstruction({
      hasPly: true,
      gaussianCount: 8000,
      bounds: { min: [0, 0, 0], max: [8, 3, 6] },
      trajectorySpan: 4,
    });
    assert.equal(r.metric, false);
  });
});

describe("odgs config", () => {
  it("does not inherit synthetic eval yaml", () => {
    const y = buildRealCaptureYaml({ datasetPath: "/tmp/frames", saveDir: "/tmp/out", width: 960, height: 480 });
    assert.equal(y.includes("rgb_render_ex_r1"), false);
    assert.equal(y.includes("use_wandb: false"), true);
    assert.equal(y.includes("use_gui: false"), true);
    assert.equal(y.includes("sensor_type: monocular"), true);
  });
});

describe("ffmpeg + wsl", () => {
  it("starts png index at 0", () => {
    const args = buildExtractArgs({ inputPath: "in.mp4", outDir: "frames" });
    assert.equal(args.includes("-start_number"), true);
    assert.equal(args.includes("0"), true);
  });
  it("targets Ubuntu-22.04", () => {
    const c = wslCommand("echo hi");
    assert.deepEqual(c.args.slice(0, 2), ["-d", "Ubuntu-22.04"]);
  });
  it("parses JSONL progress", () => {
    const ev = [];
    parseJsonl('noise\n{"stage":"tracking","frame":3}\n', (e) => ev.push(e));
    assert.equal(ev[0].stage, "tracking");
  });
});
