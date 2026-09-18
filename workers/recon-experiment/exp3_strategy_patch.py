"""Experiment 3 harness patch for gsplat 1.5.3 ``DefaultStrategy`` (narrow, env-gated).

Applied only when ``ns_train_wrap.py`` runs with ``SPLAT_LAB_EXP3=1``. Lab jobs are untouched.

Three edits are made to the *source text* of ``DefaultStrategy.step_post_backward`` and the
result is compiled back into the gsplat module namespace and bound to the class. The control
flow is therefore the stock one; there is no outer wrapper that could act after the method's
``step >= refine_stop_iter`` early return.

1. Opacity-reset predicate. Stock 1.5.3 reads::

       if step % self.reset_every == 0 & step > 0:

   Python binds ``&`` tighter than the comparisons, so this is
   ``(step % reset_every == 0) and (0 > 0)`` and is always False: opacities are never reset.
   Upstream fix: gsplat PR #776 "Fix bit-wise 'and' preventing opacity reset" (merged
   2025-08-22, commit 6e8c837)::

       if step % self.reset_every == 0 and step > 0:

2. Warm-up accumulator clear. Once, at ``step == refine_start_iter + 1`` and before
   ``_update_state`` runs for that step, ``grad2d``, ``count`` and ``radii`` (when present) are
   zeroed and ``EXP3_REFINEMENT_ACCUMULATORS_CLEARED step=N`` is printed. This is the first
   step at which the grow condition ``step > refine_start_iter`` can hold, so statistics gathered
   during the stabilisation delay never feed a refinement decision.

3. Live-count log and hard population guard. Around the grow / prune calls the live Gaussian
   count is recorded (``EXP3_REFINE`` lines) and, if it exceeds ``EXP3_MAX_LIVE_GAUSSIANS``
   (default 3,500,000), ``EXP3_POPULATION_GUARD_TRIPPED`` is printed and ``RuntimeError`` is
   raised so ns-train exits non-zero with its checkpoints left on disk. No soft cap, no
   skip-grow, no subsampling, no truncation.

Runtime assertions (``apply()``):
- gsplat version is exactly 1.5.3;
- the stock method source contains the buggy predicate exactly once;
- a CPU probe of the *stock* method at ``step == reset_every`` does NOT call ``reset_opa``;
- after patching, the bound method's source contains the corrected predicate and the same probe
  DOES call ``reset_opa`` exactly once.
The stock / patched source hashes and the bound code-object hash are written to
``<EXP3_STATUS_DIR>/exp3-strategy-patch.json`` and printed as ``EXP3_STRATEGY_PATCH``.
"""
from __future__ import annotations

import hashlib
import inspect
import json
import os
import textwrap
from pathlib import Path
from typing import Any

UPSTREAM_FIX = {
    "repo": "nerfstudio-project/gsplat",
    "pr": 776,
    "title": "Fix bit-wise 'and' preventing opacity reset",
    "merge_commit": "6e8c837",
    "merged": "2025-08-22",
}
REQUIRED_GSPLAT = "1.5.3"
DEFAULT_MAX_LIVE = 3_500_000

STOCK_PREDICATE = "if step % self.reset_every == 0 & step > 0:"
FIXED_PREDICATE = "if step % self.reset_every == 0 and step > 0:"
UPDATE_CALL = "self._update_state(params, state, info, packed=packed)"
GROW_CALL = "n_dupli, n_split = self._grow_gs(params, optimizers, state, step)"
PRUNE_CALL = "n_prune = self._prune_gs(params, optimizers, state, step)"

_CLEAR_BLOCK = """\
# EXP3: clear warm-up refinement statistics once, before the first step at which
# refinement can act (step > refine_start_iter). Logged with the exact step.
if step == self.refine_start_iter + 1 and not state.get("_exp3_accumulators_cleared"):
    _exp3_cleared = []
    for _exp3_key in ("grad2d", "count", "radii"):
        if state.get(_exp3_key) is not None:
            state[_exp3_key].zero_()
            _exp3_cleared.append(_exp3_key)
    state["_exp3_accumulators_cleared"] = step
    print(
        "EXP3_REFINEMENT_ACCUMULATORS_CLEARED step=%d refine_start_iter=%d cleared=%s"
        % (step, self.refine_start_iter, ",".join(_exp3_cleared)),
        flush=True,
    )
"""

