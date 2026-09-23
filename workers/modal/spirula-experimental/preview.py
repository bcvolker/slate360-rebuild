"""Fixed-camera preview of Gaussian centers through the imported fisheye."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

from colmap_validate import _cam_from_world, _q_to_R, find_sparse, project_fisheye, read_model
from ply_validate import inspect_ply


def _png(path: Path, w: int, h: int, rgb: bytearray) -> None:
    raw = b"".join(b"\x00" + bytes(rgb[y * w * 3:(y + 1) * w * 3]) for y in range(h))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def _centers(path: Path) -> list[tuple[float, float, float]]:
    data = path.read_bytes()
    header, _, body = data.partition(b"end_header\n")
    props = [ln.split()[-1] for ln in header.decode("ascii").splitlines() if ln.startswith("property float ")]
    count = int(next(ln.split()[-1] for ln in header.decode("ascii").splitlines() if ln.startswith("element vertex ")))
    ix, iy, iz = props.index("x"), props.index("y"), props.index("z")
    stride = 4 * len(props)
    out = []
    for i in range(count):
        base = i * stride
        out.append(tuple(struct.unpack_from("<f", body, base + 4 * j)[0] for j in (ix, iy, iz)))
    return out


def render_centers(dataset: Path, ply: Path, dest: Path) -> dict:
    info = inspect_ply(ply, min_count=1, max_count=50_000_000)
    model = read_model(find_sparse(dataset))
    image = next(iter(model["images"].values()))
    cam = model["cameras"][image["camera_id"]]
    R = _q_to_R(*image["q"])
    w, h = int(cam["width"]), int(cam["height"])
    rgb = bytearray([8, 12, 16]) * (w * h)
    hit = 0
    for xyz in _centers(ply):
        proj = project_fisheye(cam, _cam_from_world(R, image["t"], xyz))
        if proj is None:
            continue
        u, v = int(round(proj[0])), int(round(proj[1]))
        if 0 <= u < w and 0 <= v < h:
            rgb[(v * w + u) * 3:(v * w + u) * 3 + 3] = bytes([0, 230, 153])
            hit += 1
    if hit < 1:
        raise RuntimeError("fixed-camera preview received no centers inside the frame")
    dest.parent.mkdir(parents=True, exist_ok=True)
    _png(dest, w, h, rgb)
    thumb = dest.with_name("thumbnail.png")
    _png(thumb, w, h, rgb)
    return {"previewHits": hit, "cameraId": image["camera_id"], "gaussianCount": info["gaussianCount"]}
