# Local splat pipeline — Phase L0

Status: **ACTIVE** · 2026-09-06 · Branch `feat/grok-workspace`

**Laptop** = git and Grok chat. **Desktop (RTX 3090)** = Postshot training and ingest.
Copy `.env.local` to the desktop clone (see `docs/GROK_DESKTOP_BOOTSTRAP.md`). Never commit it.

Brian trains a photoreal Gaussian splat on the **desktop GPU** (Postshot), then this repo
uploads the `.spz` into Twin Studio and mints `/share/twin/[token]`. No Modal. No App Store.

Locked briefing: `docs/GROK_BUILD_HANDOFF_2026-09-06.md`. This file is the operator SOP for Phase L0.

The Spark viewer only loads **`.spz`**. A Postshot `.ply` will not open in the share page
(`resolveTwinViewerKind` treats `ply` as unsupported). Export SPZ from Postshot.

## 0. Machine check (run on the desktop)

```powershell
cd C:\s360-desktop   # or whatever clone path you used
Get-PnpDevice -Class Display | Format-Table Status, FriendlyName
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
ffmpeg -version
Test-Path .env.local
```

Need: NVIDIA 3090 visible, [Jawset Postshot](https://www.jawset.com/), FFmpeg on PATH,
`.env.local` copied from the laptop. Insta360 Studio is L1, not L0.

## 1. Capture (iPhone 2D — hero for first paid link)

Same rules as `TWIN360_CAPTURE_SOP.md`, stripped to 2D:

| Setting | Value |
|---|---|
| Camera | iPhone, **Camera app** (not Twin360 Quick Scan) |
| Format | 4K video, landscape |
| AE / WB | **Locked**. HDR off |
| Speed | Slow stroll, pause 1 s at corners |
| Heights | Two passes: chest + slightly higher |
| Length | 2–4 min, **close the loop** |
| Lighting | All lights on. No glass/mirrors as the subject |

Drone exteriors: **stills**, nadir grid + 30–45° facade orbits, ≥80% overlap. Same ingest after
Postshot. Do not shoot drone video for L0.

Front + rear action cams (chest/back, facing away from you) use this same 2D path. Luna Ultra
later. Not 360 video playback.

## 2. Extract frames (optional)

If you shot video, dump sharp-enough frames before Postshot. Skip if you already have stills.

```powershell
cd C:\s360-grok
node scripts/local-splat/extract-frames.mjs --video "D:\capture\room.mov" --out "D:\capture\frames" --fps 2
```

`--fps 1` in tight rooms, `2` for a slow walk. Discard obvious blur in Explorer before training.

## 3. Train in Postshot (manual)

1. New project → add the photo folder (or extracted frames).
2. Profile: default / indoor. Do not enable sky/environment hacks for interiors.
3. Train until the room is recognizable from inside (not an orbit of a fuzzy ball).
4. Export **SPZ** (compressed Gaussian). Keep the `.ply` as a local archive only.
5. If Postshot writes SPZ v4 and the web viewer fails, convert with the existing
   `scripts/ops/convert-spz-v4-to-v3.mjs` path after ingest, or re-export an older SPZ.

LichtFeld Studio / Brush are optional. Do not iterate quality on Modal.

## 4. Ingest + share link

```powershell
cd C:\s360-grok
node scripts/local-splat/ingest-splat.mjs --file "D:\capture\room.spz" --title "Kitchen 2026-09-06"
```

Optional: `--project "AOB205"` to attach the Twin space to a named project; otherwise the
newest active CEO-org project is used.

Writes:

- R2 `slate360-storage` key `orgs/{org}/digital-twin/{space}/models/{model}.spz`
- `digital_twin_spaces` + `digital_twin_models` (`model_format=spz`, `status=ready`)
- `digital_twin_share_tokens` row

Prints studio URL and share URL. Open the share on your **phone**. Gate: you would send it to
a GC without apologizing. If not, recapture — do not add pipeline code.

Token is also written to `tmp/local-splat-last-share.json` (gitignored). Do not commit it.

## 5. What this is not

- Not 360 video tours, not X4→splat (that is Phase L1), not LiDAR fusion, not Modal training.
- Not a new share system. Reuses `/share/twin/[token]` and Twin Studio spaces.
