#!/usr/bin/env bash
# Runs inside WSL Ubuntu 22.04. Invoked as:
#   wsl.exe -d Ubuntu-22.04 -- bash -lc "~/slate360-engines/odgs-slam/s360-engine.sh '<windows-run-dir>'"
set -euo pipefail
RUN_WIN="${1:?run directory required}"
RUN_LINUX="$(wslpath -u "$RUN_WIN" 2>/dev/null || echo "$RUN_WIN")"
ODGS_DIR="${HOME}/slate360-engines/odgs-slam/source"
VENV="${HOME}/slate360-engines/odgs-slam/.venv"
JOB="${RUN_LINUX}/job.json"

echo '{"stage":"preparing","progress":0.02}'
mkdir -p "${RUN_LINUX}/frames" "${RUN_LINUX}/odgs" "${RUN_LINUX}/logs"

if [[ ! -f "$JOB" ]]; then
  echo '{"stage":"error","error":{"title":"MISSING JOB","advice":"job.json was not written."}}'
  exit 1
fi

echo '{"stage":"extracting","progress":0.08}'
# Frame extract is driven from Windows FFmpeg when available; this script
# expects frames already present OR a sibling extract helper.
if [[ ! -f "${ODGS_DIR}/slam.py" ]]; then
  echo '{"stage":"error","error":{"title":"ODGS-SLAM MISSING","advice":"Finish engine setup on the RTX 3090."}}'
  exit 2
fi

echo '{"stage":"tracking","progress":0.2}'
# shellcheck disable=SC1091
source "${VENV}/bin/activate"
export PYTHONPATH="${ODGS_DIR}"
export WANDB_MODE=disabled
export PYOPENGL_PLATFORM=egl
xvfb-run -a python "${ODGS_DIR}/slam.py" --config "${RUN_LINUX}/config.yml" \
  2> "${RUN_LINUX}/logs/odgs.log" | tee "${RUN_LINUX}/logs/odgs.stdout.log"

echo '{"stage":"exporting","progress":0.9}'
PLY="$(find "${RUN_LINUX}" -name point_cloud.ply | head -n 1 || true)"
if [[ -z "$PLY" ]]; then
  echo '{"stage":"error","error":{"title":"NO PLY","advice":"ODGS finished without point_cloud.ply. See odgs.log."}}'
  exit 3
fi
cp "$PLY" "${RUN_LINUX}/point_cloud.ply"
echo "{\"stage\":\"complete\",\"progress\":1,\"ply\":\"${RUN_LINUX}/point_cloud.ply\"}"
