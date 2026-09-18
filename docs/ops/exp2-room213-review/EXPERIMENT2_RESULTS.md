# Room 213 Experiment 2 — Review Package

**Human visual verdict: UNREVIEWED**

Do not treat this document as selecting a winner. Arm A vs Arm B is a controlled densify-policy comparison only.

## Identity

| Field | Value |
|---|---|
| Experiment date | 2026-09-17 (Modal run `ap-F6K6wtSXXOOqjuIEatCXXs`, train dirs `2026-09-17_201258` / `2026-09-17_201247`) |
| Source dataset | Room 213 Lab job `cecc2763` (X4-only) |
| Panos / views | 376 / 6016 |
| Recipe hash | `267bb0b4f11de51b1bcde6ba86060972bccb269f75738e16ff0b88b65e6c8498` |
| Source hash | `1753a05b9eef0262d075bf9dc81d8ce49e56cdb6ae88fb9a2e713f7b73b35c99` |
| Mask hash | `20daa8e25daa806411f45f24a434f81e16767402b413d436f3c5602735a8a2b6` |
| Pose hash | `f9b1bdb367ec5864f0c21c1cd77fd33b2a8fad6ca4a92a3821571db3ae6fa604` |
| Seed PLY hash | `5c24bd98d41607d493a95167512d9489f48783a7dd781f4b31acb80a5bab4416` |
| QA pose hash | `ee51124640e16c92ea2c48cf420719b77ab9c8a02ea996dc4ed849045f3fb37a` |
| Trainer path | `ns_train_wrap.py` → nerfstudio splatfacto (not a standalone gsplat trainer) |
| Nerfstudio | 1.1.5 |
| gsplat | 1.5.3 (CUDA ops: True) |
| torch | 2.5.1+cu124 |
| GPU | NVIDIA L40S |
| Seed / SH / bilateral | 42 / 3 / True |
| Resolution | 1280 |
| Max steps | 8000 |
| Start | step 0, no `--load-dir` |

## Historical resume finding (separate from Experiment 2)

This is **not** an Experiment 2 A/B result.

Historical Room 213 checkpoints `step-2250`, `step-6000`, and `step-30000` have **bit-identical** Gaussian tensors (`means`, `scales`, `quats`, `opacities`, `features_dc`, `features_rest`) at count **3,542,182**. Only `bil_grids.grids` changed. Nerfstudio 1.1.5 bound Adam to the original parameter objects, then checkpoint load replaced the live Gaussians without rebinding optimizers. Historical Room is **not** a converged 30k-step model. Real optimization stopped around step 2250.

Experiment 2 avoided that path: both arms started from scratch (`No Nerfstudio checkpoint to load, so training from scratch.`). Checkpoint Gaussian hashes **change at every save** on both arms.

## Experiment 2 A/B findings (densify policy only)

Changed variable: **`refine_stop_iter` only** (Arm A 500 vs Arm B 4300).

Visual verdict: **UNREVIEWED**. No winner.

### Exact Arm A effective config (`ROOM213_FROZEN_CONTROL`)

See `arm-a-effective-config.yaml`. Summary:

- `refine_stop_iter` / `stop_split_at`: **500**
- `pause_refine_after_reset`: requested 5515 → effective **250**
- CLI: `splatfacto --data /vol/inputs/cecc2763/views --output-dir /tmp/arm/ROOM213_FROZEN_CONTROL/train --max-num-iterations 8000 --machine.seed 42 --pipeline.model.sh-degree 3 --pipeline.model.sh-degree-interval 266 --pipeline.model.cull-alpha-thresh 0.001 --pipeline.model.cull-scale-thresh 0.15 --pipeline.model.densify-grad-thresh 0.0002 --pipeline.model.stop-split-at 500 --pipeline.model.use-bilateral-grid True --pipeline.model.use-scale-regularization True --pipeline.datamanager.cache-images cpu --pipeline.datamanager.cache-images-type uint8 --pipeline.datamanager.masks-on-gpu False --logging.local-writer.enable True --logging.steps-per-log 50 --steps-per-save 750 --save-only-latest-checkpoint False --steps-per-eval-batch 100000 --steps-per-eval-image 100000 --steps-per-eval-all-images 100000 --vis tensorboard`

### Exact Arm B effective config (`ROOM213_GROWTH_TEST`)

See `arm-b-effective-config.yaml`. Summary:

- `refine_stop_iter` / `stop_split_at`: **4300**
- `pause_refine_after_reset`: requested 5515 → effective **250**
- CLI: `splatfacto --data /vol/inputs/cecc2763/views --output-dir /tmp/arm/ROOM213_GROWTH_TEST/train --max-num-iterations 8000 --machine.seed 42 --pipeline.model.sh-degree 3 --pipeline.model.sh-degree-interval 266 --pipeline.model.cull-alpha-thresh 0.001 --pipeline.model.cull-scale-thresh 0.15 --pipeline.model.densify-grad-thresh 0.0002 --pipeline.model.stop-split-at 4300 --pipeline.model.use-bilateral-grid True --pipeline.model.use-scale-regularization True --pipeline.datamanager.cache-images cpu --pipeline.datamanager.cache-images-type uint8 --pipeline.datamanager.masks-on-gpu False --logging.local-writer.enable True --logging.steps-per-log 50 --steps-per-save 750 --save-only-latest-checkpoint False --steps-per-eval-batch 100000 --steps-per-eval-image 100000 --steps-per-eval-all-images 100000 --vis tensorboard`

