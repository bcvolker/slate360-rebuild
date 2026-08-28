#!/usr/bin/env bash
# Mirror workers/modal/phd-odgs-slam/worker.py on this WSL Ubuntu 22.04 box.
# Imperial College licence: non-commercial academic research only.
set -euo pipefail

ODGS_SHA="1efc06fc7ad5e9eb552da58daecac41a2d9a8cf3"
ROOT="${HOME}/slate360-engines/odgs-slam"
ODGS_DIR="${ROOT}/source"
VENV="${ROOT}/.venv"
export PATH="/usr/local/cuda/bin:/usr/lib/wsl/lib:${PATH}"
export CUDA_HOME="/usr/local/cuda"
export TORCH_CUDA_ARCH_LIST="8.6"
export CC=gcc
export CXX=g++
export WANDB_MODE=disabled
export PYOPENGL_PLATFORM=egl
export PYTHONUNBUFFERED=1

echo "nvcc=$(command -v nvcc)"
nvcc --version | tail -1
test -x "${VENV}/bin/python"
"${VENV}/bin/python" -c "import torch; assert torch.__version__.startswith('2.5.1'), torch.__version__"

cd "${ODGS_DIR}"
test "$(git rev-parse HEAD)" = "${ODGS_SHA}"

# Keep the pinned torch; requirements_general.txt lists unpinned torch.
grep -vE '^(torch|torchvision)$' requirements_general.txt > /tmp/odgs-req.txt
"${VENV}/bin/pip" install pyyaml scipy pillow
"${VENV}/bin/pip" install -r /tmp/odgs-req.txt

# Required ODGS patches (same as Modal worker).
cd "${ODGS_DIR}/submodules/simple-knn"
git apply --check ../simple-knn_glog-and-flt-limits.patch && git apply ../simple-knn_glog-and-flt-limits.patch || git apply --reverse --check ../simple-knn_glog-and-flt-limits.patch
cd "${ODGS_DIR}/submodules/diff-gaussian-rasterization"
git apply --check ../diff-gaussian-rasterization_glog-cstdint-and-lerpcpp20.patch && git apply ../diff-gaussian-rasterization_glog-cstdint-and-lerpcpp20.patch || git apply --reverse --check ../diff-gaussian-rasterization_glog-cstdint-and-lerpcpp20.patch
cd "${ODGS_DIR}/submodules/omni-gaussian-rasterization"
git apply --check ../omni-gaussian-rasterization_glog-and-cstdint.patch && git apply ../omni-gaussian-rasterization_glog-and-cstdint.patch || git apply --reverse --check ../omni-gaussian-rasterization_glog-and-cstdint.patch

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
print("diff_gaussian_rasterization_ok", DGR)
from omni_gaussian_rasterization import GaussianRasterizer as OGR
print("omni_gaussian_rasterization_ok", OGR)
PY

echo INSTALL_ODGS_OK
