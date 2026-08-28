#!/usr/bin/env bash
set -euo pipefail
ROOT="${HOME}/slate360-engines/odgs-slam"
ODGS_DIR="${ROOT}/source"
VENV="${ROOT}/.venv"
export PATH="/usr/local/cuda/bin:/usr/lib/wsl/lib:/usr/sbin:/usr/bin:/bin"
export CUDA_HOME="/usr/local/cuda"
export TORCH_CUDA_ARCH_LIST="8.6"
export CC=gcc
export CXX=g++
export MAX_JOBS=4

cd "${ODGS_DIR}/submodules/simple-knn"
git apply --reverse --check ../simple-knn_glog-and-flt-limits.patch 2>/dev/null || git apply ../simple-knn_glog-and-flt-limits.patch
cd "${ODGS_DIR}/submodules/diff-gaussian-rasterization"
git apply --reverse --check ../diff-gaussian-rasterization_glog-cstdint-and-lerpcpp20.patch 2>/dev/null || git apply ../diff-gaussian-rasterization_glog-cstdint-and-lerpcpp20.patch
cd "${ODGS_DIR}/submodules/omni-gaussian-rasterization"
git apply --reverse --check ../omni-gaussian-rasterization_glog-and-cstdint.patch 2>/dev/null || git apply ../omni-gaussian-rasterization_glog-and-cstdint.patch

cd "${ODGS_DIR}"
"${VENV}/bin/pip" install --no-build-isolation submodules/simple-knn
"${VENV}/bin/pip" install --no-build-isolation submodules/diff-gaussian-rasterization
"${VENV}/bin/pip" install --no-build-isolation submodules/omni-gaussian-rasterization

"${VENV}/bin/python" - <<'PY'
import torch
print("torch", torch.__version__, "cuda", torch.version.cuda, "avail", torch.cuda.is_available())
print("device", torch.cuda.get_device_name(0))
import simple_knn
print("simple_knn_ok")
from diff_gaussian_rasterization import GaussianRasterizer as DGR
print("diff_gaussian_rasterization_ok")
from omni_gaussian_rasterization import GaussianRasterizer as OGR
print("omni_gaussian_rasterization_ok")
print("EXT_OK")
PY
