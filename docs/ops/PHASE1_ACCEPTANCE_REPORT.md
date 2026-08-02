# Twin 360 Phase 1 acceptance report

Run date: 2026-08-01/02 (local UTC-7)  
Branch: `claude/phase1-acceptance`  
Reference interior PSNR: `28.97`  

This report records real-data behavior only. It does not promote
`colmap_pose_prior`, does not claim a visual pass, and does not claim that an
exterior model is production-ready.

## Acceptance matrix

| Run | Input | Job | Result | Key evidence |
|---|---|---|---|---|
| Exterior A / 1 | DJI Mavic 3 Enterprise, 380 JPG + `Timestamp.MRK` | `83a82e9c-f7ea-41ba-af33-f57dc47aa2e8` | Failed stale | DB marked it stale at 5% after 45 minutes; no callback or artifact |
| Exterior A / 2 | Same 380 JPG + same `Timestamp.MRK` | `a3d645a7-a827-483d-a489-0e719de6f8b7` | Cancelled after repeat failure | Worker was still at 5% feature extraction; no callback or artifact |
| Interior baseline | iPhone/LiDAR capture `e5d42523-4a94-4ed8-b7bb-ab9b4c395ad1` | `175c7560-a9f5-4f04-8e92-b69ebc134f83` | Completed | 214/218 registered; PSNR 25.526 |
| Interior pose prior / 1 | Same capture | `0217fe8f-1e45-4963-8244-60cb1df73414` | Worker aborted | COLMAP vocabulary-tree SSL error; no callback |
| Interior pose prior / 2 | Same capture | `26fcb621-4825-493c-9776-8e3392e07a04` | Worker aborted | Same deterministic SSL error; no callback |
| Interior pose prior / 3 | Same capture | `e3a9bcb8-cb84-47d0-8de2-888833ada8da` | Worker aborted | Same deterministic SSL error; no callback |
| Insta360 X4 | One selected row from duplicate capture `04fada9b-c678-47d9-bc38-10572e920bcc` | `1a89811b-fd05-4e8b-bd35-ef304fabdae6` | Completed | 167/167 registered; PSNR 21.908 |

All exterior jobs were `photogrammetry_mesh` with `glb` output requested.
The exterior ingestion created capture `b98d2165-56ec-42ff-8c1c-90aef7622115`,
380 `drone_photo` assets, and one ready `other` asset named
`DJI_202607150603_015_Timestamp.MRK`. The MRK was retained and included in
both dispatches.

## Completed interior baseline

- Model: `d3bb3957-6517-4f7e-a1f0-0abcea170f93`
- Storage format: SPZ; model status `ready`
- Frames: 218 total, 214 registered (98.17%)
- `trainPsnr`: `25.5260`, which is `3.4440` below the stated 28.97 reference
- Splat count: 445,327
- Scale: `scaleFactorApplied=0.472675`; scale residual `0.0540 m`
- Alignment: `colmap_vanilla`; `alignBackendFallback=null`
- Orientation: there is no literal `Y_UP_MEASURED` field, but
  `measuredOrientationApplied=true`, `orientationMethod=up`, and
  `gravityDataAvailable=true`
- Ready gates: PSNR, file size, and splat-count gates passed

The output is operationally viewable through the existing share route, but the
visual gate remains human-owned.

## Interior pose-prior A/B

All three requested pose-prior runs reached COLMAP feature extraction and then
failed at vocabulary-tree pairing. Modal logged:

```text
Curl SSL certificate error (code 77)
Failed to download file
terminate called after throwing an instance of 'std::invalid_argument'
SIGABRT
```

The failing download was:

```text
https://github.com/colmap/colmap/releases/download/3.11.1/vocab_tree_faiss_flickr100K_words256K.bin
```

Because the process aborts before the pose-prior adapter runs, none of these
three jobs has scale, orientation, PSNR, registration, or
`alignBackendFallback` evidence. The database rows remain `processing` when
the callback is bypassed; the Modal function calls were cancelled after the
failure was reproduced to prevent further GPU spend.

