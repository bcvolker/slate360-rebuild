"""Tests for M7-D atlas baking. numpy + Pillow only — no Open3D or xatlas."""

from __future__ import annotations

import numpy as np
import pytest

from atlas_bake import NEUTRAL_GREY, bake, dilate, rasterize_atlas
from mesh_atlas import MAX_VIEW_ANGLE_DEG, score_views


def _camera(pos, look_dir=(0.0, 0.0, -1.0)):
    """ARKit camera-to-world, column-major, looking down its own -Z."""
    forward = np.asarray(look_dir, dtype=float)
    forward = forward / np.linalg.norm(forward)
    z = -forward
    up = np.array([0.0, 1.0, 0.0])
    if abs(float(np.dot(up, z))) > 0.99:
        up = np.array([1.0, 0.0, 0.0])
    x = np.cross(up, z)
    x /= np.linalg.norm(x)
    y = np.cross(z, x)
    m = np.eye(4)
    m[:3, 0], m[:3, 1], m[:3, 2] = x, y, z
    m[:3, 3] = np.asarray(pos, dtype=float)
    return {
        "transform": [float(v) for v in m.reshape(16, order="F")],
        "intrinsics": {"fx": 100.0, "fy": 100.0, "cx": 49.5, "cy": 49.5},
    }


# --- view scoring ----------------------------------------------------------


def test_a_closer_camera_beats_a_further_one():
    centroids = np.array([[0.0, 0.0, 0.0]])
    normals = np.array([[0.0, 0.0, 1.0]])
    s = score_views(centroids, normals, [_camera((0, 0, 1.0)), _camera((0, 0, 3.0))])
    assert s[0, 0] > s[0, 1] > 0


def test_a_face_on_camera_beats_an_oblique_one():
    centroids = np.array([[0.0, 0.0, 0.0]])
    normals = np.array([[0.0, 0.0, 1.0]])
    head_on = _camera((0.0, 0.0, 2.0))
    oblique = _camera((1.9, 0.0, 0.6))          # same distance, ~72 deg off
    s = score_views(centroids, normals, [head_on, oblique])
    assert s[0, 0] > s[0, 1]


def test_a_camera_past_the_angle_limit_scores_zero():
    """A grazing view smears a handful of stretched pixels across the whole
    face — worse than admitting the face was not usefully seen."""
    centroids = np.array([[0.0, 0.0, 0.0]])
    normals = np.array([[0.0, 0.0, 1.0]])
    beyond = np.deg2rad(MAX_VIEW_ANGLE_DEG + 15.0)
    cam = _camera((float(np.sin(beyond)) * 2, 0.0, float(np.cos(beyond)) * 2))
    assert score_views(centroids, normals, [cam])[0, 0] == 0.0


def test_a_camera_past_the_distance_limit_scores_zero():
    centroids = np.array([[0.0, 0.0, 0.0]])
    normals = np.array([[0.0, 0.0, 1.0]])
    assert score_views(centroids, normals, [_camera((0, 0, 99.0))])[0, 0] == 0.0


def test_a_backward_facing_normal_is_still_scored():
    """TSDF normals are not consistently oriented. Treating a flipped normal as
    invisible left 26.7% of an earlier kitchen grey for no reason but winding."""
    centroids = np.array([[0.0, 0.0, 0.0]])
    flipped = np.array([[0.0, 0.0, -1.0]])
    assert score_views(centroids, flipped, [_camera((0, 0, 1.0))])[0, 0] > 0


def test_degenerate_normals_do_not_produce_nan():
    centroids = np.array([[0.0, 0.0, 0.0]])
    s = score_views(centroids, np.array([[0.0, 0.0, 0.0]]), [_camera((0, 0, 1.0))])
    assert np.isfinite(s).all()


# --- rasterisation ---------------------------------------------------------


def test_a_full_quad_covers_the_whole_atlas():
    uv = np.array([[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]])
    idx = np.array([[0, 1, 2], [0, 2, 3]])
    face_id, bary = rasterize_atlas(uv, idx, 16)
    assert (face_id >= 0).all()
    assert set(np.unique(face_id).tolist()) == {0, 1}


def test_barycentrics_sum_to_one_inside_a_face():
    uv = np.array([[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]])
    idx = np.array([[0, 1, 2], [0, 2, 3]])
    face_id, bary = rasterize_atlas(uv, idx, 16)
    covered = face_id >= 0
    assert bary[covered].sum(axis=1) == pytest.approx(1.0, abs=1e-4)


def test_texels_outside_every_chart_are_marked_empty():
    # a small triangle in one corner leaves most of the atlas uncovered
    uv = np.array([[0.0, 0.0], [0.2, 0.0], [0.0, 0.2]])
    face_id, _ = rasterize_atlas(uv, np.array([[0, 1, 2]]), 32)
    assert (face_id < 0).any()
    assert (face_id >= 0).any()


