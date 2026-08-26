"""Tests for mesh_dollhouse. The pure-maths helpers run without Open3D; the
mesh-operating functions are guarded with importorskip so this suite passes on a
dev box where only numpy is installed."""

from __future__ import annotations

import numpy as np
import pytest

from mesh_dollhouse import (
    build_dollhouse,
    cut_ceiling,
    decimate,
    detect_horizontal_planes,
    dominant_grid_angle,
    plane_is_horizontal,
    plane_is_vertical,
    snap_heading,
    snap_walls_to_manhattan,
)

UP = np.array([0.0, 1.0, 0.0])
SIDE = np.array([1.0, 0.0, 0.0])


def _off_up(deg: float) -> np.ndarray:
    r = np.deg2rad(deg)
    return np.array([np.sin(r), np.cos(r), 0.0])


# --- orientation helpers ---------------------------------------------------


def test_horizontal_exact_up_and_down():
    assert plane_is_horizontal(UP, 1, 15.0)
    assert plane_is_horizontal(-UP, 1, 15.0)


def test_horizontal_rejects_sideways():
    assert not plane_is_horizontal(SIDE, 1, 15.0)


def test_horizontal_10_off_passes_20_off_fails():
    assert plane_is_horizontal(_off_up(10.0), 1, 15.0)
    assert not plane_is_horizontal(_off_up(20.0), 1, 15.0)


def test_vertical_is_the_complement():
    assert plane_is_vertical(SIDE, 1, 15.0)
    assert not plane_is_vertical(UP, 1, 15.0)
    assert plane_is_vertical(_off_up(80.0), 1, 15.0)
    assert not plane_is_vertical(_off_up(70.0), 1, 15.0)


def test_degenerate_normals_return_false_not_raise():
    for bad in (np.zeros(3), np.array([np.nan, 0.0, 0.0]), np.array([1.0, 0.0])):
        assert plane_is_horizontal(bad, 1, 15.0) is False
        assert plane_is_vertical(bad, 1, 15.0) is False


# --- Manhattan grid --------------------------------------------------------


def _axis_normals(rotation_deg: float) -> np.ndarray:
    out = []
    for k in range(4):
        r = np.deg2rad(rotation_deg + 90.0 * k)
        out.append([np.sin(r), 0.0, np.cos(r)])
    return np.asarray(out)


def test_grid_angle_axis_aligned_is_zero():
    got = dominant_grid_angle(_axis_normals(0.0))
    assert got is not None
    assert min(got, 90.0 - got) < 1.0


def test_grid_angle_rotated_30_recovers_30():
    got = dominant_grid_angle(_axis_normals(30.0))
    assert got is not None
    assert abs(got - 30.0) < 1.0


def test_grid_angle_random_normals_is_none():
    rng = np.random.default_rng(7)
    n = rng.normal(size=(300, 3))
    n /= np.linalg.norm(n, axis=1, keepdims=True)
    assert dominant_grid_angle(n) is None


def test_grid_angle_too_few_normals_is_none():
    assert dominant_grid_angle(np.zeros((2, 3))) is None
    assert dominant_grid_angle(np.zeros((0, 3))) is None


def test_snap_heading_47_goes_to_90_not_45():
    # The grid has FOUR axes at 0/90/180/270 — there is no 45 to snap to.
    assert snap_heading(47.0, 0.0) == pytest.approx(90.0)


def test_snap_heading_wraps_at_359():
    assert snap_heading(359.0, 0.0) == pytest.approx(0.0)


def test_snap_heading_respects_grid_offset():
    assert snap_heading(31.0, 30.0) == pytest.approx(30.0)
    assert snap_heading(100.0, 30.0) == pytest.approx(120.0)


# --- Open3D-dependent behaviour -------------------------------------------


