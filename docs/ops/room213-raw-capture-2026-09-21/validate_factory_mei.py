"""Validate the recovered X4 factory Mei calibration WITHOUT refining any Mei parameter:
round trip, straight-line test (Mei vs provisional equidistant) at several radii, lens
consistency, and write x4_factory_mei.json. ChArUco residuals come from the separate
least-squares check (board pose only) run before this script; numbers are embedded below.
Usage: python validate_factory_mei.py <RAW_DIR> [charuco_median charuco_rms charuco_p95]
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import x4_mei_model as M  # noqa: E402

RAW = Path(sys.argv[1])
CH = [float(x) for x in sys.argv[2:5]] if len(sys.argv) >= 5 else [0.58, 0.92, 1.82]
lenses = M.parse_mei(); circ = M.parse_offset()
FRAME_CIRCLE = {0: (1870.9, 1855.5, 2101.2), 1: (1925.8, 1843.8, 2106.2)}


def crop_from_circle(stream: int, lens: int):
    c = circ[lens]; fc = FRAME_CIRCLE[stream]; s = fc[2] / c["r"]
    return s, s * (c["cx"] - c["canvas_x_offset"]) - fc[0], s * c["cy"] - fc[1]


# ---- round trip ----
L = M.MeiLens(lenses[0], *crop_from_circle(0, 0))
g = np.stack(np.meshgrid(np.linspace(20, 3820, 80), np.linspace(20, 3820, 80)), -1).reshape(-1, 2)
X, v = L.unproject_frame(g); p, v2 = L.project_frame(X); ok = v & v2
d = np.hypot(*(p[ok] - g[ok]).T); rad = np.hypot(g[:, 0] - 1870.9, g[:, 1] - 1855.5)
print(f"ROUND TRIP: valid {ok.sum()}/{len(g)} max {d.max():.5f} px mean {d.mean():.6f} | <0.1px fraction {np.mean(d < 0.1):.4f} | max valid radius {rad[ok].max():.0f} px (circle r 2101)")


# ---- straight-line test ----
def render(fish, proj, yaw, pitch, out=1600, f=800.0):
    u = (np.arange(out) - out / 2) / f; uu, vv = np.meshgrid(u, u)
    dirs = np.stack([uu, vv, np.ones_like(uu)], -1); dirs /= np.linalg.norm(dirs, axis=-1, keepdims=True)
    yr, pr = math.radians(yaw), math.radians(pitch)
    Ry = np.array([[math.cos(yr), 0, math.sin(yr)], [0, 1, 0], [-math.sin(yr), 0, math.cos(yr)]])
    Rx = np.array([[1, 0, 0], [0, math.cos(pr), -math.sin(pr)], [0, math.sin(pr), math.cos(pr)]])
    dirs = dirs @ (Ry @ Rx).T
    pp, valid = proj(dirs); mapx = pp[..., 0].astype(np.float32); mapy = pp[..., 1].astype(np.float32)
    mapx[~valid] = -1; mapy[~valid] = -1
    return cv2.remap(fish, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)


def straightness(img):
    gr = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY); e = cv2.Canny(gr, 60, 160)
    lines = cv2.HoughLinesP(e, 1, np.pi / 720, 200, minLineLength=450, maxLineGap=20)
    if lines is None:
        return []
    ys, xs = np.where(e > 0); P = np.c_[xs, ys].astype(float); res = []
    for x1, y1, x2, y2 in lines[:, 0][:40]:
        a = np.array([x1, y1], float); b = np.array([x2, y2], float); n = b - a; ln = np.linalg.norm(n); n /= ln
        t = (P - a) @ n; m = (t > 0) & (t < ln); q = P[m]
        dist = np.abs((q - a) @ np.array([-n[1], n[0]])); sel = dist < 8
        if sel.sum() > 300:
            pts = q[sel]; c = pts.mean(0); _, _, vt = np.linalg.svd(pts - c); dv = vt[0]
            dev = (pts - c) @ np.array([-dv[1], dv[0]])
            res.append((float(ln), float(np.sqrt((dev ** 2).mean())), float(np.percentile(np.abs(dev), 95))))
    return res


def eq_proj(cx, cy, f=1200.0):
    def proj(dirs):
        th = np.arccos(np.clip(dirs[..., 2], -1, 1)); ph = np.arctan2(dirs[..., 1], dirs[..., 0]); r = f * th
        return np.stack([cx + r * np.cos(ph), cy + r * np.sin(ph)], -1), th < math.radians(100)
    return proj


fish = {0: cv2.imread(str(RAW / "vid020_p1_t5.97_lens0.png")), 1: cv2.imread(str(RAW / "vid020_p1_t5.97_lens1.png"))}
views = [(0, 0, "center"), (0, 45, "up45"), (45, 0, "yaw45"), (70, 0, "yaw70"), (45, 45, "diag45"), (0, -45, "down45")]
summary = {}
for stream in (0, 1):
    for model in ("mei", "equidistant"):
        if model == "mei":
            Lm = M.MeiLens(lenses[stream], *crop_from_circle(stream, stream)); proj = Lm.project_frame
        else:
            proj = eq_proj(FRAME_CIRCLE[stream][0], FRAME_CIRCLE[stream][1])
        for yaw, pitch, tag in views:
            img = render(fish[stream], proj, yaw, pitch); r = straightness(img)
            if r:
                rms = np.array([x[1] for x in r]); p95 = np.array([x[2] for x in r])
                summary[(stream, model, tag)] = (len(r), float(np.median(rms)), float(np.median(p95)), float(rms.max()))
            else:
                summary[(stream, model, tag)] = (0, None, None, None)
            if stream == 0 and tag in ("center", "yaw70", "up45"):
                cv2.imwrite(str(RAW / f"line_{model}_s{stream}_{tag}.png"), img)
print("STRAIGHT-LINE TEST: rms px deviation of Canny edge points from a refit line (1600px 90deg pinhole; lower = straighter)")
print(f"{'stream':6s} {'view':8s} {'mei n/med_rms/med_p95/max':34s} equidistant n/med_rms/med_p95/max")
fmt = lambda x: f"{x[0]:3d} / {x[1]:.2f} / {x[2]:.2f} / {x[3]:.2f}" if x[0] else "  0 / -"
for stream in (0, 1):
    for _, _, tag in views:
        print(f"{stream:6d} {tag:8s} {fmt(summary[(stream, 'mei', tag)]):34s} {fmt(summary[(stream, 'equidistant', tag)])}")

A, B = lenses
print("LENS CONSISTENCY: fx A/B %.1f/%.1f (%.2f%%) fy %.1f/%.1f xi identical=%s k1 %.4f/%.4f k2 %.3f/%.3f k3 %.3f/%.3f | B translation |t| = %.2f mm"
      % (A["fx"], B["fx"], 100 * (A["fx"] - B["fx"]) / A["fx"], A["fy"], B["fy"], A["xi"] == B["xi"], A["k1"], B["k1"], A["k2"], B["k2"], A["k3"], B["k3"], 1000 * np.linalg.norm(B["t_m"])))
print("crop similarity (s, ox, oy) from circle geometry: s0->A", [round(x, 4) for x in crop_from_circle(0, 0)], "s0->B", [round(x, 4) for x in crop_from_circle(0, 1)],
      "s1->B", [round(x, 4) for x in crop_from_circle(1, 1)], "s1->A", [round(x, 4) for x in crop_from_circle(1, 0)])

# ---- calibration JSON ----
man = json.load(open(Path(__file__).resolve().parent.parent / "room213-raw-capture-2026-09-21-manifest.json"))
sha = [f["sha256"] for f in man["files"] if f["filename"].endswith("_020.insv")][0]
rho2 = 1 / (A["xi"] ** 2 - 1)
out = {
    "source_filename": "VID_20260921_105956_00_020.insv", "source_sha256": sha,
    "volume_copy": "slate360-recon-experiments:/room213/2026-09-21/raw-capture-test/VID_20260921_105956_00_020.insv (SHA256 verified identical by the cloud preflight)",
    "serial": "IBMEA24069A4BV", "model": "Insta360 X4", "firmware": "v1.9.21_build5",
    "capture_mode": "video; 2 x 3840x3840 HEVC single-lens streams (unstitched), 29.97 fps",
    "decode_method": "Insta360 trailer: last 40 bytes = u32le trailer_size (12081364) + u32le version (3) + 32-byte magic 8db42d694ccc418790edff439fe026bf; metadata record at trailer end; protobuf length-delimited string fields read directly from tag+varint length. No SDK, no inference.",
    "protobuf_fields": {"1": "serial", "2": "model", "3": "firmware", "22": "'standard'", "53": "circle/offset string (277 B)", "54": "Mei/unified calibration string (336 B)", "55": "copy of 53", "56": "copy of 54"},
    "raw_strings": {"field53": M.OFFSET_STR, "field54": M.MEI_STR},
    "camera_model": "Mei/unified, OpenCV omnidir convention (validated): X_s=X/|X|; m=(x_s/(z_s+xi), y_s/(z_s+xi)); radial k1,k2,k3 + tangential p1,p2 on m; u=fx*m_x+cx, v=fy*m_y+cy",
    "token_layout_field54": "per lens: xi fx fy cx cy yaw_deg pitch_deg roll_deg tx ty tz k1 k2 k3 p1 p2 canvasW canvasH F ; lens A then lens B; trailing 197632 unknown",
    "canvas_convention": "16000x6000 canvas, px; lens A x in [0,8000), lens B x in [8000,16000) (cx_B=12003.11); angles deg; translation metres, lens B relative to lens A",
    "lenses": lenses, "circle_field53": circ,
    "frame_mapping": {"frame": "3840x3840 lens stream", "model": "u_f = s*(u_canvas - 8000*[lens B]) - ox ; v_f = s*v_canvas - oy",
                      "s_ox_oy_from_circle_geometry": {"stream0_as_A": crop_from_circle(0, 0), "stream0_as_B": crop_from_circle(0, 1), "stream1_as_B": crop_from_circle(1, 1), "stream1_as_A": crop_from_circle(1, 0)},
                      "frame_circle_fits_cx_cy_r": FRAME_CIRCLE,
                      "stream_to_lens_assignment": "UNRESOLVED by the target (identical ChArUco residual either way); circle-scale consistency weakly favours stream0=B, stream1=A"},
    "validity": {"rho2_max_normalised": rho2, "theta_max_deg_from_axis": round(math.degrees(math.acos((-rho2 * A["xi"]) / (rho2 + 1))), 1), "note": "unprojection is real only inside rho2_max; F=71 meaning unknown"},
    "validation": {"charuco_placement1_stream0": {"n_corners": 18, "median_px": CH[0], "rms_px": CH[1], "p95_px": CH[2], "note": "Mei params fixed; board pose solved; crop similarity from circle geometry (a free s is degenerate with board distance at one placement)"},
                   "round_trip_px": {"max": float(d.max()), "mean": float(d.mean()), "n_valid": int(ok.sum()), "n": int(len(g))},
                   "straight_line_rms_px_median_by_view": {f"stream{k[0]}_{k[1]}_{k[2]}": v[1] for k, v in summary.items()}},
    "unknown_or_uncertain": ["stream<->lens A/B assignment", "Euler order/convention of per-lens yaw/pitch/roll (relative rotation NOT taken from the string)",
                             "meaning of F=71 and trailing ids 197632/132096", "field53 tokens 10-13 (possibly a quaternion) unused",
                             "whether firmware applies these params identically at video vs still resolution"],
}
json.dump(out, open(RAW / "x4_factory_mei.json", "w"), indent=1)
json.dump(out, open(Path(__file__).resolve().parent / "x4_factory_mei.json", "w"), indent=1)
print("JSON written")
