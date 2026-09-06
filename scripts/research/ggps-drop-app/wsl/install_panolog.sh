#!/usr/bin/env bash
# Idempotent PanoLOG env for GGPS on RTX 3090 (sm_86). Research only.
set -euo pipefail

GGPS="${GGPS_ROOT_WSL:-/mnt/c/research/ggps}"
PREFIX="${HOME}/miniconda3"
ENV_NAME="PanoLOG"
PY="${PREFIX}/envs/${ENV_NAME}/bin/python"
PIP="${PREFIX}/envs/${ENV_NAME}/bin/pip"
CUDA_HOME="${CUDA_HOME:-/usr/local/cuda-12.6}"
export CUDA_HOME
export PATH="${CUDA_HOME}/bin:${PATH}"
export TORCH_CUDA_ARCH_LIST="8.6"
MARKER="${HOME}/.panolog-ready"

echo "============================================================"
echo "PanoLOG install  (Research - not for customer jobs)"
echo "GGPS=$GGPS"
echo "CUDA_HOME=$CUDA_HOME"
echo "============================================================"

if [[ ! -x "${CUDA_HOME}/bin/nvcc" ]]; then
  echo "FAIL: nvcc missing at ${CUDA_HOME}/bin/nvcc"
  exit 1
fi
if [[ ! -f "${GGPS}/train_large.py" ]]; then
  echo "FAIL: GGPS not at $GGPS"
  exit 1
fi

if [[ ! -x "${PREFIX}/bin/conda" ]]; then
  echo "[1/5] miniconda"
  curl -fsSL -o /tmp/miniconda.sh https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
  bash /tmp/miniconda.sh -b -p "$PREFIX"
else
  echo "[1/5] miniconda already present"
fi

# shellcheck disable=SC1091
source "${PREFIX}/etc/profile.d/conda.sh"
conda config --set always_yes yes
export CONDA_PLUGINS_AUTO_ACCEPT_TOS=yes
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main || true
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r || true

if [[ ! -x "$PY" ]]; then
  echo "[2/5] conda env $ENV_NAME python=3.9"
  conda create -y -n "$ENV_NAME" python=3.9 pip
else
  echo "[2/5] env $ENV_NAME already present"
fi

echo "[3/5] PyTorch cu126"
"$PIP" install --upgrade pip
"$PIP" install torch torchvision --index-url https://download.pytorch.org/whl/cu126

echo "[4/5] GGPS python deps (no CUDA submodule isolation)"
cd "$GGPS"
"$PIP" install -r requirements.txt || {
  echo "WARN: full requirements failed; installing train-critical subset"
  "$PIP" install lightning plyfile numpy==1.26.2 tensorboard tqdm einops transforms3d imageio opencv-python==4.8.* joblib splines==0.3.0
}

echo "[5/5] compile rasterizer + simple-knn for sm_86"
"$PIP" install --no-build-isolation ./submodules/diff-gaussian-rasterization
"$PIP" install --no-build-isolation ./submodules/simple-knn

echo "[verify]"
"$PY" - <<'PY'
import torch
print("torch", torch.__version__, "cuda", torch.cuda.is_available(), "arch", torch.cuda.get_arch_list() if torch.cuda.is_available() else [])
if not torch.cuda.is_available():
    raise SystemExit("CUDA not visible to torch")
import diff_gaussian_rasterization, simple_knn
print("rasterizer ok")
print("gpu", torch.cuda.get_device_name(0))
PY

echo PANOLOG_READY > "$MARKER"
echo "PANOLOG_READY"
echo "python=$PY"