## Insta360 X4 run

- Selected source asset: `0a62646c-4ba2-4387-a4e5-c6f568d5cb62`
- The capture contains two duplicate video rows; only one was dispatched
- Model: `b93a6077-85ae-4372-99b3-29f30dd46b1a`
- Frames: 167 total, 167 registered (100%)
- `trainPsnr`: `21.9078`
- Scale: not applied; `scaleSkipped=no_lidar_poses`
- Orientation: `measuredOrientationApplied=false`
- Alignment: `colmap_vanilla`; `alignBackendFallback=null`
- `panorama_views=0` and `projectionCorrections=[]`

The real-data run completed, but the requested `.insv`/360-to-perspective
chain is not proven by retained evidence. The two R2 objects for this capture
are both `.mp4`; the asset rows are generic `video`, and capture metadata has
no measured equirectangular hint. Therefore this is a successful Gaussian
run, not a verified Insta360 projection acceptance.

## Exterior runs

Both requested exterior attempts produced no callback and no R2 derivatives:
GLB, JPEG orthomosaic, GeoTIFF orthomosaic, elevation GeoTIFF, LAS, DEM, and
QC JSON were all absent under their model prefixes.

The first worker log shows that the product path did execute real COLMAP work:
feature extraction, spatial/sequential matching, mapper, sparse
reconstruction, image undistortion, and then patch-match stereo. The database
stale-job rule marked it failed at 45 minutes while the detached worker was
still processing. The second attempt reproduced the long-running behavior
during feature extraction and was cancelled after the first attempt had
already established the failure mode.

Registered-image percentage, reprojection error, MRK fit, checkpoint RMSE,
GLB size, and derivative presence are therefore `N/A` for both attempts.

## R7.5 visual gate

The share route returned HTTP 200 for both completed models. Screenshots are
kept locally at:

- `.tmp/phase1-baseline-share.png`
- `.tmp/phase1-x4-share.png`

Observed baseline screenshot: the Slate360 share header and `Quick Scan —
Jul 4` label render, along with a `LOW CONFIDENCE` model badge and the viewer
controls. The central graphite viewport showed no visible model geometry in
the automated browser capture.

Observed X4 screenshot: the Slate360 share header and `Quick Scan — Jul 8`
label render, along with a `LOW CONFIDENCE` badge and the same viewer controls.
The central viewport again showed no visible model geometry in the automated
capture.

These observations are not a visual pass or fail. They are evidence for
Brian's required browser/real-device inspection; the automated capture may
also be affected by headless WebGL.

## Bugs and handoff blockers

1. **Pose-prior worker aborts before fallback/callback.** The pinned worker
   image cannot download COLMAP's vocabulary tree because its CA bundle is not
   trusted. Prebundle the vocabulary tree or fix `SSL_CERT_FILE` in the worker
   image, and ensure native aborts still transition the job to a terminal
   failure.
2. **Exterior orchestration timeout is shorter than the product path.** A
   380-image mission reaches dense reconstruction after the 45-minute stale
   threshold. Progress heartbeats, a realistic timeout, and cancellation
   propagation are required before judging exterior quality.
3. **360 source evidence is lossy.** The retained X4 capture has MP4 objects
   only, no `.insv` filename or measured equirectangular metadata, and the
   delivered metrics do not report a perspective extraction. Preserve the
   original source identity and emit explicit projection/360 QC fields.
4. **Visual output needs human verification.** The completed share pages load,
   but automated screenshots show no visible geometry. Do not call this a
   viewer acceptance until Brian inspects the models.
5. **Baseline quality is below the stated reference.** The completed baseline
   PSNR is 25.526 rather than 28.97. No promotion decision is justified from
   this run, and the pose-prior comparison has no usable measurements.

## Operational boundary

No Modal deploy, Trigger deploy, Vercel deploy, or environment-variable change
was made during Phase 1. The five failed/cancelled acceptance function calls
were stopped after evidence collection; no paid acceptance containers remain
active. No worker code was edited on the Phase 1 branch.
