r"""Solve the constant IRX(thermal, 640x512) -> MAX(visible, 4000x3000)
mapping from image pairs (no factory calibration exists for this rig).

Consensus method: multi-scale template init (gradient NCC sweep) ->
ECC on Sobel-gradient images (affine, then homography refine) ->
validate per-pair (ECC score + center consistency) -> median of params.

Output: deliverables\rig_irx_to_max.json  {H: 3x3 IRX px -> MAX FULL-RES px,
per-pair diagnostics}.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, r"C:\s360\workers\modal\thermal-analysis")
from flir_fff_decode import decode_flir

DELIV = r"C:\ASU-Survey\deliverables"
MEDIA = Path(r"C:\ASU-Survey\102MEDIA")
MAXW = 1000  # MAX working width

reg = json.load(open(DELIV + r"\registration_102.json"))["frames"]
idx = json.load(open(DELIV + r"\index_102MEDIA.json"))["frames"]
names = [r["file"] for r in idx]
# spread ~24 pairs across the flight
picks = names[10::len(names) // 24][:24]


def grad(im):
    im = cv2.GaussianBlur(im.astype(np.float32), (5, 5), 1.2)
    gx = cv2.Sobel(im, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(im, cv2.CV_32F, 0, 1, ksize=3)
    g = np.sqrt(gx * gx + gy * gy)
    hi = np.percentile(g, 99) + 1e-6
    return np.clip(g / hi, 0, 1)


results = []
for name in picks:
    ir_path = MEDIA / name
    vis_path = MEDIA / name.replace("IRX_", "MAX_")
    if not vis_path.exists():
        continue
    t, _p, _ = decode_flir(ir_path)
    lo, hi = np.percentile(t, 2), np.percentile(t, 98)
    ir = np.clip((t - lo) / max(hi - lo, 1e-6), 0, 1) * 255
    vis = cv2.imread(str(vis_path), cv2.IMREAD_GRAYSCALE)
    mscale = MAXW / vis.shape[1]
    vis_s = cv2.resize(vis, (MAXW, int(vis.shape[0] * mscale)))
    g_vis = grad(vis_s)

    # scale sweep: IRX gradient as template on MAX gradient
    best = None
    for s in np.arange(0.8, 2.6, 0.08):
        tw = int(640 * s * (ir.shape[1] / 640) / (ir.shape[1] / 640))
        tw = int(ir.shape[1] * s)
        thh = int(ir.shape[0] * s)
        if tw >= g_vis.shape[1] or thh >= g_vis.shape[0]:
            break
        g_ir = grad(cv2.resize(ir, (tw, thh)))
        r = cv2.matchTemplate(g_vis.astype(np.float32),
                              g_ir.astype(np.float32), cv2.TM_CCOEFF_NORMED)
        _mn, mx, _l1, loc = cv2.minMaxLoc(r)
        if best is None or mx > best[0]:
            best = (mx, s, loc)
    if best is None or best[0] < 0.15:
        results.append({"name": name, "ok": False,
                        "why": "template init failed (%.2f)" % (best[0] if best else -1)})
        continue
    ncc, s, (x0, y0) = best

    # ECC refine on gradients (affine)
    g_ir_full = grad(cv2.resize(ir, (int(ir.shape[1] * s),
                                     int(ir.shape[0] * s))))
    warp = np.array([[s, 0, x0], [0, s, y0]], np.float32)
    # ECC maps template(ir at native 640) -> vis_s coordinates:
    # build warp from native ir px: scale s then translate
    g_ir_nat = grad(ir)
    try:
        crit = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 120, 1e-6)
        cc, warp = cv2.findTransformECC(
            g_vis.astype(np.float32), g_ir_nat.astype(np.float32),
            warp, cv2.MOTION_AFFINE, crit, None, 5)
    except cv2.error as e:
        results.append({"name": name, "ok": False, "why": "ecc: %s" % str(e)[:60]})
        continue
    # warp maps ir-native px -> vis_s px (inputWarp semantics: template=ir?
    # findTransformECC(templateImage, inputImage, ...) warps INPUT toward
    # TEMPLATE; we passed template=g_vis, input=g_ir -> warp maps ir->vis. )
    H = np.vstack([warp, [0, 0, 1]]).astype(np.float64)
    # to FULL-RES MAX px
    S = np.diag([1 / mscale, 1 / mscale, 1.0])
    Hf = S @ H
    ctr = Hf @ np.array([320, 256, 1.0])
    results.append({"name": name, "ok": True, "ncc": round(float(ncc), 3),
                    "ecc": round(float(cc), 3),
                    "scale": round(float(np.sqrt(abs(np.linalg.det(Hf[:2, :2])))), 4),
                    "center_max": [round(ctr[0], 1), round(ctr[1], 1)],
                    "H": Hf.tolist()})
    print("%s ncc %.2f ecc %.3f scale %.3f center (%.0f, %.0f)"
          % (name, ncc, cc, results[-1]["scale"], ctr[0], ctr[1]), flush=True)

ok = [r for r in results if r.get("ok")]
if len(ok) >= 5:
    scales = np.array([r["scale"] for r in ok])
    cxs = np.array([r["center_max"][0] for r in ok])
    cys = np.array([r["center_max"][1] for r in ok])
    med_s, med_x, med_y = np.median(scales), np.median(cxs), np.median(cys)
    # inliers: near-median pairs
    good = [r for r in ok if abs(r["scale"] - med_s) < 0.08 * med_s
            and abs(r["center_max"][0] - med_x) < 120
            and abs(r["center_max"][1] - med_y) < 120]
    Hs = np.array([r["H"] for r in good])
    H_med = np.median(Hs, axis=0)
    print("\npairs ok %d, inliers %d; median scale %.3f center (%.0f, %.0f)"
          % (len(ok), len(good), med_s, med_x, med_y))
    json.dump({"H_irx_to_max_fullres": H_med.tolist(),
               "n_pairs": len(good), "pairs": results},
              open(DELIV + r"\rig_irx_to_max.json", "w"), indent=1)
    print("saved rig_irx_to_max.json")
else:
    json.dump({"pairs": results}, open(DELIV + r"\rig_irx_to_max.json", "w"))
    print("INSUFFICIENT PAIRS: %d ok" % len(ok))
