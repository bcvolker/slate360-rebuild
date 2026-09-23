# Spirula experimental worker — architecture note

Written before implementation. Starting Slate360 SHA: `a7b1c66c0871c4e41adb89d0d58dab86183a9665` (`origin/main`). Branch: `feature/spirula-worker-experimental` in worktree `C:\s360-spirula-worker`.

## What the production path already does

`twin.gaussian_splat` (`src/trigger/twin-gaussian-splat.ts`) is a short Trigger task. It loads `digital_twin_processing_jobs`, claims the row with `status = queued`, and POSTs the payload to `MODAL_TWIN_ENDPOINT` with `x-dispatch-token`. Modal's web endpoint (`reconstruct` in `workers/modal/twin-gaussian-splat/worker.py`) checks that token and `process_job.spawn`s a GPU container. The HTTP call returns a run id. Training is not tied to the request.

The GPU function reads and writes Cloudflare R2, posts progress, and signs a completion callback to `/api/digital-twin/jobs/callback` with `GPU_WORKER_SECRET_KEY`. That callback creates the customer model row. A failed callback is logged; artifacts are already on R2. Trigger retries can re-enter the task, and the claim (`eq status queued`) is what stops a second dispatch. Modal timeout on that worker is 7200s on an A10G.

## What this experiment reuses

Same shape: Trigger claim, authenticated Modal spawn, async GPU, R2 artifacts, signed callback, idempotent terminal callback.

## What it does not reuse

It does not insert into `digital_twin_processing_jobs`, does not call `MODAL_TWIN_ENDPOINT`, and does not hit `/api/digital-twin/jobs/callback`. Those paths publish customer models. This experiment has its own table, task id `spirula.experimental`, Modal app `slate360-spirula-experimental`, and callback route.

## Spirula pin

`harry7557558/spirula-studio` @ `e6d38a2a900bb1eddc73c68051cc625e88809c5f`.

No Claude final report on this machine names a different SHA. The older local clone at `C:\tmp\spirula-studio` is `fd1afca` from a 2026-09-22 inspection, not a benchmark record. The worker builds that exact commit as a CUDA CLI inside the image. Spirula source is not copied into this repository.

## Milestone 1 data flow

Prepared dataset prefix on R2 → checksums and COLMAP projection check → `spirula train` with warp off → master `splat.ply`, logs, metrics, checkpoint, center preview → R2 prefix that includes the experiment id → best-effort callback into `spirula_experimental_jobs`.

One active GPU container. Smoke profile only until a human runs the Room 213 command in the review. That command is not wired to launch.
