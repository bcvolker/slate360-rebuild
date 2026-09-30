"""Close-pass lineage analysis (A frame). For every observation of a target:
  camera space (no planar proxy): exact training-face crop (GT tensor) vs native render of A / A+ at the SAME camera;
    per band in TRAINING PX (1-2, 2-4, 4-8, 8-16 px): NCC after <=3 px registration, energy ratio; 10-90% edge width.
  source detail on the target plane (ortho, native resolution), CLOSE group only (small baselines, local patch):
    pairwise cross-view NCC per band (mm), leave-one-out ceiling, misregistration in training px.
  novel midpoint renders vs the close consensus (ortho) against the leave-one-out ceiling.
Groups: CLOSE = training sampling >= 0.9 px/mm, FAR = <= 0.55 px/mm. Usage: python analyze_close.py <run dir> <out dir>"""
import json, sys
from itertools import combinations
from pathlib import Path
import cv2, numpy as np

RUN, OUT = Path(sys.argv[1]), Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
import os
P = json.load(open(RUN / "prep.json")); MODELS = os.environ.get("MODELS", "A,Aplus").split(","); K = 4


def gray(x): return cv2.cvtColor(np.ascontiguousarray(x, np.float32), cv2.COLOR_RGB2GRAY) * 255.0
def band(g, k, base=1.0): s = base * 2.0 ** k; return cv2.GaussianBlur(g, (0, 0), s / 2) - cv2.GaussianBlur(g, (0, 0), s)   # ~[s, 2s] px
def ncc(a, b, m=None):
    if m is None: m = np.ones(a.shape, bool)
    a, b = a[m] - a[m].mean(), b[m] - b[m].mean(); return float((a * b).mean() / (a.std() * b.std() + 1e-9))
