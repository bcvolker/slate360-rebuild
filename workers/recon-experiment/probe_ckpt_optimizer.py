#!/usr/bin/env python3
"""Compare optimizer-state tensor sizes vs live gauss_params in a Room ckpt."""
from __future__ import annotations

import json
from pathlib import Path

import torch

CKPT = Path("/home/rian_/splat-ckpts/cecc2763/views/splatfacto/2026-09-17_001408/nerfstudio_models/step-000030000.ckpt")


def _shape(x):
    if torch.is_tensor(x):
        return list(x.shape)
    return type(x).__name__


def walk_opt(state, limit=30):
    rows = []
    if not isinstance(state, dict):
        return [{"type": type(state).__name__}]
    for name, blob in state.items():
        if not isinstance(blob, dict):
            rows.append({"opt": name, "type": type(blob).__name__})
            continue
        pg = blob.get("param_groups") or []
        st = blob.get("state") or {}
        exp_avgs = []
        if isinstance(st, dict):
            for i, (k, v) in enumerate(st.items()):
                if i >= limit:
                    break
                if isinstance(v, dict) and torch.is_tensor(v.get("exp_avg")):
                    exp_avgs.append({"state_key": str(k), "exp_avg": list(v["exp_avg"].shape)})
        rows.append({
            "opt": name,
            "n_param_groups": len(pg),
            "n_state": len(st) if isinstance(st, dict) else None,
            "exp_avgs": exp_avgs[:8],
        })
    return rows


def main() -> None:
    payload = torch.load(CKPT, map_location="cpu", weights_only=False)
    pipe = payload["pipeline"]
    gp = pipe["_model.gauss_params.means"] if "_model.gauss_params.means" in pipe else None
    # state_dict keys
    gauss = {k: list(v.shape) for k, v in pipe.items() if "gauss_params" in k and torch.is_tensor(v)}
    out = {
        "step": payload["step"],
        "gauss_param_shapes": gauss,
        "optimizers": walk_opt(payload.get("optimizers")),
    }
    dest = Path("/mnt/c/s360-recon-exp/qa/historical-ckpt-optimizer-bind.json")
    dest.write_text(json.dumps(out, indent=2) + "\n")
    print(json.dumps(out, indent=2)[:4000])
    print("wrote", dest)


if __name__ == "__main__":
    main()
