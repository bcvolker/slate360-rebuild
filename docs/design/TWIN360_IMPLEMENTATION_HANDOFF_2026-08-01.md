# Twin 360 implementation handoff

This slice makes the highest-value reconstruction paths reachable from the
product. It does not claim that every sensor can already be fused into one
survey-grade scene.

## Implemented in this slice

### Exterior product contract

- `workers/modal/photogrammetry/product_worker.py` is a separate Modal worker.
- It uses the pinned COLMAP image with GPU SIFT, GPS spatial matching,
  sequential guided matching, GPU bundle adjustment, dense fusion, texturing,
  textured GLB conversion, orthomosaic, local DEM, and JSON QC output.
- The primary model is a GLB. Derivatives are stored beside it under the job
  model prefix.
- Georeferencing is explicitly `UNREGISTERED` until CRS/GCP/checkpoint
  processing is implemented and measured.
- `src/trigger/twin-photogrammetry.ts` dispatches `photogrammetry_mesh` jobs.
- `app/api/digital-twin/jobs/route.ts` now selects `glb` and this task for that
  job type.

### Interior pose-prior arm

- `workers/modal/twin-gaussian-splat/worker.py` installs `pycolmap==4.1.1`,
  mounts the existing alignment modules, accepts `alignBackend`, and adapts
  the COLMAP result into Nerfstudio `transforms.json`.
- `colmap_vanilla` remains the default. `colmap_pose_prior` is an A/B arm and
  falls back to vanilla when its correspondences or adapter fail.
- The adapter calls `image.cam_from_world()` as required by the current
  pycolmap API and reports registered image count and reprojection error.

### Ingest and evidence

- `.insv`, `.insp`, and `.s360depth` classification is explicit.
- All selected source files are probed for equirectangular dimensions.
- The measured 360 flag and capture ID survive single and multipart uploads.
- Duplicate LiDAR pose/PLY/depth assets fail loudly rather than silently
  selecting the first row.
- Native ARKit capture retains optional per-frame depth, confidence, and paired
  RGB JPEG evidence in the versioned `S360DEPTH1` stream.
- The worker validates this stream and reports counts under
  `qualityMetrics.depthEvidence`; it is not yet used for depth-supervised
  training.

### Share viewer truthfulness

- `TwinQualityBadge.tsx` now surfaces `VERIFIED`, `ESTIMATED`, `LOW CONFIDENCE`,
  or `UNREGISTERED` from delivered model QC instead of implying that every
  visible model is survey-accurate.
- The share route passes `quality_metrics` and `georef` into the viewer.

## Deployments completed

Exterior worker:

```text
https://bcvolker--reconstruct-exterior.modal.run
```

The production Vercel environment contains
`MODAL_PHOTOGRAMMETRY_ENDPOINT` with that value.

Trigger version `20260801.1` is deployed. The CLI version must match the
installed SDK for future deployments:

```powershell
$env:PYTHONIOENCODING = "utf-8"
npx trigger.dev@4.4.6 deploy
```

The Gaussian worker is also deployed at
`https://bcvolker--reconstruct.modal.run`. Its image includes Nerfstudio, CUDA
Torch, gsplat, and pycolmap.

## Validation already run

- `python -m py_compile` on all changed Python workers: pass.
- `python workers/modal/twin-gaussian-splat/test_depth_evidence.py`: pass.
- `python workers/modal/twin-gaussian-splat/test_pose_priors.py`: 28/28 pass.
- Synthetic pose-prior A/B: median camera-center error improved from 4.9533 m
  to 0.0591 m across five scenes. This validates the mechanism only.
- Textured PLY to GLB conversion smoke test: pass.
- `npx vitest run lib/digital-twin/twin-review-media.test.ts`: 4/4 pass.
- `npm run guard:architecture`: pass.
- `npm run build`: completed with existing warnings; Next build skips type/lint
  validation by project configuration.
- A scoped viewer typecheck reaches a pre-existing Spark JSX declaration error
  in `components/digital-twin/splat-viewer-scene.tsx`; no error was reported in
  the new quality-status module.

## Rerunnable acceptance data

Use the existing captures in this order:

1. ASU/DJI exterior set: submit as `photogrammetry_mesh`; require the product
   callback, GLB, orthomosaic, DEM, and QC JSON before comparing against
   DroneDeploy.
2. Existing iPhone ARKit capture: run once with `colmap_vanilla` and three times
   with `colmap_pose_prior`; compare registration, reprojection, scale,
   gravity/orientation, and the share viewer visually.
3. Existing Insta360 X4 source: verify `.insv` detection, perspective extraction,
   registration, and viewer output. Do not treat a successful upload as a
   quality pass.

The missing acceptance evidence is physical-device/TestFlight verification and
the human visual comparison. Those cannot be proven by local tests.

## Deliberately not promoted yet

- `colmap_pose_prior` is not the production default.
- Native depth evidence is retained but not used to train splats.
- Exterior GPS is used for matching, not yet for survey-grade georeferencing.
- Orthomosaic/DEM/QC derivatives are stored but not yet first-class viewer tabs.
- ODM remains benchmark-only and must not be restored as the SaaS runtime.
- Multi-device federation, RoomPlan measurement layers, GCPs, LAS/LAZ/E57
  interop, and continuous collision geometry remain later gates.
