"""Condition comparison sheets (native renders, identical cameras/pixels, 1:1, no processing).
  locked targets:  SOURCE (9/21 rectified ref) | GOLDEN | OFFICIAL | <COND>
  lineage views:   SOURCE (condition's own frame, rectified at the same camera) | GOLDEN | OFFICIAL | <COND>, full frame + ROI
  walk overviews:  GOLDEN | OFFICIAL | <COND> at 1280x720
Usage: python cond_sheets.py <cond> <renders dir> <dd dir> <out dir>"""
import json, sys
from pathlib import Path
import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "room213-detail-diag"))
from analyze import luma, bands, band_stats, edge_width, shift_scan  # noqa: E402

COND, RD, DD, OUT = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]); OUT.mkdir(parents=True, exist_ok=True)
MODELS = [("GOLDEN", "golden_for_" + COND), ("OFFICIAL", "official_for_" + COND), (COND, COND)]
LOCKED = [("white_wall", "carpet_a0_indep_f1280", (20, 330, 340, 570), None), ("ceiling_grid", "chair_slats_a2_fixed_f640", (360, 0, 680, 240), (400, 96, 560, 132)),
          ("window_reveal", "carpet_a0_indep_f640", (330, 40, 650, 280), None), ("chair_slats", "chair_slats_a2_fixed_f1280", (650, 440, 970, 680), (725, 530, 790, 523, 6)),
          ("table_edge", "table_edges_a4_indep_f1280", (760, 360, 1080, 600), (925, 535, 985, 475)), ("carpet", "carpet_a0_indep_f1280", (560, 440, 880, 700), None)]
BG, W_, G_ = (24, 24, 24), (235, 235, 235), (160, 160, 160)


def txt(lines, w, h):
    b = np.full((h, w, 3), BG, np.uint8)
    for k, (t, c, s) in enumerate(lines): cv2.putText(b, t, (6, 16 + 16 * k), cv2.FONT_HERSHEY_SIMPLEX, s, c, 1, cv2.LINE_AA)
    return b


def hrow(tiles, gap=8):
    h = max(t.shape[0] for t in tiles); out = []
    for i, t in enumerate(tiles):
        if i: out.append(np.full((h, gap, 3), BG, np.uint8))
        out.append(np.vstack([t, np.full((h - t.shape[0], t.shape[1], 3), BG, np.uint8)]) if t.shape[0] < h else t)
    return np.hstack(out)