_GROW_BLOCK = """\
_exp3_before = len(params["means"])
n_dupli, n_split = self._grow_gs(params, optimizers, state, step)
_exp3_after_grow = len(params["means"])
_exp3_guard(step, "grow", _exp3_after_grow)
"""

_PRUNE_BLOCK = """\
n_prune = self._prune_gs(params, optimizers, state, step)
_exp3_after_prune = len(params["means"])
_exp3_guard(step, "prune", _exp3_after_prune)
print(
    "EXP3_REFINE step=%d before=%d after_grow=%d after_prune=%d n_dupli=%d n_split=%d n_prune=%d"
    % (step, _exp3_before, _exp3_after_grow, _exp3_after_prune, n_dupli, n_split, n_prune),
    flush=True,
)
"""


def _sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _line_indent(src: str, needle: str) -> str:
    for line in src.splitlines():
        if needle in line:
            return line[: len(line) - len(line.lstrip())]
    raise AssertionError(f"needle not found: {needle!r}")


def _replace_line(src: str, needle: str, block: str) -> str:
    indent = _line_indent(src, needle)
    old = indent + needle
    assert src.count(old) == 1, f"expected exactly one occurrence of {needle!r}"
    return src.replace(old, textwrap.indent(block, indent).rstrip("\n"))


def build_patched_source(stock_src: str) -> str:
    """Return the corrected method source. Pure function; asserts on unexpected input."""
    src = textwrap.dedent(stock_src)
    assert src.count(STOCK_PREDICATE) == 1, "stock 1.5.3 opacity-reset predicate not found exactly once"
    assert FIXED_PREDICATE not in src, "source already contains the corrected predicate"
    for needle in (UPDATE_CALL, GROW_CALL, PRUNE_CALL):
        assert src.count(needle) == 1, f"expected exactly one {needle!r}"
    src = src.replace(STOCK_PREDICATE, FIXED_PREDICATE)
    indent = _line_indent(src, UPDATE_CALL)
    src = src.replace(indent + UPDATE_CALL, textwrap.indent(_CLEAR_BLOCK, indent) + indent + UPDATE_CALL)
    src = _replace_line(src, GROW_CALL, _GROW_BLOCK)
    src = _replace_line(src, PRUNE_CALL, _PRUNE_BLOCK)
    assert src.count(FIXED_PREDICATE) == 1
    assert "EXP3_REFINEMENT_ACCUMULATORS_CLEARED" in src and "_exp3_guard(step, \"prune\"" in src
    return src


def max_live_gaussians() -> int:
    raw = os.environ.get("EXP3_MAX_LIVE_GAUSSIANS", "").strip()
    return int(raw) if raw else DEFAULT_MAX_LIVE


def _exp3_guard(step: int, phase: str, count: int) -> None:
    limit = max_live_gaussians()
    if count > limit:
        print(
            "EXP3_POPULATION_GUARD_TRIPPED "
            + json.dumps({"step": int(step), "phase": phase, "live_gaussians": int(count), "limit": int(limit)}),
            flush=True,
        )
        raise RuntimeError(
            f"EXP3 population guard: {count} live Gaussians > {limit} after {phase} at step {step}"
        )


def _probe_reset_fires(strategy_cls, module) -> bool:
    """CPU probe: does step_post_backward at step == reset_every call reset_opa?"""
    import torch

    calls: list[Any] = []
    original = module.reset_opa
    module.reset_opa = lambda **kw: calls.append(kw.get("value"))
    try:
        strat = strategy_cls(
            refine_start_iter=10**9,
            refine_stop_iter=10**9,
            reset_every=3000,
            refine_every=100,
            pause_refine_after_reset=0,
            absgrad=False,
            verbose=False,
        )
        n = 4
        params = torch.nn.ParameterDict({
            "means": torch.nn.Parameter(torch.zeros(n, 3)),
            "scales": torch.nn.Parameter(torch.zeros(n, 3)),
            "quats": torch.nn.Parameter(torch.zeros(n, 4)),
            "opacities": torch.nn.Parameter(torch.zeros(n)),
        })
        state = strat.initialize_state(scene_scale=1.0)
        means2d = torch.zeros(1, n, 2, requires_grad=True)
        means2d.grad = torch.zeros(1, n, 2)
        info = {
            "width": 8,
            "height": 8,
            "n_cameras": 1,
            "radii": torch.ones(1, n, 2, dtype=torch.int32),
            "gaussian_ids": None,
            "means2d": means2d,
        }
        strat.step_post_backward(params, {}, state, 3000, info, packed=False)
    finally:
        module.reset_opa = original
    return len(calls) == 1