def shift(img, dx, dy): return cv2.warpAffine(img, np.float32([[1, 0, dx], [0, 1, dy]]), img.shape[::-1], flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
def register(mov, ref, lim=3.0):
    a, b = band(ref, 1) + band(ref, 2), band(mov, 1) + band(mov, 2)
    (dx, dy), _ = cv2.phaseCorrelate(a.astype(np.float32), b.astype(np.float32), cv2.createHanningWindow(a.shape[::-1], cv2.CV_32F))
    return (-dx, -dy) if np.hypot(dx, dy) <= lim else (0.0, 0.0)


def edge_width_px(g):
    gx, gy = np.abs(cv2.Sobel(g, cv2.CV_32F, 1, 0)), np.abs(cv2.Sobel(g, cv2.CV_32F, 0, 1)); mag = np.hypot(gx, gy)
    y, x = np.unravel_index(np.argmax(cv2.GaussianBlur(mag, (0, 0), 2)[8:-8, 8:-8]), (mag.shape[0] - 16, mag.shape[1] - 16)); y += 8; x += 8
    d = np.array([gx[y, x] * np.sign(cv2.Sobel(g, cv2.CV_32F, 1, 0)[y, x]), cv2.Sobel(g, cv2.CV_32F, 0, 1)[y, x]]); d /= np.linalg.norm(d) + 1e-9
    ss = np.arange(-8, 8.01, 0.25); pts = np.stack([x + ss * d[0], y + ss * d[1]], 1).astype(np.float32)
    prof = cv2.remap(g, pts[:, 0].reshape(1, -1), pts[:, 1].reshape(1, -1), cv2.INTER_LINEAR).ravel()
    lo, hi = np.percentile(prof, 5), np.percentile(prof, 95)
    if hi - lo < 4: return None
    s = np.maximum.accumulate((prof - lo) / (hi - lo)) if prof[-1] > prof[0] else np.maximum.accumulate(((prof - lo) / (hi - lo))[::-1])
    return float((np.interp(0.9, s, ss) - np.interp(0.1, s, ss)))


res = {}
for tn, T in P["targets"].items():
    tex = T["texel_mm"]; obs = [o for o in T["observations"] if (RUN / tn / f"{o['tag']}_train_face.npy").exists()]
    for o in obs: o["grp"] = "CLOSE" if o["px_per_mm_train"] >= 0.9 else ("FAR" if o["px_per_mm_train"] <= 0.55 else "MID")
    per = []
    for o in obs:
        gt = gray(np.load(RUN / tn / f"{o['tag']}_train_face.npy")); r = {"tag": o["tag"], "grp": o["grp"], "dist_m": o["dist_m"], "px_mm": o["px_per_mm_train"],
                                                                              "edge_gt_px": edge_width_px(gt), "E_gt": [float(band(gt, k).std()) for k in range(K)]}
        for M in MODELS:
            f = RUN / tn / M / f"{o['render_view']}_face_crop.png"
            if not f.exists(): continue
            rd = cv2.cvtColor(cv2.imread(str(f)), cv2.COLOR_BGR2GRAY).astype(np.float32)
            if rd.shape != gt.shape: continue
            dx, dy = register(rd, gt, lim=3.0 if M == "A" else 40.0); rd = shift(rd, dx, dy); m = np.zeros(gt.shape, bool); m[6:-6, 6:-6] = True   # A+ arrives via a model-to-model transform (~1 cm residual)
            r[M] = {"shift_px": float(np.hypot(dx, dy)), "ncc": [ncc(band(rd, k), band(gt, k), m) for k in range(K)],
                    "energy": [float(band(rd, k)[m].std() / (band(gt, k)[m].std() + 1e-9)) for k in range(K)], "edge_px": edge_width_px(rd)}
        per.append(r)
    nat = {o["tag"]: gray(np.load(RUN / tn / f"{o['tag']}_ortho_native.npy")) for o in obs if o["grp"] == "CLOSE" and (RUN / tn / f"{o['tag']}_ortho_native.npy").exists()}
    src = None
    if len(nat) >= 3:
        n = next(iter(nat.values())).shape[0]; m = np.zeros((n, n), bool); c = n // 8; m[c:-c, c:-c] = True
        cons = np.median(np.stack(list(nat.values())), 0)
        for _ in range(3):
            rg = {k: register(v, cons, lim=40) for k, v in nat.items()}; cons = np.median(np.stack([shift(v, *rg[k]) for k, v in nat.items()]), 0)
        al = {k: shift(v, *rg[k]) for k, v in nat.items()}; pxmm = {o["tag"]: o["px_per_mm_train"] for o in obs}
        pr = [[ncc(band(al[a], k, 1), band(al[b], k, 1), m) for k in range(K + 1)] for a, b in combinations(al, 2)]
        loo = [[ncc(band(al[t], k, 1), band(np.median(np.stack([al[q] for q in al if q != t]), 0), k, 1), m) for k in range(K + 1)] for t in al]
        nov = {}
        for M in MODELS:
            vs = []
            for nv in T["novel"]:
                f = RUN / tn / M / f"{nv['name']}_ortho.npy"
                if f.exists():
                    g = gray(np.load(f)); dx, dy = register(g, cons, lim=40); vs.append([ncc(band(shift(g, dx, dy), k, 1), band(cons, k, 1), m) for k in range(K + 1)])
            nov[M] = np.median(vs, 0).round(2).tolist() if vs else None
        src = {"bands_mm": [f"{tex * 2 ** k / 2:g}-{tex * 2 ** k:g}" for k in range(K + 1)], "n_close": len(al), "pairwise_ncc": np.median(pr, 0).round(2).tolist(),
               "loo_ceiling": np.median(loo, 0).round(2).tolist(), "novel_vs_consensus": nov,
               "misreg_train_px_median": float(np.median([np.hypot(*rg[k]) * tex * pxmm[k] for k in al]))}
    summ = {}
    for g in ("CLOSE", "MID", "FAR"):
        rows = [r for r in per if r["grp"] == g]
        if not rows: continue
        s = {"n": len(rows), "dist_m": float(np.median([r["dist_m"] for r in rows])), "px_mm": float(np.median([r["px_mm"] for r in rows])),
             "edge_gt_px": float(np.median([r["edge_gt_px"] for r in rows if r["edge_gt_px"]])) if any(r["edge_gt_px"] for r in rows) else None,
             "E_gt": np.median([r["E_gt"] for r in rows], 0).round(2).tolist()}
        for M in MODELS:
            rr = [r[M] for r in rows if M in r]
            if rr: s[M] = {"ncc": np.median([x["ncc"] for x in rr], 0).round(2).tolist(), "energy": np.median([x["energy"] for x in rr], 0).round(2).tolist(),
                           "shift_px": float(np.median([x["shift_px"] for x in rr])), "edge_px": float(np.median([x["edge_px"] for x in rr if x["edge_px"]])) if any(x["edge_px"] for x in rr) else None}
        summ[g] = s
    res[tn] = {"groups": summ, "close_source": src, "per_view": per}
    # lineage sheet: close obs rows: source crop | training face | A render | A+ render
    rows = []
    for o in [o for o in obs if o["grp"] == "CLOSE"][:4] + [o for o in obs if o["grp"] == "FAR"][:2]:
        tiles = []
        for lab, f in (("original lens crop", RUN / tn / f"{o['tag']}_src_native.png"), ("training face (exact)", RUN / tn / f"{o['tag']}_train_face.png"),
                       ("A native render", RUN / tn / "A" / f"{o['render_view']}_face_crop.png"), ("A+ native render", RUN / tn / "Aplus" / f"{o['render_view']}_face_crop.png")):
            im = cv2.imread(str(f)); im = np.zeros((240, 240, 3), np.uint8) if im is None else cv2.resize(im, (240, 240), interpolation=cv2.INTER_AREA if im.shape[0] > 240 else cv2.INTER_NEAREST)
            cv2.putText(im, lab, (3, 14), 0, 0.42, (0, 255, 0), 1); tiles.append(im)
        lab = np.zeros((240, 150, 3), np.uint8)
        for i, t in enumerate([o["grp"], o["tag"], f"{o['dist_m']:.2f} m", f"{o['px_per_mm_train']:.2f} px/mm", o["image"].split("/")[1] + " " + o["image"][-9:-4]]):
            cv2.putText(lab, t, (4, 20 + 20 * i), 0, 0.45, (255, 255, 255), 1)
        rows.append(np.hstack([lab] + tiles))
    cv2.imwrite(str(OUT / f"lineage_{tn}.jpg"), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 90])
json.dump(res, open(OUT / "close_metrics.json", "w"), indent=1, default=float)
for tn, r in res.items():
    print(f"\n== {tn}  (camera-space bands in TRAINING px: 1-2 / 2-4 / 4-8 / 8-16)")
    for g, s in r["groups"].items():
        line = f"  {g:5s} n={s['n']:2d} d={s['dist_m']:.2f} m {s['px_mm']:.2f} px/mm  GT edge {s['edge_gt_px']} px  E_gt {s['E_gt']}"
        for M in MODELS:
            if M in s: line += f"\n        {M:5s} vs own training pixels: NCC {s[M]['ncc']} energy {s[M]['energy']} shift {s[M]['shift_px']:.2f} px edge {s[M]['edge_px']}"
        print(line)
    if r["close_source"]: print("  CLOSE source (ortho, mm bands", r["close_source"]["bands_mm"], "):", {k: v for k, v in r["close_source"].items() if k != "bands_mm"})
