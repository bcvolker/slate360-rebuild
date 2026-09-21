"""Room 213 2026-09-21 source-level A'/B/C comparison at IDENTICAL angular sampling.

Every source is rendered to the SAME pinhole grid the historical pipeline produced for arm C:
1280x1280, fl=cx=cy=640, 90 deg HFOV, bilinear resampling (matches stages/views.py's
py360convert.e2p(..., mode="bilinear") so C is compared against new sources rendered the
same way, not against a better-filtered version of them).

  A'  new on-device-stitched ERP still (5888x2944)  -> py360convert.e2p, same as pipeline
  B   raw X4 lens frame (3840x3840 fisheye, one physical lens, NOT stitched) -> per-lens
      equidistant dewarp to the same pinhole (r = f*theta, f measured from the lens circle:
      R~2100px at an assumed 100 deg half-FOV => f~1200 px/rad; +-10% uncertainty noted in
      the report; the checkerboard square pitch is used to cross-check scale)
  C   historical Studio-ERP -> 1280 crop (used as-is; it IS the target grid)

Modes:
  render  : write pinhole PNGs for a list of (source, yaw, pitch) jobs
  measure : compute the forensic-audit metrics on ROI boxes in those renders (+ checkerboard
            pitch where a checkerboard ROI is flagged)
No stitching, sharpening, denoising or color correction anywhere.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "room213-source-detail-audit"))
from detail_forensic_audit import blockiness, esf_width_px, hf_ratio, lapvar, local_contrast, michelson  # noqa: E402

OUT_HW = (1280, 1280)
FL = 640.0


def erp_to_pinhole(erp_bgr: np.ndarray, yaw: float, pitch: float) -> np.ndarray:
    import py360convert
    return py360convert.e2p(erp_bgr, fov_deg=90, u_deg=yaw, v_deg=pitch, out_hw=OUT_HW, mode="bilinear")


def fisheye_to_pinhole(fish_bgr: np.ndarray, yaw: float, pitch: float, cx: float, cy: float,
                       f_rad: float = 1200.0) -> np.ndarray:
    """Equidistant single-lens dewarp. yaw/pitch are the pinhole optical axis relative to the
    lens axis (deg). Image up == lens up."""
    h, w = OUT_HW
    u = (np.arange(w) - FL) / FL
    v = (np.arange(h) - FL) / FL
    uu, vv = np.meshgrid(u, v)
    d = np.stack([uu, -vv, np.ones_like(uu)], -1)  # camera: x right, y up, z forward
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    yr, pr = math.radians(yaw), math.radians(-pitch)  # image y grows down; +pitch must look up
    Ry = np.array([[math.cos(yr), 0, math.sin(yr)], [0, 1, 0], [-math.sin(yr), 0, math.cos(yr)]])
    Rx = np.array([[1, 0, 0], [0, math.cos(pr), -math.sin(pr)], [0, math.sin(pr), math.cos(pr)]])
    d = d @ (Ry @ Rx).T
    x, y, z = d[..., 0], d[..., 1], d[..., 2]
    theta = np.arccos(np.clip(z, -1, 1))
    phi = np.arctan2(-y, x)  # image y grows downward
    r = f_rad * theta
    mapx = (cx + r * np.cos(phi)).astype(np.float32)
    mapy = (cy + r * np.sin(phi)).astype(np.float32)
    return cv2.remap(fish_bgr, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)


def checkerboard_pitch_px(gray: np.ndarray) -> dict | None:
    for pat in ((7, 10), (10, 7), (6, 9), (9, 6), (7, 7), (5, 8), (8, 5), (6, 6), (5, 5), (4, 6), (6, 4)):
        ok, corners = cv2.findChessboardCornersSB(gray, pat, flags=cv2.CALIB_CB_EXHAUSTIVE)
        if ok:
            c = corners.reshape(pat[1], pat[0], 2)
            dx = np.linalg.norm(np.diff(c, axis=1), axis=-1).mean()
            dy = np.linalg.norm(np.diff(c, axis=0), axis=-1).mean()
            return {"pattern_inner_corners": list(pat), "square_pitch_px": round(float((dx + dy) / 2), 2)}
    return None


def measure_roi(gray: np.ndarray, bbox, is_checker=False) -> dict:
    x0, y0, x1, y1 = bbox
    g = gray[y0:y1, x0:x1]
    m = {
        "roi_dims_px": [x1 - x0, y1 - y0],
        "esf_width_px": (round(w, 2) if (w := esf_width_px(g)) is not None else None),
        "local_contrast": round(local_contrast(g), 2),
        "michelson": round(michelson(g), 4),
        "lapvar": round(lapvar(g), 2),
        "hf_ratio": round(hf_ratio(g), 4),
        "blockiness": round(blockiness(g), 4),
    }
    if is_checker:
        m["checkerboard"] = checkerboard_pitch_px(g)
    return m


def main():
    mode = sys.argv[1]
    spec = json.load(open(sys.argv[2]))
    out = Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
    if mode == "render":
        for job in spec["jobs"]:
            src = job["source"]
            img = cv2.imread(job["path"], cv2.IMREAD_COLOR)
            assert img is not None, job["path"]
            if src.startswith("A"):
                pin = erp_to_pinhole(img, job["yaw"], job["pitch"])
            elif src.startswith("B"):
                pin = fisheye_to_pinhole(img, job["yaw"], job["pitch"], job["cx"], job["cy"], job.get("f_rad", 1200.0))
            else:  # C: already the target grid
                pin = img
            cv2.imwrite(str(out / f"{job['id']}.png"), pin)
            print("rendered", job["id"], pin.shape)
    elif mode == "measure":
        res = []
        for r in spec["rois"]:
            g = cv2.imread(str(out / f"{r['render_id']}.png"), cv2.IMREAD_GRAYSCALE)
            m = measure_roi(g, r["bbox"], r.get("checker", False))
            res.append({**r, **m})
            print(r["render_id"], r["feature"], m)
        json.dump(res, open(out / "measurements.json", "w"), indent=1)


if __name__ == "__main__":
    main()
