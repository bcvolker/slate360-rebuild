"""R213-G1 native comparison sheets + detail metrics (local). SOURCE | GOLDEN native | G1 native at identical cameras and
identical pixels; 1:1 crops, no resampling filter / sharpening / tone change (optional x3 nearest-neighbour zoom row,
identical for all panels, labelled). Metrics reuse the room213-detail-diag definitions (analyze.py).
Usage: python g1_analysis.py <ev dir (eval/ from the volume)> <refs dir> <out dir>"""
import json, sys
from pathlib import Path
import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "room213-detail-diag"))
from analyze import luma, bands, band_stats, edge_width  # noqa: E402

EV, REFS, OUT = (Path(a) for a in sys.argv[1:4]); OUT.mkdir(parents=True, exist_ok=True)
VIEWS = json.load(open(REFS / "views.json"))["views"]
VIDX = {v["name"]: k for k, v in enumerate(VIEWS)}
TARGETS = [  # locked in the 2026-09-28 visual comparison (same cameras / ROIs / segments)
    ("1_white_wall", "carpet_a0_indep_f1280", (20, 330, 340, 570), None),
    ("2_ceiling_grid", "chair_slats_a2_fixed_f640", (360, 0, 680, 240), (400, 96, 560, 132)),
    ("3_window_recess", "carpet_a0_indep_f640", (330, 40, 650, 280), None),
    ("4_chair_slats", "chair_slats_a2_fixed_f1280", (650, 440, 970, 680), (725, 530, 790, 523, 6)),
    ("5_table_edge", "table_edges_a4_indep_f1280", (760, 360, 1080, 600), (925, 535, 985, 475)),
    ("6_carpet", "carpet_a0_indep_f1280", (560, 440, 880, 700), None),
    ("6b_baseboard", "carpet_a0_indep_f1280", (360, 300, 600, 500), (420, 468, 540, 343)),
]
PANELS = [("SOURCE", "rectified training frame"), ("GOLDEN native", "Spirula 3DGUT, golden PLY"), ("G1 native", "Spirula 3DGUT, G1 PLY (normals 0.01)")]
BG, W_, G_ = (24, 24, 24), (235, 235, 235), (160, 160, 160)


def load(view):
    k = VIDX[view]; n = f"diag/v{k:03d}_{view}_eval.png"
    ims = [cv2.imread(str(REFS / f"ref_{view}.png")), cv2.imread(str(EV / "golden" / n)), cv2.imread(str(EV / "g1" / n))]
    valid = cv2.imread(str(REFS / f"valid_{view}.png"), 0)
    return ims, (valid > 127) if valid is not None else np.ones(ims[0].shape[:2], bool)