def _room_mesh(width=4.0, depth=3.0, height=2.6, step=0.05):
    """Axis-aligned box interior: floor, ceiling and four walls as point-dense
    triangulated quads. Enough structure for RANSAC to find real planes."""
    o3d = pytest.importorskip("open3d")
    verts: list[list[float]] = []
    tris: list[list[int]] = []

    def quad(origin, u, v, nu, nv):
        base = len(verts)
        for i in range(nu + 1):
            for j in range(nv + 1):
                verts.append(
                    [origin[k] + u[k] * i / nu + v[k] * j / nv for k in range(3)]
                )
        for i in range(nu):
            for j in range(nv):
                a = base + i * (nv + 1) + j
                b = a + 1
                c = a + (nv + 1)
                d = c + 1
                tris.append([a, c, b])
                tris.append([b, c, d])

    nu, nv = int(width / step), int(depth / step)
    nh = int(height / step)
    quad([0, 0, 0], [width, 0, 0], [0, 0, depth], nu, nv)          # floor
    quad([0, height, 0], [width, 0, 0], [0, 0, depth], nu, nv)     # ceiling
    quad([0, 0, 0], [width, 0, 0], [0, height, 0], nu, nh)         # wall -Z
    quad([0, 0, depth], [width, 0, 0], [0, height, 0], nu, nh)     # wall +Z
    quad([0, 0, 0], [0, 0, depth], [0, height, 0], nv, nh)         # wall -X
    quad([width, 0, 0], [0, 0, depth], [0, height, 0], nv, nh)     # wall +X

    m = o3d.geometry.TriangleMesh()
    m.vertices = o3d.utility.Vector3dVector(np.asarray(verts))
    m.triangles = o3d.utility.Vector3iVector(np.asarray(tris))
    return m


def test_empty_mesh_skips_instead_of_raising():
    o3d = pytest.importorskip("open3d")
    empty = o3d.geometry.TriangleMesh()
    assert detect_horizontal_planes(empty)["skipped"] == "no_horizontal_planes"
    _, s = snap_walls_to_manhattan(empty)
    assert s["skipped"] == "no_manhattan_grid"
    _, s = decimate(empty)
    assert s["skipped"] == "empty_mesh"


def test_cut_ceiling_none_is_a_noop():
    o3d = pytest.importorskip("open3d")
    m = o3d.geometry.TriangleMesh()
    out, stats = cut_ceiling(m, None)
    assert out is m
    assert stats["skipped"] == "no_ceiling"
    assert stats["triangles_removed"] == 0


def test_detects_floor_and_ceiling_of_a_real_room():
    pytest.importorskip("open3d")
    got = detect_horizontal_planes(_room_mesh())
    assert got["skipped"] is None
    assert got["floor_y"] == pytest.approx(0.0, abs=0.05)
    assert got["ceiling_y"] == pytest.approx(2.6, abs=0.05)


def test_countertop_is_not_mistaken_for_a_ceiling():
    # A 1.0 m room cannot have a real ceiling — the 1.8 m storey rule rejects it.
    pytest.importorskip("open3d")
    got = detect_horizontal_planes(_room_mesh(height=1.0))
    assert got["floor_y"] is not None
    assert got["ceiling_y"] is None


def test_cut_ceiling_reports_without_removing_by_default_for_the_viewer():
    """The viewer needs open / closed / plenum ceiling states. A mesh shipped
    with the lid already deleted can only ever show the first, so the default
    reports the cut height and keeps every triangle."""
    pytest.importorskip("open3d")
    m = _room_mesh()
    before = np.asarray(m.triangles).shape[0]
    out, stats = cut_ceiling(m, 2.6, remove=False)
    assert out is m
    assert np.asarray(out.triangles).shape[0] == before
    assert stats["removed"] is False
    assert stats["triangles_removed"] == 0
    assert stats["triangles_above_cut"] > 0
    assert stats["cut_y"] == pytest.approx(2.55)


def test_build_dollhouse_keeps_the_ceiling_by_default():
    pytest.importorskip("open3d")
    _, stats = build_dollhouse(_room_mesh())
    assert stats["cut_ceiling"]["removed"] is False
    assert stats["cut_ceiling"]["cut_y"] is not None


def test_cut_ceiling_removes_the_lid_and_keeps_the_walls():
    pytest.importorskip("open3d")
    m = _room_mesh()
    before = np.asarray(m.triangles).shape[0]
    out, stats = cut_ceiling(m, 2.6, remove=True)
    assert 0 < stats["triangles_removed"] < before
    kept = np.asarray(out.vertices)
    assert kept[:, 1].max() < 2.6           # lid gone
    assert kept[:, 1].max() > 2.0           # walls still reach near the top


def test_build_dollhouse_reports_extent_after_the_cut():
    pytest.importorskip("open3d")
    _, stats = build_dollhouse(_room_mesh())
    assert stats["extent"][0] == pytest.approx(4.0, abs=0.1)
    assert stats["extent"][2] == pytest.approx(3.0, abs=0.1)
    assert stats["extent_diagonal"] > 4.0


