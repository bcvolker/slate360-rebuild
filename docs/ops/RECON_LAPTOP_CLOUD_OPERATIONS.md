# Room 213 reconstruction — laptop/cloud operations guide

This is the only guide needed to run Room 213 Experiment 3 from a machine that has never touched
the Lab desktop: GitHub access and Modal credentials are the entire dependency list. Nothing in
the launch, monitoring, or evaluation path reads from `C:\s360`, `C:\s360-recon-exp`,
`/mnt/c/s360*`, or any other desktop-only path — see "Desktop dependency audit" at the bottom of
`docs/ops/ROOM213_MASK_PROVENANCE_2026-09-17.md`'s companion handoff report for the full audit.

The canonical Room 213 input data already lives on the Modal volume `slate360-recon-experiments`
(`inputs/cecc2763.tar`, SHA-256 `adc72bf7b7b4446a3d39cbd3b7cb62c5769f703747f7fc2347cfd6d969a838b3`,
1.5 GiB) — you never download or re-upload it. Everything below runs against that volume.

## A. Clone / pull

```bash
git clone https://github.com/bcvolker/slate360-rebuild.git
cd slate360-rebuild
git checkout feature/recon-controlled-experiment-v1
git pull --rebase origin feature/recon-controlled-experiment-v1
```

Expected HEAD after the handoff commit referenced in this guide's own commit message (check with
`git log -1 --format='%H %s'`). If in doubt which commit is "current," `git log --oneline -5` on
`feature/recon-controlled-experiment-v1` should show `recon: finalize portable cloud experiment
handoff` at the top.

## B. Required local setup

- **Python 3.10+** (only stdlib + the `modal` package are required *locally* — nerfstudio/gsplat/
  torch/numpy/PIL live only inside the Modal container image, never on your machine).
- Install the Modal client:
  ```bash
  pip install modal
  ```
- Authenticate (opens a browser once; credentials persist afterward at `~/.modal.toml` or
  `%USERPROFILE%\.modal.toml`):
  ```bash
  modal setup
  ```
  or, if you already have a token: `modal token set --token-id <id> --token-secret <secret>`.
  Verify with:
  ```bash
  modal profile current
  ```
  It must print `bcvolker`.
- **WSL is not required.** Everything in this guide is plain `git` + `modal` CLI + a stdlib-only
  Python script; it runs the same from native Windows PowerShell, macOS, or Linux. (The Lab
  desktop happens to run its CLI through WSL for unrelated reasons — Experiment 3's own tooling
  has no WSL dependency.)
- No non-secret environment variables are required for the laptop side. Inside the Modal
  container, `R2_ENDPOINT`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` are read only by the unused
  `render_exp1` function (Experiment 1, not Experiment 3) via the `slate360-twin-worker` Modal
  Secret, which is already attached server-side — you never see or set these locally.

## C. Laptop smoke test

One command, no GPU, no training, no reconstruction changes:

```bash
python workers/recon-experiment/laptop_preflight.py
```

It checks, in order: git branch/HEAD (advisory only, never blocks), Modal authentication, the
canonical cloud input artifact + portable content hashes (via a CPU-only Modal dispatch that runs
the real `verify_inputs()` gate, seconds of runtime, no GPU), the Experiment 3 frozen recipe
(must carry the portable-hash correction record), and the Arm C vs Arm D resolved config diff
(must be `ok=true` with only `densify_grad_thresh` differing).

**Required output on success:**
```
LAPTOP_CLOUD_PIPELINE_READY
```
On any failure it prints `LAPTOP_CLOUD_PIPELINE_BLOCKED: <exact blocker>` and exits non-zero —
that line always names the specific thing that failed (e.g. "not authenticated", "Arm C/D diff
not ok=true", "missing qa/exp3-frozen-recipe.json").

## D. Experiment 3 launch

Only after `laptop_preflight.py` prints `LAPTOP_CLOUD_PIPELINE_READY`, and only when you intend to
actually spend the GPU budget (see §G for cost/guards):

```bash
cd slate360-rebuild
PYTHONIOENCODING=utf-8 modal run workers/modal/recon-experiment/worker.py --phase exp3
```

This re-checks the preflight diff one more time server-side, stages the frozen inputs (a no-op if
already staged — see `_ensure_inputs` in `worker.py`), then spawns **both** Arm C and Arm D on
L40S in parallel and blocks until both finish (or fail/abort). It prints both result manifests as
JSON (`status: needs_review`, `HUMAN_VISUAL_VERDICT: UNREVIEWED`) when done.

Nothing about this command differs based on which machine you run it from — Modal executes
entirely in the cloud; your laptop only needs to stay connected long enough to issue the command
and (optionally) watch it stream, per §E.

## E. Status / logs

- **Live run page** (also printed at launch): `https://modal.com/apps/bcvolker/main/<run-id>`.
- **List recent runs:**
  ```bash
  modal app list
  ```
