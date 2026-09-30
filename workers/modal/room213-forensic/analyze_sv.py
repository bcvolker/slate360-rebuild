"""Stationary (tripod clip 020) vs walking (021/075) X4 video, same day (9/21), same SfM frame (R213-OFFICIAL-REF),
same shutter (1/320 s, from the .insv trailers). Fixed surfaces only. Measures, separately:
  1 source detail      per-band energy of the NATIVE-resolution ortho (band-limited, no face warp)
  2 repeatability      same-viewpoint tripod frames vs each other (no geometry involved: noise/compression floor)
  2b cross-view        pairwise NCC between registered observations from different viewpoints, scale-matched pairs
  3 local agreement    registration offset of each observation vs the all-observation consensus (training px)
  4 edge width/contr.  10-90% ESF width of the target's strongest straight edge (mm and training px) + step contrast
  6 geometry           distance, native/training px per mm, incidence; walking blur estimate from SfM speeds
Usage: python analyze_sv.py <run dir> <sparse dir> <out dir>"""
import json, sys
from itertools import combinations
from pathlib import Path
import cv2, numpy as np, pycolmap

RUN, SP, OUT = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3]); OUT.mkdir(parents=True, exist_ok=True)
P = json.load(open(RUN / "prep.json")); rec = pycolmap.Reconstruction(SP)
FPS, EXP, WIN = 29.97, 1 / 320, [(3, 17), (23, 35.5), (42, 52.5)]
K = 5


def group(name):
    clip, cam, f = name.split("/")
    if clip.endswith("_020"):
        t = int(f[:-4]) / FPS; return "S%d" % next((i + 1 for i, (a, b) in enumerate(WIN) if a <= t <= b), 0)
    return "W"


