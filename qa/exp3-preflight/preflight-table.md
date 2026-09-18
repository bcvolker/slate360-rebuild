# Experiment 3 resolved preflight: Arm C vs Arm D

Preflight OK: **True**. Differing keys: `['densify_grad_thresh']` (expected `['densify_grad_thresh']`).

Derived schedule (identical in both arms): resets at [3000, 6000, 9000] (value 0.01), accumulator clear at step 6017, refinement events 44 from step 6300 to 10900, screen-size split inactive after 4000 (before refinement: True), warm-up covers 1.111 training cycles.

| Field | Arm C | Arm D | Same |
|---|---|---|---|
| `accumulator_clear` | `grad2d,count,radii at step warmup_length+1` | `grad2d,count,radii at step warmup_length+1` | yes |
| `actual_images_per_optimizer_step` | `1` | `1` | yes |
| `arm_name` | `ROOM213_ARM_C_NO_GROWTH_CONTROL` | `ROOM213_ARM_D_DELAYED_GROWTH` | **NO** |
| `cache_images` | `cpu` | `cpu` | yes |
| `cache_images_type` | `uint8` | `uint8` | yes |
| `changed_variable` | `densify_grad_thresh` | `densify_grad_thresh` | yes |
| `cli_max_num_iterations` | `16000` | `16000` | yes |
| `cull_alpha_thresh_prune_opa` | `0.005` | `0.005` | yes |
| `cull_scale_thresh_prune_scale3d` | `0.15` | `0.15` | yes |
| `dataset_eval_images` | `601` | `601` | yes |
| `dataset_eval_order_sha256` | `2b5422fd94c0cca9f18a3cdbedf8076ee5b930dedefd0de30187424ff8abeb76` | `2b5422fd94c0cca9f18a3cdbedf8076ee5b930dedefd0de30187424ff8abeb76` | yes |
| `dataset_total_views` | `6016` | `6016` | yes |
| `dataset_train_images` | `5415` | `5415` | yes |
| `dataset_train_order_sha256` | `1bb881c0bd18a735cf7e72a805639de1901b73bf96a63c94cf3a8a1bf53547d6` | `1bb881c0bd18a735cf7e72a805639de1901b73bf96a63c94cf3a8a1bf53547d6` | yes |
| `densify_grad_thresh` | `1000000000.0` | `0.0008` | **NO** |
| `eval_steps` | `[8000, 15999]` | `[8000, 15999]` | yes |
| `experiment_id` | `room213-exp3` | `room213-exp3` | yes |
| `gpu_class` | `L40S` | `L40S` | yes |
| `gsplat` | `1.5.3` | `1.5.3` | yes |
| `gsplat_opacity_reset_patch` | `exp3_strategy_patch (PR #776 equivalent)` | `exp3_strategy_patch (PR #776 equivalent)` | yes |
| `keep_checkpoint_steps` | `[500, 3000, 6000, 8000, 9000, 11000, 13000, 15999]` | `[500, 3000, 6000, 8000, 9000, 11000, 13000, 15999]` | yes |
| `machine_seed` | `42` | `42` | yes |
| `masks_on_gpu` | `False` | `False` | yes |
| `max_cost_usd` | `15.0` | `15.0` | yes |
| `max_live_gaussians_hard_guard` | `3500000` | `3500000` | yes |
| `max_runtime_s` | `9000` | `9000` | yes |
| `max_steps` | `16000` | `16000` | yes |
| `nerfstudio` | `1.1.5` | `1.1.5` | yes |
| `pause_refine_after_reset_effective` | `250` | `250` | yes |
| `recipe.backend` | `modal-L40S` | `modal-L40S` | yes |
| `recipe.loss` | `l1+ssim` | `l1+ssim` | yes |
| `recipe.mask_hash` | `2f5bc81ddb14a38b39ac2d688bfed1645b4a784b616b4aec071d41afb1cedb3e` | `2f5bc81ddb14a38b39ac2d688bfed1645b4a784b616b4aec071d41afb1cedb3e` | yes |
| `recipe.optimizer` | `splatfacto-adam` | `splatfacto-adam` | yes |
| `recipe.pano_count` | `376` | `376` | yes |
| `recipe.pose_hash` | `f9b1bdb367ec5864f0c21c1cd77fd33b2a8fad6ca4a92a3821571db3ae6fa604` | `f9b1bdb367ec5864f0c21c1cd77fd33b2a8fad6ca4a92a3821571db3ae6fa604` | yes |
| `recipe.qa_pose_hash` | `ee51124640e16c92ea2c48cf420719b77ab9c8a02ea996dc4ed849045f3fb37a` | `ee51124640e16c92ea2c48cf420719b77ab9c8a02ea996dc4ed849045f3fb37a` | yes |
| `recipe.seed_hash` | `5c24bd98d41607d493a95167512d9489f48783a7dd781f4b31acb80a5bab4416` | `5c24bd98d41607d493a95167512d9489f48783a7dd781f4b31acb80a5bab4416` | yes |
| `recipe.source_hash` | `1753a05b9eef0262d075bf9dc81d8ce49e56cdb6ae88fb9a2e713f7b73b35c99` | `1753a05b9eef0262d075bf9dc81d8ce49e56cdb6ae88fb9a2e713f7b73b35c99` | yes |
| `recipe.use_lidar` | `False` | `False` | yes |
| `recipe.view_count` | `6016` | `6016` | yes |
| `refine_every` | `100` | `100` | yes |
| `reset_alpha_every` | `30` | `30` | yes |
| `reset_every` | `3000` | `3000` | yes |
| `resolution` | `1280` | `1280` | yes |
| `resume` | `False` | `False` | yes |
| `sampler` | `nerfstudio FullImageDatamanager train_cameras_sampling_strategy=random` | `nerfstudio FullImageDatamanager train_cameras_sampling_strategy=random` | yes |
| `save_only_latest_checkpoint` | `False` | `False` | yes |
| `sh_degree` | `3` | `3` | yes |
| `sh_degree_interval` | `533` | `533` | yes |
| `soft_population_cap` | `None` | `None` | yes |
| `start_step` | `0` | `0` | yes |
| `steps_per_eval_all_images` | `100000` | `100000` | yes |
| `steps_per_save` | `500` | `500` | yes |
| `stop_screen_size_at` | `4000` | `4000` | yes |
| `stop_split_at_refine_stop_iter` | `11000` | `11000` | yes |
| `trainer` | `ns_train_wrap.py -> nerfstudio splatfacto` | `ns_train_wrap.py -> nerfstudio splatfacto` | yes |
| `use_absgrad` | `True` | `True` | yes |
| `use_bilateral_grid` | `True` | `True` | yes |
| `use_scale_regularization` | `True` | `True` | yes |
| `warmup_length_refine_start_iter` | `6016` | `6016` | yes |
