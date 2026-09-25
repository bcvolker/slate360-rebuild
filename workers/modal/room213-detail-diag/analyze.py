"""Room 213 detail diagnostic: matched-view measurements (CPU, local). Same masks, bands and definitions for every
image. No image is shifted, warped or re-aligned before scoring (the +-2 px shift scan is reported separately, as a
registration diagnostic only).

Definitions (grayscale = BT.709 luma of the 8-bit sRGB values, float):
  fine band = g - G(sigma 1.5 px);  mid band = G(1.5) - G(4.0)          (output pixels of that view)
  energy ratio      = std(render band) / std(reference band) over the scored mask
  NCC               = zero-shift normalized cross-correlation of the two band images over the scored mask
  coherent gain     = cov(r, s) / var(s)   (how much of the source's band signal the render reproduces, in amplitude)
  incoherent ratio  = std(r - gain * s) / std(s)   (band energy NOT explained by the source: noise, ringing, aliasing,
                      misplaced texture)
  scored mask       = carpet ROI AND reference-valid (inside lens + dataset keep mask) eroded by 12 px (band support)
  edge width        = 10-90 % rise of the mean profile across a fixed segment; each profile is centred on its own
                      max-gradient sample (within +-6 px of the nominal line) and resampled bilinearly at 0.25 px.
ROIs / segments are given in f=1280 pixel coordinates and mapped to f=640 by u' = 640 + (u - 640) / 2 (same rotation,
same centre, so the same physical surface).

usage: python analyze.py <dd dir> <out dir> <labels json: {label: pattern with {name}}>"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

CARPET_ROI_1280 = {
    "carpet_a0_indep": (560, 440, 860, 700),
    "carpet_a5_indep": None,   # filled from the view itself below if used
    "carpet_a3_indep": (330, 300, 700, 640),
    "table_edges_a4_indep": None,
    "carpet_a0_fixed": (300, 440, 700, 700),
    "chair_slats_a2_fixed": None,
}
EDGE_SEG_1280 = {   # (x0, y0, x1, y1): nominal edge line; profiles run perpendicular to it
    "carpet_a0_indep": {"baseboard_top": (420, 468, 540, 343)},
    "carpet_a3_indep": {"baseboard_top": (250, 176, 590, 104)},
    "carpet_a0_fixed": {"baseboard_top": (110, 398, 560, 292)},
    "chair_slats_a2_fixed": {"chair_back_top": (725, 530, 790, 523, 6)},
}


def to1280(box_or_seg, f):
    if f == 1280:
        return box_or_seg
    return tuple(640 + (v - 640) / 2 if i % 2 == 0 else 360 + (v - 360) / 2 for i, v in enumerate(box_or_seg))


def luma(img):
    b, g, r = [img[..., i].astype(np.float64) for i in range(3)]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def bands(g):
    g15 = cv2.GaussianBlur(g, (0, 0), 1.5)
    return {"fine": g - g15, "mid": g15 - cv2.GaussianBlur(g, (0, 0), 4.0)}


def band_stats(r, s, m):
    a, b = r[m], s[m]
    a0, b0 = a - a.mean(), b - b.mean()
    var_s = (b0 ** 2).mean()
    cov = (a0 * b0).mean()
    gain = cov / var_s
    return {"energyRatio": float(a0.std() / b0.std()), "ncc": float(cov / (a0.std() * b0.std())),
            "coherentGain": float(gain), "incoherentRatio": float((a0 - gain * b0).std() / b0.std())}


def shift_scan(r, s, m, rad=2):
    best = (-2.0, 0, 0)
    H, W = m.shape
    mm = m.copy()
    mm[:rad + 1] = mm[-rad - 1:] = False
    mm[:, :rad + 1] = mm[:, -rad - 1:] = False
    for dy in range(-rad, rad + 1):
        for dx in range(-rad, rad + 1):
            rs = np.roll(np.roll(r, dy, 0), dx, 1)
            v = band_stats(rs, s, mm)["ncc"]
            if v > best[0]:
                best = (v, dx, dy)
    return {"peakNcc": round(best[0], 4), "peakShiftPx": [best[1], best[2]]}


def edge_width(g, seg, half=12, search=6):
    if len(seg) == 5:
        seg, half, search = seg[:4], seg[4], 3
    x0, y0, x1, y1 = seg
    d = np.array([x1 - x0, y1 - y0], float)
    L = np.linalg.norm(d)
    t = d / L
    nrm = np.array([-t[1], t[0]])
    profs = []
    for k in np.linspace(0, 1, max(int(L / 2), 8)):
        c = np.array([x0, y0]) + k * d
        ss = np.arange(-half - search, half + search + 0.001, 0.25)
        pts = c[None] + ss[:, None] * nrm[None]
        p = cv2.remap(g.astype(np.float32), pts[:, 0].astype(np.float32).reshape(1, -1) - 0.0,
                      pts[:, 1].astype(np.float32).reshape(1, -1), cv2.INTER_LINEAR).ravel()
        gr = np.gradient(p)
        win = (np.abs(ss) <= search)
        i0 = np.argmax(np.abs(gr) * win)
        sub = p[max(0, i0 - half * 4): i0 + half * 4 + 1]
        if len(sub) == half * 8 + 1:
            profs.append(sub if gr[i0] > 0 else sub[::-1])
    P = np.mean(profs, 0)
    k = max(4, half)            # plateau = the outer quarter of each side
    lo, hi = np.median(P[:k]), np.median(P[-k:])
    q = (P - lo) / (hi - lo + 1e-9)
    xs = np.arange(len(q)) * 0.25

    def cross(level):
        idx = np.nonzero(q >= level)[0]
        if len(idx) == 0 or idx[0] == 0:
            return np.nan
        i = idx[0]
        return xs[i - 1] + (level - q[i - 1]) / (q[i] - q[i - 1] + 1e-12) * 0.25
    return {"width10_90px": float(cross(0.9) - cross(0.1)), "contrast": float(abs(hi - lo)), "profiles": len(profs)}


def main(dd, out, labels_json):
    dd, out = Path(dd), Path(out)
    out.mkdir(parents=True, exist_ok=True)
    labels = json.loads(labels_json) if labels_json.strip().startswith("{") else json.load(open(labels_json))
    views = json.load(open(dd / "refs" / "views.json"))["views"]
    imap = json.load(open(dd / "spirula" / "index_map.json"))
    res = {"definitions": __doc__, "views": {}}
    for v in views:
        name, tag, f = v["name"], v["tag"], v["f"]
        ref = cv2.imread(str(dd / "refs" / f"ref_{name}.png"))
        valid = cv2.imread(str(dd / "refs" / f"valid_{name}.png"), 0) > 127
        imgs = {}
        for lab, pat in labels.items():
            if pat.startswith("spirula:"):
                run = pat.split(":", 1)[1]
                p = dd / "spirula" / run / f"eval-render-{imap[run][name]:05d}.png"
            else:
                p = dd / pat.format(name=name)
            if p.is_file():
                imgs[lab] = cv2.imread(str(p))
        rec = {"f": f, "sourceView": v["sourceView"], "labels": sorted(imgs)}
        gs = luma(ref)
        bs = bands(gs)
        roi = CARPET_ROI_1280.get(tag)
        if roi:
            x0, y0, x1, y1 = [int(round(c)) for c in to1280(roi, f)]
            m = np.zeros_like(valid)
            m[y0:y1, x0:x1] = True
            m &= cv2.erode(valid.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
            rec["carpetRoi"] = [x0, y0, x1, y1]
            rec["carpetScoredPixels"] = int(m.sum())
            rec["refBandStd"] = {k: float(b[m].std()) for k, b in bs.items()}
            rec["carpet"] = {}
            for lab, im in imgs.items():
                g = luma(im)
                br = bands(g)
                st = {k: band_stats(br[k], bs[k], m) for k in ("fine", "mid")}
                st["fineShiftScan"] = shift_scan(br["fine"], bs["fine"], m)
                st["meanRgbMinusRef"] = (im[m].astype(float).mean(0) - ref[m].astype(float).mean(0))[::-1].round(2).tolist()
                st["psnrVsRef"] = float(10 * np.log10(255 ** 2 / ((im[m].astype(float) - ref[m].astype(float)) ** 2).mean()))
                rec["carpet"][lab] = st
            crops = [ref[y0:y1, x0:x1]] + [imgs[lab][y0:y1, x0:x1] for lab in imgs]
            names = ["source"] + list(imgs)
            tiles = []
            for nm, c in zip(names, crops):
                c = c.copy()
                cv2.putText(c, nm, (4, 14), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
                tiles.append(c)
            cv2.imwrite(str(out / f"carpet_crop_{name}.png"), np.hstack(tiles))
        segs = EDGE_SEG_1280.get(tag, {})
        rec["edges"] = {}
        for sn, seg in segs.items():
            s2 = tuple(to1280(seg[:4], f)) + ((max(3, seg[4] // (2 if f == 640 else 1)),) if len(seg) == 5 else ())
            rec["edges"][sn] = {"source": edge_width(gs, s2)}
            for lab, im in imgs.items():
                rec["edges"][sn][lab] = edge_width(luma(im), s2)
        res["views"][name] = rec
        print(name, "done")
    json.dump(res, open(out / "measurements.json", "w"), indent=1)


if __name__ == "__main__":
    main(*sys.argv[1:4])
