"""M7-A — projective per-vertex colour from posed full-resolution RGB frames.

Why this exists: TSDF bakes colour per VOXEL, at the depth sensor's 256x192
resolution. That is why a fused mesh reads blotchy even when every frame was
integrated — the camera's real 1920x1440 detail never reaches the surface. This
module samples the full-resolution images directly, per vertex.

Governing rule: a smear of the wrong wall's colour is worse than an honest grey
patch. Vertices that are occluded, edge-on, or outside every frame stay neutral
and are counted, never guessed at.

Open3D (MIT) + numpy (BSD) + Pillow (HPND) only, imported inside functions.

Correction applied to the drafted version: both `visible_vertices` and
`bake_vertex_colors` looped in Python over every vertex calling
`project_vertex_to_image` one at a time — ~32 million interpreter calls for a
130k-vertex mesh over 123 frames. Projection is now vectorised over the whole
vertex array; the scalar entry point is kept because it is the testable unit.
"""

from __future__ import annotations

from typing import Any

# Unseen surfaces read as honest grey, never black — black looks like geometry,
# grey looks like missing information.
NEUTRAL_GREY = (0.65, 0.65, 0.65)
# Distance at which a view's weight halves. Roughly the LiDAR's useful range.
_DISTANCE_FALLOFF_M = 2.5


def _camera_to_world(transform_4x4: Any) -> Any:
    """Accept either a 16-element column-major list (what the capture writes) or
    an already-shaped 4x4. Reshaping is column-major to match ARKit."""
    import numpy as np

    a = np.asarray(transform_4x4, dtype=float)
    if a.shape == (4, 4):
        return a
    if a.size != 16:
        return np.eye(4)
    return a.reshape((4, 4), order="F")


def _world_to_camera(transform_4x4: Any):
    import numpy as np

    m = _camera_to_world(transform_4x4)
    if not np.isfinite(m).all() or abs(float(np.linalg.det(m[:3, :3]))) < 1e-12:
        return None
    try:
        return np.linalg.inv(m)
    except np.linalg.LinAlgError:
        return None


def project_points(
    points: Any,
    transform_4x4: Any,
    intrinsics: dict[str, float],
    width: int,
    height: int,
):
    """Vectorised pinhole projection of an (N,3) array.

    Returns (uv, depth, valid) where `valid` is False for anything behind the
    camera or outside the frame. This is the hot path — the scalar variant below
    is for tests and single lookups.
    """
    import numpy as np

    w2c = _world_to_camera(transform_4x4)
    pts = np.asarray(points, dtype=float).reshape(-1, 3)
    n = pts.shape[0]
    if w2c is None or n == 0:
        return np.zeros((n, 2)), np.zeros(n), np.zeros(n, dtype=bool)

    cam = pts @ w2c[:3, :3].T + w2c[:3, 3]
    z = cam[:, 2]
    # ARKit cameras look down their own -Z, so anything with z >= 0 is behind.
    in_front = z < -1e-9
    depth = np.where(in_front, -z, 0.0)
    safe = np.where(in_front, depth, 1.0)

    fx, fy = float(intrinsics["fx"]), float(intrinsics["fy"])
    cx, cy = float(intrinsics["cx"]), float(intrinsics["cy"])
    u = fx * cam[:, 0] / safe + cx
    v = fy * cam[:, 1] / safe + cy
    valid = in_front & (u >= 0) & (u < float(width)) & (v >= 0) & (v < float(height))
    return np.column_stack((u, v)), depth, valid


def project_vertex_to_image(
    vertex: Any,
    transform_4x4: Any,
    intrinsics: dict[str, float],
    width: int,
    height: int,
) -> tuple[float, float, float] | None:
    """Project one vertex. Returns (u, v, depth) or None.

    None — never a clamped UV — for a vertex behind the camera, outside the
    frame, or with a non-invertible pose. A clamped UV would paint an edge
    pixel across geometry the camera never saw.
    """
    uv, depth, valid = project_points([vertex], transform_4x4, intrinsics, width, height)
    if not bool(valid[0]):
        return None
    return (float(uv[0, 0]), float(uv[0, 1]), float(depth[0]))


