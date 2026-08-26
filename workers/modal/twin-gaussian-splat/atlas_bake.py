"""M7-D — the baking half of atlas texturing: texels, sampling, export.

Split from mesh_atlas.py, which keeps unwrapping and per-face view selection.
The division is deliberate: everything here takes a already-decided
(face -> camera) assignment and turns it into pixels, so it can be tested with
no Open3D and no xatlas.

See mesh_atlas.py for why this exists at all — per-vertex colour capped the
model at one colour sample every 4.5 cm against 1.5 mm source imagery.
"""

from __future__ import annotations

from typing import Any

# Unobserved texels keep the same neutral grey the vertex baker used, so
# "no camera saw this" reads identically across both paths.
NEUTRAL_GREY = (0.65, 0.65, 0.65)
DEFAULT_ATLAS_SIZE = 4096


def rasterize_atlas(uvs: Any, face_indices: Any, size: int):
    """Map every atlas texel to the face it belongs to and its barycentrics.

    Returns (face_id, bary) as (size, size) and (size, size, 3) arrays; face_id
    is -1 where no chart covers the texel. Walks faces rather than texels: a
    4096 atlas is 16.7M texels and most of them are empty padding between
    charts, so per-face bounding boxes do far less work.
    """
    import numpy as np

    uv = np.asarray(uvs, dtype=np.float64)
    idx = np.asarray(face_indices)
    face_id = np.full((size, size), -1, dtype=np.int64)
    bary = np.zeros((size, size, 3), dtype=np.float32)

    # UVs from xatlas are already normalised to [0, 1].
    px = uv * (size - 1)
    tri = px[idx]
    lo = np.floor(tri.min(axis=1)).astype(int)
    hi = np.ceil(tri.max(axis=1)).astype(int)
    np.clip(lo, 0, size - 1, out=lo)
    np.clip(hi, 0, size - 1, out=hi)

    for f in range(len(idx)):
        x0, y0 = lo[f]
        x1, y1 = hi[f]
        if x1 < x0 or y1 < y0:
            continue
        p0, p1, p2 = tri[f]
        det = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1])
        if abs(det) < 1e-12:
            continue
        xs = np.arange(x0, x1 + 1)
        ys = np.arange(y0, y1 + 1)
        gx, gy = np.meshgrid(xs, ys)
        w0 = ((p1[1] - p2[1]) * (gx - p2[0]) + (p2[0] - p1[0]) * (gy - p2[1])) / det
        w1 = ((p2[1] - p0[1]) * (gx - p2[0]) + (p0[0] - p2[0]) * (gy - p2[1])) / det
        w2 = 1.0 - w0 - w1
        # Half-texel slack: a texel whose centre falls just outside a thin
        # triangle still needs colour, or charts come out with pinholes.
        inside = (w0 >= -0.002) & (w1 >= -0.002) & (w2 >= -0.002)
        if not inside.any():
            continue
        yy, xx = gy[inside], gx[inside]
        face_id[yy, xx] = f
        bary[yy, xx, 0] = w0[inside]
        bary[yy, xx, 1] = w1[inside]
        bary[yy, xx, 2] = w2[inside]
    return face_id, bary


def _load_rgb(frame: dict[str, Any]):
    """Frame image as uint8 RGB, from bytes or a path. None if unreadable."""
    import io

    import numpy as np
    from PIL import Image

    raw = frame.get("jpeg")
    source = io.BytesIO(raw) if raw else frame.get("path")
    if source is None:
        return None
    try:
        with Image.open(source) as handle:
            return np.asarray(handle.convert("RGB"))
    except Exception:  # noqa: BLE001
        return None


