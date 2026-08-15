"""E1 — bake edit_list ops into splat data (2026-08-15).

Replicates Spark's SplatEdit shader chain EXACTLY (spark.module.js
evaluateSdfArray/modulateSdfArray + the CPU packing in SplatEdits.update),
so a baked file matches what every viewer renders with the edit_list applied:

- Edit transform: ops are children of the SplatMesh, so the mesh transform
  cancels and everything happens in PLY coordinates. The pack step inverts
  the edit's TRS matrix and re-decomposes it three.js-style (column-length
  scale — shear from non-uniform scale+rotation is LOST there, and therefore
  deliberately lost here too, for parity).
- sizes = (1,1,1, radius ?? 0.5): our runtime never scales the SDF node
  itself, only the edit; box half-extents are carried by the edit scale.
- op.invert is applied ONCE (SDF level), matching the corrected viewer
  runtime. Spark inverts at both the SDF and edit level, so the previous
  runtime — which passed op.invert to both — cancelled it and made Crop
  erase its INTERIOR (identical to Erase). splat-edit-runtime.ts now
  passes invert:false at the edit level; this module mirrors that, so a
  crop keeps its interior and removes everything outside.
- Single SDF per edit → the smooth log-sum-exp accumulation is identity.
- modulate = softEdge==0 ? step : clamp(-d/softEdge + 0.5, 0, 1).
- multiply/set_rgb blend: alpha factor = mix(1, opacity, modulate);
  add_rgba adds opacity·modulate (alpha only; color untouched in bake v1).
- displace: position += displace · modulate (all blend modes).
"""

from __future__ import annotations

import math
from typing import Any

DEFAULT_RADIUS = 0.5
DEFAULT_SOFT_EDGE = 0.05
DROP_THRESHOLD = 0.02
_LOGIT_CLIP = 1e-6


def _quat_from_euler_xyz(rx: float, ry: float, rz: float):
    """three.js Euler XYZ → quaternion [x, y, z, w]."""
    cx, sx = math.cos(rx / 2), math.sin(rx / 2)
    cy, sy = math.cos(ry / 2), math.sin(ry / 2)
    cz, sz = math.cos(rz / 2), math.sin(rz / 2)
    return [
        sx * cy * cz + cx * sy * sz,
        cx * sy * cz - sx * cy * sz,
        cx * cy * sz + sx * sy * cz,
        cx * cy * cz - sx * sy * sz,
    ]


def _quat_matrix(q):
    import numpy as np

    x, y, z, w = q
    return np.array(
        [
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
        ]
    )


def _op_inverse_decomposed(op: dict[str, Any]):
    """Invert the edit's TRS and decompose like three.js Matrix4.decompose.

    Returns (rot3x3, scale3, translation3) applied in the shader as
    p_sdf = rot @ (p * scale) + translation.
    """
    import numpy as np

    position = np.asarray(op.get("position") or [0, 0, 0], dtype=np.float64)
    rotation = op.get("rotation") or [0, 0, 0]
    scale = np.asarray(
        op.get("scale") or op.get("size") or [1, 1, 1], dtype=np.float64
    )

    m = np.eye(4)
    m[:3, :3] = _quat_matrix(_quat_from_euler_xyz(*rotation)) @ np.diag(scale)
    m[:3, 3] = position
    inv = np.linalg.inv(m)

    # three.js decompose: scale = column lengths (sign via determinant on x),
    # rotation = columns normalized. Shear is discarded — matching the shader.
    basis = inv[:3, :3]
    sx = float(np.linalg.norm(basis[:, 0]))
    sy = float(np.linalg.norm(basis[:, 1]))
    sz = float(np.linalg.norm(basis[:, 2]))
    if np.linalg.det(basis) < 0:
        sx = -sx
    rot = np.column_stack(
        [basis[:, 0] / sx, basis[:, 1] / sy, basis[:, 2] / sz]
    )
    return rot, np.array([sx, sy, sz]), inv[:3, 3]


