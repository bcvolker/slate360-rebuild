# Twin Appearance Fidelity V1

Branch: `feature/twin-appearance-fidelity-v1` from `feature/twin-viewer-unblock-v2` @ `deddebf5`.
Main was not merged. Brush was not retrained. SfM / TSDF / AprilTag / `EXACT_FRAME_SIM3` values were not changed.

Harness: `/preview/twin-metric?job=79a4f0ac-32e9-4358-bda0-e1a7461510e1`
Local capture: headed Chromium 1440×900 against `http://127.0.0.1:3000` on 2026-09-01.
Raw JSON + screenshots: `docs/ops/twin-appearance-fidelity/`.

## Verdict

**PARTIAL**

Native Brush B is the live Reality asset. SIM3 is a Spark object transform, not a means bake. SH bands 1–3 are packed at 8 bits into Spark-compatible SPZ v3 and `extractSplats` is gone from the production splat loaders. Fridge, cabinets, and the kitchen opening are recognizable. Mode switches do not jump the camera. Desktop Reality FPS is above 24 on the capture GPU.

Not a full PASS: Spark LOD still reports `packedSplats.numSplats = 0` / `getNumSh() = 0` at runtime (known Spark LOD API hole), so SH3 survival is proven from the SPZ header + non-destructive load path + pictures, not from `getNumSh() === 3`. Native gsplat reference (A) and Spark-native-PLY (B) PSNR were not produced this session. Mobile FPS is desktop emulation only.

## Return table

| # | Item | Result |
|---|---|---|
| 1 | Appearance asset | `appearance-web.spz` (native X4 Brush B). Research-only leftover: `brush_x4_arkit.spz`. Master PLY untouched. |
| 2 | Asset bytes | **29,888,348** gzip SPZ v3 (uncompressed payload 43,702,636) |
| 3 | Primitive count | **672,348** (header + packer; 100% retained, NaN filter empty) |
| 4 | SH degree | **3** in NGSP header. Runtime Spark `getNumSh()` read **0** under LOD. |
| 5 | SIM3 is scene transform | **Yes.** `KITCHEN_SPLAT_WORLD_MATRIX = exactFrameSim3().matrix`. Geometry/nav/measurement stay S360_WORLD identity. Spark Rx(π) off. |
| 6 | No extractSplats rebuild | **Yes** in `MeshSplatLayer`, `splat-viewer-scene`, `DesktopSplatViewport`. Spark `lod/enableLod/extSplats/nonLod`. |
| 7 | Fixed-camera A/B/C | Fridge pose exact: `(0.72, 0.004836, -1.70)`, yaw `-0.85`. **A** native gsplat raster not run. **B** native PLY Spark not separately hosted. **C/D** = live Reality. Vs prior baked-web fridge screenshot: 23.5 dB (different load path/chrome; **not** an A/C score). |
| 8 | Reality FPS | **40.4** (headed Chrome, 1440×900, Intel iGPU ANGLE). ≥24 met; ≥30 met on this GPU. |
| 9 | Geometry FPS | **61.9** |
| 10 | Load timing | Marks: first-useful **2.12 s**, geometry **3.78 s**, appearance **6.45 s**. Wall 5 s screenshot is geometry. Appearance download **4.33 s**. |
| 11 | Screenshots/video | `docs/ops/twin-appearance-fidelity/screenshots/` + `kitchen-appearance-walk.webm` |
| 12 | Public URL | Vercel preview of this branch (see commit notes). |
| 13 | Branch SHA | recorded at push (`git ls-remote`). |
| 14 | PASS/PARTIAL/FAIL | **PARTIAL** |

## SIM3

Locked `EXACT_FRAME_T_X4_TO_ARKIT` is unchanged. Native Brush mean mapped by that matrix matches the baked research PLY mean to **< 2e-5 m**. Tag0 lands at `(0.608, 0.053, -1.685)`. The baked `brush_x4_arkit.ply/.spz` is research/reference only.

Pack options: `sh1Bits = 8`, `shRestBits = 8`, SPZ version **3** (Spark rejects v4), no opacity/scale prune.

## Spark raster

Appearance canvas: `blurAmount = 0`, `gl.antialias = false`, `toneMapping = NoToneMapping`, `outputColorSpace = SRGB`. `lodSplatCount` desktop = 672,348 for kitchen; generic viewers use Spark-native LOD budgets instead of 500k/150k rebuilds.

## Shell

`deddebf5` chrome kept: graphite first paint, Geometry first, Reality async, Help lower left, View + Tools lower right, mobile Move / View / More, no central stacked pills. Reality failure still leaves geometry on screen. NavigationRig does not fight the walk camera while inside.

## Performance notes

Capture GPU: `ANGLE (Intel, Intel(R) Graphics … D3D11)`, DPR 1, JS heap **314 MB**. Reality **40 FPS**, Hybrid **43 FPS**, Geometry **62 FPS**. Mobile viewport 390×844 was **emulated**; do not treat 60 FPS as a device result.

## How to recapture

```bat
node scripts/ops/pack-appearance-web-spz.py
node scripts/ops/upload-kitchen-proof-assets.mjs
node scripts/ops/capture-appearance-fidelity.mjs http://127.0.0.1:3000
```
