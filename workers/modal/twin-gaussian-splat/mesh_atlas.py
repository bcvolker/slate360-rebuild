"""M7-D — bake the photographs into a UV texture atlas.

This replaces per-vertex colour, which was the single biggest limit on how real
the twin looked. Measured on the 2026-08-25 kitchen: 223.8 m2 of surface across
109,210 vertices is 488 colour samples per m2 — one every 4.5 cm — while the
source frames resolve 1.5 mm at 2 m. Roughly 30x linear detail, 900x in pixels,
was discarded before it ever reached the model. No amount of extra coverage can
recover it: at 0% untextured the surface would still be a 4.5 cm smear.

An atlas decouples texture resolution from mesh resolution. 4096px over 224 m2
is ~3.7 mm per texel (~4.9 mm at the ~57% packing efficiency xatlas achieves on
this mesh), which is finer than the mesh's own 26.8 mm median error — so
geometry, not texel density, becomes the limit. That is the correct place to
stop; 8192 buys sharper flat walls but ghosts edges, where misregistration is
already worth many texels.

Two changes matter, not one:

1. Texels instead of vertices — the resolution fix above.
2. BEST VIEW instead of a weighted average. The old baker accumulated a
   weighted mean of every frame that saw a vertex, and averaging ten slightly
   misregistered views is a blur kernel in its own right, independent of
   sampling density. Here each face picks one winning camera. This is what
   mvs-texturing (Waechter 2014) does and it is why published twins look sharp.

Geometry is never touched. This module reads vertex positions and writes only
UVs and an image.

Licences: xatlas MIT, numpy BSD, Pillow HPND, Open3D MIT.
"""

from __future__ import annotations

from typing import Any

# Reject a camera for a face beyond these. A grazing or distant view samples a
# few stretched pixels across the whole face and paints mush; better to fall
# through to the next candidate, or leave the face unobserved and say so.
MAX_VIEW_ANGLE_DEG = 60.0
MAX_VIEW_DISTANCE_M = 4.0
# Occlusion tolerance along the ray. The mesh carries ~27 mm of median error, so
# a stricter test rejects faces that are merely slightly off, not occluded.
OCCLUSION_TOLERANCE_M = 0.08
# Baking, sampling and GLB export live in atlas_bake so neither module trips the
# 300-line ceiling; this one owns unwrapping and view selection.
from atlas_bake import DEFAULT_ATLAS_SIZE, NEUTRAL_GREY, bake, export_textured_glb


def unwrap(vertices: Any, triangles: Any) -> tuple[Any, Any, Any]:
    """UV-unwrap a mesh with xatlas.

    Returns (vertex_map, face_indices, uvs). xatlas splits vertices along chart
    seams, so the returned mesh has MORE vertices than it was given:
    `vertex_map[i]` is the original index that new vertex i came from.
    """
    import numpy as np
    import xatlas

    v = np.ascontiguousarray(np.asarray(vertices, dtype=np.float32))
    f = np.ascontiguousarray(np.asarray(triangles, dtype=np.uint32))
    vmap, idx, uv = xatlas.parametrize(v, f)
    return np.asarray(vmap), np.asarray(idx), np.asarray(uv, dtype=np.float64)


def _camera_basis(transform_4x4: Any):
    """ARKit camera-to-world → (position, forward). Camera looks down its -Z."""
    import numpy as np

    m = np.asarray(transform_4x4, dtype=float)
    m = m if m.shape == (4, 4) else m.reshape((4, 4), order="F")
    return m[:3, 3], -m[:3, 2]


def score_views(
    centroids: Any,
    normals: Any,
    frames: list[dict[str, Any]],
    *,
    max_angle_deg: float = MAX_VIEW_ANGLE_DEG,
    max_distance_m: float = MAX_VIEW_DISTANCE_M,
):
    """Score every (face, camera) pair and return the ranked candidates.

    Score is cos(angle to the face normal) divided by distance: a close,
    face-on camera wins over a distant or oblique one. Pairs outside the angle
    or distance limits score 0 and can never be chosen.

    Returns an array of shape (faces, cameras); the caller resolves occlusion
    only for the top candidates, because raycasting every pair is what makes a
    naive baker too slow to run.
    """
    import numpy as np

    c = np.asarray(centroids, dtype=float)
    n = np.asarray(normals, dtype=float)
    norm = np.linalg.norm(n, axis=1, keepdims=True)
    n = np.divide(n, norm, out=np.zeros_like(n), where=norm > 1e-12)

    scores = np.zeros((len(c), len(frames)), dtype=np.float32)
    for j, frame in enumerate(frames):
        eye, _ = _camera_basis(frame["transform"])
        to_cam = eye[None, :] - c
        dist = np.linalg.norm(to_cam, axis=1)
        ok = (dist > 1e-6) & (dist <= max_distance_m)
        if not ok.any():
            continue
        unit = np.divide(to_cam, dist[:, None], out=np.zeros_like(to_cam), where=dist[:, None] > 1e-6)
        # Absolute dot: a TSDF mesh's normals are not consistently oriented, and
        # treating a back-facing normal as invisible left 26.7% of an earlier
        # kitchen untextured for no reason other than winding.
        facing = np.abs(np.einsum("ij,ij->i", n, unit))
        keep = ok & (facing >= np.cos(np.deg2rad(max_angle_deg)))
        scores[keep, j] = (facing[keep] / dist[keep]).astype(np.float32)
    return scores


