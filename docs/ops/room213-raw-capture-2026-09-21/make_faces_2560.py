"""Stage-1 sample faces: 2560x2560 per-lens perspective faces straight from the 3840 lens
frames through the validated factory Mei pixel->ray mapping. No stitching, no blending, no
1280 intermediate. Fixed face rotations per lens; the originating lens centre is recorded.
Also: overlap-duplication audit (how many face pixels see a ray already covered by another
face of the same lens) and the loader detail-survival check (splatfacto resize_image box
schedule 2560 -> 1280 -> 640; nerfstudio auto-downscale cannot trigger without images_2/).
Usage: python make_faces_2560.py <RAW_DIR> <OUT_DIR>
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "room213-source-detail-audit"))
import x4_mei_model as M  # noqa: E402
from detail_forensic_audit import esf_width_px, hf_ratio, lapvar, local_contrast  # noqa: E402

RAW = Path(sys.argv[1]); OUT = Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
lenses = M.parse_mei(); circ = M.parse_offset()
FRAME_CIRCLE = {0: (1870.9, 1855.5, 2101.2), 1: (1925.8, 1843.8, 2106.2)}
ASSIGN = {0: 0, 1: 1}  # stream -> lens index (A/B); UNRESOLVED, A/B intrinsics differ 0.5%
FACE = 2560; FOV = 80.0; FL = FACE / 2 / math.tan(math.radians(FOV / 2))
FACES = [("f", 0, 0), ("l", -60, 0), ("r", 60, 0), ("u", 0, 55), ("d", 0, -55)]


def crop(stream, lens):
    c = circ[lens]; fc = FRAME_CIRCLE[stream]; s = fc[2] / c["r"]
    return s, s * (c["cx"] - c["canvas_x_offset"]) - fc[0], s * c["cy"] - fc[1]


def face_dirs(yaw, pitch):
    u = (np.arange(FACE) - FACE / 2 + 0.5) / FL; uu, vv = np.meshgrid(u, u)
    d = np.stack([uu, vv, np.ones_like(uu)], -1); d /= np.linalg.norm(d, axis=-1, keepdims=True)
    yr, pr = math.radians(yaw), math.radians(pitch)
    Ry = np.array([[math.cos(yr), 0, math.sin(yr)], [0, 1, 0], [-math.sin(yr), 0, math.cos(yr)]])
    Rx = np.array([[1, 0, 0], [0, math.cos(pr), -math.sin(pr)], [0, math.sin(pr), math.cos(pr)]])
    R = Ry @ Rx
    return d @ R.T, R


def box(a, dfac):
    h, w = a.shape[:2]; h2, w2 = h // dfac, w // dfac
    return a[:h2 * dfac, :w2 * dfac].reshape(h2, dfac, w2, dfac, *a.shape[2:]).mean(axis=(1, 3))


meta = []; overlap = {}
for tag, roles in (("vid020_p1_t5.97", "tripod_p1"), ("VID_20260921_111410_00_075_keep_t96.76", "walk_keeper")):
    for stream in (0, 1):
        li = ASSIGN[stream]; L = M.MeiLens(lenses[li], *crop(stream, li))
        img = cv2.imread(str(RAW / f"{tag}_lens{stream}.png"))
        coverage = np.zeros((3840 // 8, 3840 // 8), np.int32)  # lens-frame pixel visitation by faces
        for name, yaw, pitch in FACES:
            d, R = face_dirs(yaw, pitch); p, valid = L.project_frame(d)
            mapx = p[..., 0].astype(np.float32); mapy = p[..., 1].astype(np.float32)
            inside = valid & (mapx >= 0) & (mapx < 3840) & (mapy >= 0) & (mapy < 3840)
            mapx[~inside] = -1; mapy[~inside] = -1
            face = cv2.remap(img, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
            mask = (inside.astype(np.uint8) * 255)
            fn = f"{tag}_L{stream}_{name}"; cv2.imwrite(str(OUT / f"{fn}.png"), face); cv2.imwrite(str(OUT / f"{fn}_mask.png"), mask)
            ix = (mapx[inside] // 8).astype(int); iy = (mapy[inside] // 8).astype(int)
            cell = np.zeros_like(coverage, dtype=bool); cell[iy, ix] = True; coverage += cell  # binary per face
            meta.append({"face": fn, "source_frame": f"{tag}_lens{stream}.png", "stream": stream, "lens_index_AB": "AB"[li], "role": roles,
                         "yaw_deg": yaw, "pitch_deg": pitch, "fov_deg": FOV, "fl_px": FL, "size": FACE,
                         "R_face_from_lens": R.tolist(), "valid_fraction": float(inside.mean()),
                         "lens_center_frame_px": FRAME_CIRCLE[stream][:2], "crop_s_ox_oy": crop(stream, li)})
        seen = coverage > 0; dup = coverage > 1
        overlap[f"{tag}_L{stream}"] = {"lens_pixels_covered_frac": float(seen.mean()), "covered_by_2plus_faces_frac_of_covered": float(dup.sum() / max(1, seen.sum())), "max_faces_per_pixel": int(coverage.max())}
json.dump({"faces": meta, "overlap_audit": overlap}, open(OUT / "faces_manifest.json", "w"), indent=1)
print("OVERLAP AUDIT", json.dumps(overlap, indent=1))

# ---- loader detail survival on the tripod front face (checkerboard) and up face (ceiling) ----
rep = {}
for fn, bbox, feat in (("vid020_p1_t5.97_L0_f", None, "checkerboard"), ("vid020_p1_t5.97_L0_u", None, "ceiling")):
    g = cv2.imread(str(OUT / f"{fn}.png"), 0)
    if feat == "checkerboard":
        # locate the board in the 2560 face via aruco
        dct = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_250); det = cv2.aruco.CharucoDetector(cv2.aruco.CharucoBoard((8, 11), 0.023, 0.01725, dct))
        cc, cid, mc, mid = det.detectBoard(g)
        if cc is not None and len(cc) >= 6:
            xy = cc.reshape(-1, 2); x0, y0 = xy.min(0).astype(int) - 40; x1, y1 = xy.max(0).astype(int) + 40
            bbox = (max(0, x0), max(0, y0), min(2560, x1), min(2560, y1)); rep["charuco_corners_in_2560_face"] = int(len(cc))
            pitch = float(np.mean([np.linalg.norm(np.diff(np.sort(xy[:, 0]))[np.diff(np.sort(xy[:, 0])) > 5])])) if len(xy) > 6 else None
            rep["charuco_corner_pitch_px_2560"] = pitch
        else:
            bbox = (1100, 900, 1500, 1400); rep["charuco_corners_in_2560_face"] = 0
    else:
        bbox = (900, 400, 1700, 1200)
    x0, y0, x1, y1 = bbox; roi = g[y0:y1, x0:x1].astype(np.float32)
    stages = {"2560_face": roi, "1280_loader(steps3000-5999)": box(roi, 2), "640_loader(steps0-2999)": box(roi, 4)}
    rep[feat] = {k: {"dims": list(v.shape[::-1]), "lapvar": round(lapvar(v), 1), "hf_ratio": round(hf_ratio(v), 3), "contrast": round(local_contrast(v), 1),
                    "esf_px": esf_width_px(v.astype(np.uint8))} for k, v in stages.items()}
    print(feat, json.dumps(rep[feat]))
json.dump(rep, open(OUT / "loader_detail_survival.json", "w"), indent=1)
print("FACES DONE", len(meta))
