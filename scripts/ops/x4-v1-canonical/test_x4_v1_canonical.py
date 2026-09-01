"""Locks for X4 V1 canonical recreation. No V2. No pose/SIM3 recompute."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from dataset import (  # noqa: E402
    EQUATORIAL,
    EXPECTED_CAMS,
    EXPECTED_PANOS,
    EXPECTED_POINTS,
    attach_split,
    face_of,
    split_roles,
)
from sim3_apply import apply_sim3, load_exact_frame_sim3, rotate_quats, transform_gsplat_ply  # noqa: E402

SIM3 = Path(
    "/mnt/c/Users/Brian PC/Desktop/Slate360Research/Projects/KitchenAprilTags/"
    "Runs/2026-08-31T17-32-exact-frame-anchor-rescue/EXACT_FRAME_SIM3.json"
)
WORK = Path("/home/rian_/route_b_x4")


def _sim3_path() -> Path:
    win = Path(r"C:\Users\Brian PC\Desktop\Slate360Research\Projects\KitchenAprilTags"
               r"\Runs\2026-08-31T17-32-exact-frame-anchor-rescue\EXACT_FRAME_SIM3.json")
    if win.is_file():
        return win
    if SIM3.is_file():
        return SIM3
    pytest.skip("EXACT_FRAME_SIM3.json missing")


def test_holdout_is_whole_panoramas():
    times = [float(t) for t in range(166) for _ in range(4)]
    roles = split_roles(times, every=8)
    hold = {t for t, r in zip(times, roles) if r == "holdout"}
    train = {t for t, r in zip(times, roles) if r == "train"}
    assert not (hold & train)
    assert len(hold) == 21
    assert len(train) == 145
    assert all(i % 8 == 0 for i, t in enumerate(sorted(hold | train)) if t in hold)


def test_face_parser_rejects_path_tricks():
    assert face_of("front/0002000.jpg") == "front"
    assert face_of("down/0000000.jpg") == "down"


def test_exact_frame_sim3_frozen_not_recomputed():
    sim = load_exact_frame_sim3(_sim3_path())
    assert sim["x4_sfm_rerun"] is False
    assert abs(float(sim["scale"]) - 0.6300199669353641) < 1e-12
    p = np.array([[1.0, 0.0, 0.0]])
    got = apply_sim3(p, sim["scale"], np.array(sim["rotation_3x3"]), np.array(sim["translation_m"]))
    expected = sim["scale"] * (np.array(sim["rotation_3x3"]) @ p.T).T + np.array(sim["translation_m"])
    assert np.allclose(got, expected)


def _tiny_gsplat_ply(path: Path) -> None:
    n = 2
    header = (
        "ply\nformat binary_little_endian 1.0\n"
        f"element vertex {n}\n"
        "property float x\nproperty float y\nproperty float z\n"
        "property float f_dc_0\nproperty float f_dc_1\nproperty float f_dc_2\n"
        "property float opacity\n"
        "property float scale_0\nproperty float scale_1\nproperty float scale_2\n"
        "property float rot_0\nproperty float rot_1\nproperty float rot_2\nproperty float rot_3\n"
        "end_header\n"
    )
    dt = np.dtype([
        ("x", "<f4"), ("y", "<f4"), ("z", "<f4"),
        ("f_dc_0", "<f4"), ("f_dc_1", "<f4"), ("f_dc_2", "<f4"),
        ("opacity", "<f4"),
        ("scale_0", "<f4"), ("scale_1", "<f4"), ("scale_2", "<f4"),
        ("rot_0", "<f4"), ("rot_1", "<f4"), ("rot_2", "<f4"), ("rot_3", "<f4"),
    ])
    arr = np.zeros(n, dtype=dt)
    arr["x"], arr["y"], arr["z"] = [1.0, 2.0], [0.0, 0.0], [0.0, 0.0]
    arr["scale_0"] = arr["scale_1"] = arr["scale_2"] = 0.10
    arr["rot_0"] = 1.0
    arr["opacity"] = 0.5
    path.write_bytes(header.encode("ascii") + arr.tobytes())


def test_sim3_transforms_center_orientation_and_uniform_scale(tmp_path: Path):
    sim = load_exact_frame_sim3(_sim3_path())
    src = tmp_path / "raw.ply"
    dst = tmp_path / "arkit.ply"
    _tiny_gsplat_ply(src)
    n = transform_gsplat_ply(src, dst, sim)
    assert n == 2
    dt = np.dtype([
        ("x", "<f4"), ("y", "<f4"), ("z", "<f4"),
        ("f_dc_0", "<f4"), ("f_dc_1", "<f4"), ("f_dc_2", "<f4"),
        ("opacity", "<f4"),
        ("scale_0", "<f4"), ("scale_1", "<f4"), ("scale_2", "<f4"),
        ("rot_0", "<f4"), ("rot_1", "<f4"), ("rot_2", "<f4"), ("rot_3", "<f4"),
    ])
    raw = dst.read_bytes()
    body = raw[raw.find(b"end_header\n") + len(b"end_header\n"):]
    arr = np.frombuffer(body, dtype=dt, count=2)
    s = float(sim["scale"])
    assert np.allclose(arr["scale_0"], 0.10 * s, rtol=1e-5)
    assert np.allclose(arr["scale_1"], 0.10 * s, rtol=1e-5)
    assert np.allclose(arr["scale_2"], 0.10 * s, rtol=1e-5)
    q = np.column_stack([arr["rot_0"], arr["rot_1"], arr["rot_2"], arr["rot_3"]])
    ident = np.array([[1.0, 0.0, 0.0, 0.0], [1.0, 0.0, 0.0, 0.0]])
    expected_q = rotate_quats(ident, np.array(sim["rotation_3x3"]))
    assert np.allclose(q, expected_q, atol=1e-5)
    assert not np.allclose(arr["x"], [1.0, 2.0])
    assert np.allclose(arr["opacity"], 0.5)
    assert np.allclose(arr["f_dc_0"], 0.0)


@pytest.mark.skipif(not (WORK / "sparse" / "0" / "points3D.bin").is_file(), reason="Route B dataset missing")
def test_colmap_dataset_is_v1_equatorial_not_v2():
    from dataset import load_colmap, validate

    cameras, xyz, rgb = load_colmap(WORK)
    split = attach_split(cameras)
    validate(cameras, xyz, split)
    assert split["n_panos"] == EXPECTED_PANOS
    assert split["n_cameras"] == EXPECTED_CAMS
    assert len(xyz) == EXPECTED_POINTS
    assert {c["face"] for c in cameras} == set(EQUATORIAL)
    assert not any(c["face"] in ("up", "down") for c in cameras)
    assert all(c["w"] == 800 and c["h"] == 800 for c in cameras)
    assert split["n_holdout_panos"] == 21
    hold = {c["t"] for c in cameras if c["role"] == "holdout"}
    train = {c["t"] for c in cameras if c["role"] == "train"}
    assert not (hold & train)
    assert all(c["role"] != "train" or c["t"] not in hold for c in cameras)
    assert len(rgb) == EXPECTED_POINTS
