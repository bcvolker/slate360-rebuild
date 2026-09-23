# Spirula experimental worker — review

Branch `feature/spirula-worker-experimental` in worktree `C:\s360-spirula-worker`.
Starting SHA: `a7b1c66c0871c4e41adb89d0d58dab86183a9665` (`origin/main`).
Ending SHA: `d801655e630666b1fa8ec79817a5625bb590f1fa`
Remote branch: `origin/feature/spirula-worker-experimental`.

Spirula pin: `harry7557558/spirula-studio` @ `e6d38a2a900bb1eddc73c68051cc625e88809c5f`.
No Claude final report on this machine names a different SHA. The inspection clone at `C:\tmp\spirula-studio` is `fd1afca` and was not used.

The callback route and the migration are in this branch and are not deployed. Production Postgres was not changed.

## Audit identifiers

- Smoke command: `python -m modal run --detach worker.py::smoke --experiment-id spirula-smoke-v2` from `workers/modal/spirula-experimental`.
- Attempt `spirula-smoke-v1`: train reached step 4 on a T4, then SIGSEGV in `on_exit`. Resume was not accepted. STARTED lock remains. 13.3 s, about $0.0022.
- Attempt `spirula-smoke-v2`: train step 4, restore, resume to step 6. 15.5 s, about $0.0025. Combined ledger 28.8 s, about $0.0047, one trainer at a time.
- Resolved resume command: `/opt/spirula/bin/spirula train --data /tmp/spirula-smoke-v2/dataset --data-format colmap --output-dir-name smoke --disable-viewer true --keep-viewer-alive false --save-full-checkpoint true --load-depths false --load-normals false --warp-to-pinhole false --num-iterations 6 --cap-max 2000 --steps-per-save 2 --resume /tmp/spirula-smoke-v2/outputs/smoke`
- GPU/backend: Tesla T4, 15360 MiB, CUDA 12.4.1, arch 7.5, `/opt/spirula/BACKEND` = `cuda`. Crash report version `2026.9.20 (e6d38a2)`.
- Fresh storage read: `python fresh_validate.py` downloaded 27 objects into an empty temp directory. Dataset files match the manifest. Resume log terminal step is 6. `outputs/smoke/step-000000006.ckpt/state.tar` is present. Master PLY sha256 `ec4ae6bf569f9b693825dabc262cfad611abecfad4f22ccd0115f5059d9bae43`, 1861 bytes, 1 Gaussian, 65 float properties, no NaN/Inf. Integrity mismatches: none.
- Strict re-acceptance of v2 fails closed: `attempt.json` was not written by that run, and `status.json` does not store the process exit code. The exit code observed by the worker was `-11`. The crash text is in `logs/resume.log`. New runs write `attempt.json` and accept a SIGSEGV only after `accept_attempt` re-reads R2.

## SIGSEGV handling

A non-zero exit is not success inside the trainer process. `execute` returns `pending-acceptance` and leaves the durable status short of `completed`. `run_smoke` uploads, downloads that prefix into a new directory, and calls `accept_attempt`. Acceptance requires the attempt id, config hash, dataset hash, terminal step in the log, checkpoint directory for that step, a parseable finite PLY, crash text, and byte hashes from the storage read. The returned record keeps `exitCode` and the crash report. Any miss rejects the attempt. The STARTED object stays, so the rejection does not start a second trainer.

## Idempotency tests

`python -m unittest test_spirula_experimental.py test_idempotency.py` — 11 tests passed.

Covered: duplicate claim, simultaneous claim through one lock map, stale ACTIVE lock, preemption after ACTIVE release while STARTED remains, callback retry for completed/failed/cancelled/training, failed callback without a second spawn, cost ledger of the 13.3 s and 15.5 s attempts as one trainer, T4 241 minutes rejected, SIGSEGV accepted only when storage hashes match, wrong terminal step rejected, empty storage hashes rejected.

Max containers stays 1. Unapproved caps stay $5 and 4 hours. Automatic attempts stay bounded by the STARTED object.

