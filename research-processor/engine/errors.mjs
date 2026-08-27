/** Map engine stderr to a user-facing summary. Never hide the raw log. */

const RULES = [
  {
    id: "cuda_oom",
    title: "CUDA OUT OF MEMORY",
    test: /out of memory|cuda.*oom|CUDNN_STATUS_ALLOC_FAILED/i,
    advice: "Reduce quality from Standard/Research High to Preview (downsample 8).",
  },
  {
    id: "wsl_gpu",
    title: "WSL GPU NOT AVAILABLE",
    test: /could not load library.*cuda|no CUDA-capable device|NVIDIA-SMI has failed/i,
    advice: "Install a recent NVIDIA driver on Windows, then confirm nvidia-smi inside WSL.",
  },
  {
    id: "ext_build",
    title: "CUDA EXTENSION FAILED",
    test: /error: command.*ninja|nvcc fatal|undefined symbol.*_Z|failed building wheel/i,
    advice: "Rebuild ODGS-SLAM submodules with TORCH_CUDA_ARCH_LIST=8.6 after patches apply.",
  },
  {
    id: "ffmpeg",
    title: "FFMPEG FAILED",
    test: /ffmpeg.*(error|failed)|No such file or directory.*\.(mp4|png)/i,
    advice: "Confirm the input is a stitched 2:1 MP4 and FFmpeg is on PATH or in WSL.",
  },
  {
    id: "tracking",
    title: "ODGS LOST TRACKING",
    test: /lost tracking|tracking failed|not enough frames to evaluate/i,
    advice: "Try a longer/sharper section, Preview downsample, or inspect the operator in frame.",
  },
  {
    id: "disk",
    title: "INSUFFICIENT DISK SPACE",
    test: /no space left on device|ENOSPC/i,
    advice: "Free 100–200 GB on the NVMe used for jobs. PNG frame dumps are large.",
  },
  {
    id: "config",
    title: "MALFORMED CONFIG",
    test: /Unknown dataset type|KeyError|yaml\.scanner/i,
    advice: "Do not inherit the authors' synthetic eval YAML. Use the generated real-capture config.",
  },
];

export function classifyError(text) {
  const blob = String(text || "");
  const hit = RULES.find((rule) => rule.test.test(blob));
  if (!hit) {
    return {
      id: "unknown",
      title: "PROCESSING FAILED",
      advice: "Open View Technical Details and export diagnostics.",
      raw: blob,
    };
  }
  return { id: hit.id, title: hit.title, advice: hit.advice, raw: blob };
}
