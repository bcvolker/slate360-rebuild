"""M7-B (part 1) — 360 equirectangular unwrapping into texturer-ready cameras.

Convention, stated once because a wrong one silently rotates the whole room:
  u = 0.5, v = 0.5 is -Z  (front, and ARKit's look direction)
  u increases toward +X   (right)
  v = 0 is +Y (zenith), v = 1 is -Y (nadir)
Cube "front" is therefore the identity rotation.

SCOPE, honestly: this module unwraps and masks. It does NOT solve where the 360
rig was standing. `estimate_rig_poses` is a 4-DOF gate that assumes you already
have candidate camera centres from somewhere else; without them, nothing here
places a 360 frame into the ARKit coordinate frame. See the module TODO.

Open3D (MIT) + numpy (BSD) + Pillow (HPND). COLMAP, if ever wired, is GPL-3.0
and may only ever be invoked as a subprocess, never linked.
"""

from __future__ import annotations

from typing import Any

FACES = ("front", "right", "back", "left", "up", "down")

# Camera-footprint occupancy cell for the coarse yaw search, metres.
_VOXEL = 0.25
# A runner-up yaw within this angle of the winner is the same solution.
_AMBIG_DEG = 20.0
# Equirect images are 2:1; accept a little slop for odd encoders.
_MIN_ASPECT, _MAX_ASPECT = 1.6, 2.4


def cube_face_intrinsics(face_size: int) -> dict[str, float]:
    """Pinhole intrinsics of a 90-degree cube face.

    For a 90-degree field of view the focal length is exactly half the image
    size, and the principal point is the centre. Every downstream projection
    depends on this, which is why it is a named function with its own test.
    A face smaller than 2 px returns zeros rather than raising.
    """
    s = int(face_size)
    if s < 2:
        return {"fx": 0.0, "fy": 0.0, "cx": 0.0, "cy": 0.0}
    half = float(s) / 2.0
    return {"fx": half, "fy": half, "cx": half, "cy": half}


