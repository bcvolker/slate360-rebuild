# Twin Metric Processor V1

Route C (KitchenAprilTags iPhone, 2026-08-31) is the reference truth. This job turns that pipeline into a repeatable Slate360 worker. Spatial Walkthrough, X4, and capture code were not touched.

## Architecture

```
.s360depth + lidar_poses.json  (required processing master)
optional: lidar_traj.jsonl, capture_manifest.json, RGB clips
preview_point_cloud.ply         (recorded, NEVER reconstruction truth)

        │
        ▼
Ingest validation (fail clearly)
        │
        ▼
Dense unproject  (conf ≥ medium, 0.25–5 m, no 500k cap)
        │
        ▼
TSDF 15 mm default (10 / 15 / 20 mm allowed)
        │
        ▼
Metric QA  (floor / gravity / AABB / components / holes / trajectory overlap)
        │
        ▼
Frozen-camera gsplat (Apache-2)  → raw appearance.ply then SPZ
        │
        ▼
geometry.glb + appearance.{ply,spz} + floor_slice.png + thumbnail.png
+ processing_manifest.json + qa.json
```

Geometry is measurement truth. Gaussian is appearance. Camera / center / scale optimization stay OFF. RGB-only is the baseline; RGB+ED depth loss is a feature flag (`--depth-loss` / `METRIC_DEPTH_LOSS=1`) and must not replace the baseline unless holdout PSNR+SSIM **and** floor residual all improve.

Cloud path matches the existing twin jobs: `POST /api/digital-twin/jobs` → Trigger `twin.metric_processor` → Modal `slate360-twin-metric-processor` (`process-metric`) → signed callback `/api/digital-twin/jobs/callback`.

Local RTX 3090 stays a first-class research path via `cli.py`.

Dependencies: Open3D (MIT), numpy, Pillow, gsplat 1.5.3 (Apache-2.0). No simple_knn, no CGAL/GPL.

## Exact local command

From `C:\s360` (WSL or a Python 3.11 env with numpy / open3d / pillow; add CUDA + gsplat for appearance):

```bat
wsl -e python3 workers/modal/twin-metric-processor/cli.py ^
  --depth "/mnt/c/Users/Brian PC/Desktop/Slate360Research/Projects/KitchenAprilTags/Runs/2026-08-31T16-45-route-c-iphone-metric/source_iphone/1788212997322_lidar_depth.s360depth" ^
  --poses "/mnt/c/Users/Brian PC/Desktop/Slate360Research/Projects/KitchenAprilTags/Runs/2026-08-31T16-45-route-c-iphone-metric/source_iphone/1788212997322_lidar_poses.json" ^
  --out /mnt/c/s360/tmp/metric-housewalk ^
  --voxel-mm 15
```

Appearance on the 3090 (25k steps, cameras frozen):

```bat
wsl -e python3 workers/modal/twin-metric-processor/cli.py ^
  --depth "<same .s360depth>" ^
  --poses "<same lidar_poses.json>" ^
  --out /mnt/c/s360/tmp/metric-housewalk ^
  --gaussian --steps 25000
```

Do not pass `--preview-ply` as a reconstruction source. If present it is logged as `point_cloud_preview` only.

## Exact cloud job path

1. Apply `supabase/migrations/20260831200000_metric_processor_job_type.sql` (adds `metric_processor` to `digital_twin_processing_jobs.job_type`).
2. Deploy Modal from the worker directory:

```bat
cd workers\modal\twin-metric-processor
set PYTHONIOENCODING=utf-8
python -m modal deploy worker.py
```

3. Put the printed HTTPS endpoint in `.env.local` as `MODAL_METRIC_ENDPOINT`, then:

```bat
npx vercel env add MODAL_METRIC_ENDPOINT production --value="<modal endpoint>" --no-sensitive --yes
```

4. Redeploy Trigger so it picks up `MODAL_METRIC_ENDPOINT` from `.env.local`:

```bat
set PYTHONIOENCODING=utf-8
npx trigger.dev@latest deploy
```

5. Enqueue (authenticated):

```http
POST /api/digital-twin/jobs
{
  "capture_id": "<uuid>",
  "job_type": "metric_processor",
  "output_format": "glb",
  "confirm_processing": true
}
```

Trigger task: `twin.metric_processor`. Modal app: `slate360-twin-metric-processor`, web label `process-metric`. Primary model key: `orgs/{org}/digital-twin/{space}/models/{jobId}/geometry.glb`. Appearance and QA live under the same prefix.

## Migration requirements

Additive only. New file: `supabase/migrations/20260831200000_metric_processor_job_type.sql`.

Re-states the current job_type allow-list and adds `metric_processor`. Does **not** edit asset_kind (lidar_traj already landed). `output_format=glb` is already allowed.

Brian applies via the Supabase Management API / `npx supabase db query --linked`. The job insert will fail on prod until this constraint is applied.

## Tests

Python (19 passed, WSL):

```bat
wsl -e bash -lc "cd /mnt/c/s360/workers/modal/twin-metric-processor && python3 -m pytest -q test_ingest.py test_dense_cloud.py test_qa_regression.py test_pipeline.py"
```

Vitest: `npx vitest run lib/twin/metric-processor-contract.test.ts` (3 passed).

Covered: magic/count/timestamp/intrinsics/clip-id/confidence failures; preview PLY is not master; unproject with no 500k cap; 0.25–5 m vs 8 m engineering range; TSDF 5 mm rejected; cameras frozen; depth-loss promotion requires appearance **and** metric gain; HouseWalk bands flag 500k / 12 mm / 12 PSNR as major regressions but allow a few percent of noise.

## Worker timings (Route C reference, not this implementation’s 3090 re-run)

From `ROUTE_C_METRICS.json` on the KitchenAprilTags capture (225 frames):

| Stage | Route C |
| --- | --- |
| Dense unproject | ~22 s |
| TSDF candidates (5/10/15/20 mm) | ~447 s total |
| Selected TSDF | 15 mm |
| Frozen gsplat 25k steps | holdout PSNR 23.46 / SSIM 0.800, peak VRAM 2235 MiB |

Production jobs write `timingsSec` into `qa.json` / `processing_manifest.json`. Synthetic CI captures are milliseconds; full HouseWalk numbers require the local command above.

## HouseWalk regression band

Production should stay reasonably close to:

- filtered points ≈ 9.38M
- TSDF 15 mm
- floor RMS ≈ 8 mm
- holdout PSNR ≈ 23.46
- SSIM ≈ 0.800

`regression.py` flags major deltas (points off by >8%, floor RMS off by >6 mm, PSNR off by >2, SSIM off by >0.05, or voxel ≠ 15 mm). It does **not** use wall clustering as pass/fail.

## Screenshots

Processor-emitted products (synthetic ingest, proves PNG write path):

- `docs/ops/twin-metric-processor/screenshots/floor_slice.png`
- `docs/ops/twin-metric-processor/screenshots/thumbnail.png`

Route C visual reference (KitchenAprilTags, not regenerated here):

- `docs/ops/twin-metric-processor/screenshots/housewalk_route_c_dense_floor_slice.png`
- `docs/ops/twin-metric-processor/screenshots/housewalk_route_c_tsdf_floor_slice.png`
- `docs/ops/twin-metric-processor/screenshots/housewalk_route_c_tsdf_dollhouse.png`

## What this is not

- Not a Spatial Walkthrough change.
- Not X4 registration.
- Not a capture-app change.
- Not a merge to `main`.
- Preview PLY is not a metric prior.
