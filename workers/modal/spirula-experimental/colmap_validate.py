"""COLMAP text/binary readers and the pre-train projection gate."""

from __future__ import annotations

import math
import struct
from pathlib import Path

MODEL_PARAMS = {
    0: ("SIMPLE_PINHOLE", 3),
    1: ("PINHOLE", 4),
    2: ("SIMPLE_RADIAL", 4),
    3: ("RADIAL", 5),
    4: ("OPENCV", 8),
    5: ("OPENCV_FISHEYE", 8),
    6: ("FULL_OPENCV", 12),
    7: ("FOV", 5),
    8: ("SIMPLE_RADIAL_FISHEYE", 4),
    9: ("RADIAL_FISHEYE", 5),
    10: ("THIN_PRISM_FISHEYE", 12),
}
FISHEYE_MODELS = {"OPENCV_FISHEYE", "SIMPLE_RADIAL_FISHEYE", "RADIAL_FISHEYE", "THIN_PRISM_FISHEYE"}
MEAN_PX_LIMIT = 1.0
MAX_PX_LIMIT = 3.0


class ImportRejected(RuntimeError):
    pass


def _q_to_R(qw: float, qx: float, qy: float, qz: float) -> list[list[float]]:
    n = math.sqrt(qw * qw + qx * qx + qy * qy + qz * qz)
    if n < 1e-12:
        raise ImportRejected("zero rotation quaternion")
    qw, qx, qy, qz = qw / n, qx / n, qy / n, qz / n
    return [
        [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)],
        [2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)],
        [2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)],
    ]


def _det(R: list[list[float]]) -> float:
    return (
        R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1])
        - R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0])
        + R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0])
    )


def _cam_from_world(R, t, xyz):
    return (
        R[0][0] * xyz[0] + R[0][1] * xyz[1] + R[0][2] * xyz[2] + t[0],
        R[1][0] * xyz[0] + R[1][1] * xyz[1] + R[1][2] * xyz[2] + t[1],
        R[2][0] * xyz[0] + R[2][1] * xyz[1] + R[2][2] * xyz[2] + t[2],
    )


def project_fisheye(cam: dict, xyz_cam: tuple[float, float, float]):
    if cam["model"] != "OPENCV_FISHEYE":
        raise ImportRejected(f"projection check supports OPENCV_FISHEYE, got {cam['model']}")
    fx, fy, cx, cy, k1, k2, k3, k4 = cam["params"][:8]
    x, y, z = xyz_cam
    if z <= 1e-8:
        return None
    a, b = x / z, y / z
    r = math.hypot(a, b)
    theta = math.atan(r)
    th2 = theta * theta
    distort = 1 + th2 * (k1 + th2 * (k2 + th2 * (k3 + th2 * k4)))
    scale = 1.0 if r < 1e-12 else (theta * distort) / r
    return fx * a * scale + cx, fy * b * scale + cy


def find_sparse(root: Path) -> Path:
    for rel in (Path("sparse") / "0", Path("sparse")):
        d = root / rel
        if (d / "cameras.bin").is_file() or (d / "cameras.txt").is_file():
            return d
    raise ImportRejected("COLMAP sparse model not found")


def _read_text_model(sparse: Path) -> dict:
    cameras, images, points = {}, {}, {}
    cam_lines = [ln for ln in (sparse / "cameras.txt").read_text(encoding="utf-8").splitlines() if ln and not ln.startswith("#")]
    for ln in cam_lines:
        p = ln.split()
        name = p[1]
        n = MODEL_PARAMS[[k for k, (nm, _) in MODEL_PARAMS.items() if nm == name][0]][1]
        cameras[int(p[0])] = {
            "model": name,
            "width": int(p[2]),
            "height": int(p[3]),
            "params": [float(x) for x in p[4:4 + n]],
        }
    img_lines = [ln for ln in (sparse / "images.txt").read_text(encoding="utf-8").splitlines() if not ln.startswith("#")]
    i = 0
    while i < len(img_lines):
        p = img_lines[i].split()
        pts = []
        if i + 1 < len(img_lines):
            q = img_lines[i + 1].split()
            for k in range(0, len(q) - 2, 3):
                pts.append((float(q[k]), float(q[k + 1]), int(float(q[k + 2]))))
        images[int(p[0])] = {
            "q": [float(p[1]), float(p[2]), float(p[3]), float(p[4])],
            "t": [float(p[5]), float(p[6]), float(p[7])],
            "camera_id": int(p[8]),
            "name": p[9],
            "points2d": pts,
        }
        i += 2
    if (sparse / "points3D.txt").is_file():
        for ln in (sparse / "points3D.txt").read_text(encoding="utf-8").splitlines():
            if not ln or ln.startswith("#"):
                continue
            p = ln.split()
            points[int(p[0])] = (float(p[1]), float(p[2]), float(p[3]))
    return {"cameras": cameras, "images": images, "points": points}


def _read_cstr(buf: bytes, off: int) -> tuple[str, int]:
    end = buf.index(b"\x00", off)
    return buf[off:end].decode("utf-8"), end + 1