def cube_face_rotation(face_name: str) -> Any:
    """3x3 taking a cube face's camera frame into the 360 rig's frame.

    Built from exact 0/+-1 entries rather than cos(pi/2), so the result is
    exactly orthonormal with det +1 instead of carrying floating-point noise
    into every projection. An unknown face name returns identity — it refuses
    to invent a look direction.
    """
    import numpy as np

    mats = {
        "front": [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        "back": [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
        "right": [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
        "left": [[0, 0, 1], [0, 1, 0], [-1, 0, 0]],
        "up": [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
        "down": [[1, 0, 0], [0, 0, 1], [0, -1, 0]],
    }
    return np.array(mats.get(face_name, mats["front"]), dtype=float)


def _as_camera_to_world(transform_4x4: Any) -> Any:
    import numpy as np

    a = np.asarray(transform_4x4, dtype=float)
    if a.shape == (4, 4):
        return a.copy()
    if a.size != 16:
        return np.eye(4)
    return a.reshape((4, 4), order="F")


def _to_column_major_16(mat4: Any) -> list[float]:
    import numpy as np

    return [float(x) for x in np.asarray(mat4, dtype=float).reshape(16, order="F")]


def direction_to_equirect_uv(directions: Any):
    """Unit directions in rig space to (u, v) in [0,1]. See module convention."""
    import numpy as np

    d = np.asarray(directions, dtype=float)
    x, y, z = d[..., 0], d[..., 1], d[..., 2]
    lon = np.arctan2(x, -z)
    lat = np.arcsin(np.clip(y, -1.0, 1.0))
    return lon / (2.0 * np.pi) + 0.5, 0.5 - lat / np.pi


def _sample_equirect(image: Any, directions: Any):
    """Bilinear sample of an equirect at the given directions, with the
    horizontal axis WRAPPING — a face straddling u=0 must not clamp to the seam
    and smear one column of pixels across the join."""
    import numpy as np

    h, w = int(image.shape[0]), int(image.shape[1])
    u, v = direction_to_equirect_uv(directions)
    x = u * w - 0.5
    y = np.clip(v * h - 0.5, 0.0, h - 1.001)

    x0 = np.floor(x).astype(np.int64)
    y0 = np.floor(y).astype(np.int64)
    sx = (x - x0)[..., None]
    sy = (y - y0)[..., None]
    x0m, x1m = np.mod(x0, w), np.mod(x0 + 1, w)
    y0c = np.clip(y0, 0, h - 1)
    y1c = np.clip(y0 + 1, 0, h - 1)

    img = image.astype(np.float64)
    top = img[y0c, x0m] * (1 - sx) + img[y0c, x1m] * sx
    bottom = img[y1c, x0m] * (1 - sx) + img[y1c, x1m] * sx
    return top * (1 - sy) + bottom * sy


def equirect_to_cube_faces(equirect_image: Any, face_size: int = 1024) -> dict[str, Any]:
    """Six 90-degree pinhole faces from one equirectangular frame.

    Empty, tiny, or non-2:1 images return {} — a skip, never a raise. Feeding a
    non-equirect through this would produce a plausible-looking but wrong
    unwrap, which is worse than nothing.
    """
    import numpy as np

    img = np.asarray(equirect_image)
    if img.size == 0 or img.ndim < 2:
        return {}
    if img.ndim == 2:
        img = np.stack((img, img, img), axis=-1)

    h, w = int(img.shape[0]), int(img.shape[1])
    if h < 2 or w < 4 or not (_MIN_ASPECT * h <= w <= _MAX_ASPECT * h):
        return {}
    size = int(face_size)
    if size < 2:
        return {}

    xs = (np.arange(size) + 0.5) / size * 2.0 - 1.0
    ys = 1.0 - (np.arange(size) + 0.5) / size * 2.0
    xx, yy = np.meshgrid(xs, ys)
    dirs_cam = np.stack((xx, yy, -np.ones_like(xx)), axis=-1)
    dirs_cam /= np.linalg.norm(dirs_cam, axis=-1, keepdims=True)
    flat = dirs_cam.reshape(-1, 3)

    is_uint8 = img.dtype == np.uint8
    out: dict[str, Any] = {}
    for name in FACES:
        sampled = _sample_equirect(img, flat @ cube_face_rotation(name).T)
        face = sampled.reshape(size, size, img.shape[2])
        out[name] = np.clip(np.rint(face), 0, 255).astype(np.uint8) if is_uint8 else face
    return out


def operator_mask_for_face(face_image: Any, face_name: str) -> Any | None:
    """Boolean mask of pixels to EXCLUDE from texturing. True means discard.

    Geometric only — no detector, because the obvious one (Ultralytics YOLO) is
    AGPL and banned here. On a high pass the operator and pole occupy the nadir,
    so `down` gets a central disk and the side faces a bottom strip.

    `up` returns None deliberately: on a HIGH pass nothing of the operator is up
    there. On a LOW pass the operator IS in `up`, and this mask will not save
    you — do not bake a low pass until real person segmentation lands (MASK-2),
    or you will stamp yourself across the ceiling.
    """
    import numpy as np

    img = np.asarray(face_image)
    if img.size == 0 or img.ndim < 2:
        return None
    h, w = int(img.shape[0]), int(img.shape[1])
    if face_name == "up":
        return None
    yy, xx = np.mgrid[0:h, 0:w]
    if face_name == "down":
        cy, cx = (h - 1) / 2.0, (w - 1) / 2.0
        radius = 0.42 * min(h, w)
        return (xx - cx) ** 2 + (yy - cy) ** 2 <= radius * radius
    return yy >= int(0.82 * h)


def frames_from_equirect(
    equirect_image: Any,
    rig_transform_4x4: Any,
    *,
    face_size: int = 1024,
    faces: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Cube faces as frame dicts the projective texturer already understands.

    `faces=None` yields all six. Callers normally drop "down": on a high pass it
    is mostly the operator and the pole. A bad equirect or a non-finite pose
    returns [].
    """
    import numpy as np

    wanted = list(faces) if faces is not None else list(FACES)
    cubes = equirect_to_cube_faces(equirect_image, face_size=face_size)
    if not cubes:
        return []
    rig = _as_camera_to_world(rig_transform_4x4)
    if not np.isfinite(rig).all():
        return []

    intrinsics = cube_face_intrinsics(face_size)
    frames: list[dict[str, Any]] = []
    for name in wanted:
        if name not in cubes:
            continue
        c2w = rig.copy()
        c2w[:3, :3] = rig[:3, :3] @ cube_face_rotation(name)
        frames.append({
            "image": cubes[name],
            "transform": _to_column_major_16(c2w),
            "intrinsics": dict(intrinsics),
            "width": int(face_size),
            "height": int(face_size),
            "face": name,
        })
    return frames


def _voxel_keys(points: Any) -> set:
    import numpy as np

    if points.shape[0] == 0:
        return set()
    return set(map(tuple, np.floor(points / _VOXEL).astype(np.int64).tolist()))


def _rotate_y(points: Any, yaw_rad: float):
    import numpy as np

    c, s = float(np.cos(yaw_rad)), float(np.sin(yaw_rad))
    return np.column_stack((
        c * points[:, 0] + s * points[:, 2],
        points[:, 1],
        -s * points[:, 0] + c * points[:, 2],
    ))


def estimate_rig_poses(
    source_centers: Any,
    target_centers: Any,
    *,
    yaw_step_deg: float = 5.0,
    min_overlap: float = 0.20,
) -> dict[str, Any]:
    """4-DOF (yaw about +Y plus translation) fit of 360 camera centres onto the
    ARKit centres.

    Both captures are gravity-aligned, so a tilt is wrong by construction and
    only yaw is searched. Scored by voxel-occupancy IoU of the camera
    footprints rather than by pairing frames in time — the two walks share no
    clock, and the phone and 360 routes are different paths anyway.

    Refuses in two distinct ways, both first-class: too little overlap
    ("failed"), or a runner-up yaw within 10% of the winner ("ambiguous" —
    the rectangular-room case where an offset of one doorway still scores well).
    Returns identity on either, never a guessed transform.

    NOTE: needs candidate 360 centres as input. It is the acceptance GATE, not
    the solver.
    """
    import numpy as np

    identity = np.eye(4)
    empty = {
        "transform": _to_column_major_16(identity),
        "yaw_deg": 0.0,
        "translation": [0.0, 0.0, 0.0],
        "score": 0.0,
        "runner_up_score": 0.0,
        "confidence": 0.0,
        "verdict": "failed",
        "skipped": "degenerate_centers",
    }

    src = np.asarray(source_centers, dtype=float).reshape(-1, 3)
    tgt = np.asarray(target_centers, dtype=float).reshape(-1, 3)
    if src.shape[0] < 3 or tgt.shape[0] < 3:
        return empty

    src0, tgt0 = src - src.mean(0), tgt - tgt.mean(0)
    tgt_keys = _voxel_keys(tgt0)
    if not tgt_keys:
        return {**empty, "skipped": "empty_voxels"}

    step = max(float(yaw_step_deg), 1.0)
    best_score, best_yaw = -1.0, 0.0
    scored: list[tuple[float, float]] = []
    yaw = 0.0
    while yaw < 360.0 - 1e-9:
        keys = _voxel_keys(_rotate_y(src0, float(np.deg2rad(yaw))))
        union = len(keys | tgt_keys) or 1
        score = len(keys & tgt_keys) / union
        scored.append((score, yaw))
        if score > best_score:
            best_score, best_yaw = score, yaw
        yaw += step

    runner = 0.0
    for score, ydeg in scored:
        d = abs(ydeg - best_yaw) % 360.0
        if min(d, 360.0 - d) >= _AMBIG_DEG:
            runner = max(runner, score)

    if best_score < min_overlap:
        return {**empty, "score": float(best_score), "skipped": "insufficient_overlap"}
    if runner > 0.9 * max(best_score, 1e-9):
        return {
            **empty,
            "score": float(best_score),
            "runner_up_score": float(runner),
            "yaw_deg": float(best_yaw),
            "verdict": "ambiguous",
            "skipped": "rotational_ambiguity",
        }

    rad = float(np.deg2rad(best_yaw))
    translation = tgt.mean(0) - _rotate_y(src.mean(0).reshape(1, 3), rad)[0]
    c, s = float(np.cos(rad)), float(np.sin(rad))
    xf = np.eye(4)
    xf[0, 0], xf[0, 2] = c, s
    xf[2, 0], xf[2, 2] = -s, c
    xf[:3, 3] = translation
    return {
        "transform": _to_column_major_16(xf),
        "yaw_deg": float(best_yaw),
        "translation": [float(v) for v in translation],
        "score": float(best_score),
        "runner_up_score": float(runner),
        "confidence": float(min(1.0, best_score / 0.5)),
        "verdict": "aligned",
        "skipped": None,
    }
