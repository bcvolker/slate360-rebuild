#!/usr/bin/env python3
"""Compare historical Room 213 checkpoint Gaussian tensors. Read-only."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import torch

CKPTS = [
    Path("/home/rian_/splat-ckpts/cecc2763/views/splatfacto/2026-09-16_234807/nerfstudio_models/step-000002250.ckpt"),
    Path("/home/rian_/splat-ckpts/cecc2763/views/splatfacto/2026-09-16_235822/nerfstudio_models/step-000006000.ckpt"),
    Path("/home/rian_/splat-ckpts/cecc2763/views/splatfacto/2026-09-17_001408/nerfstudio_models/step-000030000.ckpt"),
]


def _sha(t: torch.Tensor) -> str:
    arr = t.detach().contiguous().cpu()
    return hashlib.sha256(arr.numpy().tobytes()).hexdigest()


def _collect_gauss(payload: dict) -> dict[str, str]:
    out = {}
    pipeline = payload.get("pipeline") or payload
    if not isinstance(pipeline, dict):
        return out

    def walk(prefix: str, obj) -> None:
        if torch.is_tensor(obj):
            if obj.numel() > 1000:
                out[prefix] = {
                    "shape": list(obj.shape),
                    "dtype": str(obj.dtype),
                    "sha256": _sha(obj),
                    "numel": int(obj.numel()),
                    "mean": float(obj.float().mean()),
                    "std": float(obj.float().std()),
                }
            return
        if isinstance(obj, dict):
            for k, v in obj.items():
                walk(f"{prefix}.{k}" if prefix else str(k), v)

    walk("", pipeline)
    return out


def _opt_ids(payload: dict) -> dict:
    opt = payload.get("optimizers") or {}
    summary = {}
    if not isinstance(opt, dict):
        return {"type": type(opt).__name__}
    for name, state in opt.items():
        if not isinstance(state, dict):
            summary[name] = type(state).__name__
            continue
        pg = state.get("param_groups") or []
        summary[name] = {
            "n_param_groups": len(pg),
            "n_params": sum(len(g.get("params", [])) for g in pg if isinstance(g, dict)),
            "state_keys": list(state.get("state", {}).keys())[:8] if isinstance(state.get("state"), dict) else None,
        }
    return summary


def main() -> int:
    reports = []
    for path in CKPTS:
        print("loading", path.name, path.stat().st_size, flush=True)
        payload = torch.load(path, map_location="cpu", weights_only=False)
        keys = list(payload.keys()) if isinstance(payload, dict) else [type(payload).__name__]
        gauss = _collect_gauss(payload) if isinstance(payload, dict) else {}
        reports.append({
            "path": str(path),
            "bytes": path.stat().st_size,
            "file_sha256_head": hashlib.sha256(path.read_bytes()[:1024 * 1024]).hexdigest(),
            "top_keys": keys,
            "step": payload.get("step") if isinstance(payload, dict) else None,
            "gauss": gauss,
            "optimizers": _opt_ids(payload) if isinstance(payload, dict) else None,
        })
        del payload
    # pairwise gauss hash compare
    names = [Path(r["path"]).name for r in reports]
    pairs = []
    for i in range(len(reports)):
        for j in range(i + 1, len(reports)):
            a, b = reports[i]["gauss"], reports[j]["gauss"]
            keys = sorted(set(a) | set(b))
            same = [k for k in keys if a.get(k) and b.get(k) and a[k]["sha256"] == b[k]["sha256"]]
            diff = [k for k in keys if not (a.get(k) and b.get(k) and a[k]["sha256"] == b[k]["sha256"])]
            pairs.append({
                "a": names[i], "b": names[j],
                "identical_tensors": same, "different_tensors": diff,
                "n_identical": len(same), "n_different": len(diff),
            })
    dest = Path("/mnt/c/s360-recon-exp/qa/historical-ckpt-identity.json")
    dest.write_text(json.dumps({"reports": reports, "pairs": pairs}, indent=2) + "\n")
    print(json.dumps({"pairs": pairs, "wrote": str(dest)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
