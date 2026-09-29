"""Stage 1 Spark delivery gate: OFFICIAL native (Spirula v2026.9.24 render) vs OFFICIAL Spark (production Spark 2.1.0 path,
corrected settings: accumExtSplats, blur 0, preBlur 0, LoD off, DPR 1, 1280x720) at identical cameras and pixels.
GOLDEN Spark is shown for context only. 1:1 crops, no processing; optional x3 nearest-neighbour zoom row.
Usage: python spark_compare.py <dd dir> <official native eval dir (ev/ref)> <out dir>"""
import json, sys
from pathlib import Path
import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "room213-detail-diag"))
from analyze import luma, bands, band_stats, edge_width, shift_scan  # noqa: E402

DD, NAT, OUT = (Path(a) for a in sys.argv[1:4]); OUT.mkdir(parents=True, exist_ok=True)
SP = DD / "out_spark"
VIEWS = json.load(open(DD / "refs" / "views.json"))["views"]; VIDX = {v["name"]: k for k, v in enumerate(VIEWS)}
TARGETS = [("1_white_wall", "carpet_a0_indep_f1280", (20, 330, 340, 570), None),
           ("2_ceiling_grid", "chair_slats_a2_fixed_f640", (360, 0, 680, 240), (400, 96, 560, 132)),
           ("3_window_reveal", "carpet_a0_indep_f640", (330, 40, 650, 280), None),
           ("4_chair_slats", "chair_slats_a2_fixed_f1280", (650, 440, 970, 680), (725, 530, 790, 523, 6)),
           ("5_carpet", "carpet_a0_indep_f1280", (560, 440, 880, 700), None)]
PANELS = [("SOURCE", "rectified training frame"), ("OFFICIAL native", "Spirula v2026.9.24 render"),
          ("OFFICIAL Spark", "Spark 2.1.0 product path (corrected)"), ("GOLDEN Spark", "context: golden in same Spark path")]
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


def pair_stats(a, b, m=None):
    d = b.astype(float) - a.astype(float)
    if m is not None: d = d[m]
    else: d = d.reshape(-1, 3)
    return {"signed_mean_BGR": [round(float(x), 2) for x in d.mean(0)], "mad": round(float(np.abs(d).mean()), 2), "rmse": round(float(np.sqrt((d ** 2).mean())), 2)}


