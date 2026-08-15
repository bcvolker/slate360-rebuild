"""E1 bake unit tests — shader-parity semantics of the edit-op chain.

The load-bearing assertions encode CURRENT rendered behavior (verified
against spark.module.js source): crop's double invert cancels, so a crop
box erases its INTERIOR; erase spheres erase their interior; slice planes
erase the local -z half-space; soft edges produce partial alpha; disabled
ops are ignored; displacement moves surviving splats.
"""

import numpy as np
import pytest

from bake import bake_structured_array, evaluate_edit_ops


def _op(**kw):
    base = {
        "id": "t",
        "tool": kw.pop("tool", "erase"),
        "sdfType": kw.pop("sdfType", "sphere"),
        "position": kw.pop("position", [0, 0, 0]),
        "opacity": kw.pop("opacity", 0),
        "rgbaBlendMode": "multiply",
        "softEdge": kw.pop("softEdge", 0.0),
        "sdfSmooth": 0.0,
    }
    base.update(kw)
    return base


def _pts(*points):
    return np.array(points, dtype=np.float64)


def test_erase_sphere_zeroes_inside_keeps_outside():
    xyz = _pts([0, 0, 0], [0.4, 0, 0], [2, 0, 0])
    alpha, _d, stats = evaluate_edit_ops(xyz, [_op(radius=0.5)])
    assert alpha[0] == 0.0 and alpha[1] == 0.0
    assert alpha[2] == 1.0
    assert stats["opsApplied"] == 1


def test_crop_box_double_invert_erases_interior():
    # Crop op exactly as defaultOpForTool builds it: box, invert=True,
    # scale 1.2 → the two inverts cancel and the box interior is erased.
    op = _op(
        tool="crop", sdfType="box", invert=True,
        scale=[1.2, 1.2, 1.2], size=[1.2, 1.2, 1.2], radius=None,
    )
    xyz = _pts([0, 0, 0], [1.0, 0, 0], [5, 0, 0])
    alpha, _d, _s = evaluate_edit_ops(xyz, [op])
    assert alpha[0] == 0.0          # centre: inside → erased
    assert alpha[1] == 0.0          # inside half-extent 1.2 → erased
    assert alpha[2] == 1.0          # far outside → kept


def test_slice_plane_erases_negative_z_side():
    op = _op(tool="slice", sdfType="plane", position=[0, 0, 1])
    xyz = _pts([0, 0, 0.5], [0, 0, 2.0])
    alpha, _d, _s = evaluate_edit_ops(xyz, [op])
    assert alpha[0] == 0.0  # local z = -0.5 → d<0 → modulated → erased
    assert alpha[1] == 1.0  # local z = +1.0 → kept


def test_rotated_scaled_box():
    # Box scaled 2x in x, rotated 90° about z: erasure region rotates with it.
    op = _op(
        tool="crop", sdfType="box", invert=True,
        scale=[2, 0.5, 0.5], rotation=[0, 0, np.pi / 2], radius=None,
    )
    xyz = _pts([0, 1.5, 0], [1.5, 0, 0])
    alpha, _d, _s = evaluate_edit_ops(xyz, [op])
    assert alpha[0] == 0.0  # rotated long axis now along y → inside
    assert alpha[1] == 1.0  # x direction now short (0.5) → outside


def test_soft_edge_partial_alpha_and_disabled_op():
    soft = _op(radius=1.0, softEdge=0.4)
    xyz = _pts([1.0, 0, 0])  # exactly on the surface → d=0 → modulate 0.5
    alpha, _d, _s = evaluate_edit_ops(xyz, [soft])
    assert alpha[0] == pytest.approx(0.5)
    alpha2, _d2, stats2 = evaluate_edit_ops(xyz, [dict(soft, enabled=False)])
    assert alpha2[0] == 1.0 and stats2["opsSkipped"] == 1


def test_displacement_applied_with_modulation():
    op = _op(tool="transform", opacity=1, radius=1.0, displace=[0, 0.2, 0])
    xyz = _pts([0, 0, 0], [5, 0, 0])
    _a, disp, _s = evaluate_edit_ops(xyz, [op])
    assert disp[0][1] == pytest.approx(0.2)
    assert disp[1][1] == 0.0


def _structured(xyz, opacity_logit=4.0):
    dt = np.dtype([("x", "<f4"), ("y", "<f4"), ("z", "<f4"), ("opacity", "<f4"), ("f_dc_0", "<f4")])
    arr = np.zeros(len(xyz), dtype=dt)
    arr["x"], arr["y"], arr["z"] = xyz[:, 0], xyz[:, 1], xyz[:, 2]
    arr["opacity"] = opacity_logit
    arr["f_dc_0"] = 1.23
    return arr


def test_bake_structured_drops_and_preserves_fields():
    xyz = _pts([0, 0, 0], [3, 0, 0])
    arr = _structured(xyz)
    out, stats = bake_structured_array(arr, [_op(radius=0.5)])
    assert stats["splatsTotal"] == 2 and stats["splatsKept"] == 1
    assert out["x"][0] == pytest.approx(3.0)
    assert out["f_dc_0"][0] == pytest.approx(1.23)  # untouched fields survive


def test_bake_partial_alpha_folds_into_opacity_logit():
    xyz = _pts([1.0, 0, 0])  # on the soft boundary → alpha 0.5
    arr = _structured(xyz, opacity_logit=4.0)
    out, stats = bake_structured_array(arr, [_op(radius=1.0, softEdge=0.4)])
    assert stats["splatsKept"] == 1
    before = 1 / (1 + np.exp(-4.0))
    after = 1 / (1 + np.exp(-float(out["opacity"][0])))
    assert after == pytest.approx(before * 0.5, rel=1e-4)


def test_no_ops_keeps_everything_bitwise():
    xyz = _pts([0, 0, 0], [1, 1, 1])
    arr = _structured(xyz)
    out, stats = bake_structured_array(arr, [])
    assert stats["splatsKept"] == 2
    assert np.array_equal(out["opacity"], arr["opacity"])


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