def test_a_degenerate_face_is_skipped_not_fatal():
    uv = np.array([[0.5, 0.5], [0.5, 0.5], [0.5, 0.5]])
    face_id, _ = rasterize_atlas(uv, np.array([[0, 1, 2]]), 8)
    assert (face_id < 0).all()


# --- baking ----------------------------------------------------------------


class _Mesh:
    def __init__(self, vertices, triangles):
        self.vertices = np.asarray(vertices, dtype=float)
        self.triangles = np.asarray(triangles)


def _quad_mesh():
    """A 2x2 m wall on the z=0 plane, facing +Z."""
    v = np.array([[-1.0, -1.0, 0.0], [1.0, -1.0, 0.0], [1.0, 1.0, 0.0], [-1.0, 1.0, 0.0]])
    t = np.array([[0, 1, 2], [0, 2, 3]])
    return _Mesh(v, t)


def _uv_for_quad():
    uv = np.array([[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]])
    idx = np.array([[0, 1, 2], [0, 2, 3]])
    return uv, idx


def _solid_frame(colour, pos=(0.0, 0.0, 2.0)):
    import io

    from PIL import Image

    img = Image.new("RGB", (100, 100), colour)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    frame = _camera(pos)
    frame["jpeg"] = buf.getvalue()
    return frame


def test_bake_paints_texels_from_the_chosen_view():
    mesh = _quad_mesh()
    uv, idx = _uv_for_quad()
    frames = [_solid_frame((255, 0, 0))]
    atlas, stats = bake(mesh, uv, idx, np.array([0, 0]), frames, size=32)
    assert stats["texelsPainted"] > 0
    assert stats["framesDecoded"] == 1
    # the wall is a solid red image, so painted texels must be red
    assert atlas[16, 16].tolist() == [255, 0, 0]


def test_a_face_with_no_view_stays_neutral_grey():
    """The mesh must never imply it knows a colour no camera supplied."""
    mesh = _quad_mesh()
    uv, idx = _uv_for_quad()
    atlas, stats = bake(mesh, uv, idx, np.array([-1, -1]), [_solid_frame((255, 0, 0))], size=16)
    assert stats["texelsPainted"] == 0
    expected = [int(c * 255) for c in NEUTRAL_GREY]
    assert atlas[8, 8].tolist() == expected


def test_each_face_uses_its_OWN_chosen_view_not_an_average():
    """The point of the rewrite. Averaging every view that sees a surface is a
    blur kernel; each face must take its winner whole."""
    mesh = _quad_mesh()
    uv, idx = _uv_for_quad()
    frames = [_solid_frame((255, 0, 0)), _solid_frame((0, 0, 255))]
    atlas, _ = bake(mesh, uv, idx, np.array([0, 1]), frames, size=64)
    colours = {tuple(c) for c in atlas.reshape(-1, 3).tolist()}
    assert (255, 0, 0) in colours
    assert (0, 0, 255) in colours
    # no blend of the two ever appears
    assert not any(0 < c[0] < 255 and 0 < c[2] < 255 for c in colours)


def test_an_undecodable_frame_is_counted_not_fatal():
    mesh = _quad_mesh()
    uv, idx = _uv_for_quad()
    bad = _camera((0.0, 0.0, 2.0))
    bad["jpeg"] = b"not a jpeg"
    atlas, stats = bake(mesh, uv, idx, np.array([0, 0]), [bad], size=16)
    assert stats["framesFailed"] == 1
    assert stats["texelsPainted"] == 0


def test_a_frame_behind_the_surface_paints_nothing():
    """Projecting a point that sits behind the lens must not wrap around and
    sample an arbitrary pixel."""
    mesh = _quad_mesh()
    uv, idx = _uv_for_quad()
    behind = _solid_frame((255, 0, 0), pos=(0.0, 0.0, -2.0))
    atlas, stats = bake(mesh, uv, idx, np.array([0, 0]), [behind], size=16)
    assert stats["texelsPainted"] == 0


# --- dilation --------------------------------------------------------------


def test_dilate_bleeds_colour_into_the_padding():
    atlas = np.zeros((8, 8, 3), dtype=np.uint8)
    painted = np.zeros((8, 8), dtype=bool)
    atlas[4, 4] = [10, 20, 30]
    painted[4, 4] = True
    out = dilate(atlas, painted, iterations=1)
    assert out[4, 3].tolist() == [10, 20, 30]
    assert out[3, 4].tolist() == [10, 20, 30]


def test_dilate_leaves_painted_texels_untouched():
    atlas = np.zeros((8, 8, 3), dtype=np.uint8)
    painted = np.ones((8, 8), dtype=bool)
    atlas[...] = 77
    out = dilate(atlas, painted, iterations=3)
    assert (out == 77).all()


