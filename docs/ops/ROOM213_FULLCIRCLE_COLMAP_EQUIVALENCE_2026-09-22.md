# Room 213 — pycolmap 4.2 vs FullCircle's COLMAP 3.12 camera estimation: option equivalence

FullCircle's released `scripts/run_colmap.sh` (`theialab/fullcircle@6d5afc16`) shells out to a **COLMAP 3.12
binary** with only four non-default flags and otherwise **relies entirely on 3.12's built-in defaults**:

```
feature_extractor --image_path images --database_path database.db \
    --ImageReader.mask_path masks-colmap \
    --ImageReader.single_camera_per_folder 1 \
    --ImageReader.camera_model OPENCV_FISHEYE
exhaustive_matcher --database_path database.db
mapper --image_path images --database_path database.db --output_path sparse
```

We execute the identical three stages through **pycolmap 4.2.0** (the same COLMAP library, newer release).
Defaults were read from the live pycolmap 4.2 objects and from COLMAP source at tag `3.12.0`
(`src/colmap/feature/sift.h`, `src/colmap/estimators/two_view_geometry.h`,
`src/colmap/controllers/incremental_pipeline.h`, `src/colmap/sfm/incremental_mapper.h`).

## MATERIAL DIFFERENCES — pycolmap 4.2 default differs from COLMAP 3.12; we override to 3.12 behaviour
| option | COLMAP 3.12 | pycolmap 4.2 default | we use | why it matters |
|---|---|---|---|---|
| `FeatureExtraction.max_image_size` | **3200** | **−1** (no limit) | **3200** | our frames are 3840²; the released pipeline extracts SIFT on a 3200-px downscale. Leaving −1 would change feature scale, count and coordinates — the single most material divergence. |
| `FeatureExtraction.use_gpu` | **true** | **False** | **True** (`Device.cuda`) | 3.12 uses SiftGPU; CPU VLFeat SIFT yields slightly different keypoints, and CPU extraction on 242×3840² is far slower. |
| `FeatureMatching.use_gpu` | **true** | **False** | **True** | same: released behaviour is GPU brute-force matching. |
| `ba_local_max_num_iterations` | **25** | **−1** | **25** | mapper local BA iteration budget. |
| `TwoViewGeometry.use_sampson_refinement` | *(does not exist)* | **True** | **False** | a post-3.12 addition, on by default; 3.12 behaved as if off. |

## VERIFIED IDENTICAL — no override needed
Extraction: `max_num_features` 8192, `peak_threshold` 0.00667, `edge_threshold` 10, `first_octave` −1,
`num_octaves` 4, `octave_resolution` 3, `max_num_orientations` 2, `upright` false,
`estimate_affine_shape` false, `domain_size_pooling` false, `darkness_adaptivity` false,
`normalization` L1_ROOT (RootSIFT).
Matching: `max_num_matches` 32768, `max_ratio` 0.8, `max_distance` 0.7, `cross_check` true,
`guided_matching` false; exhaustive `block_size` 50.
Two-view geometry: `min_num_inliers` 15, `ransac.max_error` 4.0, `ransac.confidence` 0.999,
`ransac.min_inlier_ratio` 0.25, `detect_watermark` true, `watermark_min_inlier_ratio` 0.7,
`multiple_models` false.
Mapper: `min_num_matches` 15, `multiple_models` true, `max_model_overlap` 20, `min_model_size` 10,
`init_num_trials` 200, `extract_colors` true, `ba_refine_focal_length` **true**,
`ba_refine_principal_point` false, `ba_refine_extra_params` **true**, `ba_refine_sensor_from_rig` true,
`init_min_num_inliers` 100, `init_min_tri_angle` 16.0, `abs_pose_min_num_inliers` 30,
`abs_pose_min_inlier_ratio` 0.25, `abs_pose_refine_focal_length` true,
`abs_pose_refine_extra_params` true, `filter_max_reproj_error` 4.0, `filter_min_tri_angle` 1.5.

Note the mapper **self-calibrates** the fisheye cameras (`ba_refine_focal_length` /
`ba_refine_extra_params` = true). That is the released behaviour and the intent of this attempt; it is the
opposite of our closed H1 build, which pinned intrinsics. We do not carry the H1 setting over.

## NEW IN 4.2 WITH NO 3.12 COUNTERPART — defaults already preserve 3.12 behaviour
`TwoViewGeometry.min_inlier_ratio` 0.0 (inactive; the active one is `ransac.min_inlier_ratio` 0.25),
`use_degensac` false, `filter_stationary_matches` false, `FeatureMatching.rig_verification` false,
`skip_image_pairs_in_same_frame` false (each image is its own trivial frame under
`single_camera_per_folder`, so it cannot fire).

## Flag translation
| FullCircle CLI | pycolmap 4.2 |
|---|---|
| `--ImageReader.single_camera_per_folder 1` | `camera_mode=CameraMode.PER_FOLDER` |
| `--ImageReader.camera_model OPENCV_FISHEYE` | `ImageReaderOptions(camera_model="OPENCV_FISHEYE")` |
| `--ImageReader.mask_path masks-colmap` | `ImageReaderOptions(mask_path=...)` (per-image masks; 0 = ignored) |
| `exhaustive_matcher` | `match_exhaustive(db, matching_options, pairing_options)` |
| `mapper` | `incremental_mapping(db, image_path, output_path, options)` |

Conclusion: no real incompatibility was found, so COLMAP 3.12 is **not** compiled. Five options are pinned to
3.12 values; everything else is already identical.

---

## SUPERSEDED 2026-09-22 19:10 UTC — a real incompatibility was found, so the real binary is used

The pycolmap translation above was **abandoned before it ever produced a camera solution**. `extract_features`
refused the pinned options with `Check failed: extraction_options.Check()`, and the COLMAP log gave the reason:

```
E20260922 19:10:18 extractor.cc:156] Cannot use GPU feature extraction without CUDA or OpenGL support.
                                      Consider setting use_gpu to false.
```

The **pycolmap PyPI wheel is built without CUDA/OpenGL SIFT**, so it cannot reproduce FullCircle's GPU feature
extraction or GPU matching at all. That is material twice over: SiftGPU and CPU VLFeat SIFT produce different
keypoints, and CPU brute-force matching of 29,161 pairs would have risked the one-day time box. Falling back to
CPU SIFT would have been exactly the "silently accepting the newer default" this document exists to prevent.

Per the standing guardrail ("do not compile COLMAP 3.12 unless a real incompatibility is found"), the real binary
is now used — but without a source build: **conda-forge ships `colmap=3.12.6=cuda_126`**, installed into its own
conda env (`colmap312`) so it cannot perturb the training environment. Phase 1 runs FullCircle's
`scripts/run_colmap.sh` three commands verbatim.

**Consequence: the entire override table above is moot.** With the genuine 3.12.6 binary every default is COLMAP
3.12's own, so `max_image_size` 3200, GPU extraction, GPU matching, `ba_local_max_num_iterations` 25 and the
absence of `use_sampson_refinement` are simply what the program does — nothing is pinned, translated or assumed.
The table is retained as the audit record of why the pycolmap path was rejected.

Result of the verbatim run: 242/242 images registered, 121/121 exposures, both lenses, all walks in one
component, mean reprojection 1.15 px. See ROOM213_FULLCIRCLE_PHASE1_2_2026-09-22.md.