### Explicit config diff

Frozen recipe keys are identical across arms (source/mask/pose/seed/views/resolution/SH/bilateral/optimizer/loss/GPU/seed/converter/QA poses).

Intended difference:

| Key | Arm A | Arm B |
|---|---|---|
| `refine_stop_iter` | 500 | 4300 |
| `schedule.stop_split_at_absolute` | 500 | 4300 |
| `arm_name` | ROOM213_FROZEN_CONTROL | ROOM213_GROWTH_TEST |

Other recorded (result, not input) differences: train runtime/cost/final count, export PLY hashes.

Unexpected non-variable drift: none in recipe fields.

SPZ conversion failed on **both** arms (`splat-transform@2.7.1` exit 1). PLY QA renders exist.

### Gaussian counts

| | Arm A | Arm B |
|---|---|---|
| Starting (seed / step 0 TB) | 209587 | 209587 |
| Checkpoint 750 | 209587 | 398446 |
| Checkpoint 1500 | 209587 | 1875171 |
| Checkpoint 2250 | 209587 | 3493750 |
| Checkpoint 3000 | 209587 | 5194222 |
| Checkpoint 3750 | 209587 | 6736680 |
| Checkpoint 4500 | 209587 | 7499239 |
| Peak | 209587 | 7499239 |
| Final (step 7999) | 209587 | 7499239 |

Arm A stayed at the SfM seed count for the entire run (densify window 250–500 only). Arm B grew until `stop_split_at=4300`, then count held at 7,499,239 while parameter hashes continued to change.

### Checkpoint hashes (early / middle / final)

Early = 750, middle = 3750, final = 7999. Full table in `checkpoint-hashes.json`.

**Arm A** — count 209587 at all three. Every listed tensor hash changed 750→3750 and 3750→7999.

| Tensor | 750 | 3750 | 7999 | changed 750→3750 | changed 3750→7999 |
|---|---|---|---|---|---|
| means | `d8a28c241533a9d6d73318348386173670a3395643a3a2fe9fb1119dd9fd96e4` | `6890294b70e36b0ee09eeb55069025b1079528d05e95573eedc2585b2cba4143` | `5779b9804b87178252656fab98bf8c63ed11a9449f1cd521ca3013b9a772fc3f` | true | true |
| scales | `be37bf22be93b49f4e2d50f2c0ee41522abbcd4f833685bb5283e9066f4d78fd` | `00beaf0732f90c30d8c4678f533eda4dfd13b258f5e0ad94857cb7756bd300d6` | `a17de62fc8c4b46708e32506ed72a4c77d2edcd9849775c8aff6ddd7347eefbd` | true | true |
| quats | `a2f1fdc31b4371e1472d52e790b568b1e47395c47965414f59656aed0276e9bd` | `45a728c443aafc9ec4a00c00d327e3111770bf96c49a41a299bd8e1e57fdd2ad` | `98bd5ad74d8dc808514e913665ba136d64a865b944c69a3d9d43b24da40bbff9` | true | true |
| opacities | `4482aaa4c8641e0168b3ae7c08c2f5418a1f9aa1865baca531bece04d5ff24bd` | `326ed2bcfaa51aa884ab231948441efc6d05e174e76862aced07e0e591378a15` | `c8b636fd3b2fde8ac990b0500020730778f1abdb0eb5510e6ad5441c8247b270` | true | true |
| features_dc | `e98204b787e6a84aaced00805ba14b3c544be5bb856aa546da099f3e62beaecd` | `41d7220a8d54eb4c6159c009ae6bd5aa15aa756888349c3afd61e50da9fce588` | `950cf0fcc2d4b2d9241b4bae9cda6cbda046173500686e31dcb61e8efd78544b` | true | true |
| features_rest | `093d9a01ac2f6e9c34c4c5acbb403eae79f00942364f678de8da30a5057ac7d3` | `d63d094326f162e9681bb14eca1e192c0b06dd24bb3ebaa405e62d5b84c5a6be` | `a3c327a5b3e2db486e7819892bc8b905441bbffc536b2b4cd5cdeb4c1fbf39bd` | true | true |

**Arm B** — count 398446 / 6736680 / 7499239. Every listed tensor hash changed 750→3750 and 3750→7999.