def test_dilate_on_an_empty_mask_is_a_no_op():
    atlas = np.full((8, 8, 3), 5, dtype=np.uint8)
    out = dilate(atlas, np.zeros((8, 8), dtype=bool), iterations=3)
    assert (out == 5).all()


# --- unwrap fallback -------------------------------------------------------


def test_grid_unwrap_gives_every_triangle_its_own_texels():
    """The deterministic fallback. It exists because a chart unwrap that
    overruns does not fail — it holds the GIL, starves the worker heartbeat,
    and gets the whole container killed and retried."""
    from atlas_unwrap import unwrap_grid

    tris = np.arange(30).reshape(10, 3)
    vmap, idx, uv = unwrap_grid(tris, resolution=1024)
    assert len(idx) == 10
    assert uv.shape == (30, 2)
    assert vmap.tolist() == tris.reshape(-1).tolist()
    assert (uv >= 0).all() and (uv <= 1).all()


def test_grid_unwrap_cells_do_not_overlap():
    from atlas_unwrap import unwrap_grid

    _, idx, uv = unwrap_grid(np.arange(48).reshape(16, 3), resolution=1024)
    boxes = [(uv[f].min(axis=0), uv[f].max(axis=0)) for f in idx]
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            (lo_a, hi_a), (lo_b, hi_b) = boxes[i], boxes[j]
            disjoint = (hi_a[0] <= lo_b[0]) or (hi_b[0] <= lo_a[0]) or \
                       (hi_a[1] <= lo_b[1]) or (hi_b[1] <= lo_a[1])
            assert disjoint, f"cells {i} and {j} overlap"


def test_grid_unwrap_handles_an_empty_mesh():
    from atlas_unwrap import unwrap_grid

    vmap, idx, uv = unwrap_grid(np.zeros((0, 3), dtype=int), resolution=512)
    assert len(vmap) == 0 and len(idx) == 0 and len(uv) == 0


def test_grid_unwrap_leaves_padding_between_cells():
    """Without padding, bilinear filtering samples the neighbouring triangle
    and every edge in the model gets a wrong-coloured fringe."""
    from atlas_unwrap import unwrap_grid

    _, idx, uv = unwrap_grid(np.arange(12).reshape(4, 3), resolution=1024)
    assert uv.min() > 0.0


def test_a_face_outside_the_frame_scores_zero():
    """Close and square-on is not the same as visible. Without a frustum test a
    face gets assigned to a camera pointing elsewhere and then paints nothing —
    69% of faces held a view while only 5.9% of texels took colour."""
    # camera at the origin looking down -Z; this point is far off to the side
    off_to_the_side = np.array([[8.0, 0.0, -2.0]])
    normals = np.array([[0.0, 0.0, 1.0]])
    assert score_views(off_to_the_side, normals, [_camera((0.0, 0.0, 0.0))])[0, 0] == 0.0


def test_a_face_inside_the_frame_still_scores():
    straight_ahead = np.array([[0.0, 0.0, -2.0]])
    normals = np.array([[0.0, 0.0, 1.0]])
    assert score_views(straight_ahead, normals, [_camera((0.0, 0.0, 0.0))])[0, 0] > 0


# --- voxel-colour fallback -------------------------------------------------


def _coloured_quad_mesh():
    mesh = _quad_mesh()
    # solid green vertex colours, as the TSDF would have integrated them
    mesh.vertex_colors = np.tile(np.array([0.0, 1.0, 0.0]), (4, 1))
    return mesh


def test_a_face_with_no_camera_falls_back_to_measured_vertex_colour():
    """Soft but MEASURED beats a grey void — the TSDF integrated this colour
    from the same photographs, just at voxel resolution."""
    mesh = _coloured_quad_mesh()
    uv, idx = _uv_for_quad()
    atlas, stats = bake(mesh, uv, idx, np.array([-1, -1]), [_solid_frame((255, 0, 0))], size=32)
    assert stats["texelsFromPhoto"] == 0
    assert stats["texelsFromVoxelColour"] > 0
    assert atlas[16, 16].tolist() == [0, 255, 0]


def test_photo_colour_always_wins_over_the_fallback():
    mesh = _coloured_quad_mesh()
    uv, idx = _uv_for_quad()
    atlas, stats = bake(mesh, uv, idx, np.array([0, 0]), [_solid_frame((255, 0, 0))], size=32)
    assert stats["texelsFromPhoto"] > 0
    assert atlas[16, 16].tolist() == [255, 0, 0]


def test_a_mesh_without_vertex_colours_fills_nothing():
    """It must never guess. No colour anywhere means the texel stays grey."""
    mesh = _quad_mesh()
    uv, idx = _uv_for_quad()
    atlas, stats = bake(mesh, uv, idx, np.array([-1, -1]), [_solid_frame((255, 0, 0))], size=16)
    assert stats["texelsFromVoxelColour"] == 0
    assert atlas[8, 8].tolist() == [int(c * 255) for c in NEUTRAL_GREY]
