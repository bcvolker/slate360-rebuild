"""Tests for M7-A projective texturing. Pure-maths tests run without Open3D."""

from __future__ import annotations

import numpy as np
import pytest

from mesh_texture import (
    NEUTRAL_GREY,
    bake_vertex_colors,
    project_points,
    project_vertex_to_image,
    view_quality,
    visible_vertices,
)

K = {"fx": 500.0, "fy": 500.0, "cx": 320.0, "cy": 240.0}
W, H = 640, 480
IDENTITY = np.eye(4).reshape(16, order="F")


class _Mesh:
    """Duck-typed stand-in so the pure maths is testable without Open3D."""

    def __init__(self, verts, normals):
        self.vertices = np.asarray(verts, dtype=float)
        self.vertex_normals = np.asarray(normals, dtype=float)
        self.triangles = np.zeros((0, 3), dtype=np.int32)


def _camera_at(z: float) -> np.ndarray:
    t = np.eye(4)
    t[2, 3] = z
    return t.reshape(16, order="F")


# --- projection ------------------------------------------------------------


def test_straight_ahead_lands_on_the_principal_point():
    hit = project_vertex_to_image((0.0, 0.0, -2.0), IDENTITY, K, W, H)
    assert hit is not None
    assert hit[0] == pytest.approx(320.0)
    assert hit[1] == pytest.approx(240.0)
    assert hit[2] == pytest.approx(2.0)


def test_behind_the_camera_is_none():
    assert project_vertex_to_image((0.0, 0.0, 2.0), IDENTITY, K, W, H) is None


def test_outside_the_frustum_is_none():
    assert project_vertex_to_image((80.0, 0.0, -2.0), IDENTITY, K, W, H) is None


def test_offset_right_lands_right_of_the_principal_point():
    hit = project_vertex_to_image((0.1, 0.0, -2.0), IDENTITY, K, W, H)
    assert hit is not None
    assert hit[0] > 320.0


def test_a_non_invertible_pose_is_none_not_a_crash():
    assert project_vertex_to_image((0.0, 0.0, -1.0), np.zeros(16), K, W, H) is None


def test_vectorised_projection_matches_the_scalar_one():
    pts = np.array([[0.0, 0.0, -2.0], [0.1, 0.05, -3.0], [0.0, 0.0, 2.0], [80.0, 0.0, -2.0]])
    uv, depth, valid = project_points(pts, IDENTITY, K, W, H)
    assert list(valid) == [True, True, False, False]
    for i in (0, 1):
        scalar = project_vertex_to_image(pts[i], IDENTITY, K, W, H)
        assert scalar is not None
        assert uv[i, 0] == pytest.approx(scalar[0])
        assert uv[i, 1] == pytest.approx(scalar[1])
        assert depth[i] == pytest.approx(scalar[2])


def test_projecting_an_empty_array_is_safe():
    uv, depth, valid = project_points(np.zeros((0, 3)), IDENTITY, K, W, H)
    assert uv.shape == (0, 2) and depth.size == 0 and valid.size == 0


# --- view quality ----------------------------------------------------------


def test_face_on_beats_edge_on():
    xf = _camera_at(3.0)
    face = _Mesh([[0, 0, 0]], [[0, 0, 1]])
    edge = _Mesh([[0, 0, 0]], [[1, 0, 0]])
    assert view_quality(face, [0], xf)[0] > view_quality(edge, [0], xf)[0]


def test_near_beats_far():
    xf = _camera_at(3.0)
    near = _Mesh([[0, 0, 1.5]], [[0, 0, 1]])
    far = _Mesh([[0, 0, -3.0]], [[0, 0, 1]])
    assert view_quality(near, [0], xf)[0] > view_quality(far, [0], xf)[0]


def test_quality_stays_in_range():
    xf = _camera_at(3.0)
    for normal in ([0, 0, 1], [1, 0, 0], [0, 1, 0], [0.3, 0.3, 0.9], [0, 0, -1]):
        q = view_quality(_Mesh([[0, 0, 0]], [normal]), [0], xf)[0]
        assert 0.0 <= q <= 1.0


def test_a_flipped_normal_scores_the_same_as_a_correct_one():
    """TSDF normals come back inconsistently oriented. On the kitchen, floor
    vertices with DOWN-pointing normals were 84.6% untextured against 12.5% for
    correctly-oriented ones — solely because a clamped dot product scored them
    zero. Visibility is settled by the occlusion raycast, so only |cos| matters."""
    xf = _camera_at(3.0)
    up = view_quality(_Mesh([[0, 0, 0]], [[0, 0, 1]]), [0], xf)[0]
    down = view_quality(_Mesh([[0, 0, 0]], [[0, 0, -1]]), [0], xf)[0]
    assert down == pytest.approx(up)
    assert up > 0.0


def test_quality_degenerates_to_zero_rather_than_raising():
    assert view_quality(_Mesh(np.zeros((0, 3)), np.zeros((0, 3))), [], IDENTITY).size == 0
    bad_pose = view_quality(_Mesh([[0, 0, 0]], [[0, 0, 1]]), [0], np.zeros(16))
    assert bad_pose[0] == 0.0


