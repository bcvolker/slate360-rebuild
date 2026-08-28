import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

function decodeMaybeUtf16(value) {
  if (Buffer.isBuffer(value)) {
    if (value.length >= 2 && value[1] === 0) {
      return value.toString("utf16le").replace(/^\uFEFF/, "");
    }
    return value.toString("utf8");
  }
  const text = String(value || "");
  if (text.includes("\u0000")) {
    return Buffer.from(text, "binary").toString("utf16le").replace(/^\uFEFF/, "");
  }
  return text;
}

async function run(cmd, args, opts = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      timeout: 15000,
      windowsHide: true,
      encoding: "buffer",
      ...opts,
    });
    return { ok: true, stdout: decodeMaybeUtf16(stdout), stderr: decodeMaybeUtf16(stderr) };
  } catch (err) {
    return {
      ok: false,
      stdout: decodeMaybeUtf16(err.stdout || ""),
      stderr: decodeMaybeUtf16(err.stderr || err.message || ""),
    };
  }
}

function statusFrom(ok, detail, extra = {}) {
  return { status: ok ? "READY" : "MISSING", detail, ...extra };
}

export async function collectEnvironment() {
  const nvidia = await run("nvidia-smi", [
    "--query-gpu=name,memory.total,driver_version",
    "--format=csv,noheader",
  ]);
  const wsl = await run("wsl.exe", ["--status"]);
  const wslList = await run("wsl.exe", ["-l", "-v"]);
  const ffmpegWin = await run("ffmpeg", ["-version"]);
  const ffmpegWsl = await run("wsl.exe", ["-d", "Ubuntu-22.04", "--", "ffmpeg", "-version"]);
  const ffmpeg = ffmpegWin.ok ? ffmpegWin : ffmpegWsl;
  const wslCuda = await run("wsl.exe", [
    "-d",
    "Ubuntu-22.04",
    "-e",
    "bash",
    "-lc",
    "nvidia-smi --query-gpu=name --format=csv,noheader",
  ]);
  const wslOdgs = await run("wsl.exe", [
    "-d",
    "Ubuntu-22.04",
    "-e",
    "bash",
    "-lc",
    "test -f ~/slate360-engines/odgs-slam/source/slam.py && echo ODGS_OK || echo ODGS_MISSING",
  ]);

  const gpuLine = nvidia.ok ? nvidia.stdout.trim().split(/\r?\n/)[0] : "";
  const [gpuName, vram, driver] = gpuLine.split(",").map((s) => s.trim());
  const wslInstalled = wsl.ok || /Ubuntu/i.test(wslList.stdout + wslList.stderr);
  const ubuntu = /Ubuntu/i.test(wslList.stdout + wslList.stderr);
  const odgsReady = /ODGS_OK/.test(wslOdgs.stdout);

  return {
    host: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    gpu: nvidia.ok
      ? statusFrom(true, gpuName || "NVIDIA GPU", { vram, driver })
      : { status: "MISSING", detail: "nvidia-smi not found (expected on the RTX 3090 desktop)." },
    driver: nvidia.ok ? statusFrom(true, driver || "present") : { status: "MISSING", detail: "No NVIDIA driver visible." },
    wsl2: wslInstalled
      ? statusFrom(true, "WSL responded")
      : { status: "MISSING", detail: "WSL is not installed. Use the Environment screen — requires Administrator + possible reboot." },
    ubuntu: ubuntu ? statusFrom(true, "Ubuntu distro listed") : { status: "MISSING", detail: "Ubuntu 22.04 not listed in wsl -l -v." },
    cudaWsl: wslCuda.ok
      ? statusFrom(true, wslCuda.stdout.trim())
      : { status: "MISSING", detail: "CUDA not visible inside WSL yet." },
    ffmpeg: ffmpeg.ok
      ? statusFrom(true, ffmpeg.stdout.split(/\r?\n/)[0])
      : { status: "MISSING", detail: "ffmpeg not on PATH. Will be installed inside WSL on the 3090." },
    odgs: odgsReady
      ? statusFrom(true, "slam.py found")
      : { status: "MISSING", detail: "ODGS-SLAM engine not installed in WSL (deferred until the 3090)." },
    spz: { status: "READY", detail: "@playcanvas/splat-transform@2.7.1 (npx)" },
    mockMode: !(nvidia.ok && wslInstalled && odgsReady),
    researchOnly: true,
    suggestedOutputRoot: existsSync("D:\\") ? "D:\\Slate360Research" : path.join(os.homedir(), "Slate360Research"),
  };
}