def target(key, view, roi, seg):
    k = VIDX[view]
    ims = [cv2.imread(str(DD / "refs" / f"ref_{view}.png")), cv2.imread(str(NAT / "diag" / f"v{k:03d}_{view}_eval.png")),
           cv2.imread(str(SP / f"spk_official_combined_lod0__{view}.png")), cv2.imread(str(SP / f"iso_golden_combined_lod0__{view}.png"))]
    valid = cv2.imread(str(DD / "refs" / f"valid_{view}.png"), 0) > 127
    x0, y0, x1, y1 = roi; m = np.zeros_like(valid); m[y0:y1, x0:x1] = True
    m &= cv2.erode(valid.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0
    bs = bands(luma(ims[0])); bn = bands(luma(ims[1])); recs = []
    for i, im in enumerate(ims):
        g = luma(im); b = bands(g); r = {"fine_std": float(b["fine"][m].std())}
        if i:
            r["fine_vs_source"] = band_stats(b["fine"], bs["fine"], m); r["mid_vs_source"] = band_stats(b["mid"], bs["mid"], m)
            r["shift_vs_source"] = shift_scan(b["mid"], bs["mid"], m, rad=6)
        if i >= 2 and i == 2:
            r["fine_vs_official_native"] = band_stats(b["fine"], bn["fine"], m); r["mid_vs_official_native"] = band_stats(b["mid"], bn["mid"], m)
            r["pixels_vs_official_native"] = pair_stats(ims[1], ims[2], m)
        if seg: r["edge"] = edge_width(g, seg)
        recs.append(r)
    w = x1 - x0; tiles = []
    for i, (im, r) in enumerate(zip(ims, recs)):
        L = [(PANELS[i][0], W_, 0.5), (PANELS[i][1], G_, 0.36), (f"cam {view} 1280x720, ROI x{x0} y{y0} {w}x{y1 - y0} 1:1", G_, 0.34),
             (f"fine-band std {r['fine_std']:.2f}", W_, 0.4)]
        if "edge" in r: L.append((f"edge 10-90%: {r['edge']['width10_90px']:.2f} px contrast {r['edge']['contrast']:.0f}", W_, 0.4))
        if "shift_vs_source" in r: L.append((f"vs source: mid NCC@best {r['shift_vs_source']['peakNcc']:.2f}, fine energy {r['fine_vs_source']['energyRatio']:.2f}", W_, 0.38))
        if "fine_vs_official_native" in r:
            L.append((f"vs OFFICIAL native: mid NCC {r['mid_vs_official_native']['ncc']:.2f}, fine NCC {r['fine_vs_official_native']['ncc']:.2f}", W_, 0.38))
            L.append((f"  fine energy x{r['fine_vs_official_native']['energyRatio']:.2f}, pixel MAD {r['pixels_vs_official_native']['mad']:.1f}", W_, 0.38))
        tiles.append(np.vstack([im[y0:y1, x0:x1], txt(L, w, 16 * 8 + 8)]))
    zw, zh = 106, 80; cx, cy = w // 2 - zw // 2, (y1 - y0) // 2 - zh // 2
    if seg: cx = int(np.clip((seg[0] + seg[2]) / 2 - x0 - zw / 2, 0, w - zw)); cy = int(np.clip((seg[1] + seg[3]) / 2 - y0 - zh / 2, 0, y1 - y0 - zh))
    zoom = hrow([cv2.resize(im[y0:y1, x0:x1][cy:cy + zh, cx:cx + zw], (zw * 3, zh * 3), interpolation=cv2.INTER_NEAREST) for im in ims])
    body = hrow(tiles); zoom = np.hstack([zoom, np.full((zoom.shape[0], max(0, body.shape[1] - zoom.shape[1]), 3), BG, np.uint8)])[:, :body.shape[1]]
    head = txt([(f"{key[2:].replace('_', ' ').upper()} | camera {view} | identical camera, identical pixels", W_, 0.55),
                ("SOURCE | OFFICIAL native | OFFICIAL Spark | GOLDEN Spark (context). Row 1 = 1:1, no processing. Row 2 = centre patch, nearest-neighbour x3.", G_, 0.4)], body.shape[1], 42)
    cv2.imwrite(str(OUT / f"spark_target_{key}.png"), np.vstack([head, body, np.full((8, body.shape[1], 3), BG, np.uint8), zoom]))
    return {"view": view, "roi": roi, "panels": dict(zip([p[0] for p in PANELS], recs))}


def walk():
    res = {}
    for k in ("00000", "00200", "00400", "00600"):
        a = cv2.imread(str(NAT / "walk" / f"w_{k}_eval.png")); b = cv2.imread(str(SP / f"spk_official_combined_lod0__walk_{k}.png"))
        g = cv2.imread(str(SP / f"spk_golden_walk_combined_lod0__walk_{k}.png"))
        ga, gb = luma(a), luma(b); ba, bb = bands(ga), bands(gb); full = np.ones(ga.shape, bool)
        lab = lambda t: txt([(t, W_, 0.5)], 1280, 24)
        cv2.imwrite(str(OUT / f"spark_walk_{k}.png"), hrow([np.vstack([lab(f"OFFICIAL native | walk w_{k} | 1280x720 1:1"), a]),
                                                          np.vstack([lab(f"OFFICIAL Spark | walk w_{k} | 1280x720 1:1"), b]),
                                                          np.vstack([lab(f"GOLDEN Spark (context) | walk w_{k}"), g])]))
        res[k] = {"pixels_spark_minus_native": pair_stats(a, b), "fine_band_ncc": band_stats(bb["fine"], ba["fine"], full)["ncc"],
                  "mid_band_ncc": band_stats(bb["mid"], ba["mid"], full)["ncc"], "fine_energy_spark_over_native": band_stats(bb["fine"], ba["fine"], full)["energyRatio"],
                  "fine_std_native": float(ba["fine"].std()), "fine_std_spark": float(bb["fine"].std())}
    return res


if __name__ == "__main__":
    out = {"targets": {k: target(k, v, r, s) for k, v, r, s in TARGETS}, "walk": walk()}
    json.dump(out, open(OUT / "spark_metrics.json", "w"), indent=1)
    for k, r in out["targets"].items():
        p = r["panels"]; o = p["OFFICIAL Spark"]
        print(k, "fstd src/nat/spk/goldspk", [round(p[n]["fine_std"], 2) for n in p], "| spk vs nat mid NCC", round(o["mid_vs_official_native"]["ncc"], 3),
              "fine NCC", round(o["fine_vs_official_native"]["ncc"], 3), "fine en", round(o["fine_vs_official_native"]["energyRatio"], 2), "px", o["pixels_vs_official_native"],
              "| vs src NCC nat/spk/goldspk", [p[n].get("shift_vs_source", {}).get("peakNcc") for n in list(p)[1:]],
              "| edge", [round(p[n]["edge"]["width10_90px"], 2) for n in p] if "edge" in o else "")
    for k, r in out["walk"].items(): print("walk", k, r)
