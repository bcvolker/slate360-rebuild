# Slate360 Splat Lab — local Gaussian-splat pipeline runner

A local-first reimplementation of the AirVis Studio Gaussian-splat pipeline,
built from the same open-source components AirVis uses (COLMAP via Nerfstudio,
gsplat, PlayCanvas splat-transform, RTMDet-Ins-S for people masking). This is a
**desktop quality-evaluation tool** for the CEO — it is not shipped to mobile
users and is gated to local/development use only.

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
# 1. ffmpeg must be on PATH
ffmpeg -version

# 2. Run on a 360 video
python workers/local/splat-lab/run.py `
  --input "C:\Users\Brian PC\Desktop\Kitchen-AirVis-Test\highpass.mp4" `
  --output ./tmp/splat-lab-test `
  --is360 --fps 2

# 3. You should see frames extracted, then a `blocked` record for SfM
#    telling you to install nerfstudio.
```

## Install nerfstudio (unlocks SfM + training)

```powershell
pip install nerfstudio gsplat onnxruntime-gpu
# (CUDA wheels: follow https://docs.nerf.studio/quickstart/installation.html)
ns-process-data --help   # should now work
ns-train splatfacto --help
ns-export gaussian-splat --help
```

## People masking (the AirVis "Remove People" feature)

The RTMDet-Ins-S ONNX model used by AirVis is copied to:
`Desktop/AirVis-Study/third_party/models/rtmdet-ins-s-640.onnx`

Slice 2 will load it via `onnxruntime-gpu` and mask people before SfM. For now
the mask stage reports `blocked` with install instructions.

## Knobs (AirVis-derived field names)

| flag | default | notes |
|---|---|---|
| `--fps` | 2.0 | frame extraction rate |
| `--is360` | off | equirectangular 360 video |
| `--remove-people` | off | RTMDet people masking |
| `--resolution-limit` | 1.0 | image resolution scale limit |
| `--sh-degree` | 2 | spherical harmonics degree (0-3) |
| `--max-splats-millions` | 3.0 | splat cap |
| `--training-steps` | 30000 | training iterations |
| `--images-per-step` | auto | `clamp(ceil(cams/5000),1,64)` |
| `--preset` | classic | classic/lite/object/safe/conservative |

## Web UI

The Next.js UI lives at `app/(dashboard)/splat-lab/` and is gated to local dev
only (see `app/api/splat-lab/run/route.ts`). It drops a video, runs the runner,
streams progress, and shows the resulting .spz in the existing
`SplatViewerCore` component.