def select_face_views(
    mesh: Any,
    frames: list[dict[str, Any]],
    *,
    top_k: int = 4,
    occlusion_tolerance: float = OCCLUSION_TOLERANCE_M,
) -> tuple[Any, dict[str, Any]]:
    """Choose ONE camera per face — the sharpest available, not an average.

    Considers the `top_k` best-scoring cameras per face and takes the first that
    is not occluded. Returns (face_view, stats) where face_view is -1 for a face
    no camera saw, which stays neutral grey rather than being invented.
    """
    import numpy as np
    import open3d as o3d

    verts = np.asarray(mesh.vertices, dtype=float)
    tris = np.asarray(mesh.triangles)
    stats: dict[str, Any] = {
        "faces": int(len(tris)),
        "frames": int(len(frames)),
        "facesAssigned": 0,
        "facesUnobserved": 0,
        "facesOccluded": 0,
    }
    if len(tris) == 0 or not frames:
        return np.full(len(tris), -1, dtype=np.int64), {**stats, "skipped": "no_faces_or_frames"}

    a, b, c = verts[tris[:, 0]], verts[tris[:, 1]], verts[tris[:, 2]]
    centroids = (a + b + c) / 3.0
    normals = np.cross(b - a, c - a)

    scores = score_views(centroids, normals, frames)
    order = np.argsort(-scores, axis=1)[:, : max(1, int(top_k))]

    scene = o3d.t.geometry.RaycastingScene()
    scene.add_triangles(o3d.t.geometry.TriangleMesh.from_legacy(mesh))

    face_view = np.full(len(tris), -1, dtype=np.int64)
    pending = np.arange(len(tris))
    for rank in range(order.shape[1]):
        if pending.size == 0:
            break
        cand = order[pending, rank]
        alive = scores[pending, cand] > 0
        pending, cand = pending[alive], cand[alive]
        if pending.size == 0:
            break

        eyes = np.array([_camera_basis(frames[j]["transform"])[0] for j in cand])
        # Cast FROM the surface TOWARD the camera: anything hit before we get
        # there stands between the face and the lens.
        target = centroids[pending]
        delta = eyes - target
        dist = np.linalg.norm(delta, axis=1)
        good = dist > 1e-6
        pending, cand, target, delta, dist = (
            pending[good], cand[good], target[good], delta[good], dist[good],
        )
        if pending.size == 0:
            break
        dirs = delta / dist[:, None]
        # Start slightly off the surface so the face does not hit itself.
        origins = target + dirs * 1e-3
        rays = o3d.core.Tensor(
            np.hstack([origins, dirs]).astype(np.float32), dtype=o3d.core.Dtype.Float32
        )
        hit = scene.cast_rays(rays)["t_hit"].numpy()
        clear = ~np.isfinite(hit) | (hit >= dist - occlusion_tolerance)

        face_view[pending[clear]] = cand[clear]
        stats["facesOccluded"] += int((~clear).sum())
        pending = pending[~clear]

    stats["facesAssigned"] = int((face_view >= 0).sum())
    stats["facesUnobserved"] = int((face_view < 0).sum())
    return face_view, stats



def build_atlas(
    mesh: Any, frames: list[dict[str, Any]], out_path: Any, *, size: int = DEFAULT_ATLAS_SIZE
) -> dict[str, Any]:
    """Unwrap, choose one view per face, bake, and write a textured GLB.

    Never raises: returns stats with `skipped` set. Appearance must not be able
    to fail a job whose geometry is good.
    """
    import numpy as np

    stats: dict[str, Any] = {"enabled": True, "skipped": None, "size": int(size)}
    try:
        verts = np.asarray(mesh.vertices, dtype=float)
        tris = np.asarray(mesh.triangles)
        if len(tris) == 0 or not frames:
            return {**stats, "skipped": "no_faces_or_frames"}

        vmap, idx, uv = unwrap(verts, tris)
        stats["unwrap"] = {
            "verticesBefore": int(len(verts)),
            "verticesAfter": int(len(vmap)),
            "faces": int(len(idx)),
        }

        face_view, sel_stats = select_face_views(mesh, frames)
        stats["viewSelection"] = sel_stats

        atlas, bake_stats = bake(mesh, uv, idx, face_view, frames, size=size)
        stats["bake"] = bake_stats

        stats["glb"] = export_textured_glb(mesh, vmap, idx, uv, atlas, out_path)

        painted = int(bake_stats.get("texelsPainted") or 0)
        in_chart = int(bake_stats.get("texelsInChart") or 0)
        stats["texelCoverage"] = round(painted / in_chart, 4) if in_chart else 0.0
    except Exception as exc:  # noqa: BLE001
        return {**stats, "skipped": f"{type(exc).__name__}: {exc}"}
    return stats