| Tensor | 750 | 3750 | 7999 | changed 750→3750 | changed 3750→7999 |
|---|---|---|---|---|---|
| means | `297aadb260e197389bd8fb2f50ae76577f9250428ebbf27e417857849e7f144b` | `7b62d11f1d4e6add2632e7fefe89cf52c6ebdec008fc04a569ba759a50bb2dd8` | `b523df194efe6aaae3192ebf181ae564424603d36d2b34d13173fd79544b7d48` | true | true |
| scales | `318a7709393eec2a7dcb0d6dac580262fcf7911173817b19461d64c441118d3f` | `14f7e595b76c612c7f6f2a8618e2bd2353b3c26079fef3447edc2bbb5b277a41` | `baa44d20a4f5404c49c3d56ea58527d5d73ff56c4eda3648116858ddef2973a5` | true | true |
| quats | `93b02b9deaa47573f4eec74543b98c41454f9886e3933132d547a09d72a3336b` | `6b03ab6a9ab5bb40120328a15f99ed0bb1fa331dffd8cd666dc708b04289efa3` | `6e83479f22367161d2fc6cb11e9ed1c0579eae3fdbef190028be614d4ea84e5d` | true | true |
| opacities | `69a2d3deac2faed3461e7dbe27357afb839e8b5f45f69bf43ae243e5f64d04d3` | `78d68ed7c63cd589692923e894d1fc85233a7977220083f879d870ebedd794e0` | `f4b81215c09af26a011cf9dcd4b5f3cb83256b4cd70b0ead0626af4903d83766` | true | true |
| features_dc | `43b4bda2d1618940836f6a45846a92fca0d6d1875d3c4279d9f0b592f67e657f` | `6a1a30a460433f893c4d3b822500f1b6a385bedf77f25fa9030cd87b5284f07e` | `9efcef38f0ef46fe14aabeafc1cccbddee3d385e8dc1e4cf1b28301b150702a3` | true | true |
| features_rest | `3b5211406717b1d0c28a98b0368ea0a5d9becb25d3819d18f5fd65461519085e` | `603176a6007ec09e201a6fc804c481746573e386da90e6eb70676c76fac17c38` | `9f0105f25a8f2d6cbd1bac402c554a537a0db239b35bbe21a35dad4af18a45b9` | true | true |

Confirmation: **tensors actually changed** on both arms. This is the opposite of the historical resume freeze.

### Loss / PSNR (train-view scalars, every 50 steps)

SSIM as a standalone series was **not logged**; loss is `l1+ssim`. Do not invent SSIM columns.

| | Arm A | Arm B |
|---|---|---|
| Step 0 loss | 0.2155221551656723 | 0.2155221551656723 |
| Step 0 PSNR | 13.906949043273926 | 13.906949043273926 |
| Final logged step | 7950 | 7950 |
| Final loss | 0.07024931907653809 | 0.13162201642990112 |
| Final PSNR | 20.76909637451172 | 15.370576858520508 |
| Peak GPU memory (MB) | 5129.65234375 | 15157.3232421875 |

Full series: `arm-a-metrics.csv`, `arm-b-metrics.csv`.

### Was Arm B still materially improving at step 8000?

Train-view scalars from step 7000 to 7950: loss 0.08742443472146988 → 0.13162201642990112 (not decreasing), PSNR 14.933598518371582 → 15.370576858520508 (slightly increasing). These are single-image train metrics, not a visual verdict.

Count was already frozen after step 4300. Parameter hashes still changed 7500→7999, so optimization of the existing 7.50M Gaussians was not a no-op. Whether that is *material visual* improvement is **UNREVIEWED**.

### Runtime, cost, guards

| | Arm A | Arm B |
|---|---|---|
| Runtime | 1759.314 s (29.3 min) | 2415.958 s (40.3 min) |
| Cost | $1.4504 | $1.9917 |
| Hourly | $2.96784 | $2.96784 |
| Abort | None | None |
| Exit | 0 | 0 |

This valid run total: **$3.4421**. Guards: 10M Gaussians / 90 min / $15 — none tripped (Arm B peak 7,499,239).

Prior infra-failed launches (missing Open3D libs / missing gsplat CUDA) are **not** scientific results and are excluded from these metrics.

### Opacity fractions

Computed from ns-export PLY `opacity` (activated 0–1). Export count is lower than the live train count because `ns-export` culls some Gaussians. Not fabricated.

| Threshold | Arm A (export n=180452) | Arm B (export n=6952188) |
|---|---|---|
| < 0.001 | 0.0 | 0.0 |
| < 0.01 | 0.05864163323210605 | 0.03998769883668278 |
| < 0.05 | 0.2349655309999335 | 0.14073439901222465 |
| < 0.1 | 0.33826169840179104 | 0.1948409622984879 |

Train-time counts were 209587 (A) and 7499239 (B).

### Matched visual QA

Four composites, Arm A LEFT | Arm B RIGHT, identical camera / renderer / 1280 resolution / no per-arm auto-frame:

- `A_on_path.png`
- `B_off_path.png`
- `C_dollhouse.png`
- `D_overhead.png`

Labels only: `Arm A — refine stop 500` and `Arm B — refine stop 4300`. No BETTER/WORSE.

Historical three-way: Included. Same qa_pose_hash ee511246, same gsplat 1.5.3 rasterizer, same 1280 resolution, no auto-frame. Representative view: A_on_path.

Integrity record: `VALID_RUN_COMPLETE`.
