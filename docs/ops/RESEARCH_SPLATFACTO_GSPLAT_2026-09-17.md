# Splatfacto resume + gsplat 1.5.3 research (2026-09-17)

**Written:** 2026-09-17 (Pacific)  
**Author:** Grok Bot (parallel research; docs only)  
**Does not change:** Experiment 2, Lab trainers, workers, pins, or running GPU jobs  
**Companion:** `docs/ops/GROK_BOT_COORDINATION_2026-09-17.md`

---

## Confirmed

1. **Orphaned Adam after checkpoint load.** Splatfacto `load_state_dict` resizes `gauss_params` by allocating **new** `nn.Parameter` tensors, then calls `super().load_state_dict`. It does **not** rebind Adam `param_groups` / `state` to those new objects. The optimizer keeps the old Parameter identities. That explains Room 213 bit-identical checkpoints from step **2250–30000**: weights can load, but later `optimizer.step()` writes into orphaned tensors. Densify/prune **does** rebind, via gsplat `_update_param_with_optimizer` in `gsplat/strategy/ops.py`. The ParameterDict refactor that made resize-on-load necessary is nerfstudio PR [#2946](https://github.com/nerfstudio-project/nerfstudio/pull/2946). Cite: [`nerfstudio/models/splatfacto.py`](https://github.com/nerfstudio-project/nerfstudio/blob/main/nerfstudio/models/splatfacto.py) (`load_state_dict`), [`gsplat/strategy/ops.py`](https://github.com/nerfstudio-project/gsplat/blob/main/gsplat/strategy/ops.py).

2. **`stop_split_at` / `refine_stop_iter` is an absolute global step**, not “steps since resume.” Splatfacto `stop_split_at` (default 15000) maps to gsplat `DefaultStrategy.refine_stop_iter` (default 15000). A resume whose global step is already past that cutoff never densifies again, even if the run “just started” from a mid-train ckpt.

3. **gsplat v1.5.3 opacity-reset dead code.** Stock 1.5.3 DefaultStrategy uses  
   `if step % self.reset_every == 0 & step > 0`  
   Python `&` binds tighter than `==` / `>`, so this is parsed as  
   `step % self.reset_every == (0 & step) > 0`  
   and the opacity reset **never fires**. Introduced by the “don’t reset at step 0” change in [PR #735](https://github.com/nerfstudio-project/gsplat/pull/735) (shipped in [v1.5.3](https://github.com/nerfstudio-project/gsplat/releases/tag/v1.5.3)). Fixed after 1.5.3 in [PR #776](https://github.com/nerfstudio-project/gsplat/pull/776), merge commit [`6e8c837`](https://github.com/nerfstudio-project/gsplat/commit/6e8c837f35c9b025c0e92fb07bfda4e7c9361c49). Confirmed in the field by [Issue #797](https://github.com/nerfstudio-project/gsplat/issues/797) (1.5.3 GS count explodes vs 1.5.2). **Workaround:** pin **1.5.2**, or install from `main` at **≥ 6e8c837**, until **1.5.4+**. Do not run DefaultStrategy on stock 1.5.3.

4. **Defaults (do not mix blindly).**

| Knob | Splatfacto | gsplat `DefaultStrategy` | MCMC |
|---|---|---|---|
| Densify / grow grad | `densify_grad_thresh=0.0008` + `use_absgrad=True` | `grow_grad2d=0.0002`, `absgrad=False` | N/A (relocation / sample-add) |
| Cull / prune opacity | `cull_alpha_thresh=0.1` | `prune_opa=0.005` | `min_opacity` (typically ~0.005) |
| Hard GS cap | none in Default path | **none** | **`cap_max`** |
| Stop refine | `stop_split_at=15000` (absolute step) | `refine_stop_iter=15000` (absolute step) | `refine_stop_iter` |

gsplat docs state: if `absgrad=True`, raise `grow_grad2d` to **~0.0008** (Splatfacto’s pairing). `0.0002` + absgrad over-densifies.

---

## Recommended fixes (clean-room)

Do **not** apply these to the running Experiment 2 arms. For the next Lab / trainer revision:

- Rebuild Adam after **every** checkpoint load. Assert `optimizer.param_groups[*]["params"][0] is gauss_params[name]` (object identity, not just shape).
- Avoid stock **gsplat 1.5.3** for DefaultStrategy. Pin 1.5.2 or `main` ≥ `6e8c837`.
- If absgrad is on, densify thresh must be **~0.0008**, not 0.0002.
- Keep a **working** opacity reset and a sensible cull. Add a **hard count guard** (DefaultStrategy has no `cap_max`; MCMC does).
- Separate densify profiles for **interior / exterior ground 360 / aerial**. Do not overwrite recipes across modes. Stadium aerial splat `2bb07176` stays a protected benchmark.
- Treat future handheld LiDAR as **Geometry** authority. Do not let photometric densify fight metric means.

---

## Implications for Slate360 modes

| Mode | Role | Densify / reset | Do not |
|---|---|---|---|
| Interior (e.g. Room 213) | Reality, close-range 360 | Working reset + cull; hard GS cap; absgrad ⇒ ~0.0008; rebuild Adam on resume | Reuse aerial thresh / no-cap 1.5.3 DefaultStrategy |
| Exterior ground 360 | Reality | Own profile (ground GSD, facade scale); same optimizer-rebind rule | Share interior or aerial densify knobs |
| Aerial 360 | Reality | Own profile; `2bb07176` is the protected aerial benchmark | Overwrite with interior recipe, or vice versa |
| Future handheld LiDAR (Airy / Mid-360) | **Geometry** | Metric means are authority; photometric densify must not relocate them | Collapse Reality vs Geometry into one trainer |

---

## Open questions for desktop Exp 2

Leave answers in `docs/ops/EXPERIMENT2_RESULTS.md` when Exp 2 finishes (do not stop the run to check):

- Does Lab recreate optimizers after load, or only `load_state_dict` the model?
- Exact gsplat pin (1.5.2 / 1.5.3 / `main` SHA)?
- Was `grow_grad2d=0.0002` used **with** `absgrad=True`?

---

## Key links

- Splatfacto model: https://github.com/nerfstudio-project/nerfstudio/blob/main/nerfstudio/models/splatfacto.py
- Nerfstudio ParameterDict refactor: https://github.com/nerfstudio-project/nerfstudio/pull/2946
- gsplat strategy ops (optimizer rebind): https://github.com/nerfstudio-project/gsplat/blob/main/gsplat/strategy/ops.py
- gsplat DefaultStrategy: https://github.com/nerfstudio-project/gsplat/blob/main/gsplat/strategy/default.py
- Densification API docs: https://docs.gsplat.studio/main/apis/strategy.html
- gsplat v1.5.3 release (includes #735): https://github.com/nerfstudio-project/gsplat/releases/tag/v1.5.3
- Introduced “skip reset at 0” via bitwise `&`: https://github.com/nerfstudio-project/gsplat/pull/735
- Fix bitwise `&` so opacity reset fires: https://github.com/nerfstudio-project/gsplat/pull/776
- Merge commit `6e8c837`: https://github.com/nerfstudio-project/gsplat/commit/6e8c837f35c9b025c0e92fb07bfda4e7c9361c49
- Field report (1.5.3 GS explosion vs 1.5.2): https://github.com/nerfstudio-project/gsplat/issues/797