Production reconstruction (`workers/modal/twin-gaussian-splat`), the UI vNext worktree, FullCircle artifacts, and Claude's benchmark outputs were not modified.

## Architecture

Slate360 Trigger task `spirula.experimental` claims a row in `spirula_experimental_jobs` while it is `queued`, then POSTs `{experimentId, profile:"smoke"}` to `MODAL_SPIRULA_EXPERIMENTAL_ENDPOINT` with `x-dispatch-token`. The Modal web function returns a call id. The GPU function is `run_smoke` on a T4, `max_containers=1`, timeout 40 minutes.

The GPU process checks the image SHA and `nvidia-smi`, builds a synthetic prepared package, validates it, runs the pinned `spirula` binary, parks the checkpoint on a Modal volume, uploads the experiment tree to R2, and signs a terminal callback. A failed callback does not delete those objects. `status.json` is uploaded on each transition.

This does not call `MODAL_TWIN_ENDPOINT` or `/api/digital-twin/jobs/callback`.

## Files Changed

- `trigger.config.ts` — adds `MODAL_SPIRULA_EXPERIMENTAL_ENDPOINT` to the Trigger env sync list
- `docs/ops/SPIRULA_WORKER_EXPERIMENTAL_ARCHITECTURE.md`
- `docs/ops/SPIRULA_WORKER_EXPERIMENTAL_REVIEW.md`
- `src/trigger/spirula-experimental.ts`
- `lib/spirula-experimental/enqueue.ts`
- `app/api/internal/spirula-experimental/jobs/route.ts`
- `app/api/internal/spirula-experimental/callback/route.ts`
- `supabase/migrations/20260923183000_spirula_experimental_jobs.sql` (prepared, not applied)
- `workers/modal/spirula-experimental/` — `worker.py`, `pin.py`, `storage.py`, `cost_guard.py`, `lifecycle.py`, `colmap_validate.py`, `package_validate.py`, `ply_validate.py`, `train_command.py`, `train_run.py`, `smoke_job.py`, `synthetic_dataset.py`, `preview.py`, `test_spirula_experimental.py`, `DEPLOY.md`

Spirula source is not in this tree. The image clones it at build time.

## Input Contract

A prepared directory with `manifest.json`:

- `experimentId`, `captureId`, `expectedImageCount`
- `lenses`: at least two filename prefixes
- `files`: relative paths and sha256
- `images/` plus `sparse/0/` (`cameras`, `images`, `points3D` as `.txt` or `.bin`)
- optional `projectTransform.scale` (must be 1 within 1e-3)
- JPEG EXIF orientation must be 1 when the tag is present

Paths containing `..` or an absolute path are rejected. Filenames and the two lens prefixes are kept. The smoke GPU entrypoint builds that package in the container. It does not download an operator COLMAP tree, so Room 213 files cannot be attached to this launch.

## Camera Validation

Before training, `validate_package` checks image count, two distinct fisheye camera ids, OPENCV_FISHEYE intrinsics, distortion parameter count, files on disk, and at least eight linked 2D–3D observations. Projection uses the COLMAP world-to-camera quaternion. Mean error above 1 px or max above 3 px fails the job. `det(R) < 0.5` fails as an axis inversion. A scale other than 1 fails. The synthetic fixture projects at well under 0.05 px.

Spirula's own camera dump is not invoked on the smoke path. The gate is the COLMAP projection check above, and training does not start if it fails.

## Container / GPU Backend

