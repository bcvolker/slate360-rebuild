"""Room 213 forensic analysis (local). Input: a downloaded forensic run dir (prep.json, <target>/oNN_*.npy|png,
<target>/<model>/<view>_ortho.npy|_face_crop.png). All comparisons are on the shared ortho grid of each target plane.
  - bands: octave DoG on the ortho grid, band k = G(s_k) - G(2 s_k), s_k = 2^k texels (reported in mm)
  - registration: phase correlation of the 1-4 texel band vs the video consensus (median of registered video views)
  - source coherence: per band, mean pairwise NCC between registered VIDEO observations (does the detail exist
    consistently across views?), and panorama vs video consensus
  - fidelity: per band, render(view) vs GT(view) NCC and energy ratio at the view's own training camera; novel views vs
    the video consensus. Usage: python analyze_forensic.py <run dir> <out dir>"""
import json, sys
from pathlib import Path
import cv2
import numpy as np

RUN, OUT = Path(sys.argv[1]), Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
MODELS = ["Official", "A", "Aplus", "AX6c"]
P = json.load(open(RUN / "prep.json"))


def gray(x): return cv2.cvtColor(np.ascontiguousarray(x, np.float32), cv2.COLOR_RGB2GRAY) * 255.0
def band(g, k): s = 2.0 ** k; return cv2.GaussianBlur(g, (0, 0), s) - cv2.GaussianBlur(g, (0, 0), 2 * s)
def ncc(a, b, m): a, b = a[m] - a[m].mean(), b[m] - b[m].mean(); return float((a * b).mean() / (a.std() * b.std() + 1e-9))
def eratio(a, b, m): return float(a[m].std() / (b[m].std() + 1e-9))