def _primitive_distance(p, sdf_type: str, radius: float):
    """Shader primitives with sizes = (1, 1, 1, radius). p is [N,3] in SDF space."""
    import numpy as np

    if sdf_type == "plane":
        return p[:, 2].copy()
    if sdf_type == "sphere":
        return np.linalg.norm(p, axis=1) - radius
    if sdf_type == "box":
        q = np.abs(p) - 1.0 + radius
        outside = np.linalg.norm(np.maximum(q, 0.0), axis=1)
        inside = np.minimum(np.max(q, axis=1), 0.0)
        return outside + inside - radius
    if sdf_type == "ellipsoid":
        sizes = np.array([1.0, 1.0, 1.0])
        k0 = np.linalg.norm(p / sizes, axis=1)
        k1 = np.linalg.norm(p, axis=1) / float(np.dot(sizes, sizes))
        with np.errstate(divide="ignore", invalid="ignore"):
            d = k0 * (k0 - 1.0) / k1
        return np.where(k1 > 0, d, -1.0)
    if sdf_type == "cylinder":
        dx = np.abs(np.linalg.norm(p[:, [0, 2]], axis=1)) - radius
        dy = np.abs(p[:, 1]) - 1.0
        d2 = np.stack([dx, dy], axis=1)
        return (
            np.minimum(np.maximum(dx, dy), 0.0)
            + np.linalg.norm(np.maximum(d2, 0.0), axis=1)
        )
    raise ValueError(f"Unsupported sdfType: {sdf_type}")


def evaluate_edit_ops(xyz, ops: list[dict[str, Any]]):
    """Alpha multiplier + displacement for every splat under the op chain.

    Returns (alpha_mult [N], displacement [N,3], stats dict).
    """
    import numpy as np

    n = len(xyz)
    alpha = np.ones(n, dtype=np.float64)
    disp = np.zeros((n, 3), dtype=np.float64)
    stats: dict[str, Any] = {"opsApplied": 0, "opsSkipped": 0, "colorOpsAlphaOnly": 0}

    for op in ops:
        if op.get("enabled") is False:
            stats["opsSkipped"] += 1
            continue
        try:
            rot, scale, trans = _op_inverse_decomposed(op)
        except Exception:  # noqa: BLE001 — singular scale etc.
            stats["opsSkipped"] += 1
            continue
        p_sdf = (xyz * scale) @ rot.T + trans

        radius = float(op.get("radius") or DEFAULT_RADIUS)
        d = _primitive_distance(p_sdf, str(op.get("sdfType") or "sphere"), radius)
        if op.get("invert"):
            d = -d  # SDF-level only — see module docstring
        soft = op.get("softEdge")
        soft = DEFAULT_SOFT_EDGE if soft is None else float(soft)
        if soft == 0.0:
            modulate = (d < 0.0).astype(np.float64)
        else:
            modulate = np.clip(-d / soft + 0.5, 0.0, 1.0)

        opacity = op.get("opacity")
        opacity = (0.0 if op.get("tool") == "erase" else 1.0) if opacity is None else float(opacity)
        blend = str(op.get("rgbaBlendMode") or "multiply")
        if blend in ("multiply", "set_rgb"):
            alpha *= 1.0 + (opacity - 1.0) * modulate
            if blend == "set_rgb" or op.get("color"):
                stats["colorOpsAlphaOnly"] += 1
        elif blend == "add_rgba":
            alpha = np.clip(alpha + opacity * modulate, 0.0, None)
            stats["colorOpsAlphaOnly"] += 1

        displace = op.get("displace")
        if displace:
            disp += modulate[:, None] * np.asarray(displace, dtype=np.float64)
        stats["opsApplied"] += 1

    return alpha, disp, stats


def bake_structured_array(arr, ops: list[dict[str, Any]], drop_threshold: float = DROP_THRESHOLD):
    """Apply ops to a structured 3DGS PLY array: drop dead splats, fold partial
    alpha into the opacity logit, apply displacement. Returns (out_arr, stats)."""
    import numpy as np

    xyz = np.stack(
        [arr["x"].astype(np.float64), arr["y"].astype(np.float64), arr["z"].astype(np.float64)],
        axis=1,
    )
    alpha, disp, stats = evaluate_edit_ops(xyz, ops)

    sigma = 1.0 / (1.0 + np.exp(-arr["opacity"].astype(np.float64)))
    new_sigma = np.clip(sigma * alpha, 0.0, 1.0 - _LOGIT_CLIP)
    keep = new_sigma >= drop_threshold

    out = arr[keep].copy()
    kept_sigma = np.clip(new_sigma[keep], _LOGIT_CLIP, 1.0 - _LOGIT_CLIP)
    out["opacity"] = np.log(kept_sigma / (1.0 - kept_sigma)).astype(out["opacity"].dtype)
    moved = disp[keep]
    out["x"] = (xyz[keep, 0] + moved[:, 0]).astype(out["x"].dtype)
    out["y"] = (xyz[keep, 1] + moved[:, 1]).astype(out["y"].dtype)
    out["z"] = (xyz[keep, 2] + moved[:, 2]).astype(out["z"].dtype)

    stats.update(
        {
            "splatsTotal": int(len(arr)),
            "splatsKept": int(keep.sum()),
            "splatsDropped": int(len(arr) - keep.sum()),
            "dropThreshold": drop_threshold,
        }
    )
    return out, stats
