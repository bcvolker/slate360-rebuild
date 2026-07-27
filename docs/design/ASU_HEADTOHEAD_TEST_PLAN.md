# ASU head-to-head: our pipeline vs DroneDeploy — state, hypothesis, protocol

Status: **PROPOSED** · 2026-07-27 · Answers the four questions + protocol response.
Sources: `workers/modal/photogrammetry/worker.py`, `odm_runner.py`, and the ASU doc set.

---

## 1. Current pipeline state (answering Q1)

**Engine: COLMAP 4.1.0/4.1.1**, run as `colmap/colmap:latest` on Modal A10G. Not ODM, not
OpenMVS. Dense is COLMAP's own `patch_match_stereo` + `stereo_fusion`.

### The path that produced the current outputs

| Stage | Command (exact flags) | Result |
|---|---|---|
| Sparse | `feature_extractor --ImageReader.single_camera_per_folder 1 --FeatureExtraction.max_image_size 3200` → `spatial_matcher --FeatureMatching.guided_matching 1` → `sequential_matcher --SequentialMatching.overlap 20 --FeatureMatching.guided_matching 1` → `mapper --Mapper.ba_use_gpu 1` | **917/917 registered**, 24,216 verified pairs |
| Georeference | `model_aligner --ref_images_path gps_refs_enu.txt --ref_is_gps 0 --alignment_type custom --alignment_max_error 3.0` | **0.43 m median** horizontal residual |
| Dense | `image_undistorter --max_image_size 1600` → `patch_match_stereo --PatchMatchStereo.geom_consistency true --PatchMatchStereo.cache_size 16` → `stereo_fusion --input_type geometric` | **18.6 M points / 502 MB** |
| Mesh | Poisson **out of repo** (`C:\ASU-Survey\tools\mesh_from_colmap.py`) → quadric decimate 5.31 M → 800 k tris → `colmap mesh_texturer` 16384×6480 atlas | `coverage_textured.glb` |
| Ortho | Nadir z-buffer raster of the textured mesh at 1 cm | 12135×8133, 100% coverage |

**Mapper tuning: there is none** beyond `ba_use_gpu 1`. No `ba_refine_*`, no iteration limits,
no min/max model size. That is worth noting — DroneDeploy self-calibrates and QC-gates.

### The ODM run that failed

`--orthophoto-resolution 1.0 --dsm --dem-resolution 2.0 --mesh-size 600000 --mesh-octree-depth 11
--pc-quality high --feature-quality high --max-concurrency 16 --skip-report --gltf`, 16 CPU /
96 GiB / 23 h.

It **timed out (exit 124)**. Root cause is recorded: ODM discards the COLMAP model and rebuilds
its own dense cloud at **247 M points / 6.9 GB**, `renderdem` thrashed at **38 GB / 37 CPU-hours**,
and Poisson returned a **degenerate 36 KB mesh**. Parameter tuning could not fix it. ODM is off
the path.

### The three files you named

`georef_app.py`, `patch_ortho.py`, `stats_app.py` are **not in the git repository** — not on this
branch and not on `origin/main`. `workers/modal/photogrammetry/` contains only `worker.py` and
`odm_runner.py`. The docs reference them as untracked, and `patch_ortho.py` is marked obsolete
("do not re-run"). **They need committing before I can say what they do.**