def shift(img, dx, dy): return cv2.warpAffine(img, np.float32([[1, 0, dx], [0, 1, dy]]), img.shape[::-1], flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def register(mov, ref, edge_only=False):
    """Sub-texel translation aligning mov to ref on the 1-4 texel band (Hann-windowed phase correlation). edge_only: a
    vertical edge (T1) only constrains the across-edge (u) shift, so register column profiles and report dy = 0."""
    if edge_only:
        mov, ref = np.repeat(mov.mean(0, keepdims=True), mov.shape[0], 0), np.repeat(ref.mean(0, keepdims=True), ref.shape[0], 0)
    a, b = band(ref, 0) + band(ref, 1), band(mov, 0) + band(mov, 1)
    win = cv2.createHanningWindow(a.shape[::-1], cv2.CV_32F)
    (dx, dy), resp = cv2.phaseCorrelate(a.astype(np.float32), b.astype(np.float32), win)
    return -dx, (0.0 if edge_only else -dy), resp


def analyse(name, T):
    tex = T["texel_mm"]; obs = T["observations"]; K = 5; eo = name.startswith("T1")
    gt = {o["tag"]: gray(np.load(RUN / name / f"{o['tag']}_ortho_gt.npy")) for o in obs}
    n = next(iter(gt.values())).shape[0]; m = np.zeros((n, n), bool); c = n // 8; m[c:-c, c:-c] = True
    vid = [o for o in obs if not o["pano"]]; pan = [o for o in obs if o["pano"]]
    cons = np.median(np.stack([gt[o["tag"]] for o in vid]), 0)
    reg = {}
    for it in range(3):                                   # iterate consensus <- registered video views
        for o in obs: reg[o["tag"]] = register(gt[o["tag"]], cons, eo)
        cons = np.median(np.stack([shift(gt[o["tag"]], *reg[o["tag"]][:2]) for o in vid]), 0)
    al = {t: shift(g, *reg[t][:2]) for t, g in gt.items()}
    rows = []
    for o in obs:
        dx, dy, resp = reg[o["tag"]]; mm = float(np.hypot(dx, dy) * tex)
        rows.append({"tag": o["tag"], "pano": o["pano"], "image": o["image"], "dist_m": o["dist_m"], "incidence_deg": o["incidence_deg"],
                     "px_per_mm_native": o["px_per_mm_native"], "px_per_mm_train": o["px_per_mm_train"],
                     "train_over_native": o["px_per_mm_train"] / o["px_per_mm_native"],
                     "misreg_mm": mm, "misreg_train_px": mm * o["px_per_mm_train"], "reg_response": float(resp),
                     "band_energy": [float(band(al[o["tag"]], k)[m].std()) for k in range(K)],
                     "ncc_to_video_consensus": [ncc(band(al[o["tag"]], k), band(cons, k), m) for k in range(K)]})
    pair = [[ncc(band(al[a["tag"]], k), band(al[b["tag"]], k), m) for a_i, a in enumerate(vid) for b in vid[a_i + 1:]] for k in range(K)]
    src = {"band_mm": [f"{tex * 2 ** k:g}-{tex * 2 ** (k + 1):g}" for k in range(K)],
           "video_pairwise_ncc_median": [float(np.median(p)) for p in pair],
           "pano_vs_video_consensus_ncc": [[r["ncc_to_video_consensus"][k] for k in range(K)] for r in rows if r["pano"]],
           "video_leave_one_out_ncc_median": [float(np.median([ncc(band(al[o["tag"]], k), band(np.median(np.stack([al[q["tag"]] for q in vid if q is not o]), 0), k), m)
                                                               for o in vid])) for k in range(K)],
           "video_misreg_train_px_median": float(np.median([r["misreg_train_px"] for r in rows if not r["pano"]])),
           "video_misreg_train_px_p90": float(np.percentile([r["misreg_train_px"] for r in rows if not r["pano"]], 90))}
    nat = {o["tag"]: shift(gray(np.load(RUN / name / f"{o['tag']}_ortho_native.npy")), *reg[o["tag"]][:2]) for o in obs
           if (RUN / name / f"{o['tag']}_ortho_native.npy").exists()}
    if nat:
        pn = [[ncc(band(nat[a["tag"]], k), band(nat[b["tag"]], k), m) for a_i, a in enumerate(vid) for b in vid[a_i + 1:]] for k in range(K)]
        src["video_pairwise_ncc_median_NATIVE"] = [float(np.median(p)) for p in pn]
        for rr in rows:
            if rr["tag"] in nat:
                rr["projection_energy_transfer"] = [float(band(al[rr["tag"]], k)[m].std() / (band(nat[rr["tag"]], k)[m].std() + 1e-9)) for k in range(K)]
                rr["projection_ncc_train_vs_native"] = [ncc(band(al[rr["tag"]], k), band(nat[rr["tag"]], k), m) for k in range(K)]
    fid = {}
    for M in MODELS:
        d = RUN / name / M
        if not d.exists(): continue
        per = []
        for o in obs:
            f = d / f"{o['render_view']}_ortho.npy"
            if not f.exists(): continue
            r0 = gray(np.load(f)); dx, dy, _ = register(r0, gt[o["tag"]], eo)   # global-transform residual of THIS model
            r = shift(shift(r0, dx, dy), *reg[o["tag"]][:2])                     # then the GT's own registration
            per.append({"tag": o["tag"], "pano": o["pano"], "global_residual_mm": float(np.hypot(dx, dy) * tex),
                        "ncc_vs_own_gt": [ncc(band(r, k), band(al[o["tag"]], k), m) for k in range(K)],
                        "energy_vs_own_gt": [eratio(band(r, k), band(al[o["tag"]], k), m) for k in range(K)]})
        nov = []
        for nv in T["novel"]:
            f = d / f"{nv['name']}_ortho.npy"
            if f.exists():
                r = gray(np.load(f)); dx, dy, _ = register(r, cons, eo); r = shift(r, dx, dy)
                nov.append({"name": nv["name"], "reg_texel": [dx, dy], "ncc_vs_consensus": [ncc(band(r, k), band(cons, k), m) for k in range(K)],
                            "energy_vs_consensus": [eratio(band(r, k), band(cons, k), m) for k in range(K)]})
        med = lambda L, key, sel: [float(np.median([p[key][k] for p in L if sel(p)])) if any(sel(p) for p in L) else None for k in range(K)]
        fid[M] = {"train_views_video": {"ncc": med(per, "ncc_vs_own_gt", lambda p: not p["pano"]), "energy": med(per, "energy_vs_own_gt", lambda p: not p["pano"])},
                  "train_views_pano": {"ncc": med(per, "ncc_vs_own_gt", lambda p: p["pano"]), "energy": med(per, "energy_vs_own_gt", lambda p: p["pano"])},
                  "novel": {"ncc": med(nov, "ncc_vs_consensus", lambda p: True), "energy": med(nov, "energy_vs_consensus", lambda p: True)},
                  "global_residual_mm_median": float(np.median([p["global_residual_mm"] for p in per])) if per else None,
                  "per_view": per, "novel_views": nov}
    cons_e = [float(band(cons, k)[m].std()) for k in range(K)]
    return {"target": name, "texel_mm": tex, "sweep_delta_m": T["sweep"]["best_delta_m"], "observations": rows, "source": src,
            "consensus_band_energy": cons_e, "fidelity": fid}, al, cons


def sheet(name, T, al, cons):
    """Lineage sheet: per observation row = native source crop | exact training-face crop | renders at that camera
    (Official, A, A+, AX6c), all resized to one tile height (nearest) for layout only; plus an ortho row."""
    H = 220; rows = []
    lab = lambda im, t: cv2.putText(im, t, (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 255, 80), 1, cv2.LINE_AA)
    def tile(im, t):
        if im is None: im = np.zeros((H, H, 3), np.uint8)
        s = H / im.shape[0]; im = cv2.resize(im, (max(1, int(im.shape[1] * s)), H), interpolation=cv2.INTER_NEAREST if s > 1 else cv2.INTER_AREA)
        im = np.ascontiguousarray(im); lab(im, t); return im
    pick = [o for o in T["observations"] if o["pano"]] + [o for o in T["observations"] if not o["pano"]][:3]
    for o in pick:
        src = cv2.imread(str(RUN / name / f"{o['tag']}_src_native.png")); tr = cv2.imread(str(RUN / name / f"{o['tag']}_train_face.png"))
        tiles = [tile(src, f"A src {o['tag']} {'PANO' if o['pano'] else 'video'} {o['px_per_mm_native']:.2f}px/mm"),
                 tile(tr, f"C train face {o['px_per_mm_train']:.2f}px/mm")]
        for M in MODELS:
            tiles.append(tile(cv2.imread(str(RUN / name / M / f"{o['render_view']}_face_crop.png")), f"E {M} render"))
        rows.append(np.hstack(tiles))
    ot = [tile(np.clip(cons, 0, 255).astype(np.uint8)[..., None].repeat(3, 2), "video consensus (ortho)")]
    ot += [tile(np.clip(al[o["tag"]], 0, 255).astype(np.uint8)[..., None].repeat(3, 2), f"{o['tag']} GT ortho") for o in pick[:3]]
    rows.append(np.hstack(ot))
    w = max(r.shape[1] for r in rows)
    cv2.imwrite(str(OUT / f"lineage_{name}.jpg"), np.vstack([np.pad(r, ((0, 4), (0, w - r.shape[1]), (0, 0))) for r in rows]), [cv2.IMWRITE_JPEG_QUALITY, 92])


res = {}
for name, T in P["targets"].items():
    r, al, cons = analyse(name, T); res[name] = r; sheet(name, T, al, cons)
    s = r["source"]; print(f"\n== {name} (texel {r['texel_mm']} mm, plane sweep {r['sweep_delta_m']:+.3f} m) bands mm {s['band_mm']}")
    print("  video pairwise NCC per band:", [round(x, 2) for x in s["video_pairwise_ncc_median"]])
    if "video_pairwise_ncc_median_NATIVE" in s: print("  ... same at NATIVE res     :", [round(x, 2) for x in s["video_pairwise_ncc_median_NATIVE"]])
    print("  real held-out frame vs consensus of the others (novel-view ceiling):", [round(x, 2) for x in s["video_leave_one_out_ncc_median"]])
    print("  pano vs video consensus    :", [[round(x, 2) for x in p] for p in s["pano_vs_video_consensus_ncc"]])
    print(f"  video misregistration: median {s['video_misreg_train_px_median']:.2f} train px, p90 {s['video_misreg_train_px_p90']:.2f}")
    for o in r["observations"]:
        print(f"   {o['tag']} {'P' if o['pano'] else 'v'} d={o['dist_m']:.2f} inc={o['incidence_deg']:.0f} train/native={o['train_over_native']:.2f} misreg={o['misreg_mm']:.2f}mm={o['misreg_train_px']:.2f}px E={[round(x, 1) for x in o['band_energy']]} proj_transfer={[round(x, 2) for x in o.get('projection_energy_transfer', [])]}")
    for M, f in r["fidelity"].items():
        print(f"  {M:8s} global-transform residual at these cameras: {f['global_residual_mm_median']:.2f} mm (removed below)")
        print(f"  {M:8s} train-video ncc {[round(x, 2) for x in f['train_views_video']['ncc']]} en {[round(x, 2) for x in f['train_views_video']['energy']]}")
        if f["train_views_pano"]["ncc"][0] is not None:
            print(f"  {'':8s} train-pano  ncc {[round(x, 2) for x in f['train_views_pano']['ncc']]} en {[round(x, 2) for x in f['train_views_pano']['energy']]}")
        print(f"  {'':8s} novel       ncc {[round(x, 2) for x in f['novel']['ncc']]} en {[round(x, 2) for x in f['novel']['energy']]}")
json.dump(res, open(OUT / "forensic_metrics.json", "w"), indent=1)