# --- Open3D-dependent ------------------------------------------------------


def _two_walls():
    """Near wall at z=-1.5, far wall at z=-4, camera at the origin facing -Z."""
    o3d = pytest.importorskip("open3d")

    def wall(z: float):
        v = np.array([[-1, 0, z], [1, 0, z], [1, 2, z], [-1, 2, z]], dtype=float)
        m = o3d.geometry.TriangleMesh()
        m.vertices = o3d.utility.Vector3dVector(v)
        m.triangles = o3d.utility.Vector3iVector(np.array([[0, 1, 2], [0, 2, 3]], dtype=np.int32))
        return m

    both = wall(-1.5) + wall(-4.0)
    both.compute_vertex_normals()
    return both


def test_the_far_wall_is_occluded_by_the_near_one():
    """The reason this module exists. Without the occlusion test, the far wall
    gets painted with the near wall's colour and the model reads blotchy."""
    mesh = _two_walls()
    vis = visible_vertices(mesh, IDENTITY, K, W, H, depth_buffer_tolerance=0.08)
    assert bool(vis[:4].any())
    assert not bool(vis[4:].any())


def test_baking_paints_what_is_seen_and_leaves_the_rest_grey():
    mesh = _two_walls()
    red = np.zeros((H, W, 3), dtype=np.uint8)
    red[:] = (255, 0, 0)
    out, stats = bake_vertex_colors(
        mesh, [{"image": red, "transform": IDENTITY, "intrinsics": K}]
    )
    colors = np.asarray(out.vertex_colors)
    assert stats["skipped"] is None
    assert stats["framesUsed"] == 1
    assert stats["verticesColored"] > 0
    assert stats["verticesUncolored"] > 0
    assert colors[:4].mean(axis=0)[0] > 0.7          # near wall is red
    assert colors[4:].mean() == pytest.approx(NEUTRAL_GREY[0], abs=0.08)


def test_bake_degenerate_inputs_skip_rather_than_raise():
    o3d = pytest.importorskip("open3d")
    empty = o3d.geometry.TriangleMesh()
    out, stats = bake_vertex_colors(empty, [])
    assert out is empty and stats["skipped"] == "empty_mesh"

    mesh = _two_walls()
    out2, stats2 = bake_vertex_colors(mesh, [])
    assert out2 is mesh and stats2["skipped"] == "no_frames"


def test_a_singular_transform_yields_no_usable_frames():
    mesh = _two_walls()
    frames = [{"image": np.full((H, W, 3), 255, dtype=np.uint8),
               "transform": np.zeros(16), "intrinsics": K}]
    out, stats = bake_vertex_colors(mesh, frames)
    assert stats["skipped"] == "no_usable_frames"
    assert out is mesh


def test_two_views_blend_toward_the_closer_one():
    """A close face-on view must dominate a distant one rather than averaging
    into mud — otherwise a grazing glimpse washes out good detail."""
    mesh = _two_walls()
    red = np.zeros((H, W, 3), dtype=np.uint8)
    red[:] = (255, 0, 0)
    blue = np.zeros((H, W, 3), dtype=np.uint8)
    blue[:] = (0, 0, 255)
    close = np.eye(4)
    close[2, 3] = -0.5           # 1.0 m from the near wall
    far = np.eye(4)
    far[2, 3] = 6.0              # 7.5 m away
    out, _ = bake_vertex_colors(mesh, [
        {"image": red, "transform": close.reshape(16, order="F"), "intrinsics": K},
        {"image": blue, "transform": far.reshape(16, order="F"), "intrinsics": K},
    ])
    near_wall = np.asarray(out.vertex_colors)[:4].mean(axis=0)
    assert near_wall[0] > near_wall[2]


# --- frame selection -------------------------------------------------------


def test_select_frames_keeps_everything_under_the_cap():
    from mesh_texture import select_frames

    frames = [{"i": i} for i in range(50)]
    assert select_frames(frames, 800) is frames


def test_select_frames_thins_by_stride_not_truncation():
    """The bug this replaced: frames[:max] keeps the START of the walk and
    discards the end, leaving the last rooms scanned permanently grey."""
    from mesh_texture import select_frames

    frames = [{"i": i} for i in range(1000)]
    got = select_frames(frames, 100)
    assert len(got) == 100
    assert got[0]["i"] == 0
    # The end of the walk MUST survive.
    assert got[-1]["i"] > 900


def test_select_frames_spans_the_whole_list_evenly():
    from mesh_texture import select_frames

    got = [f["i"] for f in select_frames([{"i": i} for i in range(1000)], 10)]
    assert got == [0, 100, 200, 300, 400, 500, 600, 700, 800, 900]


def test_select_frames_never_indexes_past_the_end():
    from mesh_texture import select_frames

    for total in (3, 7, 101, 999):
        for cap in (1, 2, 5, 100):
            got = select_frames([{"i": i} for i in range(total)], cap)
            assert len(got) == min(total, cap)
            assert all(0 <= f["i"] < total for f in got)