- Base: `nvidia/cuda:12.4.1-devel-ubuntu22.04`, Python 3.11
- Apt: git, cmake, ninja-build, build-essential, python3, ca-certificates, pkg-config, libomp-dev
- Pip on the GPU image: boto3
- Build script in the image: `image_build.sh`. It runs `bash build_develop.bash -DSS_BACKEND=cuda -DSS_BUILD_GUI=OFF -DTORCH_CUDA_ARCH_LIST=7.5 -DCMAKE_CXX_FLAGS="-include stddef.h"`
- CUDA arch `7.5` is the T4. The image build has no GPU, so Spirula cannot detect one.
- GCC 11 rejects an unqualified `ptrdiff_t` in this pin. The `-include stddef.h` flag is in our build script. The cloned tree is not edited.
- Built image `im-5Wn3kOxAkcE931iZM8aGT3` (about 79 minutes, one compile job).
- Binary: `/opt/spirula/bin/spirula`
- `/opt/spirula/PINNED_SHA` must equal the pin or the process refuses to train
- `/opt/spirula/BACKEND` must read `cuda`
- `nvidia-smi` must list a GPU. There is no CPU fallback.
- Vulkan, SfM, and SAM are not installed
- Web accept image: Debian slim Python 3.11, `fastapi[standard]`, boto3
- App: `slate360-spirula-experimental`
- Secret read: `slate360-twin-worker` (the twin worker file is not edited)
- Volume: `spirula-experimental-checkpoints`
- GPU: T4 only. The function does not request A10G, L40S, or A100.

## Job Lifecycle

`queued → preparing → validating → training → exporting → evaluating → completed`

`failed` and `cancelled` are reachable from the active states. The only exit from `failed` is an explicit edge back to `queued`. The API does not take that edge, so a failed experiment does not start another GPU by itself.

Trigger returns after Modal accepts the spawn. The GPU call is not an HTTP request from the browser. Progress is `status.json` on R2. The signed callback writes the terminal row. If the table is missing or the callback HTTP call fails, the R2 tree remains.

## Retry / Idempotency

- Database: `experiment_id` is unique
- Trigger: idempotency key `spirula-exp-${experimentId}` for 24h, and `retry.maxAttempts = 1`
- Dispatch skips unless the row is still `queued` and `config.profile` is `smoke`
- R2 object `experimental/spirula/<id>/STARTED` is created with `IfNoneMatch=*`. A second run of the same id returns skipped and does not train
- R2 object `experimental/spirula/ACTIVE_GPU` allows one active GPU claim
- Modal `max_containers=1`
- `profile` other than `smoke`, including `room213`, returns 403 from the web endpoint and the Next route

The STARTED object is not deleted on success or failure. A human would have to remove it before any repeat. That is intentional for this budget.

## Checkpoint / Resume

`save_full_checkpoint` is forced on. The smoke job trains 4 iterations, copies `outputs/smoke` to `persistent`, deletes the local output, copies it back, then runs a second process with `--resume` and 6 iterations. The resume log must contain `--resume`. The parked tree is also copied to the Modal volume `spirula-experimental-checkpoints/<experimentId>` and committed, so it survives the container.

Unit test `test_resume_roundtrip_with_fake_binary` covers that sequence with a stand-in binary. The T4 smoke `spirula-smoke-v2` covered the real binary: it resumed step 4 and finished step 6.

## Storage

Prefix: `experimental/spirula/<experimentId>/`

Kept there: `status.json`, `validation.json`, `cost.json`, `logs/`, `outputs/smoke/splat.ply`, `preview.png`, `thumbnail.png`, and `checkpoint/` from the parked tree. The master PLY is uploaded as the file Spirula wrote. This worker does not compress it.

## Cost Guards

Configured card (not a live invoice): T4 $0.59/h, L4 $0.80, A10G $1.10, L40S $1.95, A100 $3.73.

Smoke default: T4, 20 minutes expected, about $0.20, timeout 40 minutes (2×). Unapproved ceilings are $5 and 4 hours. The approval string is `BRIAN_APPROVED`. `cap_max` above 2000 raises unless the extra flag profile is `approved-train`, and no launch path sets that flag. The process is killed if wall time exceeds 2× the expected duration. Completion writes `actualSeconds` and `actualUsd` from the T4 rate times measured wall time.

## Output Validation