def metrics(ims, valid, roi, seg):
    x0, y0, x1, y1 = roi; m = np.zeros_like(valid); m[y0:y1, x0:x1] = True
    m &= cv2.erode(valid.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
    bs = bands(luma(ims[0])); out = []
    for i, im in enumerate(ims):
        g = luma(im); r = {"fine_std": float(bands(g)["fine"][m].std()) if m.sum() else None}
        if i and m.sum() > 500:
            br = bands(g); r["fine"] = band_stats(br["fine"], bs["fine"], m); r["mid"] = band_stats(br["mid"], bs["mid"], m)
        if seg: r["edge"] = edge_width(g, seg)
        out.append(r)
    return out


def txt(lines, w, h):
    b = np.full((h, w, 3), BG, np.uint8)
    for k, (t, c, s) in enumerate(lines): cv2.putText(b, t, (6, 16 + 16 * k), cv2.FONT_HERSHEY_SIMPLEX, s, c, 1, cv2.LINE_AA)
    return b


def hrow(tiles, gap=8):
    h = max(t.shape[0] for t in tiles); parts = []
    for i, t in enumerate(tiles):
        if i: parts.append(np.full((h, gap, 3), BG, np.uint8))
        parts.append(np.vstack([t, np.full((h - t.shape[0], t.shape[1], 3), BG, np.uint8)]) if t.shape[0] < h else t)
    return np.hstack(parts)


def target(key, view, roi, seg):
    ims, valid = load(view); x0, y0, x1, y1 = roi; recs = metrics(ims, valid, roi, seg); w = x1 - x0
    tiles = []
    for i, (im, r) in enumerate(zip(ims, recs)):
        L = [(PANELS[i][0], W_, 0.5), (PANELS[i][1], G_, 0.36), (f"cam {view} 1280x720", G_, 0.36), (f"ROI x{x0} y{y0} {w}x{y1 - y0}, 1:1", G_, 0.36),
             (f"fine-band std {r['fine_std']:.2f}", W_, 0.4)]
        if "edge" in r: L.append((f"edge 10-90%: {r['edge']['width10_90px']:.2f} px contrast {r['edge']['contrast']:.0f}", W_, 0.4))
        if "fine" in r:
            L.append((f"fine: gain {r['fine']['coherentGain']:.2f} energy {r['fine']['energyRatio']:.2f} incoh {r['fine']['incoherentRatio']:.2f}", W_, 0.4))
            L.append((f"mid:  gain {r['mid']['coherentGain']:.2f} energy {r['mid']['energyRatio']:.2f} incoh {r['mid']['incoherentRatio']:.2f}", W_, 0.4))
        tiles.append(np.vstack([im[y0:y1, x0:x1], txt(L, w, 16 * 8 + 8)]))
    zw, zh = 106, 80; cx, cy = w // 2 - zw // 2, (y1 - y0) // 2 - zh // 2
    if seg:
        cx = int(np.clip((seg[0] + seg[2]) / 2 - x0 - zw / 2, 0, w - zw)); cy = int(np.clip((seg[1] + seg[3]) / 2 - y0 - zh / 2, 0, y1 - y0 - zh))
    zoom = [cv2.resize(im[y0:y1, x0:x1][cy:cy + zh, cx:cx + zw], (zw * 3, zh * 3), interpolation=cv2.INTER_NEAREST) for im in ims]
    body = hrow(tiles); zr = hrow(zoom)
    zr = np.hstack([zr, np.full((zr.shape[0], max(0, body.shape[1] - zr.shape[1]), 3), BG, np.uint8)])[:, :body.shape[1]]
    head = txt([(f"{key[2:].replace('_', ' ').upper()} | camera {view} | identical camera, identical pixels", W_, 0.55),
                ("SOURCE -> GOLDEN native Spirula -> G1 native Spirula. Row 1 = 1:1, no processing. Row 2 = centre patch, nearest-neighbour x3, identical for all.", G_, 0.4)],
               body.shape[1], 42)
    cv2.imwrite(str(OUT / f"target_{key}.png"), np.vstack([head, body, np.full((8, body.shape[1], 3), BG, np.uint8), zr]))
    return {"view": view, "roi": roi, "segment": seg, "panels": dict(zip([p[0] for p in PANELS], recs))}


def overview():
    """Ordinary viewing scale: walkthrough poses (1280x720, 1:1) GOLDEN | G1, and two held-out fisheye frames at 1/2."""
    for k in (0, 200, 400, 600):
        n = f"walk/w_{k:05d}_eval.png"; a, b = cv2.imread(str(EV / "golden" / n)), cv2.imread(str(EV / "g1" / n))
        lab = lambda t: txt([(t, W_, 0.5)], 1280, 24)
        cv2.imwrite(str(OUT / f"overview_walk_{k:05d}.png"), hrow([np.vstack([lab(f"GOLDEN native | walk w_{k:05d} | 1280x720 1:1"), a]),
                                                                    np.vstack([lab(f"G1 native | walk w_{k:05d} | 1280x720 1:1"), b])]))


if __name__ == "__main__":
    res = {k: target(k, v, r, s) for k, v, r, s in TARGETS}
    overview()
    json.dump(res, open(OUT / "target_metrics.json", "w"), indent=1)
    for k, r in res.items():
        p = r["panels"]
        print(k, " | ".join(f"{n}: fstd={v['fine_std']:.2f}" + (f" gain={v['fine']['coherentGain']:.2f} en={v['fine']['energyRatio']:.2f} inc={v['fine']['incoherentRatio']:.2f} midgain={v['mid']['coherentGain']:.2f}" if 'fine' in v else "")
                            + (f" edge={v['edge']['width10_90px']:.2f}/c{v['edge']['contrast']:.0f}" if 'edge' in v else "") for n, v in p.items()))
