"""Validate an ODGS Gaussian PLY. Scale is not metric. Research-only."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from plyfile import PlyData

REQUIRED = ("x", "y", "z", "opacity", "scale_0", "scale_1", "scale_2")
SH_DC = ("f_dc_0", "f_dc_1", "f_dc_2")
ROT = ("rot_0", "rot_1", "rot_2", "rot_3")


def main() -> int:
    ply_path = Path(sys.argv[1])
    st = ply_path.stat()
    if st.st_size <= 0:
        print(json.dumps({"ok": False, "reason": "empty_file"}))
        return 1

    ply = PlyData.read(str(ply_path))
    v = ply["vertex"]
    names = set(v.data.dtype.names)
    missing = [n for n in REQUIRED if n not in names]
    if missing:
        print(json.dumps({"ok": False, "reason": "missing_properties", "missing": missing, "have": sorted(names)}))
        return 1

    xyz = np.stack([np.asarray(v[n], dtype=np.float64) for n in ("x", "y", "z")], axis=1)
    n = int(xyz.shape[0])
    finite = bool(np.isfinite(xyz).all())
    extras = {}
    for name in list(SH_DC) + list(ROT) + ["opacity", "scale_0", "scale_1", "scale_2"]:
        if name in names:
            arr = np.asarray(v[name], dtype=np.float64)
            extras[name] = {
                "finite": bool(np.isfinite(arr).all()),
                "min": float(np.nanmin(arr)),
                "max": float(np.nanmax(arr)),
            }
            finite = finite and extras[name]["finite"]

    mn = xyz.min(axis=0)
    mx = xyz.max(axis=0)
    span = mx - mn
    diag = float(np.linalg.norm(span))
    centroid = xyz.mean(axis=0)
    radii = np.linalg.norm(xyz - centroid, axis=1)
    r_mean = float(radii.mean()) if n else 0.0
    r_std = float(radii.std()) if n else 0.0
    spherical_cv = (r_std / r_mean) if r_mean > 1e-12 else 0.0
    unique = int(np.unique(np.round(xyz, 6), axis=0).shape[0])
    dup_ratio = 1.0 - (unique / n) if n else 1.0

    collapsed = n < 8 or diag < 1e-3
    spherical = n > 50 and spherical_cv < 0.08 and r_mean > 1e-3
    duplicated = n > 50 and dup_ratio > 0.95

    flags = []
    if not finite:
        flags.append("nan_or_inf")
    if collapsed:
        flags.append("collapsed")
    if spherical:
        flags.append("spherical")
    if duplicated:
        flags.append("duplicated")

    report = {
        "ok": finite and not collapsed and not spherical and not duplicated,
        "path": str(ply_path),
        "bytes": st.st_size,
        "gaussian_count": n,
        "properties": sorted(names),
        "has_sh_dc": all(k in names for k in SH_DC),
        "has_rotation": all(k in names for k in ROT),
        "finite": finite,
        "bbox_min": mn.tolist(),
        "bbox_max": mx.tolist(),
        "bbox_span": span.tolist(),
        "bbox_diagonal": diag,
        "centroid": centroid.tolist(),
        "radius_mean": r_mean,
        "radius_std": r_std,
        "spherical_cv": spherical_cv,
        "unique_xyz": unique,
        "duplicate_ratio": dup_ratio,
        "flags": flags,
        "metric": False,
        "note": "Monocular scale is not metric. Do not auto-fix geometry.",
        "property_stats": extras,
    }
    print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
