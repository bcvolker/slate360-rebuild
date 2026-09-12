/** WSL path + clean PATH helpers. Windows PATH has `Program Files (x86)`
 * parens that break bash, so the runner never inherits it. */

export const WSL_PYTHON =
  process.env.SPLAT_LAB_PYTHON ||
  "/home/rian_/slate360-engines/nerfstudio/.venv/bin/python";
export const WSL_REPO = process.env.SPLAT_LAB_WSL_REPO || "/mnt/c/s360";
export const WSL_COLMAP_BIN =
  process.env.SPLAT_LAB_COLMAP_BIN ||
  "/home/rian_/slate360-engines/colmap-4.1.0/bin";

const CLEAN_PATH = [
  WSL_COLMAP_BIN,
  "/usr/local/sbin",
  "/usr/local/bin",
  "/usr/sbin",
  "/usr/bin",
  "/sbin",
  "/bin",
].join(":");

const CUDNN_LIBS = [
  "/home/rian_/slate360-engines/nerfstudio/.venv/lib/python3.10/site-packages/nvidia/cudnn/lib",
  "/home/rian_/slate360-engines/nerfstudio/.venv/lib/python3.10/site-packages/nvidia/cublas/lib",
  "/home/rian_/slate360-engines/nerfstudio/.venv/lib/python3.10/site-packages/nvidia/cuda_runtime/lib",
].join(":");

export function toWslPath(winPath: string): string {
  const p = winPath.replace(/\\/g, "/").trim();
  const m = /^([A-Za-z]):(.*)$/.exec(p);
  if (m) return `/mnt/${m[1].toLowerCase()}${m[2]}`;
  return p;
}

export function wslCleanEnv(): string {
  return `export PATH=${CLEAN_PATH}; export LD_LIBRARY_PATH=${CUDNN_LIBS}:$LD_LIBRARY_PATH; export PYTHONIOENCODING=utf-8`;
}
