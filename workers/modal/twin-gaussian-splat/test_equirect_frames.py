"""Tests for M7-B equirect unwrapping. numpy only — no Open3D needed."""

from __future__ import annotations

import numpy as np
import pytest

from equirect_frames import (
    FACES,
    cube_face_intrinsics,
    cube_face_rotation,
    direction_to_equirect_uv,
    equirect_to_cube_faces,
    estimate_rig_poses,
    frames_from_equirect,
    operator_mask_for_face,
)

DIRECTIONS = {
    "front": (0.0, 0.0, -1.0),
    "right": (1.0, 0.0, 0.0),
    "back": (0.0, 0.0, 1.0),
    "left": (-1.0, 0.0, 0.0),
    "up": (0.0, 1.0, 0.0),
    "down": (0.0, -1.0, 0.0),
}
COLOURS = {
    "front": (255, 0, 0),
    "right": (0, 255, 0),
    "back": (255, 255, 0),
    "left": (0, 0, 255),
    "up": (255, 255, 255),
    "down": (40, 40, 40),
}


def test_intrinsics_of_a_ninety_degree_face():
    k = cube_face_intrinsics(1024)
    assert k["fx"] == pytest.approx(512.0)
    assert k["fy"] == pytest.approx(512.0)
    assert k["cx"] == pytest.approx(512.0)
    assert k["cy"] == pytest.approx(512.0)
    assert cube_face_intrinsics(1)["fx"] == 0.0


def test_every_face_rotation_is_exactly_orthonormal():
    for name in FACES:
        r = cube_face_rotation(name)
        assert r @ r.T == pytest.approx(np.eye(3), abs=1e-12)
        assert float(np.linalg.det(r)) == pytest.approx(1.0, abs=1e-12)


def test_front_is_identity_and_back_is_a_half_turn():
    assert cube_face_rotation("front") == pytest.approx(np.eye(3))
    back = cube_face_rotation("back")
    assert back[0, 0] == pytest.approx(-1.0)
    assert back[2, 2] == pytest.approx(-1.0)


def test_each_face_rotation_points_where_its_name_says():
    """A face's camera looks down its own -Z; rotated into the rig it must land
    on that face's direction. This is what a transposed matrix would break."""
    for name, want in DIRECTIONS.items():
        got = cube_face_rotation(name) @ np.array([0.0, 0.0, -1.0])
        assert got == pytest.approx(np.array(want), abs=1e-12), name


def test_an_unknown_face_falls_back_to_front_rather_than_guessing():
    assert cube_face_rotation("sideways") == pytest.approx(np.eye(3))


def test_the_equirect_convention_is_what_the_docstring_claims():
    u, v = direction_to_equirect_uv(np.array([[0.0, 0.0, -1.0]]))
    assert u[0] == pytest.approx(0.5) and v[0] == pytest.approx(0.5)   # front, centre
    u, v = direction_to_equirect_uv(np.array([[1.0, 0.0, 0.0]]))
    assert u[0] == pytest.approx(0.75)                                  # +X is right
    u, v = direction_to_equirect_uv(np.array([[0.0, 1.0, 0.0]]))
    assert v[0] == pytest.approx(0.0)                                   # +Y is the top


def _painted_equirect(h: int = 128, w: int = 256) -> np.ndarray:
    """Each of the six principal directions painted a distinct colour."""
    yy, xx = np.mgrid[0:h, 0:w]
    lon = ((xx + 0.5) / w - 0.5) * 2.0 * np.pi
    lat = (0.5 - (yy + 0.5) / h) * np.pi
    x = np.cos(lat) * np.sin(lon)
    y = np.sin(lat)
    z = -np.cos(lat) * np.cos(lon)

    names = list(DIRECTIONS)
    dots = np.stack([x * DIRECTIONS[n][0] + y * DIRECTIONS[n][1] + z * DIRECTIONS[n][2]
                     for n in names], axis=-1)
    winner = np.argmax(dots, axis=-1)
    img = np.zeros((h, w, 3), dtype=np.uint8)
    for i, name in enumerate(names):
        img[winner == i] = COLOURS[name]
    return img


def test_each_cube_face_comes_back_the_right_colour():
    """The decisive test. A flipped or rotated equirect convention silently
    turns the whole room, and nothing downstream can detect it — so assert that
    every face centre carries its own direction's colour."""
    faces = equirect_to_cube_faces(_painted_equirect(), face_size=32)
    assert set(faces) == set(FACES)
    for name, rgb in COLOURS.items():
        centre = faces[name][16, 16].astype(float)
        assert np.linalg.norm(centre - np.array(rgb, dtype=float)) < 40.0, name


def test_faces_are_the_requested_size_and_dtype():
    faces = equirect_to_cube_faces(_painted_equirect(), face_size=24)
    assert faces["front"].shape == (24, 24, 3)
    assert faces["front"].dtype == np.uint8


