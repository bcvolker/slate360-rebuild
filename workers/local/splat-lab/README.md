# Slate360 Splat Lab — local Gaussian-splat pipeline runner

A local-first Gaussian-splat pipeline for Slate360, built from open-source
components (COLMAP via Nerfstudio, gsplat, PlayCanvas splat-transform, RTMDet-Ins-S
for people masking). This is a **desktop quality-evaluation tool** for the CEO —
it is not shipped to mobile users and is gated to local/development use only.

## Pipeline

```
input (video | folder)
  -> Stage 1 frames   (ffmpeg extract, REAL in Slice 1)
  -> Stage 2 sfm      (COLMAP via `ns-process-data`, stub until nerfstudio installed)
  -> Stage 3 mask     (RTMDet-Ins-S people masking, optional, stub)
  -> Stage 4 train    (`ns-train splatfacto`, stub)
  -> Stage 5 export   (`ns-export` -> .ply, `npx @playcanvas/splat-transform` -> .spz, stub)
  -> manifest.json
```

Each stage emits one JSON progress record per line to stdout:
```json
{"stage":"frames","status":"running","progress":0.0}
{"stage":"frames","status":"done","progress":1.0,"elapsed_s":12.3,"detail":"extracted 168 frames @ 2.0 fps"}
{"stage":"sfm","status":"blocked","detail":"nerfstudio not installed","error":"..."}
```

## Quick start (Slice 1 — frames only)

```powershell
# 1. ffmpeg must be on PATH (inside WSL it is at /usr/bin/ffmpeg)
# 2. Run on a 360 video (the web UI at /splat-lab does this for you)
python workers/local/splat-lab/run.py `
  --input "<video.mp4 or image folder>" `
  --output ./tmp/splat-lab `
  --is360 --fps 2
```

## Install nerfstudio (unlocks SfM + training)

```powershell
pip install nerfstudio gsplat onnxruntime-gpu
# (CUDA wheels: follow https://docs.nerf.studio/quickstart/installation.html)
ns-process-data --help   # should now work
ns-train splatfacto --help
ns-export gaussian-splat --help
```

## COLMAP compatibility note (Slice 2)

The local WSL env has COLMAP 4.1.0 (with CUDA) at
`/home/rian_/slate360-engines/colmap-4.1.0/bin/colmap`, but nerfstudio 1.1.5
passes the old option name `--SiftExtraction.use_gpu`, which COLMAP 4.x renamed
to `--FeatureExtraction.use_gpu`. This causes `ns-process-data` to fail at the
feature-extraction step.

Fix options (pick one — this is the next thing to solve for a fully-running
local pipeline):
1. Install a COLMAP 3.x build (compatible with nerfstudio 1.1.5's option names).
2. Upgrade nerfstudio to a version that supports COLMAP 4.x option names.
3. Patch nerfstudio's `process_data_utils.py` colmap command builder to use the
   new `--FeatureExtraction.*` names.

The job-store already adds the colmap bin to PATH (`SPLAT_LAB_COLMAP_BIN` env)
so once the version mismatch is resolved, SfM runs end-to-end. The cloud
Modal worker uses its own pinned COLMAP and does not hit this.

## People masking (the "Remove People" feature)

Uses the RTMDet-Ins-S instance-segmentation model. Place it at:
`workers/local/splat-lab/models/rtmdet-ins-s-640.onnx`

Slice 2 loads it via `onnxruntime-gpu` and masks people before SfM.

## Knobs (recommended defaults)

| flag | default | notes |
|---|---|---|
| `--fps` | 2.0 | frame extraction rate |
| `--is360` | off | equirectangular 360 video |
| `--remove-people` | off | RTMDet people masking |
| `--resolution-limit` | 1920 | image resolution limit in px |
| `--sh-degree` | 1 | spherical harmonics degree (0-3) |
| `--max-splats-millions` | 1.5 | splat cap |
| `--training-steps` | 7000 | training iterations |
| `--images-per-step` | 0 | 0 = auto: clamp(ceil(cameras/5000),1,64) |
| `--preset` | classic | classic/lite/object/safe |

## Web UI

The Next.js UI lives at `app/(dashboard)/splat-lab/` and is gated to local dev
only (see `app/api/splat-lab/run/route.ts`). It drops a video, runs the runner,
streams progress, and shows the resulting .spz in the existing
`SplatViewerCore` component.