def _read_bin_model(sparse: Path) -> dict:
    raw = (sparse / "cameras.bin").read_bytes()
    off = 8
    n = struct.unpack_from("<Q", raw, 0)[0]
    cameras = {}
    for _ in range(n):
        cid, mid = struct.unpack_from("<ii", raw, off)
        off += 8
        w, h = struct.unpack_from("<QQ", raw, off)
        off += 16
        name, count = MODEL_PARAMS[mid]
        params = list(struct.unpack_from("<" + "d" * count, raw, off))
        off += 8 * count
        cameras[cid] = {"model": name, "width": w, "height": h, "params": params}
    raw = (sparse / "images.bin").read_bytes()
    n = struct.unpack_from("<Q", raw, 0)[0]
    off = 8
    images = {}
    for _ in range(n):
        iid = struct.unpack_from("<I", raw, off)[0]
        off += 4
        q = list(struct.unpack_from("<dddd", raw, off))
        off += 32
        t = list(struct.unpack_from("<ddd", raw, off))
        off += 24
        cam = struct.unpack_from("<I", raw, off)[0]
        off += 4
        name, off = _read_cstr(raw, off)
        n2 = struct.unpack_from("<Q", raw, off)[0]
        off += 8
        pts = []
        for _k in range(n2):
            x, y, pid = struct.unpack_from("<ddq", raw, off)
            off += 24
            pts.append((x, y, pid))
        images[iid] = {"q": q, "t": t, "camera_id": cam, "name": name, "points2d": pts}
    points = {}
    p3 = sparse / "points3D.bin"
    if p3.is_file():
        raw = p3.read_bytes()
        n = struct.unpack_from("<Q", raw, 0)[0]
        off = 8
        for _ in range(n):
            pid = struct.unpack_from("<Q", raw, off)[0]
            off += 8
            xyz = struct.unpack_from("<ddd", raw, off)
            off += 24 + 3 + 8
            track = struct.unpack_from("<Q", raw, off)[0]
            off += 8 + track * 8
            points[pid] = xyz
    return {"cameras": cameras, "images": images, "points": points}


def read_model(sparse: Path) -> dict:
    if (sparse / "cameras.bin").is_file() and (sparse / "images.bin").is_file():
        return _read_bin_model(sparse)
    if (sparse / "cameras.txt").is_file() and (sparse / "images.txt").is_file():
        return _read_text_model(sparse)
    raise ImportRejected("cameras and images must both be .bin or both be .txt")


def validate_model(root: Path, manifest: dict) -> dict:
    model = read_model(find_sparse(root))
    images = list(model["images"].values())
    expected = int(manifest["expectedImageCount"])
    if len(images) != expected:
        raise ImportRejected(f"image count {len(images)} != expected {expected}")
    lenses = list(manifest.get("lenses") or [])
    if len(lenses) < 2:
        raise ImportRejected("manifest must name both physical lenses")
    by_lens: dict[str, set[int]] = {lens: set() for lens in lenses}
    resolutions = {}
    inversions = []
    for image in images:
        lens = image["name"].split("/")[0].split("\\")[0]
        if lens not in by_lens:
            raise ImportRejected(f"image {image['name']} is not under a declared lens")
        by_lens[lens].add(image["camera_id"])
        cam = model["cameras"].get(image["camera_id"])
        if cam is None:
            raise ImportRejected(f"missing camera {image['camera_id']}")
        if cam["model"] not in FISHEYE_MODELS:
            raise ImportRejected(f"camera {image['camera_id']} model {cam['model']} is not fisheye")
        resolutions.setdefault(image["camera_id"], (cam["width"], cam["height"]))
        R = _q_to_R(*image["q"])
        det = _det(R)
        if det < 0.5:
            inversions.append(image["name"])
    if inversions:
        raise ImportRejected(f"axis inversion on {inversions[:3]}")
    ids = []
    for lens, cams in by_lens.items():
        if len(cams) != 1:
            raise ImportRejected(f"lens {lens} maps to cameras {sorted(cams)}")
        ids.append(next(iter(cams)))
    if len(set(ids)) < 2:
        raise ImportRejected("both physical lenses collapsed onto one camera id")
    missing = [im["name"] for im in images if not (root / "images" / im["name"]).is_file()]
    if missing:
        raise ImportRejected(f"missing images: {missing[:5]}")
    errors = []
    for image in images:
        cam = model["cameras"][image["camera_id"]]
        R = _q_to_R(*image["q"])
        for u, v, pid in image["points2d"]:
            if pid < 0 or pid not in model["points"]:
                continue
            proj = project_fisheye(cam, _cam_from_world(R, image["t"], model["points"][pid]))
            if proj is None:
                errors.append(MAX_PX_LIMIT + 1)
                continue
            errors.append(math.hypot(proj[0] - u, proj[1] - v))
            if len(errors) >= 400:
                break
        if len(errors) >= 400:
            break
    if len(errors) < 8:
        raise ImportRejected("too few linked observations to check projection")
    errors.sort()
    mean = sum(errors) / len(errors)
    worst = errors[-1]
    if mean > MEAN_PX_LIMIT or worst > MAX_PX_LIMIT:
        raise ImportRejected(f"projection mean {mean:.3f}px max {worst:.3f}px")
    scale = manifest.get("projectTransform", {}).get("scale", 1.0)
    if abs(float(scale) - 1.0) > 1e-3:
        raise ImportRejected(f"unexpected project scale {scale}")
    return {
        "imageCount": len(images),
        "lenses": {lens: next(iter(cams)) for lens, cams in by_lens.items()},
        "cameras": {str(k): {"model": v["model"], "width": v["width"], "height": v["height"]} for k, v in model["cameras"].items()},
        "points3D": len(model["points"]),
        "reprojectionMeanPx": round(mean, 4),
        "reprojectionMaxPx": round(worst, 4),
        "samples": len(errors),
        "projectScale": float(scale),
        "resolutions": {str(k): list(v) for k, v in resolutions.items()},
    }