- **Follow logs for a specific run:**
  ```bash
  modal app logs <app-id-or-name>
  ```
- **Inspect one arm's evidence while training or after it finishes** — Arm C and Arm D each get
  their own durable directory on the volume:
  ```bash
  modal volume ls slate360-recon-experiments experiments/room213-exp3/ROOM213_ARM_C_NO_GROWTH_CONTROL
  modal volume ls slate360-recon-experiments experiments/room213-exp3/ROOM213_ARM_D_DELAYED_GROWTH
  ```
  Each directory contains `result-manifest.json`, `effective-config.json`, `ns-train.log`,
  `gaussian-count.json`, `refine-log.json`, `checkpoint-hashes.json`, `opacity-stats.json`,
  `eval-summary.json`, and per-eval-step `qa/step-<n>/*.png` renders.
- **Pull a small evidence file to read locally** (avoid pulling checkpoints/PLYs — those are
  multi-GB and stay on the volume):
  ```bash
  modal volume get slate360-recon-experiments experiments/room213-exp3/ROOM213_ARM_C_NO_GROWTH_CONTROL/result-manifest.json ./arm-c-result.json
  ```

## F. Results

1. **Evaluation is automatic** — each arm's own run already executes `ns-eval` at steps 8000 and
   15999 against the held-out split and writes `eval-summary.json` + `eval/metrics-<step>.json`
   before the run returns (see `train_arm_exp3.run_arm`). Nothing further to run unless an arm
   `failed`/`aborted` before reaching an eval step, in which case re-launching that arm is a human
   decision (§G — Experiment 3 never auto-resumes).
2. **Retrieve small result artifacts:**
   ```bash
   modal volume get slate360-recon-experiments experiments/room213-exp3/ROOM213_ARM_C_NO_GROWTH_CONTROL/result-manifest.json qa/exp3-run/arm-c/
   modal volume get slate360-recon-experiments experiments/room213-exp3/ROOM213_ARM_D_DELAYED_GROWTH/result-manifest.json qa/exp3-run/arm-d/
   modal volume get slate360-recon-experiments experiments/room213-exp3/ROOM213_ARM_C_NO_GROWTH_CONTROL/eval-summary.json qa/exp3-run/arm-c/
   modal volume get slate360-recon-experiments experiments/room213-exp3/ROOM213_ARM_D_DELAYED_GROWTH/eval-summary.json qa/exp3-run/arm-d/
   ```
   **Do not** `modal volume get` an entire arm directory in one shot — checkpoints and PLYs live
   there too and are multi-GB; fetch named files only, per `compare_arms_exp3.py`'s expected layout.