Same for the whole `C:\ASU-Survey\tools\` set — `mesh_from_colmap.py`, `mesh_post.py`,
`tie_point_rmse.py`, `analyze_deck.py`, the tiling scripts. The mesh and every measurement in the
ASU docs came from code that is not in version control.

---

## 2. Hypothesis for the quality gap (answering Q2)

**Primary, and I think dominant: the dense stage runs at `max_image_size 1600` against a native
5280×3956 sensor.**

That is a **3.3× linear downscale — 89% of the pixels discarded** before any depth is computed.
Consequences that map directly onto your benchmarks:

- Native GSD is ~1.08 cm/px (your DD measurement, and independently 1.01/1.08 from two DD
  exports in our docs). At 1600 px the **effective GSD becomes ~3.6 cm/px**.
- Depth precision scales with pixel resolution. A pipeline sampling at 3.6 cm cannot produce
  **σ = 0.93 cm** single-point vertical scatter; the quantisation floor is above it.
- Every 1 cm product downstream — the 1 cm deck ortho, the tiles — is therefore **upsampled from
  ~3.6 cm evidence**, which is exactly the "soft/mushy at native zoom" verdict in the docs.

Note what this does *not* explain: **point count**. Ours is 18.6 M against DD's 22.2 M — the same
order. Density per unit area is the number to check, not the total, because COLMAP fuses across
many views. That is why the protocol below separates the two.

**Why 1600 was chosen:** the docstring says it plainly — `cache_size` "forces disk paging instead
of OOM (external-review recommendation for 917 imgs on 24GB)". This is an **A10G memory
constraint, not an algorithmic choice.** It is the single most likely thing to fix.

**Secondary hypotheses, ranked:**

2. **No bundle-adjustment refinement tuning.** The mapper runs stock. DD self-calibrates per
   flight and warns at >5% intrinsic deviation. Our sparse geometry may simply be looser.
3. **Poisson on a fused cloud vs DD's depth-map fusion.** Poisson smooths and invents surface in
   unobserved volume; the docs already record it producing floating islands that needed
   largest-connected-cluster filtering. DD's mesh is 1.21 M tris across 5 atlases; ours is 800 k
   after decimation from 5.31 M — the decimation ratio suggests the raw Poisson output was noisy.
4. **Ortho finishing was hand-rolled and is documented as the root-cause failure** — winner-take-all
   blending with a seam-only least-squares correction constrains only seam pixels, leaving each
   footprint's interior gradient intact ("four independent external reviews said so unanimously").
   Superseded by rasterising the textured mesh, which inherits `mesh_texturer`'s blending.
5. **No GCPs and consumer GPS.** 0.43 m median alignment residual is good for consumer GPS but
   leaves low-frequency dome/bowl warp that GCPs would remove. Affects absolute georeferencing,
   not local sharpness.

---

## 3. Output formats (answering Q3) — the honest answer is "none of the three, in-repo"

| Format you need | Status | Detail |
|---|---|---|
| (a) Georeferenced ortho GeoTIFF + world file | ❌ **Not implemented** | `worker.py` writes **JPEG** plus an `.npz` carrying `origin` and `gsd_m`. There is **no GDAL, no pyproj, no GeoTIFF writer, no `.tfw`** anywhere in the repo |
| (b) LAS/LAZ in a known CRS | ❌ **Not implemented** | Dense output is `fused.ply` in local ENU metres. No LAS writer, no CRS tagging |
| (c) Textured mesh OBJ/GLB | ⚠️ **Exists, out of repo** | Produced by untracked `C:\ASU-Survey\tools` scripts via `colmap mesh_texturer` → GLB |

This is a concrete, bounded gap and it is **prerequisite to the comparison**, not a side quest —
without common formats and a common CRS you cannot score anything against DD's exports.

There is also a frame mismatch to resolve: **we work in a local ENU** anchored at
lat 33.4277667, lon −111.9322333; **DD delivers EPSG:3857 ortho and EPSG:2223/6405 LAS**. The
conversion chain is already specified in `ASU_VIEWER_REBUILD_PLAN.md` (pyproj, explicit EPSG
codes — the US survey foot vs international foot difference is **0.4–0.6 m** at ~695,000 ft
eastings, so it must not be hand-rolled).

---

## 4. What I need from you (answering Q4)

**Blocking:**
1. **Commit the untracked code** — `georef_app.py`, `patch_ortho.py`, `stats_app.py`, and
   `C:\ASU-Survey\tools\*`. Without the mesh and scoring scripts in git, the head-to-head is not
   reproducible and I cannot review what produced the current numbers.
2. **GPU budget.** The 1600 px cap exists because 917 images at higher resolution OOM a 24 GB
   A10G. Testing the primary hypothesis requires **A100 40 GB or 80 GB** for the dense stage.
   Rough expectation: 3200 px is ~4× the pixels of 1600 px, so plan for hours, not minutes.
3. **Backend access or an operator.** This session cannot reach Modal (gateway 403). Someone with
   access has to launch runs.

**Not needed:** the raw imagery. All 917 photos are already on the `asu-rgb-flights` Modal volume
with the sparse model, aligned model, and dense workspace intact. No re-upload.

**ODM flags to trial:** I would **not** re-run ODM. It has a documented, understood failure on
this dataset, and the COLMAP path already registers 917/917. Effort is better spent on dense
resolution and on emitting the three formats.

---

## 5. Test protocol — response and proposed changes

Your protocol is sound. Four changes, one of them important:

**Change 1 — georeferencing residual is measured FIRST, and gates the rest.** You have it as
item (d); it must be item (a). If our CRS conversion or world-file placement is off by even a
few centimetres, every subsequent metric — acutance on matched crops, phase correlation, plane
fits — measures registration error rather than reconstruction quality. Gate before scoring:
median ≤ 5 cm, p90 ≤ 10 cm against the DD base over ≥20 tiles.

**Change 2 — report effective dense-stage GSD as a first-class number.** Not just the ortho's
nominal GSD. The hypothesis above lives or dies on it, and a 1 cm ortho upsampled from 3.6 cm
evidence should be labelled as such rather than compared as if native.

**Change 3 — add a resolution ladder as the controlled variable.** Same images, same sparse
model, same alignment, dense at **1600 (control) / 2400 / 3200 px**, everything downstream
identical. This isolates the downscale from every other difference and answers "is it compute or
is it algorithm" in one experiment. Without it, a single improved run tells you *that* something
changed, not *what*.

**Change 4 — separate point-cloud density from point-cloud precision.** Density (pts/m² on the
deck, target 873) and plane-fit σ (target 0.93 cm) fail for different reasons: density responds
to fusion settings and overlap, σ responds to source resolution. Report both per surface patch,
and report the raw fused count alongside the decimated deliverable count so they are not confused.

**Agreed as written:** same input images with no manual cleanup; Laplacian acutance on matched
crops; mesh hole-area completeness; nadir-render phase correlation against the DD ortho; you
score, we produce, results in a shared doc.

**One caution on acutance:** the docs record that JPEG-in-TIFF plus multiple `INTER_CUBIC` warps
cost real sharpness — three resamples were traced as the cause of L3 mush. When scoring, compare
at the same point in each chain (both at master resolution, or both after identical tiling), or
the comparison measures resampling policy rather than reconstruction.

---

## 6. Relevance to the unified twin

Per `UNIFIED_SITE_MODEL_ARCHITECTURE.md`, the drone mesh becomes the **site shell** that ground
walks and interiors anchor into. That raises the priority of two items above: the **textured mesh
must be reproducible in-repo** (not from untracked scripts), and the **georeferenced formats must
exist**, because the site frame is what every other capture registers against.
