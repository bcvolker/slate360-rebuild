# Prompt for Grok Build on the desktop — GGPS drop app

Paste the block below as the first *implementation* prompt on the **3090 desktop** after you have
read `docs/GROK.md`, `docs/GROK_DESKTOP_BOOTSTRAP.md`, and `docs/research/GGPS_ON_DESKTOP.md`.

Do not run this prompt on the laptop (no NVIDIA GPU).

---

```text
You are on Brian's WINDOWS DESKTOP (RTX 3090). Cwd is the slate360-rebuild clone on feat/grok-workspace.

GOAL
Build a local, research-only desktop app Brian can open and drag-and-drop stitched 360 media into, which then runs the GGPS / PanoLOG method that already lives on disk. Do not vendor GGPS into workers/modal or the Next.js app. Do not copy GGPS CUDA/Python into slate360-rebuild. Wrap it.

LICENSE
GGPS is CC BY-NC 4.0 + Inria 3DGS non-commercial + OmniGS GPL-3.0. The wrapper we write can be our code. The trainer it shells out to is PhD-only. Window title and logs must say "Research — not for customer jobs". Output PLY is for Brian's thesis / local inspect, not auto-ingest to production R2 unless he passes --i-understand-research.

FIND GGPS
Search in order: $env:GGPS_ROOT, $env:USERPROFILE\OneDrive\Desktop\ggps, C:\research\ggps. Require train_large.py. If missing, print the three copy methods from docs/research/GGPS_ON_DESKTOP.md and stop.

INPUTS (both)
- Folder or files of stitched equirect stills (jpg/png, ~2:1). Native GGPS input.
- Stitched equirect video (mp4 from Insta360 Studio). Not native — extract 1–2 fps with ffmpeg, drop blurry frames (variance / Laplacian), then treat as stills.
- Reject raw .insv (tell him to stitch first: horizon lock ON, tilt recovery and vibration reduction OFF).
- One single pano is not enough. Need a walk (many stations). If fewer than ~20 stills after extract, warn and refuse to train.

PIPELINE THE APP MUST RUN
1) Import drop → scene folder under %USERPROFILE%\ggps-jobs\<timestamp>\images
2) If video: ffmpeg extract
3) Spherical / panoramic SfM. Prefer OpenMVG if present; else COLMAP with an explicit equirect or rig-constrained model. Do not silently run vanilla pinhole COLMAP on cube faces (that is the production bug we are not repeating here).
4) Write reconstruction/ the way GGPS prepare_pano_scene.sh expects (or call that script from WSL if Ubuntu is installed). First version may SKIP_DAP=1 (no depth/sky).
5) Write a lonlat yaml from config_360/templates/lonlat_template.yaml with default_camera_type: 3, use_depth: False for v1.
6) Run coarse train_large.py (skip block partition for indoor / <200 frames; only run _c4 partition if he checks "large outdoor").
7) Show progress log, output PLY path, and a "Open folder" button.

UI
Native Windows is fine: Python + tkinterdnd2 or a tiny PowerShell + WinForms, or Tauri. Drag-drop target, Start, log pane. No web server. Installer not required; pythonw or a .bat on the Desktop named "GGPS Research Drop".

ENV
Do not compile CUDA in the wrapper. Document one-time: conda env PanoLOG, compile GGPS submodules for sm_86 (RTX 3090), WSL2 optional. The app should call that env's python.

DELIVERABLES IN THIS CLONE (research paths only)
- scripts/research/ggps-drop-app/  (our wrapper)
- docs/research/GGPS_DROP_APP.md   (how Brian opens it)
Do not import this from Trigger, Next.js, or workers/modal/twin-gaussian-splat.

Read docs/research/GGPS_ON_DESKTOP.md and docs/design/360_SPLAT_CHANGE_LIST.md before coding.
```