Exit code 0 is not enough. `inspect_ply` requires binary little-endian, properties `x y z f_dc_0 opacity scale_0 rot_0`, a count in range, and a body long enough for that count. Sampled positions and scales must be finite. `render_centers` projects Gaussian centers through the first fisheye camera and fails if none land in frame. That preview is a center scatter, not a shaded splat render. A failure in either check marks the job failed.

## Security / Auth

The enqueue route and the Modal web function require `x-dispatch-token` equal to `GPU_WORKER_SECRET_KEY` (timing-safe, fail closed). The callback requires `x-worker-signature` HMAC-SHA256 of the raw body, verified with the existing helper. The new table enables RLS and revokes `anon` and `authenticated`. There is no customer policy and no navigation entry.

## Smoke Test Results

Local, without a GPU:

- `python -m unittest test_spirula_experimental.py` — 6 tests passed.

GPU, experiment `spirula-smoke-v2`, Modal app `ap-5TW2lcQ8tlo9UujAYcnAur`:

- Image SHA file and crash report both say `e6d38a2` / version `2026.9.20 (e6d38a2)`.
- `nvidia-smi`: Tesla T4, 15360 MiB. Spirula listed `Tesla T4 (discrete, 14912 MB)`. Backend `cuda`.
- Prepared package: 2 images, two OPENCV_FISHEYE cameras, mean reprojection 0.0 px.
- Train advanced `4/4`, 1 splat, checkpoint `step-000000004.ckpt` (`splat.ply` + `state.tar`).
- That tree was deleted locally, restored, and resumed. Log: `Resumed from .../step-000000004.ckpt at step 4`, then `step 6/6`.
- Master `outputs/smoke/splat.ply` is on R2. Preview recorded 1 projected center. Status `completed`.
- Wall time 15.5 s, about $0.0025 at the T4 card rate. 27 objects under `experimental/spirula/spirula-smoke-v2/`.
- Signed callback returned HTTP 404 because the Next route is not deployed. The R2 tree was already written.
- `spirula-smoke-v1` is the earlier run that stopped on the same post-train signal before resume was allowed. Its STARTED lock is still in R2. It was not retrained.

Both processes print `Training complete` and then SIGSEGV inside an `on_exit` handler. The worker continues only when that line and a `step-*.ckpt` directory are both present. Room 213 was not launched.

## R2 object checksums

Prefix `experimental/spirula/spirula-smoke-v2/`. SHA-256 of the bytes returned by a fresh `get_object`.

