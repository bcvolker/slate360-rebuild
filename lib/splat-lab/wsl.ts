/** WSL path + clean PATH helpers. Windows PATH has `Program Files (x86)`
 * parens that break bash, so the runner never inherits it. */

export const WSL_DISTRO = process.env.SPLAT_LAB_WSL_DISTRO || "Ubuntu-22.04";
export const WSL_PYTHON =
  process.env.SPLAT_LAB_PYTHON ||
  "/home/rian_/slate360-engines/nerfstudio/.venv/bin/python";
export const WSL_REPO = process.env.SPLAT_LAB_WSL_REPO || "/mnt/c/s360";
export const WSL_COLMAP_BIN =
  process.env.SPLAT_LAB_COLMAP_BIN ||
  "/home/rian_/slate360-engines/colmap-4.1.0/bin";
export const WSL_COLMAP_ROOT =
  process.env.SPLAT_LAB_COLMAP_ROOT ||
  "/home/rian_/slate360-engines/colmap-4.1.0";
// FAISS-format vocab tree for COLMAP >= 3.12's sequential/vocab-tree matchers.
// The legacy flann-based tree that ships with nerfstudio's data dir crashes
// COLMAP 4.1 ("Failed to read faiss index" — verified 2026-09-12). Fetched by
// scripts/splat-lab/fetch-vocab-tree.sh into WSL_COLMAP_ROOT.
export const WSL_VOCAB_TREE =
  process.env.SPLAT_LAB_VOCAB_TREE ||
  `${WSL_COLMAP_ROOT}/vocab_tree_faiss_flickr100K_words32K.bin`;
// User-local Node.js (no sudo needed — installed by scripts/splat-lab/install-node.sh).
// Root-caused 2026-09-12: the sanitized WSL PATH never included any Node.js,
// so `shutil.which("npx")` in stages/export.py always returned None and
// every export silently fell back to the raw, uncompressed .ply instead of
// running `npx @playcanvas/splat-transform` for a much smaller .spz/.sog.
export const WSL_NODE_BIN =
  process.env.SPLAT_LAB_NODE_BIN || "/home/rian_/slate360-engines/node/bin";

const CLEAN_PATH = [
  WSL_COLMAP_BIN,
  WSL_NODE_BIN,
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

// Trailing `;` matters: callers join this into a longer one-line command with
// plain spaces, and without it the next word (a `cd` target, a python path)
// gets swallowed as an argument to this `export` statement instead of
// starting its own command — root-caused 2026-09-12 (every real pipeline
// run failed with `export: '--quality': not a valid identifier` because the
// whole `python run.py --input ... --quality auto` invocation had been
// silently absorbed into this line's `export PYTHONIOENCODING=utf-8 ...`).
export function wslCleanEnv(): string {
  return `export PATH=${CLEAN_PATH}; export LD_LIBRARY_PATH=${CUDNN_LIBS}:$LD_LIBRARY_PATH; export PYTHONIOENCODING=utf-8;`;
}