def measure(ims, roi, seg, valid=None):
    x0, y0, x1, y1 = roi; m = np.zeros(ims[0].shape[:2], bool); m[y0:y1, x0:x1] = True
    if valid is not None: m &= cv2.erode(valid.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
    bs = bands(luma(ims[0])); recs = []
    for i, im in enumerate(ims):
        g = luma(im); b = bands(g); r = {"fine_std": float(b["fine"][m].std())}
        if i: r["fine"] = band_stats(b["fine"], bs["fine"], m); r["mid"] = band_stats(b["mid"], bs["mid"], m); r["shift"] = shift_scan(b["mid"], bs["mid"], m, rad=6)
        if seg: r["edge"] = edge_width(g, seg)
        recs.append(r)
    return recs


def sheet(title, sub, names, ims, roi, recs, out):
    x0, y0, x1, y1 = roi; w = x1 - x0; tiles = []
    for n, im, r in zip(names, ims, recs):
        L = [(n, W_, 0.5), (f"ROI x{x0} y{y0} {w}x{y1 - y0} 1:1", G_, 0.36), (f"fine-band std {r['fine_std']:.2f}", W_, 0.4)]
        if "edge" in r: L.append((f"edge 10-90%: {r['edge']['width10_90px']:.2f} px contrast {r['edge']['contrast']:.0f}", W_, 0.4))
        if "shift" in r: L += [(f"vs source: mid NCC@best {r['shift']['peakNcc']:.2f} (shift {r['shift']['peakShiftPx']})", W_, 0.38),
                               (f"fine energy {r['fine']['energyRatio']:.2f}, mid energy {r['mid']['energyRatio']:.2f}", W_, 0.38)]
        tiles.append(np.vstack([im[y0:y1, x0:x1], txt(L, w, 16 * 6 + 8)]))
    body = hrow(tiles)
    cv2.imwrite(str(out), np.vstack([txt([(title, W_, 0.55), (sub, G_, 0.4)], body.shape[1], 42), body]))


res = {"locked": {}, "lineage": {}, "walk": {}}
for key, view, roi, seg in LOCKED:
    ims = [cv2.imread(str(DD / "refs" / f"ref_{view}.png"))] + [cv2.imread(str(RD / d / f"{view}.png")) for _, d in MODELS]
    valid = cv2.imread(str(DD / "refs" / f"valid_{view}.png"), 0) > 127
    recs = measure(ims, roi, seg, valid); res["locked"][key] = dict(zip(["SOURCE_9-21"] + [n for n, _ in MODELS], recs))
    sheet(f"{key.upper()} | locked camera {view} | identical camera, identical pixels", "SOURCE = 9/21 rectified frame (chairs may have moved since) | GOLDEN | OFFICIAL | " + COND,
          ["SOURCE 9/21"] + [n for n, _ in MODELS], ims, roi, recs, OUT / f"{COND}_locked_{key}.png")
for key in ("white_wall", "ceiling_grid", "window_reveal", "chair_slats", "table_edge", "carpet"):
    n = f"lin_{key}"; ims = [cv2.imread(str(RD / ("src" + COND) / f"{n}.png"))] + [cv2.imread(str(RD / d / f"{n}.png")) for _, d in MODELS]
    valid = ims[0].sum(2) > 0; roi = (320, 180, 960, 540)
    recs = measure(ims, roi, None, valid); res["lineage"][key] = dict(zip(["SOURCE_cond"] + [nn for nn, _ in MODELS], recs))
    sheet(f"LINEAGE {key.upper()} | camera at the {COND} source frame | identical camera, identical pixels",
          f"SOURCE = {COND}'s own rectified frame (9/29) | GOLDEN | OFFICIAL | {COND}. Centre 640x360 at 1:1.",
          [f"SOURCE ({COND} frame)"] + [nn for nn, _ in MODELS], ims, roi, recs, OUT / f"{COND}_lineage_{key}.png")
    full = [cv2.resize(im, (640, 360), interpolation=cv2.INTER_AREA) for im in ims]
    cv2.imwrite(str(OUT / f"{COND}_lineage_{key}_full.jpg"), np.vstack([hrow(full[:2]), np.full((8, 1288, 3), BG, np.uint8), hrow(full[2:])]), [cv2.IMWRITE_JPEG_QUALITY, 92])
for k in ("00000", "00200", "00400", "00600"):
    ims = [cv2.imread(str(RD / d / f"walk_{k}.png")) for _, d in MODELS]
    lab = lambda t: txt([(t, W_, 0.5)], 1280, 24)
    cv2.imwrite(str(OUT / f"{COND}_walk_{k}.png"), hrow([np.vstack([lab(f"{n} | walk w_{k} | 1280x720 1:1"), im]) for (n, _), im in zip(MODELS, ims)]))
    g = [luma(im) for im in ims]
    res["walk"][k] = {n: {"fine_std": float(bands(x)["fine"].std()), "mid_std": float(bands(x)["mid"].std())} for (n, _), x in zip(MODELS, g)}
json.dump(res, open(OUT / f"{COND}_metrics.json", "w"), indent=1)
for part in ("locked", "lineage"):
    for k, r in res[part].items():
        print(part, k, " | ".join(f"{n}: " + (f"NCC {v['shift']['peakNcc']:.2f} fineE {v['fine']['energyRatio']:.2f} " if 'shift' in v else f"fstd {v['fine_std']:.2f} ")
                                    + (f"edge {v['edge']['width10_90px']:.1f}/c{v['edge']['contrast']:.0f}" if 'edge' in v else "") for n, v in r.items()))
