# GGPS on the desktop (PhD / research only)

**Do not copy this code into `workers/modal/` or any customer path.** License stack:
CC BY-NC 4.0 + Inria 3DGS non-commercial + OmniGS GPL-3.0. Cite `panolog2026`.
Same isolation rule as `workers/modal/phd-odgs-slam`.

GGPS does **not** live in this git repo (on purpose). Desktop Grok finds it on disk.

## Stills vs video

| Input | What GGPS trains on | What you must do first |
|---|---|---|
| **Stitched 360 stills** (equirect JPEG/PNG, 2:1) | Yes — native | Many frames from **different positions** (a walk), not one pano |
| **Stitched 360 video** (equirect MP4 from Insta360 Studio) | No, not directly | Extract stills (about 1–2 fps, keep sharp ones), then treat as stills |
| Raw `.insv` dual-fisheye | No | Stitch in Insta360 Studio first (horizon lock ON; tilt recovery / VR OFF) |
| One single 360 photo | Not enough | SfM needs overlap from a **path**. One pano is a textured sphere, not a walkable twin |

Their published outdoor scenes use **hundreds to thousands** of ERP stills plus an **openMVG** reconstruction. A room walk is smaller (dozens–hundreds of extracted frames) but still needs **poses** before training. Dropping files in is not enough until SfM has run.

**For the first contractor SKU, still use 2D iPhone → Postshot (L0).** GGPS is the PhD / 360-research trainer on the 3090.

## How the desktop gets the code (pick one)

### A. OneDrive (easiest if the desktop uses the same Microsoft account)

Laptop copy already is:

`C:\Users\bcvol\OneDrive\Desktop\ggps`

On the desktop, wait for OneDrive to sync **Desktop**, then the same path exists. Confirm:

```powershell
Test-Path "$env:USERPROFILE\OneDrive\Desktop\ggps\train_large.py"
```

### B. USB / robocopy from the laptop before you walk over

```powershell
# on the laptop — destination = USB drive letter
powershell -File scripts/research/copy-ggps-to-usb.ps1 -Dest E:\ggps
```

On the desktop, copy `E:\ggps` to `C:\research\ggps` (or keep it on the USB).

### C. Fresh clone (if OneDrive is off)

```powershell
git clone --recurse-submodules https://github.com/Insta360-Research-Team/GGPS.git C:\research\ggps
```

Datasets/pretrained PLYs (not required to start): https://huggingface.co/Insta360-Research/GGPS

Set a durable env var so every tool finds it:

```powershell
[Environment]::SetEnvironmentVariable("GGPS_ROOT", "C:\research\ggps", "User")
```

## What GGPS still needs besides the folder

NVIDIA GPU + CUDA toolkit matching PyTorch (3090 = sm_86, not their 5090 sm_120 sample).
Conda env as in their README, then compile `diff-gaussian-rasterization` and `simple-knn` with
`--no-build-isolation`. **WSL2 Ubuntu is the less painful way to run their bash scripts on Windows.**

They also need, per scene:

1. `images/` — ERP stills  
2. `reconstruction/` — openMVG `sfm_data.bin` / json + `colorized.ply`  
   (or skip DAP with `SKIP_DAP=1` but you still need SfM poses)

The drag-drop app (next doc) is supposed to wrap stitch-extract → SfM → train so you do not run those bash scripts by hand.

## Desktop Grok: build the drop app

After Grok is installed on the desktop, read and execute:

**[DESKTOP_GROK_GGPS_APP_PROMPT.md](DESKTOP_GROK_GGPS_APP_PROMPT.md)**
