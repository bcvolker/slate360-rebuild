#!/usr/bin/env python3
"""Mandatory cleanup of a trained Gaussian PLY before packing (runs in WSL).

    clean_ply.py --in gaussian.ply --out clean.ply --sparse <dataset/sparse/0>
                 [--frame <name>.frame.json] [--mobile-out clean.mobile.ply --mobile-max 160000]
                 [--min-opacity 0.12] [--max-scale-frac 0.35] [--sor-k 20 --sor-std 1.8]
                 [--min-views 2] [--report clean_report.json]

Removes the "milky shell" and floaters that a single-camera walk grows in volume the
camera never saw twice:
  1. opacity < min-opacity-hard (invisible), and HAZE = faint AND oversized AND isolated
     (a plain opacity cut deletes real walls — surfaces are stacks of faint splats)
  2. any axis scale > max-scale-frac * room diag  (giant blobs)
  3. statistical outliers on centres (k nearest, std multiplier)
  4. below floor - 0.25 m or above floor + ceiling-clip metres (needs frame.json)
  5. visibility: centre projects inside fewer than min-views training images
The cleaned PLY keeps every property so pack_spz.py runs unchanged. --mobile-out writes a
second PLY thinned to the highest-contribution splats for phones (pack it with --max-sh 0).
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

try:
    from scipy.spatial import cKDTree
except Exception:  # pragma: no cover
    cKDTree = None


def read_ply(path: Path):
    raw = path.read_bytes()
    end = raw.index(b"end_header\n")
    header = raw[:end].decode("ascii", "replace")
    n = int([l for l in header.splitlines() if l.startswith("element vertex")][0].split()[2])
    props = [l.split()[2] for l in header.splitlines() if l.startswith("property")]
    types = [l.split()[1] for l in header.splitlines() if l.startswith("property")]
    if any(t != "float" for t in types):
        raise SystemExit("clean_ply: only all-float binary PLYs are supported")
    if "binary_little_endian" not in header:
        raise SystemExit("clean_ply: PLY must be binary_little_endian")
    arr = np.frombuffer(raw[end + 11 :], dtype=np.dtype([(p, "<f4") for p in props]), count=n)
    return arr.copy(), props


def write_ply(path: Path, arr: np.ndarray, props: list[str]) -> None:
    lines = ["ply", "format binary_little_endian 1.0", f"element vertex {len(arr)}"]
    lines += [f"property float {p}" for p in props]
    lines.append("end_header")
    header = ("\n".join(lines) + "\n").encode("ascii")
    path.write_bytes(header + arr.tobytes())


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def load_cameras(sparse: Path):
    import pycolmap

    rec = pycolmap.Reconstruction(str(sparse))
    cams = []
    for im in rec.images.values():
        cam = rec.cameras[im.camera_id]
        cfw = im.cam_from_world()
        R = np.asarray(cfw.rotation.matrix(), dtype=np.float64)
        t = np.asarray(cfw.translation, dtype=np.float64)
        K = np.asarray(cam.calibration_matrix(), dtype=np.float64)
        cams.append((R, t, K, cam.width, cam.height))
    return cams


def visibility_counts(centres: np.ndarray, cams, chunk: int = 200_000) -> np.ndarray:
    counts = np.zeros(len(centres), dtype=np.int32)
    for R, t, K, w, h in cams:
        for s in range(0, len(centres), chunk):
            p = centres[s : s + chunk]
            c = p @ R.T + t  # camera frame
            z = c[:, 2]
            ok = z > 0.05
            u = K[0, 0] * c[:, 0] / np.where(ok, z, 1) + K[0, 2]
            v = K[1, 1] * c[:, 1] / np.where(ok, z, 1) + K[1, 2]
            ok &= (u >= 0) & (u < w) & (v >= 0) & (v < h)
            counts[s : s + chunk] += ok.astype(np.int32)
    return counts


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", required=True)
    ap.add_argument("--out", dest="dst", required=True)
    ap.add_argument("--sparse", default="")
    ap.add_argument("--frame", default="", help="<name>.frame.json from walk_from_colmap (up, floor, scale)")
    ap.add_argument("--min-opacity-hard", type=float, default=0.02, help="below this a splat is invisible; always dropped")
    ap.add_argument("--min-opacity", type=float, default=0.15, help="faint threshold for the haze rule (with size + isolation)")
    ap.add_argument("--haze-scale-mult", type=float, default=3.0, help="haze splats are this many times the median size")
    ap.add_argument("--haze-nn-mult", type=float, default=2.0, help="haze splats sit this many times the median neighbour gap")
    ap.add_argument("--max-scale-frac", type=float, default=0.35)
    ap.add_argument("--sor-k", type=int, default=20)
    ap.add_argument("--sor-std", type=float, default=1.8)
    ap.add_argument("--min-views", type=int, default=2)
    ap.add_argument("--floor-margin", type=float, default=0.25, help="metres below floor to keep")
    ap.add_argument("--ceiling-clip", type=float, default=3.4, help="metres above floor; higher is deleted")
    ap.add_argument("--crop-margin", type=float, default=0.0, help="metres from the camera path (horizontal); 0 = off")
    ap.add_argument("--mobile-out", default="")
    ap.add_argument("--mobile-max", type=int, default=160_000)
    ap.add_argument("--report", default="")
    a = ap.parse_args()

    t0 = time.time()
    arr, props = read_ply(Path(a.src))
    n0 = len(arr)
    xyz = np.column_stack([arr["x"], arr["y"], arr["z"]]).astype(np.float64)
    op = arr["opacity"].astype(np.float64)
    if op.min() < 0 or op.max() > 1:
        op = sigmoid(op)
    sc = np.column_stack([arr["scale_0"], arr["scale_1"], arr["scale_2"]]).astype(np.float64)
    if sc.min() < 0:
        sc = np.exp(sc)
    keep = np.ones(n0, dtype=bool)
    report: dict = {"input": n0}

    # 1a. near-invisible splats contribute nothing; safe at any threshold this low.
    m = op >= a.min_opacity_hard
    report["dropped_invisible"] = int((~m).sum())
    keep &= m

    # 2. giant scales relative to the room
    lo, hi = np.percentile(xyz[keep], 2, axis=0), np.percentile(xyz[keep], 98, axis=0)
    diag = float(np.linalg.norm(hi - lo))
    m = sc.max(axis=1) <= a.max_scale_frac * diag
    report["dropped_scale"] = int((keep & ~m).sum())
    keep &= m

    # 1b + 3. Haze and floaters. A plain opacity cut (0.12) ate wall and ceiling
    # surfaces on the kitchen test — thin surfaces ARE stacks of faint splats. A
    # floater is faint AND oversized AND alone, so all three must hold. The same
    # neighbour distances feed the statistical-outlier pass.
    if cKDTree is not None and a.sor_k > 0 and keep.sum() > a.sor_k + 1:
        idx = np.flatnonzero(keep)
        pts = xyz[idx]
        tree = cKDTree(pts)
        d, _ = tree.query(pts, k=a.sor_k + 1, workers=-1)
        mean_d = d[:, 1:].mean(axis=1)
        med_nn = float(np.median(mean_d))
        med_scale = float(np.median(sc[idx].mean(axis=1)))
        haze = (
            (op[idx] < a.min_opacity)
            & (sc[idx].mean(axis=1) > a.haze_scale_mult * med_scale)
            & (mean_d > a.haze_nn_mult * med_nn)
        )
        report["dropped_haze"] = int(haze.sum())
        thresh = mean_d.mean() + a.sor_std * mean_d.std()
        sor = mean_d > thresh
        report["dropped_sor"] = int((sor & ~haze).sum())
        keep[idx[haze | sor]] = False
    else:
        report["dropped_haze"] = 0
        report["dropped_sor"] = 0

    # 4. floor / ceiling clip in the COLMAP frame
    if a.frame:
        fr = json.loads(Path(a.frame).read_text())
        up = np.asarray(fr["up_colmap"], dtype=np.float64)
        floor_h = float(fr["floor_h"])
        scale = float(fr["scale"])  # metres per COLMAP unit
        h = xyz @ up
        low = floor_h - a.floor_margin / scale
        high = floor_h + a.ceiling_clip / scale
        m = (h >= low) & (h <= high)
        report["dropped_floor_ceiling"] = int((keep & ~m).sum())
        keep &= m

    # 5. visibility support, and 6. horizontal crop to the walked footprint
    if a.sparse and (a.min_views > 0 or a.crop_margin > 0):
        cams = load_cameras(Path(a.sparse))
        report["cameras"] = len(cams)
        if a.min_views > 0:
            counts = visibility_counts(xyz, cams)
            m = counts >= a.min_views
            report["dropped_visibility"] = int((keep & ~m).sum())
            keep &= m
        if a.crop_margin > 0 and a.frame:
            # Fog outside the room lives beyond the walls; anything further than the
            # margin from the camera path, measured horizontally, cannot be the room.
            fr = json.loads(Path(a.frame).read_text())
            up = np.asarray(fr["up_colmap"], dtype=np.float64)
            scale = float(fr["scale"])
            centres_c = np.array([-(R.T @ t) for R, t, _, _, _ in cams])
            # Horizontal coordinates: remove the up component.
            def horiz(p: np.ndarray) -> np.ndarray:
                return p - np.outer(p @ up, up)
            hc = horiz(centres_c)
            hp = horiz(xyz)
            if cKDTree is not None:
                dist, _ = cKDTree(hc).query(hp, k=1, workers=-1)
            else:
                dist = np.array([np.min(np.linalg.norm(hc - q, axis=1)) for q in hp])
            m = dist <= a.crop_margin / scale
            report["dropped_crop"] = int((keep & ~m).sum())
            keep &= m

    out = arr[keep]
    write_ply(Path(a.dst), out, props)
    report["output"] = int(len(out))
    report["kept_fraction"] = round(len(out) / max(n0, 1), 4)

    if a.mobile_out:
        # Phones: keep the splats that matter most — opacity times footprint — then SH0 at pack time.
        opk = op[keep]
        sck = sc[keep]
        score = opk * np.clip(sck.mean(axis=1), 1e-4, None)
        if len(out) > a.mobile_max:
            order = np.argsort(-score)[: a.mobile_max]
            order.sort()
            mob = out[order]
        else:
            mob = out
        write_ply(Path(a.mobile_out), mob, props)
        report["mobile_output"] = int(len(mob))

    report["seconds"] = round(time.time() - t0, 1)
    if a.report:
        Path(a.report).write_text(json.dumps(report, indent=2))
    print("RESULT clean " + json.dumps(report))
    return 0


if __name__ == "__main__":
    sys.exit(main())