def test_sampling_wraps_across_the_seam_rather_than_clamping():
    """The 'back' face straddles u=0. Clamping instead of wrapping smears one
    column of pixels across the join."""
    faces = equirect_to_cube_faces(_painted_equirect(), face_size=32)
    back = faces["back"].astype(float)
    left_edge, right_edge = back[16, 0], back[16, -1]
    assert np.linalg.norm(left_edge - right_edge) < 60.0


def test_degenerate_equirects_skip_rather_than_unwrap_nonsense():
    assert equirect_to_cube_faces(np.zeros((1, 1, 3), dtype=np.uint8)) == {}
    assert equirect_to_cube_faces(np.zeros((0, 0, 3))) == {}
    # Square input is not equirectangular; unwrapping it would look plausible
    # and be wrong, which is worse than refusing.
    assert equirect_to_cube_faces(np.zeros((32, 32, 3), dtype=np.uint8)) == {}
    assert equirect_to_cube_faces(_painted_equirect(), face_size=1) == {}


def test_frames_carry_column_major_transforms_and_can_drop_the_nadir():
    img = _painted_equirect()
    rig = np.eye(4)
    six = frames_from_equirect(img, rig, face_size=16)
    five = frames_from_equirect(
        img, rig, face_size=16, faces=["front", "right", "back", "left", "up"]
    )
    assert len(six) == 6 and len(five) == 5
    assert all(len(f["transform"]) == 16 for f in six)
    assert {f["face"] for f in five} == {"front", "right", "back", "left", "up"}
    for f in six:
        r = np.array(f["transform"], dtype=float).reshape((4, 4), order="F")[:3, :3]
        assert r @ r.T == pytest.approx(np.eye(3), abs=1e-9)


def test_frames_compose_the_rig_pose_with_the_face_rotation():
    rig = np.eye(4)
    rig[:3, 3] = [1.0, 2.0, 3.0]
    frames = frames_from_equirect(_painted_equirect(), rig, face_size=16, faces=["right"])
    m = np.array(frames[0]["transform"], dtype=float).reshape((4, 4), order="F")
    assert m[:3, 3] == pytest.approx([1.0, 2.0, 3.0])
    assert m[:3, :3] == pytest.approx(cube_face_rotation("right"), abs=1e-12)


def test_a_broken_pose_or_image_yields_no_frames():
    assert frames_from_equirect(_painted_equirect(), np.full(16, np.nan)) == []
    assert frames_from_equirect(np.zeros((4, 4, 3), dtype=np.uint8), np.eye(4)) == []


def test_the_operator_is_masked_out_of_the_nadir():
    face = np.zeros((64, 64, 3), dtype=np.uint8)
    down = operator_mask_for_face(face, "down")
    assert down is not None
    assert bool(down[32, 32])       # centre of the nadir is the operator
    assert not bool(down[0, 0])     # corners are floor
    assert operator_mask_for_face(face, "front") is not None
    # `up` is unmasked ON A HIGH PASS. A low pass puts the operator here and
    # this mask will not save it — that is what MASK-2 is for.
    assert operator_mask_for_face(face, "up") is None


def test_rig_alignment_recovers_a_known_yaw():
    t = np.linspace(0.0, 6.0, 25)
    src = np.column_stack((t, np.zeros_like(t), np.sin(t) * 0.4))
    yaw = np.deg2rad(35.0)
    c, s = np.cos(yaw), np.sin(yaw)
    tgt = np.column_stack((c * src[:, 0] + s * src[:, 2], src[:, 1],
                           -s * src[:, 0] + c * src[:, 2])) + [1.0, 0.0, -0.5]
    got = estimate_rig_poses(src, tgt, yaw_step_deg=5.0, min_overlap=0.15)
    assert got["verdict"] == "aligned"
    err = abs(got["yaw_deg"] - 35.0)
    assert min(err, 360.0 - err) <= 5.0


def test_rig_alignment_refuses_when_the_walks_do_not_overlap():
    t = np.linspace(0.0, 6.0, 25)
    src = np.column_stack((t, np.zeros_like(t), np.sin(t) * 0.4))
    far = np.column_stack((t + 40.0, np.zeros_like(t), t + 40.0))
    got = estimate_rig_poses(src, far, yaw_step_deg=10.0, min_overlap=0.20)
    assert got["verdict"] == "failed"
    assert got["skipped"] == "insufficient_overlap"


def test_rig_alignment_refuses_a_rotationally_ambiguous_room():
    """A symmetric set of centres aligns to itself at several yaws. Accepting
    the winner would offset the whole 360 walk by one wall."""
    ring = np.array([[np.cos(a), 0.0, np.sin(a)] for a in np.linspace(0, 2 * np.pi, 24, endpoint=False)])
    got = estimate_rig_poses(ring, ring, yaw_step_deg=5.0, min_overlap=0.10)
    assert got["verdict"] in {"ambiguous", "failed"}
    assert got["skipped"] is not None


def test_rig_alignment_degenerate_input():
    got = estimate_rig_poses(np.zeros((1, 3)), np.zeros((1, 3)))
    assert got["verdict"] == "failed"
    assert got["skipped"] == "degenerate_centers"