def gray(x): return cv2.cvtColor(np.ascontiguousarray(x, np.float32), cv2.COLOR_RGB2GRAY) * 255.0
def band(g, k): s = 2.0 ** k; return cv2.GaussianBlur(g, (0, 0), s) - cv2.GaussianBlur(g, (0, 0), 2 * s)
def ncc(a, b, m): a, b = a[m] - a[m].mean(), b[m] - b[m].mean(); return float((a * b).mean() / (a.std() * b.std() + 1e-9))
def shift(img, dx, dy): return cv2.warpAffine(img, np.float32([[1, 0, dx], [0, 1, dy]]), img.shape[::-1], flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def register(mov, ref):
    a, b = band(ref, 1) + band(ref, 2), band(mov, 1) + band(mov, 2)
    (dx, dy), _ = cv2.phaseCorrelate(a.astype(np.float32), b.astype(np.float32), cv2.createHanningWindow(a.shape[::-1], cv2.CV_32F))
    return -dx, -dy


by_name = {im.name: im for im in rec.images.values()}
def walk_blur(name, X):
    """Image-space motion during the 1/320 s exposure, px at the NATIVE fisheye centre scale (f~1079): angular rate +
    translation parallax at the target distance, from the SfM poses of the neighbouring extracted frames (0.5 s apart)."""
    clip, cam, f = name.split("/"); i = int(f[:-4]); nb = [n for n in by_name if n.startswith(f"{clip}/{cam}/")]
    idx = sorted(int(n.split("/")[-1][:-4]) for n in nb); j = idx.index(i); a, b = idx[max(0, j - 1)], idx[min(len(idx) - 1, j + 1)]
    ia, ib = by_name[f"{clip}/{cam}/{a:05d}.jpg"], by_name[f"{clip}/{cam}/{b:05d}.jpg"]; dt = (b - a) / FPS
    Ra, Rb = (np.asarray(x.cam_from_world().rotation.matrix()) for x in (ia, ib)); ang = np.arccos(np.clip((np.trace(Rb @ Ra.T) - 1) / 2, -1, 1))
    Ca, Cb = np.asarray(ia.projection_center()), np.asarray(ib.projection_center()); v = np.linalg.norm(Cb - Ca) / dt
    d = np.linalg.norm(np.asarray(by_name[name].projection_center()) - X)
    return {"speed_m_s": float(v), "ang_deg_s": float(np.degrees(ang) / dt), "blur_px_native_upper": float((ang / dt + v / d) * EXP * 1079)}


def edge_width(g, texel):
    """Strongest straight step across the patch centre: average the profile perpendicular to the dominant gradient
    direction (rows or cols), 10-90% width in texels."""
    gx, gy = np.abs(cv2.Sobel(g, cv2.CV_32F, 1, 0)).mean(0), np.abs(cv2.Sobel(g, cv2.CV_32F, 0, 1)).mean(1)
    prof = g.mean(0) if gx.max() >= gy.max() else g.mean(1); gr = np.abs(np.gradient(cv2.GaussianBlur(prof.reshape(1, -1), (0, 0), 0.7).ravel()))
    c = int(np.argmax(gr[8:-8])) + 8; w = prof[max(0, c - 14):c + 15]
    lo, hi = np.percentile(w, 5), np.percentile(w, 95); rng = hi - lo
    if rng < 1: return None
    s = (w - lo) / rng; s = s if s[-1] > s[0] else s[::-1]
    x = np.arange(len(s)); t10, t90 = np.interp(0.1, np.maximum.accumulate(s), x), np.interp(0.9, np.maximum.accumulate(s), x)
    return {"width_mm": float((t90 - t10) * texel), "contrast": float(rng), "axis": "u" if gx.max() >= gy.max() else "v", "pos": c}


res = {}
for tname, T in P["targets"].items():
    tex = T["texel_mm"]; X = np.array(T["X"]); obs = T["observations"]
    nat = {o["tag"]: gray(np.load(RUN / tname / f"{o['tag']}_ortho_native.npy")) for o in obs if (RUN / tname / f"{o['tag']}_ortho_native.npy").exists()}
    trn = {o["tag"]: gray(np.load(RUN / tname / f"{o['tag']}_ortho_gt.npy")) for o in obs}
    obs = [o for o in obs if o["tag"] in nat and o.get("mask_valid") is not False]; n = next(iter(nat.values())).shape[0]; m = np.zeros((n, n), bool); c = n // 8; m[c:-c, c:-c] = True
    for o in obs:
        o["group"] = group(o["image"])
        if o["group"] == "W": o.update(walk_blur(o["image"], X))
    obs = [o for o in obs if o["group"] != "S0"]
    cons = np.median(np.stack([nat[o["tag"]] for o in obs]), 0)
    for _ in range(3):
        reg = {o["tag"]: register(nat[o["tag"]], cons) for o in obs}
        cons = np.median(np.stack([shift(nat[o["tag"]], *reg[o["tag"]]) for o in obs]), 0)
    al = {o["tag"]: shift(nat[o["tag"]], *reg[o["tag"]]) for o in obs}
    ew_ref = edge_width(cons, tex)
    rows = []
    for o in obs:
        dx, dy = reg[o["tag"]]; mm = float(np.hypot(dx, dy) * tex); e = edge_width(al[o["tag"]], tex)
        rows.append({k: o[k] for k in ("tag", "image", "group", "dist_m", "incidence_deg", "px_per_mm_native", "px_per_mm_train") if k in o} |
                    {k: o[k] for k in ("speed_m_s", "ang_deg_s", "blur_px_native_upper") if k in o} |
                    {"misreg_mm": mm, "misreg_train_px": mm * o["px_per_mm_train"], "band_energy_native": [float(band(al[o["tag"]], k)[m].std()) for k in range(K)],
                     "edge": e, "edge_width_train_px": (e["width_mm"] * o["px_per_mm_train"]) if e else None})
    def pairs(sel, same_view=None, scale_tol=1.5):
        out = [[] for _ in range(K)]; cut = []
        for a, b in combinations([o for o in obs if sel(o)], 2):
            if same_view is not None and ((a["group"] == b["group"] and a["group"] != "W") != same_view): continue
            r = a["px_per_mm_train"] / b["px_per_mm_train"]
            if max(r, 1 / r) > scale_tol: continue
            v = [ncc(band(al[a["tag"]], k), band(al[b["tag"]], k), m) for k in range(K)]
            for k in range(K): out[k].append(v[k])
            fin = next((k for k in range(K) if v[k] >= 0.5), None)          # finest band that still agrees
            if fin is not None: cut.append(tex * 2 ** fin * 0.5 * (a["px_per_mm_train"] + b["px_per_mm_train"]))   # lower band edge in training px
        return {"n_pairs": len(out[0]), "ncc_median": [float(np.median(x)) if x else None for x in out], "coherent_down_to_train_px_median": float(np.median(cut)) if cut else None}
    isS = lambda o: o["group"].startswith("S")
    res[tname] = {"texel_mm": tex, "bands_mm": [f"{tex * 2 ** k:g}-{tex * 2 ** (k + 1):g}" for k in range(K)], "consensus_edge": ew_ref,
                  "stationary_same_view": pairs(isS, same_view=True),
                  "stationary_cross_view": pairs(isS, same_view=False, scale_tol=4.0),
                  "walking_cross_view": pairs(lambda o: o["group"] == "W", scale_tol=1.5),
                  "stationary_vs_walking": pairs(lambda o: True, same_view=False, scale_tol=1.5),
                  "observations": rows}
    # matched viewpoints: each tripod placement vs the walking frame nearest to it that sees the target
    mv = []
    for g in ("S1", "S2", "S3"):
        s_ = [o for o in obs if o["group"] == g]
        if not s_: continue
        s0 = s_[0]; Cs = np.array(s0["C"]); w_ = sorted([o for o in obs if o["group"] == "W"], key=lambda o: np.linalg.norm(np.array(o["C"]) - Cs))
        if not w_: continue
        w0 = w_[0]; tiles = []
        for o, lab in ((s0, f"{g} tripod"), (w0, "walking nearest")):
            im = np.clip(al[o["tag"]], 0, 255).astype(np.uint8); im = cv2.resize(im, (360, 360), interpolation=cv2.INTER_NEAREST)
            cv2.putText(im, f"{lab} d={o['dist_m']:.2f}m {o['px_per_mm_native']:.2f}px/mm", (4, 16), 0, 0.45, 255, 1); tiles.append(im)
        cv2.imwrite(str(OUT / f"matched_{tname}_{g}.png"), np.hstack(tiles))
        mv.append({"placement": g, "tripod": s0["tag"], "walk": w0["tag"], "walk_center_offset_m": float(np.linalg.norm(np.array(w0["C"]) - Cs)),
                   "ncc_bands": [ncc(band(al[s0["tag"]], k), band(al[w0["tag"]], k), m) for k in range(K)],
                   "energy_tripod": [float(band(al[s0["tag"]], k)[m].std()) for k in range(K)], "energy_walk": [float(band(al[w0["tag"]], k)[m].std()) for k in range(K)],
                   "dist_tripod": s0["dist_m"], "dist_walk": w0["dist_m"], "blur_walk_px": w0.get("blur_px_native_upper")})
    res[tname]["matched_viewpoints"] = mv
json.dump(res, open(OUT / "sv_metrics.json", "w"), indent=1, default=float)
for t, r in res.items():
    print(f"\n== {t} bands {r['bands_mm']} consensus edge {r['consensus_edge']}")
    for k in ("stationary_same_view", "stationary_cross_view", "walking_cross_view", "stationary_vs_walking"):
        v = r[k]; print(f"  {k:24s} pairs {v['n_pairs']:4d} ncc {[None if x is None else round(x, 2) for x in v['ncc_median']]} coherent to {v['coherent_down_to_train_px_median']}")
    for g in ("S1", "S2", "S3", "W"):
        os_ = [o for o in r["observations"] if o["group"] == g]
        if not os_: continue
        med = lambda k: float(np.median([o[k] for o in os_ if o.get(k) is not None])) if any(o.get(k) is not None for o in os_) else None
        E = np.median([o["band_energy_native"] for o in os_], 0)
        print(f"  {g}: n={len(os_)} dist {med('dist_m'):.2f} m, native {med('px_per_mm_native'):.2f} px/mm, train {med('px_per_mm_train'):.2f}; misreg {med('misreg_train_px'):.2f} train px; "
              f"edge {med('edge_width_train_px')} train px; E_native {np.round(E, 1).tolist()}" + (f"; speed {med('speed_m_s'):.2f} m/s, rot {med('ang_deg_s'):.0f} deg/s, blur<= {med('blur_px_native_upper'):.2f} px" if g == "W" else ""))
    for mv in r["matched_viewpoints"]:
        print(f"  matched {mv['placement']}: walk {mv['walk_center_offset_m']:.2f} m away, d {mv['dist_tripod']:.2f}/{mv['dist_walk']:.2f}, ncc {np.round(mv['ncc_bands'], 2).tolist()}, "
              f"E tripod {np.round(mv['energy_tripod'], 1).tolist()} walk {np.round(mv['energy_walk'], 1).tolist()}, walk blur<= {mv['blur_walk_px']}")
