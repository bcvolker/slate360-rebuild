#!/bin/bash
# Built into the CUDA image. The SHA must match pin.py.
# T4 is compute capability 7.5. Image builds have no GPU, so the arch is explicit.
set -euxo pipefail
PIN=e6d38a2a900bb1eddc73c68051cc625e88809c5f
git clone --filter=blob:none --depth 1 https://github.com/harry7557558/spirula-studio.git /opt/spirula-src
cd /opt/spirula-src
git fetch --depth 1 origin "$PIN"
git checkout FETCH_HEAD
test "$(git rev-parse HEAD)" = "$PIN"
bash build_develop.bash -DSS_BACKEND=cuda -DSS_BUILD_GUI=OFF -DTORCH_CUDA_ARCH_LIST=7.5 -DCMAKE_CXX_FLAGS="-include stddef.h"
mkdir -p /opt/spirula/bin
cp build_cuda/spirula /opt/spirula/bin/spirula
chmod 755 /opt/spirula/bin/spirula
git rev-parse HEAD > /opt/spirula/PINNED_SHA
printf '%s\n' cuda > /opt/spirula/BACKEND