| Object | SHA-256 |
| --- | --- |
| STARTED | `6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b` |
| checkpoint/config.json | `ba1f1e3f777cb27620de4d7800dd45485270965a3dfa0281fbc1bfe26a6970ba` |
| checkpoint/scene_transform.json | `458914a301aefbcb2a8ac7059e5edb1bf438c41739a88299161f6de17be6ea39` |
| checkpoint/step-000000004.ckpt/splat.ply | `1dbbd485ffd3af6e84b23644d066fc4acb0ebdcc3f9702a8a94b4c439e43aa01` |
| checkpoint/step-000000004.ckpt/state.tar | `92dcf90795299eb63352c2df55c064af4460415fb435c3269da5cef1a15a265d` |
| cost.json | `459625a89821e8b552b5293081464a05365063124fc11c900c889a791551a80a` |
| dataset/images/cam0/a.png | `66ca19e2d7c715d3d747908d791a229a9c783b1a8b61a7a31a517fe12ec77940` |
| dataset/images/cam1/a.png | `66ca19e2d7c715d3d747908d791a229a9c783b1a8b61a7a31a517fe12ec77940` |
| dataset/manifest.json | `6c1733e13a81b5ba41154fd6f0091e0850e045a42a02ad635ae8f759776c3618` |
| dataset/sparse/0/cameras.txt | `8b80fb15c9e13c5ac7b9f0e942ad3bfad91ed1a79dffbd9f2efbc2432219165f` |
| dataset/sparse/0/images.txt | `a2a1143b0c16886cbcd6bc49c6f6a3c8646ca5a3e85178e8835cd957e30f63bd` |
| dataset/sparse/0/points3D.txt | `f675047a218cbd6b0a70895dfc95c5ef71e9be010dd1307c13bf1e1856c5efc5` |
| logs/resume.log | `f019e40a73afb9c314132b0cfbfbf70ab1ec9c03257262b23b6cef4cc545ae4e` |
| logs/train.log | `a4a15081c809d6be61dbfd111c4d8e07095854040e0e08abf1617f0a92ddbec2` |
| outputs/smoke/config.json | `28ab025a735659ea73441b5fab2155dbd5f647650ef37e8829800246bf85dfc7` |
| outputs/smoke/scene_transform.json | `458914a301aefbcb2a8ac7059e5edb1bf438c41739a88299161f6de17be6ea39` |
| outputs/smoke/splat.ply | `ec4ae6bf569f9b693825dabc262cfad611abecfad4f22ccd0115f5059d9bae43` |
| outputs/smoke/step-000000006.ckpt/splat.ply | `ec4ae6bf569f9b693825dabc262cfad611abecfad4f22ccd0115f5059d9bae43` |
| outputs/smoke/step-000000006.ckpt/state.tar | `d1c3724345b83e108aa5b9531166880a6157f1d42a11c29e9c1789ebe375bed9` |
| persistent/config.json | `ba1f1e3f777cb27620de4d7800dd45485270965a3dfa0281fbc1bfe26a6970ba` |
| persistent/scene_transform.json | `458914a301aefbcb2a8ac7059e5edb1bf438c41739a88299161f6de17be6ea39` |
| persistent/step-000000004.ckpt/splat.ply | `1dbbd485ffd3af6e84b23644d066fc4acb0ebdcc3f9702a8a94b4c439e43aa01` |
| persistent/step-000000004.ckpt/state.tar | `92dcf90795299eb63352c2df55c064af4460415fb435c3269da5cef1a15a265d` |
| preview.png | `4248399f156571c3e909b7eb34f0b774987872f3c8061d8e429595fc49a34f94` |
| status.json | `d0b9753e9879dfb7e919c0986b3ad3e976263a23b179cc4363c925e9b28da4d9` |
| thumbnail.png | `4248399f156571c3e909b7eb34f0b774987872f3c8061d8e429595fc49a34f94` |
| validation.json | `25f130cc1df646525886bc973d83c519466f1e51a96d0f610dd8614a642ab63c` |

## Known Gaps

- The Next callback route returns 404 until that route is deployed. The migration `20260923183000_spirula_experimental_jobs.sql` is not applied. Neither was done for this freeze. R2 remains the durable record. A later Room 213 reproduction can be checked from R2 without the callback.
- `spirula-smoke-v2` cannot be re-accepted by the new gate because it has no `attempt.json` and its `status.json` omits the exit code. The fresh object checklist passed.
- This pin crashes in `on_exit` after `Training complete`.
- The GPU entrypoint builds a synthetic package. It does not download an operator COLMAP tree.
- Preview is projected centers, not a shaded Gaussian render.
- Vulkan was not set up.
- JPEG EXIF rejection is implemented and not covered by the PNG unit fixture.
- Claude's exact Room 213 argv was not found. Confirm it before anyone runs the command below.
- `spirula-smoke-v1` stays locked by its STARTED object.

## Exact UNEXECUTED Room 213 command

Do not run this. The worker returns 403 for that profile, and `argv()` refuses `cap_max` of 1000000.

```text
/opt/spirula/bin/spirula train \
  --data <prepared-colmap-dir> \
  --data-format colmap \
  --output-dir-name room213-spirula-1m \
  --disable-viewer true \
  --keep-viewer-alive false \
  --save-full-checkpoint true \
  --load-depths false \
  --load-normals false \
  --warp-to-pinhole false \
  --num-iterations 30000 \
  --cap-max 1000000 \
  --steps-per-save 2000
```

Confirm this argv against Claude's final Room 213 command before any full run. Do not pass `--quality` and do not use the `360-camera` preset. That preset turns on fisheye-to-pinhole warp.
