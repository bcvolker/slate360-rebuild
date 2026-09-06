# GGPS Research Drop (desktop)

**Research — not for customer jobs.** Window title, logs, and this doc all say that on purpose.

Wraps the GGPS / PanoLOG trainer that lives **outside** this git repo. Does not copy GGPS CUDA/Python into `workers/modal`, Next.js, or Trigger. Cite `panolog2026`. License stack: CC BY-NC 4.0 + Inria 3DGS non-commercial + OmniGS GPL-3.0.

Product 360 splats are a later gsplat (Apache) path on Modal. First contractor SKU is still 2D iPhone → Postshot → `.spz`.

## Open it

```powershell
cd C:\s360-desktop
powershell -ExecutionPolicy Bypass -File scripts\research\ggps-drop-app\Install-DesktopShortcut.ps1
```

That puts **GGPS Research Drop** on the Desktop. Or double-click:

`C:\s360-desktop\scripts\research\ggps-drop-app\Launch-GGPS-Research-Drop.bat`

Drag stitched 360 stills or a stitched 360 mp4 onto the drop target, then **Start**. Jobs land in `%USERPROFILE%\ggps-jobs\<timestamp>\`.

## What you can drop

| Drop | What happens |
|---|---|
| Equirect JPEG/PNG (~2:1) from a **walk** | Copied to `images/`, blur-filtered, SfM, optional train |
| Stitched equirect **mp4** (Insta360 Studio) | ffmpeg 1–2 fps → stills, then same |
| Raw `.insv` | **Rejected** — stitch first (horizon lock ON, tilt/VR OFF) |
| One single pano | **Rejected** — need overlap from a path |
| Fewer than ~20 stills after filter | **Refuses to train** |

GGPS itself trains on stills only. Video is a capture container.

## Where GGPS lives

This desktop clone is `C:\research\ggps` (`GGPS_ROOT` user env). It is **not** in git. Finder order: `$env:GGPS_ROOT`, OneDrive `Desktop\ggps`, `C:\research\ggps`. Need `train_large.py`.

## Pipeline the app runs

1. Import → `%USERPROFILE%\ggps-jobs\<timestamp>\images`
2. Video → ffmpeg extract + Laplacian-ish blur drop
3. Spherical SfM in WSL Ubuntu: **OpenSfM spherical** (OpenMVG if you later drop a `reconstruction/`). Does **not** run vanilla pinhole COLMAP on cube faces.
4. Writes `reconstruction/` + `sparse/0/` the way GGPS expects (dummy PINHOLE + `default_camera_type: 3`)
5. `SKIP_DAP=1` (no depth/sky) for v1
6. Coarse `train_large.py` if conda env **PanoLOG** exists. Indoor / default: no `_c4` partition. Check **Large outdoor** only for campus-scale.

Output: `point_cloud.ply` under the job `output/` folder. **Open folder** in the UI. No auto-upload to production R2.

## One-time GPU env (not done by the wrapper)

WSL already sees the 3090 and has CUDA 12.6 + OpenSfM + COLMAP 4.1. There is **no** `PanoLOG` conda env yet, so the first runs will finish SfM and then tell you to create it. Do **not** compile CUDA from the wrapper.

In WSL Ubuntu, for the **3090 (sm_86)** — not their 5090 sm_120 sample:

```bash
conda create -yn PanoLOG python=3.9 pip
conda activate PanoLOG
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126
cd /mnt/c/research/ggps
pip install -r requirements.txt
export CUDA_HOME=/usr/local/cuda-12.6
export TORCH_CUDA_ARCH_LIST=8.6
pip install --no-build-isolation ./submodules/diff-gaussian-rasterization
pip install --no-build-isolation ./submodules/simple-knn
```

Then tick **Train after SfM** and Start again on an existing job, or re-drop.

## Isolation

- Wrapper: `scripts/research/ggps-drop-app/` (this repo)
- Trainer: `C:\research\ggps` (not git)
- Jobs: `%USERPROFILE%\ggps-jobs\`
- Do not import this from Trigger, Next.js, or `workers/modal/twin-gaussian-splat`
