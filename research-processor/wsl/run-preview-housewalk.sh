#!/usr/bin/env bash
# One conservative preview reconstruction. Do not rerun on failure.
set -euo pipefail

ODGS_SHA="1efc06fc7ad5e9eb552da58daecac41a2d9a8cf3"
ODGS_DIR="${HOME}/slate360-engines/odgs-slam/source"
VENV="${HOME}/slate360-engines/odgs-slam/.venv"
WIN_SRC="/mnt/c/Users/Brian PC/Desktop/VID_20260821_165600_00_120_STITCHED_360.mp4"
WORK="${HOME}/slate360-data/housewalk/preview"
CAM="${WORK}/PanoramaCam"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%S)"
SAVE_PARENT="${WORK}/odgs-out"
export PATH="/usr/local/cuda/bin:/usr/lib/wsl/lib:/usr/sbin:/usr/bin:/bin"
export CUDA_HOME="/usr/local/cuda"
export TORCH_CUDA_ARCH_LIST="8.6"
export WANDB_MODE=disabled
export PYOPENGL_PLATFORM=egl
export MPLBACKEND=Agg
export PYTHONUNBUFFERED=1
export PYTHONPATH="${ODGS_DIR}"

test -f "${WIN_SRC}"
test "$(git -C "${ODGS_DIR}" rev-parse HEAD)" = "${ODGS_SHA}"

mkdir -p "${CAM}" "${SAVE_PARENT}" "${WORK}/logs"
if [[ ! -f "${WORK}/source.mp4" ]]; then
  echo "staging MP4 onto ext4 (read-only copy of Windows master)"
  cp -n "${WIN_SRC}" "${WORK}/source.mp4"
fi

echo "=== ffprobe staged copy ==="
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,bit_rate -show_entries format=duration,bit_rate,size -of json "${WORK}/source.mp4" | tee "${WORK}/logs/ffprobe.json"

PNG_COUNT="$(find "${CAM}" -maxdepth 1 -name '*.png' | wc -l)"
if [[ "${PNG_COUNT}" -lt 90 ]]; then
  echo "=== extracting 960x480 @ 2fps, start 0000.png ==="
  rm -f "${CAM}"/*.png
  ffmpeg -hide_banner -y -t 52 -i "${WORK}/source.mp4" \
    -vf "fps=2,scale=960:480:flags=lanczos" \
    -start_number 0 "${CAM}/%04d.png" 2> "${WORK}/logs/ffmpeg.log"
fi
ls "${CAM}"/0000.png "${CAM}"/0001.png
FRAME_COUNT="$(find "${CAM}" -maxdepth 1 -name '*.png' | wc -l)"
echo "frames=${FRAME_COUNT}" | tee "${WORK}/logs/frame_count.txt"
test "${FRAME_COUNT}" -ge 90
test ! -e "${CAM}/positions/PanoramaCam_positions.json"

CFG="${WORK}/config.yml"
cat > "${CFG}" <<YAML
# Generated for clip 120 preview. CONFIRMED: no --eval, no GT poses, no synthetic inherit.
inherit_from: ${ODGS_DIR}/configs/base_config.yml
Dataset:
  type: panorama
  sensor_type: monocular
  dataset_path: ${CAM}
  image_downsample: 1
  Calibration:
    width: 960
    height: 480
    fx: 240.0
    fy: 240.0
    cx: 480.0
    cy: 240.0
    k1: 0.0
    k2: 0.0
    k3: 0.0
    p1: 0.0
    p2: 0.0
    depth_scale: 1.0
    distorted: false
Results:
  use_gui: false
  use_wandb: false
  eval_rendering: false
  save_results: true
  save_trj: true
  color_refine: false
  save_dir: ${SAVE_PARENT}
Training:
  single_thread: true
  size_threshold: 20
  kf_remove_min_dist: 0.1
  kf_remove_similarity_threshold: 0.1
YAML

echo "=== ODGS-SLAM start ${STAMP} ===" | tee "${WORK}/logs/odgs.stdout.log"
nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv | tee "${WORK}/logs/nvidia_before.txt"

# Peak VRAM sampler
(
  echo "ts,memory_used_mib" > "${WORK}/logs/vram_trace.csv"
  while true; do
    nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits | awk -v t="$(date -u +%Y-%m-%dT%H:%M:%SZ)" '{print t","$1}' >> "${WORK}/logs/vram_trace.csv"
    sleep 2
  done
) &
VRAM_PID=$!

set +e
cd "${ODGS_DIR}"
"${VENV}/bin/python" /home/rian_/slate360-engines/odgs-slam/slam-headless.py --config "${CFG}" \
  >> "${WORK}/logs/odgs.stdout.log" 2> "${WORK}/logs/odgs.stderr.log"
ODGS_RC=$?
set -e
kill "${VRAM_PID}" 2>/dev/null || true
echo "odgs_exit=${ODGS_RC}" | tee "${WORK}/logs/odgs_exit.txt"
nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv | tee "${WORK}/logs/nvidia_after.txt"

find "${SAVE_PARENT}" -name 'point_cloud.ply' -o -name 'final_run_stats.json' -o -name 'trj_final.json' | tee "${WORK}/logs/artifacts.txt"
exit "${ODGS_RC}"
