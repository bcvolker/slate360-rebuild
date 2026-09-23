# Experimental Spirula worker

Isolated Modal app. It does not import or deploy `slate360-twin-gaussian-splat`.

## Pin

- Repo: `https://github.com/harry7557558/spirula-studio.git`
- SHA: `e6d38a2a900bb1eddc73c68051cc625e88809c5f`
- Binary in the image: `/opt/spirula/bin/spirula`
- SHA file: `/opt/spirula/PINNED_SHA` (the process refuses to train if this differs)

## Image

- Base: `nvidia/cuda:12.4.1-devel-ubuntu22.04` with Python 3.11
- Apt: git, cmake, ninja-build, build-essential, python3, ca-certificates, pkg-config, libomp-dev
- Pip: boto3
- Build script copied into the image: `image_build.sh` (must contain the pin). It runs `bash build_develop.bash -DSS_BACKEND=cuda -DSS_BUILD_GUI=OFF -DTORCH_CUDA_ARCH_LIST=7.5 -DCMAKE_CXX_FLAGS="-include stddef.h"`
- CUDA arch `7.5` is T4. The image build has no GPU, so Spirula cannot detect one.
- The forced `stddef.h` include is a compiler flag in our script. GCC 11 rejects an unqualified `ptrdiff_t` in this pin. Spirula source is not edited.
- Backend file: `/opt/spirula/BACKEND` must read `cuda`
- Vulkan is not installed

Web accept path uses a separate image: `debian_slim` Python 3.11 plus `fastapi[standard]` and boto3. Accepting a POST does not boot the CUDA image.

## Runtime

- App: `slate360-spirula-experimental`
- GPU function: `T4`, timeout 40 minutes, `max_containers=1`
- Secret: existing `slate360-twin-worker` (read only; the twin worker file is not edited)
- Volume: `spirula-experimental-checkpoints`
- Endpoint label after deploy: `spirula-experimental`

## Deploy

From this directory, after the image build has succeeded once:

```powershell
$env:PYTHONIOENCODING = "utf-8"
python -m modal deploy worker.py
```

Set `MODAL_SPIRULA_EXPERIMENTAL_ENDPOINT` in `.env.local` to the printed web URL, then redeploy Trigger so `spirula.experimental` can see it. Do not point `MODAL_TWIN_ENDPOINT` at this app.

The smoke entrypoint does not deploy the web endpoint:

```powershell
python -m modal run worker.py::smoke --experiment-id spirula-smoke-v1
```

`profile=room213` returns 403. The Room 213 command in the review is not wired to launch.