def view_quality(mesh: Any, vertex_indices: Any, transform_4x4: Any):
    """Per-vertex weight in [0,1] from viewing angle and distance.

    A wall seen edge-on at 6 m must count for far less than one seen face-on at
    1.5 m, otherwise a grazing glimpse washes out a good close view.
    Back-facing vertices get exactly 0 so nothing is painted from behind.
    Missing normals or a bad pose return zeros rather than raising.
    """
    import numpy as np

    idx = np.asarray(vertex_indices, dtype=int).reshape(-1)
    verts_all = np.asarray(mesh.vertices, dtype=float)
    if idx.size == 0 or verts_all.shape[0] == 0:
        return np.zeros(0, dtype=float)
    if _world_to_camera(transform_4x4) is None:
        return np.zeros(idx.size, dtype=float)

    try:
        normals_all = np.asarray(mesh.vertex_normals, dtype=float)
    except (AttributeError, RuntimeError):
        return np.zeros(idx.size, dtype=float)
    if normals_all.shape[0] != verts_all.shape[0]:
        return np.zeros(idx.size, dtype=float)

    cam = _camera_to_world(transform_4x4)[:3, 3]
    verts = verts_all[idx]
    normals = normals_all[idx]

    to_cam = cam - verts
    dist = np.linalg.norm(to_cam, axis=1)
    ok = dist > 1e-8
    unit = np.zeros_like(to_cam)
    unit[ok] = to_cam[ok] / dist[ok, None]

    nlen = np.linalg.norm(normals, axis=1)
    good = nlen > 1e-8
    unit_n = np.zeros_like(normals)
    unit_n[good] = normals[good] / nlen[good, None]

    facing = np.clip(np.einsum("ij,ij->i", unit_n, unit), 0.0, 1.0)
    return np.clip(facing / (1.0 + dist / _DISTANCE_FALLOFF_M), 0.0, 1.0)


def visible_vertices(
    mesh: Any,
    transform_4x4: Any,
    intrinsics: dict[str, float],
    width: int,
    height: int,
    depth_buffer_tolerance: float = 0.05,
):
    """Frustum test plus an occlusion test against the mesh itself.

    The occlusion half is the point. A vertex on a far wall projects perfectly
    into frame while being hidden behind a near wall; colouring it from that
    camera smears the near wall's paint across the room, which is exactly the
    blotching this module exists to remove.

    Empty mesh, bad pose, or a raycast failure returns all-False.
    """
    import numpy as np

    verts = np.asarray(mesh.vertices, dtype=float)
    n = int(verts.shape[0])
    mask = np.zeros(n, dtype=bool)
    if n == 0:
        return mask

    _, _, in_frustum = project_points(verts, transform_4x4, intrinsics, width, height)
    if not np.any(in_frustum):
        return mask

    try:
        import open3d as o3d
    except ImportError:
        return mask

    origin = _camera_to_world(transform_4x4)[:3, 3]
    try:
        scene = o3d.t.geometry.RaycastingScene()
        scene.add_triangles(o3d.t.geometry.TriangleMesh.from_legacy(mesh))
        # Cast only the frustum subset — the rest cannot be visible anyway.
        idx = np.flatnonzero(in_frustum)
        dirs = verts[idx] - origin
        dist = np.linalg.norm(dirs, axis=1)
        ok = dist > 1e-8
        unit = np.zeros_like(dirs)
        unit[ok] = dirs[ok] / dist[ok, None]
        rays = np.concatenate(
            (np.broadcast_to(origin, unit.shape), unit), axis=1
        ).astype(np.float32)
        hit = scene.cast_rays(o3d.core.Tensor(rays))["t_hit"].numpy()
        mask[idx] = ok & (np.abs(hit - dist) <= float(depth_buffer_tolerance))
    except (RuntimeError, ValueError, TypeError):
        return np.zeros(n, dtype=bool)
    return mask


def _load_rgb(frame: dict[str, Any]):
    """Frame image as float RGB in [0,1], from an array, a path, or JPEG bytes."""
    import io

    import numpy as np

    img = frame.get("image")
    if img is None:
        raw = frame.get("jpeg")
        source = io.BytesIO(raw) if raw else frame.get("path")
        if source is None:
            return None
        try:
            from PIL import Image

            with Image.open(source) as handle:
                img = np.asarray(handle.convert("RGB"))
        except Exception:  # noqa: BLE001
            return None

    arr = np.asarray(img)
    if arr.ndim == 2:
        arr = np.stack((arr, arr, arr), axis=-1)
    if arr.size == 0 or arr.ndim != 3:
        return None
    arr = arr.astype(np.float64)
    if arr.max() > 1.5:
        arr = arr / 255.0
    return np.clip(arr[..., :3], 0.0, 1.0)