def apply(status_dir: str | os.PathLike | None = None) -> dict[str, Any]:
    """Patch gsplat in-process. Idempotent: a second call returns the recorded status."""
    import gsplat
    import gsplat.strategy.default as module
    from gsplat.strategy.default import DefaultStrategy

    if getattr(DefaultStrategy, "_exp3_patch_status", None):
        return DefaultStrategy._exp3_patch_status  # type: ignore[attr-defined]

    assert gsplat.__version__ == REQUIRED_GSPLAT, (
        f"Experiment 3 requires gsplat {REQUIRED_GSPLAT}, found {gsplat.__version__}"
    )
    stock_fn = DefaultStrategy.step_post_backward
    stock_src = textwrap.dedent(inspect.getsource(stock_fn))
    assert STOCK_PREDICATE in stock_src, "environment is not stock gsplat 1.5.3 (buggy predicate absent)"
    stock_probe = _probe_reset_fires(DefaultStrategy, module)
    assert stock_probe is False, "stock probe unexpectedly reset opacity; environment is not stock 1.5.3"

    patched_src = build_patched_source(stock_src)
    module.__dict__["_exp3_guard"] = _exp3_guard
    filename = "<exp3-patched gsplat/strategy/default.py::DefaultStrategy.step_post_backward>"
    code = compile(patched_src, filename, "exec")
    exec(code, module.__dict__)  # noqa: S102 - compiles the audited source into gsplat's namespace
    patched_fn = module.__dict__.pop("step_post_backward")
    patched_fn.__qualname__ = "DefaultStrategy.step_post_backward"
    patched_fn.__module__ = module.__name__
    DefaultStrategy.step_post_backward = patched_fn  # type: ignore[method-assign]

    assert DefaultStrategy.step_post_backward is patched_fn
    patched_probe = _probe_reset_fires(DefaultStrategy, module)
    assert patched_probe is True, "patched method did not reset opacity at step == reset_every"

    status = {
        "patch": "exp3_strategy_patch",
        "gsplat_version": gsplat.__version__,
        "gsplat_file": getattr(module, "__file__", None),
        "upstream_fix": UPSTREAM_FIX,
        "stock_predicate": STOCK_PREDICATE,
        "fixed_predicate": FIXED_PREDICATE,
        "stock_predicate_found": True,
        "patched_predicate_present": FIXED_PREDICATE in patched_src,
        "stock_probe_reset_called": stock_probe,
        "patched_probe_reset_called": patched_probe,
        "stock_source_sha256": _sha(stock_src),
        "patched_source_sha256": _sha(patched_src),
        "bound_code_sha256": hashlib.sha256(patched_fn.__code__.co_code).hexdigest(),
        "bound_is_patched": True,
        "max_live_gaussians": max_live_gaussians(),
        "accumulator_clear": "step == refine_start_iter + 1, before _update_state, keys grad2d/count/radii",
    }
    DefaultStrategy._exp3_patch_status = status  # type: ignore[attr-defined]
    DefaultStrategy._exp3_patched_source = patched_src  # type: ignore[attr-defined]
    if status_dir:
        dest = Path(status_dir)
        dest.mkdir(parents=True, exist_ok=True)
        (dest / "exp3-strategy-patch.json").write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
        (dest / "exp3-strategy-patched-source.py").write_text(patched_src, encoding="utf-8")
    print("EXP3_STRATEGY_PATCH " + json.dumps(status, sort_keys=True), flush=True)
    return status
