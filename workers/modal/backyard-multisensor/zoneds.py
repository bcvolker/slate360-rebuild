"""Backyard compact-zone datasets A (X4 only) and D (X4 + GoPro + iPhone) from camera-solves/v2.

Frozen before any training: zone, image selection, held-out split (every 8th capture per source, index % 8 == 4),
colour transforms, masks and the common initial point set. A and D share the identical EVAL set and the identical
points3D.txt; they differ only in which TRAIN images exist."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

SAT = 250          # any channel >= SAT -> clipped, masked in non-X4 images (dilated)
MIN_ZONE_OBS = 40  # an image joins the zone set when it observes >= this many zone points


def zone_frame(zc: dict):
    return np.array(zc["mu"]), np.array(zc["Vt"]), float(zc["scale"])


def src_of(name: str) -> str:
    return "x4" if name.startswith("x4_") else name.split("/")[0]


def order_key(name: str):
    f = name.split("/")[1]
    if name.startswith("x4_"):
        return int(f.split("_f")[1].split(".")[0])
    if name.startswith("iphone/"):
        return int(f.rsplit("_", 1)[1].split(".")[0])
    return f


def select(rec, mu, Vt, S, box):
    """Zone points and the images that see them (X4 selected per rig frame: both lenses or neither)."""
    u0, u1, v0, v1 = box
    zone = set()
    for pid, p in rec.points3D.items():
        q = ((p.xyz - mu) @ Vt.T) * S
        if u0 <= q[0] < u1 and v0 <= q[1] < v1:
            zone.add(pid)
    nobs = {}
    for iid, im in rec.images.items():
        nobs[im.name] = sum(1 for p in im.points2D if p.has_point3D() and p.point3D_id in zone)
    chosen = {n for n, k in nobs.items() if k >= MIN_ZONE_OBS and not n.startswith("x4_")}
    frames = {n.split("/")[1] for n, k in nobs.items() if n.startswith("x4_") and k >= MIN_ZONE_OBS}
    for n in nobs:
        if n.startswith("x4_") and n.split("/")[1] in frames:
            chosen.add(n)
    return zone, chosen, nobs


def split_of(chosen: set) -> dict:
    """Frozen held-out split: per source, sorted by capture order; X4 by frame (both lenses share the split)."""
    out = {}
    x4f = sorted({order_key(n) for n in chosen if n.startswith("x4_")})
    x4rank = {f: i for i, f in enumerate(x4f)}
    for s in ("iphone", "gopro"):
        ns = sorted([n for n in chosen if n.startswith(s + "/")], key=order_key)
        for i, n in enumerate(ns):
            out[n] = "eval" if i % 8 == 4 else "train"
    for n in chosen:
        if n.startswith("x4_"):
            out[n] = "eval" if x4rank[order_key(n)] % 8 == 4 else "train"
    return out


def patch_mean(img, xy, r=2):
    x, y = int(round(xy[0])), int(round(xy[1]))
    h, w = img.shape[:2]
    if x - r < 0 or y - r < 0 or x + r >= w or y + r >= h:
        return None
    return img[y - r:y + r + 1, x - r:x + r + 1].reshape(-1, 3).mean(0)


def fit_affine(src, dst, iters=8):
    """Robust (Huber-IRLS) 3x4 affine colour map src -> dst in 8-bit sRGB."""
    X = np.hstack([src, np.ones((len(src), 1))])
    w = np.ones(len(src))
    for _ in range(iters):
        A = np.linalg.lstsq(X * w[:, None], dst * w[:, None], rcond=None)[0]
        res = np.linalg.norm(X @ A - dst, axis=1)
        d = 1.345 * max(np.median(res), 1e-3) * 1.4826
        w = np.where(res <= d, 1.0, d / np.maximum(res, 1e-9))
    pred = X @ A
    return A, {"n": int(len(src)), "residualMedian": round(float(np.median(np.linalg.norm(pred - dst, axis=1))), 2),
               "residualBeforeMedian": round(float(np.median(np.linalg.norm(src - dst, axis=1))), 2),
               "meanSrc": [round(float(x), 1) for x in src.mean(0)], "meanDst": [round(float(x), 1) for x in dst.mean(0)]}


def qt_text(im):
    cfw = im.cam_from_world()
    x, y, z, w = [float(v) for v in cfw.rotation.quat]     # pycolmap quat = (x, y, z, w)
    t = [float(v) for v in cfw.translation]
    return [w, x, y, z], t


def write_sparse(root: Path, rec, names_out: dict, cams_used: set, init_pts: list):
    """names_out: solve name -> dataset name. COLMAP text without comment lines (the worker reader pairs lines)."""
    sp = root / "sparse" / "0"
    sp.mkdir(parents=True, exist_ok=True)
    with open(sp / "cameras.txt", "w") as f:
        for cid in sorted(cams_used):
            c = rec.cameras[cid]
            f.write(f"{cid} {c.model.name} {c.width} {c.height} " + " ".join(repr(float(x)) for x in c.params) + "\n")
    by_name = {im.name: (iid, im) for iid, im in rec.images.items()}
    with open(sp / "images.txt", "w") as f:
        for k, (src_name, dst_name) in enumerate(sorted(names_out.items(), key=lambda kv: kv[1])):
            iid, im = by_name[src_name]
            q, t = qt_text(im)
            f.write(f"{k + 1} " + " ".join(repr(v) for v in q + t) + f" {im.camera_id} {dst_name}\n\n")
    with open(sp / "points3D.txt", "w") as f:
        for i, (xyz, rgb) in enumerate(init_pts):
            f.write(f"{i + 1} {xyz[0]!r} {xyz[1]!r} {xyz[2]!r} {int(rgb[0])} {int(rgb[1])} {int(rgb[2])} 0\n")