def bake(
    mesh: Any,
    uvs: Any,
    face_indices: Any,
    face_view: Any,
    frames: list[dict[str, Any]],
    *,
    size: int = DEFAULT_ATLAS_SIZE,
) -> tuple[Any, dict[str, Any]]:
    """Sample each texel from its face's chosen camera.

    Decodes each frame at most once and paints every texel assigned to it, so
    cost is one JPEG decode per used frame rather than one per face.
    """
    import numpy as np

    stats: dict[str, Any] = {
        "size": int(size),
        "texelsPainted": 0,
        "texelsInChart": 0,
        "framesDecoded": 0,
        "framesFailed": 0,
    }
    face_id, bary = rasterize_atlas(uvs, face_indices, size)
    in_chart = face_id >= 0
    stats["texelsInChart"] = int(in_chart.sum())

    atlas = np.zeros((size, size, 3), dtype=np.uint8)
    atlas[..., 0] = int(NEUTRAL_GREY[0] * 255)
    atlas[..., 1] = int(NEUTRAL_GREY[1] * 255)
    atlas[..., 2] = int(NEUTRAL_GREY[2] * 255)
    painted = np.zeros((size, size), dtype=bool)
    if not in_chart.any():
        return atlas, {**stats, "skipped": "no_charts"}

    verts = np.asarray(mesh.vertices, dtype=float)
    tris = np.asarray(mesh.triangles)
    idx = np.asarray(face_indices)
    fv = np.asarray(face_view)

    ty, tx = np.nonzero(in_chart)
    tf = face_id[ty, tx]
    tview = fv[tf]
    have = tview >= 0
    ty, tx, tf, tview = ty[have], tx[have], tf[have], tview[have]
    tb = bary[ty, tx]

    # Texel -> 3D surface point, via barycentrics on the ORIGINAL triangle. The
    # unwrap duplicated vertices along seams but kept face order, so face f in
    # the UV mesh is face f in the geometry.
    p = (
        verts[tris[tf, 0]] * tb[:, 0:1]
        + verts[tris[tf, 1]] * tb[:, 1:2]
        + verts[tris[tf, 2]] * tb[:, 2:3]
    )
    _ = idx  # UV indices are not needed once barycentrics are resolved

    for j in np.unique(tview):
        frame = frames[int(j)]
        rgb = _load_rgb(frame)
        if rgb is None:
            stats["framesFailed"] += 1
            continue
        stats["framesDecoded"] += 1
        h, w = rgb.shape[0], rgb.shape[1]
        sel = tview == j
        pts = p[sel]

        m = np.asarray(frame["transform"], dtype=float)
        m = m if m.shape == (4, 4) else m.reshape((4, 4), order="F")
        flip = np.eye(4)
        flip[1, 1] = flip[2, 2] = -1.0
        world_to_cam = np.linalg.inv(m @ flip)
        cam = (world_to_cam[:3, :3] @ pts.T).T + world_to_cam[:3, 3]

        z = cam[:, 2]
        ok = z > 1e-6
        k = frame["intrinsics"]
        u = np.zeros_like(z)
        v = np.zeros_like(z)
        u[ok] = float(k["fx"]) * cam[ok, 0] / z[ok] + float(k["cx"])
        v[ok] = float(k["fy"]) * cam[ok, 1] / z[ok] + float(k["cy"])
        ok &= (u >= 0) & (u <= w - 1) & (v >= 0) & (v <= h - 1)
        if not ok.any():
            continue

        # Nearest sampling: the texel grid is already finer than the mesh error,
        # so interpolation would only add blur to a pipeline whose whole problem
        # was blur.
        ui = np.rint(u[ok]).astype(int)
        vi = np.rint(v[ok]).astype(int)
        yy = ty[sel][ok]
        xx = tx[sel][ok]
        atlas[yy, xx] = rgb[vi, ui]
        painted[yy, xx] = True

    stats["texelsPainted"] = int(painted.sum())
    stats["texelsUnobserved"] = int(stats["texelsInChart"] - stats["texelsPainted"])
    atlas = dilate(atlas, painted)
    return atlas, stats


def dilate(atlas: Any, painted: Any, iterations: int = 4):
    """Bleed painted texels outward into the padding around each chart.

    Without this, bilinear filtering at chart edges samples unpainted padding
    and every chart is outlined in grey.
    """
    import numpy as np

    out = np.asarray(atlas).copy()
    mask = np.asarray(painted).copy()
    for _ in range(int(iterations)):
        if mask.all():
            break
        acc = np.zeros(out.shape, dtype=np.uint32)
        cnt = np.zeros(mask.shape, dtype=np.uint32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            src = np.roll(np.roll(out, dy, axis=0), dx, axis=1)
            srcm = np.roll(np.roll(mask, dy, axis=0), dx, axis=1)
            acc += src * srcm[..., None]
            cnt += srcm
        grow = (~mask) & (cnt > 0)
        if not grow.any():
            break
        out[grow] = (acc[grow] // cnt[grow][..., None]).astype(np.uint8)
        mask |= grow
    return out


def export_textured_glb(
    mesh: Any, vertex_map: Any, face_indices: Any, uvs: Any, atlas: Any, out_path: Any
) -> dict[str, Any]:
    """Write a GLB carrying the UV map and the baked atlas.

    trimesh rather than Open3D: Open3D's GLB writer drops the texture, which is
    the same reason the production share viewer could never show a textured mesh.

    Note the vertex remap — xatlas splits vertices along chart seams, so the
    exported mesh uses the SPLIT vertex set with its own UVs, while the geometry
    those vertices came from is unchanged.
    """
    import numpy as np
    import trimesh
    from PIL import Image

    verts = np.asarray(mesh.vertices, dtype=float)
    split = verts[np.asarray(vertex_map)]
    faces = np.asarray(face_indices)
    uv = np.asarray(uvs, dtype=float).copy()
    # glTF's texture origin is the BOTTOM-left; xatlas hands back top-left, and
    # getting this wrong flips every surface vertically without erroring.
    uv[:, 1] = 1.0 - uv[:, 1]

    image = Image.fromarray(np.asarray(atlas, dtype=np.uint8), mode="RGB")
    material = trimesh.visual.material.PBRMaterial(
        baseColorTexture=image, metallicFactor=0.0, roughnessFactor=1.0
    )
    tm = trimesh.Trimesh(
        vertices=split,
        faces=faces,
        visual=trimesh.visual.TextureVisuals(uv=uv, material=material),
        process=False,
    )
    tm.export(str(out_path), file_type="glb")
    return {
        "path": str(out_path),
        "vertices": int(len(split)),
        "faces": int(len(faces)),
        "atlasSize": int(np.asarray(atlas).shape[0]),
    }