def test_snap_walls_does_not_move_already_straight_walls_far():
    pytest.importorskip("open3d")
    m = _room_mesh()
    before = np.asarray(m.vertices).copy()
    out, stats = snap_walls_to_manhattan(m)
    if stats["skipped"] is None:
        moved = np.linalg.norm(np.asarray(out.vertices) - before, axis=1)
        assert moved.max() < 0.04   # never drags geometry across the room


def test_cut_ceiling_preserves_vertex_colours():
    """Colour is baked into vertices by the fusion. Building a bare
    TriangleMesh drops it, which silently un-textured every dollhouse."""
    o3d = pytest.importorskip("open3d")
    m = _room_mesh()
    n = np.asarray(m.vertices).shape[0]
    m.vertex_colors = o3d.utility.Vector3dVector(np.tile([0.2, 0.6, 0.9], (n, 1)))

    out, stats = cut_ceiling(m, 2.6)
    assert stats["skipped"] is None
    colors = np.asarray(out.vertex_colors)
    assert colors.shape[0] == np.asarray(out.vertices).shape[0]
    assert colors.shape[0] > 0
    assert colors[0] == pytest.approx([0.2, 0.6, 0.9], abs=1e-6)


def test_build_dollhouse_reports_whether_colour_survived():
    o3d = pytest.importorskip("open3d")
    m = _room_mesh()
    n = np.asarray(m.vertices).shape[0]
    m.vertex_colors = o3d.utility.Vector3dVector(np.tile([0.5, 0.5, 0.5], (n, 1)))
    _, stats = build_dollhouse(m)
    assert stats["has_vertex_colors"] is True


# --- decimation debris -----------------------------------------------------


class _FakeMesh:
    """Stands in for an Open3D mesh's clustering API, which needs no geometry
    here — only the label/count contract drop_decimation_debris relies on."""

    def __init__(self, labels, counts):
        self._labels, self._counts = list(labels), list(counts)
        self.removed_mask = None
        self.unreferenced_cleaned = False

    def cluster_connected_triangles(self):
        return self._labels, self._counts, None

    def remove_triangles_by_mask(self, mask):
        self.removed_mask = list(mask)

    def remove_unreferenced_vertices(self):
        self.unreferenced_cleaned = True


def test_drops_small_islands_and_keeps_the_room():
    from mesh_dollhouse import drop_decimation_debris

    # one big room, three confetti fragments
    labels = [0] * 5000 + [1] * 10 + [2] * 5 + [3] * 3
    mesh, stats = drop_decimation_debris(_FakeMesh(labels, [5000, 10, 5, 3]))
    assert stats["componentsRemoved"] == 3
    assert stats["trianglesRemoved"] == 18
    assert mesh.unreferenced_cleaned
    # the room's triangles survive
    assert not any(mesh.removed_mask[:5000])
    assert all(mesh.removed_mask[5000:])


def test_keeps_islands_at_or_above_the_threshold():
    from mesh_dollhouse import MIN_ISLAND_TRIANGLES, drop_decimation_debris

    n = MIN_ISLAND_TRIANGLES
    mesh, stats = drop_decimation_debris(_FakeMesh([0] * 5000 + [1] * n, [5000, n]))
    assert stats["componentsRemoved"] == 0
    assert mesh.removed_mask is None


def test_never_strips_the_mesh_to_nothing():
    """If every island is under the threshold the largest still survives —
    returning an empty mesh would turn a cosmetic cleanup into data loss."""
    from mesh_dollhouse import drop_decimation_debris

    mesh, stats = drop_decimation_debris(_FakeMesh([0] * 9 + [1] * 4, [9, 4]))
    assert stats["componentsRemoved"] == 1
    assert not any(mesh.removed_mask[:9])
    assert all(mesh.removed_mask[9:])


def test_reports_and_skips_when_clustering_is_unavailable():
    from mesh_dollhouse import drop_decimation_debris

    class Broken(_FakeMesh):
        def cluster_connected_triangles(self):
            raise RuntimeError("no clustering")

    mesh, stats = drop_decimation_debris(Broken([], []))
    assert "skipped" in stats
    assert mesh.removed_mask is None
