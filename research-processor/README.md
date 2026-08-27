# Slate360 Research Processor V0.1

Local Windows research workstation for **ODGS-SLAM** (Imperial College licence: **non-commercial academic research only**). This package is isolated from production Twin / Trigger / customer jobs.

## What this is

A drag/drop UI + local engine that:

1. Accepts a **stitched 2:1 equirectangular MP4** (not raw `.insv`)
2. Runs Preview / Standard / Research High presets
3. Talks to ODGS-SLAM in WSL2 Ubuntu 22.04 via `wsl.exe` JSONL
4. Writes `point_cloud.ply` + `model.spz` (PlayCanvas splat-transform 2.7.1, SPZ v3)
5. Opens the result in an integrated Spark viewer (orbit / top / walk)
6. Captures screenshots and a diagnostics ZIP

On a machine **without** WSL/CUDA (this Lenovo laptop), Process runs in **mock mode** so the UI, logs, viewer, and folders can be tested. Reconstruction only happens on the RTX 3090 after WSL + ODGS are installed.

## Run on this PC (no Rust / no GPU)

```bat
cd research-processor
npm install
npm test
npm run start
```

Or double-click `Start-Slate360-Processor.cmd`.

- UI: http://127.0.0.1:1420
- Engine: http://127.0.0.1:8765

Paste the **full Windows path** to a stitched MP4 (browsers do not expose `File.path`). Dropping `.insv` is rejected.

## 3090 desktop — pull and continue

```bat
cd C:\s360
git fetch origin
git checkout research-processor-v0.1
git pull origin research-processor-v0.1
cd research-processor
npm install
npm test
npm run start
```

Then:

1. PowerShell: `nvidia-smi` (confirm RTX 3090)
2. Insta360 Studio: export clip `VID_20260821_165600_00_120.insv` as 2:1 MP4, stabilization **off**. Screenshot export settings.
3. Environment tab → follow `wsl --install -d Ubuntu-22.04` (Admin, possible reboot). Do **not** change the NVIDIA driver “just because.”
4. After Ubuntu exists, Cursor will clone ODGS-SLAM at commit `1efc06fc`, venv Python 3.10, PyTorch 2.5.1 cu124, `TORCH_CUDA_ARCH_LIST=8.6`, xvfb, **no `--eval`**.
5. Copy `wsl/s360-engine.sh` to `~/slate360-engines/odgs-slam/s360-engine.sh` and `chmod +x`.
6. Process → Preview → only clip 120.

Disable sleep during GPU jobs. Prefer 100–200 GB+ free on NVMe. Workspace: `D:\Slate360Research` if D: exists, else `C:\Slate360Research`.

## Tauri / NSIS

`src-tauri/` is scaffolded. This Lenovo has **no Rust**, so `tauri build` was not run here. On the 3090, after `rustup`:

```bat
cd research-processor
npm run tauri:dev
npm run tauri:build
```

NSIS `setup.exe` is **best-effort**. V0.1 acceptance is `npm run start` (or the `.cmd`), not the installer. Do not silently install WSL/CUDA from the bundle.

## Engine contract

- ODGS commit: `1efc06fc7ad5e9eb552da58daecac41a2d9a8cf3`
- Real-capture YAML from `engine/odgs-config.mjs` — **does not** inherit `rgb_render_ex_r1.yml`
- Never pass `--eval` (that flag forces W&B)
- Preview: ~2 fps, downsample 8, max 120 s
- PLY is archival; SPZ is for the viewer

## Not in V0.1

Raw `.insv` stitching, SAM, high/low fusion, LiDAR registration, DJI, R2 publish, production Trigger.