3. **Build the matched visual comparison** (Arm C left | Arm D right, four QA views, both eval
   steps) once both arms' `qa/step-*/*.png` renders are pulled locally:
   ```bash
   modal volume get slate360-recon-experiments experiments/room213-exp3/ROOM213_ARM_C_NO_GROWTH_CONTROL/qa qa/exp3-run/ROOM213_ARM_C_NO_GROWTH_CONTROL/qa
   modal volume get slate360-recon-experiments experiments/room213-exp3/ROOM213_ARM_D_DELAYED_GROWTH/qa qa/exp3-run/ROOM213_ARM_D_DELAYED_GROWTH/qa
   python workers/recon-experiment/compare_arms_exp3.py qa/exp3-run
   ```
   This writes `qa/exp3-run/comparison/step-<n>/*.png` and `comparison.json`, with
   `HUMAN_VISUAL_VERDICT: UNREVIEWED` and no winner selected — that field only ever changes when a
   human actually looks at the renders and says so.
4. **Publish a review package to GitHub** — mirror the pattern already used for Experiment 2
   (`docs/ops/exp2-room213-review/`): create `docs/ops/exp3-room213-review/` containing a written
   `EXPERIMENT3_RESULTS.md`, the small JSON manifests/eval summaries/opacity stats, and the
   comparison PNGs only (never checkpoints, PLYs, or the source tar). Commit and push on
   `feature/recon-controlled-experiment-v1` (or open a PR) the same way the Experiment 2 package
   was committed in `docs/ops/exp2-room213-review/EXPERIMENT2_RESULTS.md`. Keep
   `HUMAN_VISUAL_VERDICT=UNREVIEWED` in every artifact until a human reviews the renders.

## G. Failure behavior

- **No resume, ever, for Experiment 3.** Both arms always start at step 0 (`resume: false` in the
  resolved config, no `--load-dir` in the train command). If an arm fails or aborts partway, its
  partial checkpoints and logs are preserved on the volume as evidence, but relaunching it is a
  fresh from-scratch run, and relaunching is a human decision — nothing in the pipeline
  auto-retries or auto-resumes an Experiment 3 arm. (This is deliberately different from the Lab's
  ordinary jobs, which do auto-restart on crash — Experiment 3's validity depends on a clean,
  unbroken step-0 run per arm.)
- **The 3.5M live-Gaussian hard guard** (`exp3.MAX_LIVE_GAUSSIANS`) is checked after every grow and
  every prune inside the corrected gsplat strategy patch, plus a 10-second heartbeat backstop. If
  tripped, that arm's `ns-train` process raises and exits non-zero; its evidence (checkpoints up to
  that point, `ns-train.log`, `refine-log.json` with the `EXP3_POPULATION_GUARD_TRIPPED` line) is
  still copied to `experiments/room213-exp3/<ARM>/` and its `result-manifest.json` status is
  `failed_population_guard`. There is also a 150-minute per-arm runtime guard and a $15 per-arm
  cost guard (`exp3.MAX_RUNTIME_S`, `exp3.MAX_COST_USD_PER_ARM`).
- **If one arm fails, the other is unaffected** — `train_arm_exp3.spawn()` is called for both arms
  independently in `worker.py`'s `main(phase="exp3")`; one arm's exception does not cancel the
  other's already-running container. The local entrypoint's final `.get()` calls will surface
  whichever arm failed in its own result dict while the other arm's full result (including a
  completed `needs_review` status) is still returned normally.
- **Where evidence persists:** always on the Modal volume, under
  `experiments/room213-exp3/<ARM_NAME>/`, regardless of whether the arm finished, failed, or
  tripped the population guard. Nothing about a failure deletes prior evidence — the durable copy
  step in `worker.py`'s `train_arm_exp3` function only replaces that *one arm's own* directory, not
  the sibling arm's or any prior experiment's.

---

Companion reading: `docs/ops/ROOM213_EXPERIMENT3_FINAL.md` (the canonical scientific protocol —
arm configuration, harness validity requirements, checkpoint/eval schedule) and
`docs/ops/ROOM213_MASK_PROVENANCE_2026-09-17.md` (why the launch aborted once before, and why the
data itself was never wrong).