def _sample_bilinear(image: Any, uv: Any):
    """Bilinear sample at (N,2) UVs. Bilinear rather than nearest because this
    is final surface colour, where a smooth gradient beats a blocky one."""
    import numpy as np

    h, w = image.shape[0], image.shape[1]
    x = np.clip(uv[:, 0], 0.0, w - 1.001)
    y = np.clip(uv[:, 1], 0.0, h - 1.001)
    x0, y0 = x.astype(int), y.astype(int)
    x1, y1 = np.minimum(x0 + 1, w - 1), np.minimum(y0 + 1, h - 1)
    sx, sy = (x - x0)[:, None], (y - y0)[:, None]
    top = image[y0, x0] * (1 - sx) + image[y0, x1] * sx
    bottom = image[y1, x0] * (1 - sx) + image[y1, x1] * sx
    return top * (1 - sy) + bottom * sy


def bake_vertex_colors(
    mesh: Any, frames: list[dict[str, Any]], *, max_frames: int = 200
) -> tuple[Any, dict[str, Any]]:
    """Blend every good view of each vertex into a single colour.

    Weighted by `view_quality`, so a close face-on view dominates a distant
    grazing one instead of being averaged into mud. Vertices no camera saw stay
    NEUTRAL_GREY and are reported in `verticesUncolored` — the mesh must never
    imply it knows a colour it does not.

    Returns the mesh unchanged with a `skipped` reason for an empty mesh, no
    frames, or no usable pose.
    """
    import numpy as np

    stats: dict[str, Any] = {
        "framesUsed": 0,
        "verticesColored": 0,
        "verticesUncolored": 0,
        "meanViewsPerVertex": 0.0,
        "skipped": None,
    }
    try:
        verts = np.asarray(mesh.vertices, dtype=float)
    except (AttributeError, RuntimeError):
        return mesh, {**stats, "skipped": "empty_mesh"}
    n = int(verts.shape[0])
    if n == 0:
        return mesh, {**stats, "skipped": "empty_mesh"}
    if not frames:
        return mesh, {**stats, "skipped": "no_frames"}

    accum = np.zeros((n, 3), dtype=float)
    weight = np.zeros(n, dtype=float)
    views = np.zeros(n, dtype=float)
    used = 0

    for frame in frames[: int(max_frames)]:
        transform = frame.get("transform")
        intrinsics = frame.get("intrinsics") or {}
        if transform is None or _world_to_camera(transform) is None:
            continue
        rgb = _load_rgb(frame)
        if rgb is None:
            continue
        used += 1

        h, w = rgb.shape[0], rgb.shape[1]
        vis = visible_vertices(mesh, transform, intrinsics, w, h)
        idx = np.flatnonzero(vis)
        if idx.size == 0:
            continue

        quality = view_quality(mesh, idx, transform)
        keep = quality > 1e-6
        if not np.any(keep):
            continue
        idx = idx[keep]
        quality = quality[keep]

        uv, _, valid = project_points(verts[idx], transform, intrinsics, w, h)
        if not np.any(valid):
            continue
        idx, quality, uv = idx[valid], quality[valid], uv[valid]

        sampled = _sample_bilinear(rgb, uv)
        np.add.at(accum, idx, sampled * quality[:, None])
        np.add.at(weight, idx, quality)
        np.add.at(views, idx, 1.0)

    if used == 0:
        return mesh, {**stats, "skipped": "no_usable_frames"}

    colors = np.tile(np.asarray(NEUTRAL_GREY, dtype=float), (n, 1))
    painted = weight > 1e-6
    colors[painted] = accum[painted] / weight[painted, None]

    try:
        import open3d as o3d

        mesh.vertex_colors = o3d.utility.Vector3dVector(np.clip(colors, 0.0, 1.0))
    except (ImportError, RuntimeError):
        mesh.vertex_colors = colors

    stats.update({
        "framesUsed": int(used),
        "verticesColored": int(painted.sum()),
        "verticesUncolored": int((~painted).sum()),
        "meanViewsPerVertex": round(float(views[painted].mean()) if painted.any() else 0.0, 2),
        "skipped": None,
    })
    return mesh, stats
