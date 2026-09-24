"""A/B comparison of two Room 213 models rendered at the SAME native eval cameras (24 holdouts, fixed view + crops,
800-frame walkthrough). Views are identified by GT content against the golden run, so eval ordering never matters."""

from __future__ import annotations

import hashlib
import json
import math
import subprocess
from pathlib import Path

import numpy as np

GOLD = "/vol/room213/2026-09-21/spirula_bench_v1"
CROPS_720 = {"ceiling_grid": (200, 60, 560, 300), "window_frames": (140, 350, 440, 470),
             "chair_backs": (360, 420, 560, 540), "table_edges": (380, 450, 580, 560),
             "door_hardware": (575, 340, 660, 430), "carpet": (60, 520, 250, 640)}


def _psnr_ssim(render, gt, valid):
    import cv2
    d = (render.astype(np.float64) - gt.astype(np.float64))[valid]
    mse = float((d ** 2).mean())
    a = render.astype(np.float64); b = gt.astype(np.float64); C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    bl = lambda x: cv2.GaussianBlur(x, (11, 11), 1.5)
    ma, mb = bl(a), bl(b); saa = bl(a * a) - ma * ma; sbb = bl(b * b) - mb * mb; sab = bl(a * b) - ma * mb
    s = (((2 * ma * mb + C1) * (2 * sab + C2)) / ((ma * ma + mb * mb + C1) * (saa + sbb + C2))).mean(axis=2)
    return {"psnr": round(10 * math.log10(255.0 ** 2 / max(mse, 1e-12)), 3), "ssim": round(float(s[valid].mean()), 4)}


def _noise_sigma(g):
    from scipy.signal import convolve2d
    M = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]], float)
    h, w = g.shape
    return float(np.abs(convolve2d(g, M, mode="valid")).sum() * math.sqrt(0.5 * math.pi) / (6 * (w - 2) * (h - 2)))


def _detail(r, s, m):
    """Edge ratio / gradient correlation vs source, and noise-corrected fine+mid band energy ratios."""
    import cv2
    rg = cv2.cvtColor(r, cv2.COLOR_BGR2GRAY).astype(np.float32); sg = cv2.cvtColor(s, cv2.COLOR_BGR2GRAY).astype(np.float32)
    grad = lambda g: np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0, 3), cv2.Sobel(g, cv2.CV_32F, 0, 1, 3))
    a, b = grad(rg)[m], grad(sg)[m]
    out = {"edgeRatio": round(float(a.mean() / b.mean()), 3), "gradCorr": round(float(np.corrcoef(a, b)[0, 1]), 3)}
    ns = _noise_sigma(sg); wn = np.random.default_rng(0).normal(size=sg.shape).astype(np.float32)
    for bn, (s0, s1) in (("fine", (0, 1.5)), ("mid", (1.5, 4.0))):
        dog = lambda g: (cv2.GaussianBlur(g, (0, 0), s0) if s0 else g) - cv2.GaussianBlur(g, (0, 0), s1)
        gain = float(dog(wn)[m].std()); rs = float(dog(rg)[m].std()); ss = float(dog(sg)[m].std())
        out[f"{bn}BandRatioNoiseCorr"] = round(rs / math.sqrt(max(ss ** 2 - (gain * ns) ** 2, 1e-6)), 3)
    return out


class _Lpips:
    def __init__(self):
        try:
            import lpips
            import torch
            self.torch = torch; self.net = lpips.LPIPS(net="alex", verbose=False).eval()
        except Exception as exc:  # noqa: BLE001
            self.net = None; self.err = str(exc)[:200]

    def __call__(self, a, b, m):
        if self.net is None:
            return None
        import cv2
        a = a.copy(); b = b.copy(); a[~m] = 0; b[~m] = 0
        sz = (1024, 1024) if a.shape[0] == a.shape[1] else (a.shape[1], a.shape[0])
        t = lambda x: self.torch.from_numpy(cv2.resize(x, sz, interpolation=cv2.INTER_AREA)[..., ::-1].copy()) \
            .permute(2, 0, 1)[None].float() / 127.5 - 1
        with self.torch.no_grad():
            return round(float(self.net(t(a), t(b)).item()), 4)


def _index(run: Path, gold_hash_to_name: dict):
    import cv2
    still, walk = {}, []
    for p in sorted(run.glob("eval-gt-*.png")):
        i = int(p.stem.split("-")[-1])
        if cv2.imread(str(p), cv2.IMREAD_REDUCED_GRAYSCALE_8).shape == (90, 160):
            walk.append(i)
        else:
            h = hashlib.sha256(p.read_bytes()).hexdigest()
            if h in gold_hash_to_name:
                still[gold_hash_to_name[h]] = i
    return still, sorted(walk)


def compare_ab(runs: dict, out: Path) -> dict:
    """runs: {label: Path to a dir holding eval-gt-*/eval-render-* at the native cameras}. Two labels."""
    import cv2
    out.mkdir(parents=True, exist_ok=True)
    (la, ra), (lb, rb) = list(runs.items())
    gold = Path(f"{GOLD}/runs/room213_spirula_full"); ds = Path(f"{GOLD}/dataset")
    man = json.load(open(f"{GOLD}/dataset_manifest.json"))
    ident = json.load(open(f"{GOLD}/eval_full/eval.json"))["identified"]
    g_h2n = {hashlib.sha256((gold / f"eval-gt-{v['eval_index']:05d}.png").read_bytes()).hexdigest(): k
             for k, v in ident.items()}
    role = {m["new"]: m["role"] for m in man["images"]}
    idx = {la: _index(ra, g_h2n), lb: _index(rb, g_h2n)}
    res = {"labels": [la, lb], "stillViews": {l: len(v[0]) for l, v in idx.items()},
           "walkViews": {l: len(v[1]) for l, v in idx.items()}}
    lp = _Lpips(); res["lpipsAvailable"] = lp.net is not None
    rimg = lambda lab, name: cv2.imread(str(runs[lab] / f"eval-render-{idx[lab][0][name]:05d}.png"))
    # holdouts
    hold = []
    for name in sorted(n for n in idx[la][0] if role.get(n) == "holdout_eval" and n in idx[lb][0]):
        gt = cv2.imread(str(ds / "images" / name)); m = cv2.imread(str(ds / "masks" / name), 0) > 127
        rec = {"view": name}
        for lab in (la, lb):
            r = rimg(lab, name)
            rec[lab] = {**_psnr_ssim(r, gt, m), "lpips": lp(r, gt, m), **_detail(r, gt, m)}
        hold.append(rec)
    agg = lambda lab, k: (round(float(np.mean([h[lab][k] for h in hold if h[lab][k] is not None])), 4)
                          if any(h[lab][k] is not None for h in hold) else None)
    keys = ("psnr", "ssim", "lpips", "edgeRatio", "gradCorr", "fineBandRatioNoiseCorr", "midBandRatioNoiseCorr")
    res["heldout"] = {"n": len(hold), "mean": {lab: {k: agg(lab, k) for k in keys} for lab in (la, lb)},
                      "perView": hold}
    # fixed view + crops
    fx = man["fixed_eval"]["camera2/frame_00103.png"]
    gt = cv2.imread(str(ds / "images" / fx)); m = cv2.imread(str(ds / "masks" / fx), 0) > 127
    A, B = rimg(la, fx), rimg(lb, fx); sc = gt.shape[1] / 720.0
    res["fixedView"] = {"view": fx, la: {**_psnr_ssim(A, gt, m), "lpips": lp(A, gt, m)},
                        lb: {**_psnr_ssim(B, gt, m), "lpips": lp(B, gt, m)}, "crops": {}}
    rows = []
    for cn, (x0, y0, x1, y1) in CROPS_720.items():
        X0, Y0, X1, Y1 = int(x0 * sc), int(y0 * sc), int(x1 * sc), int(y1 * sc)
        sl = (slice(Y0, Y1), slice(X0, X1))
        res["fixedView"]["crops"][cn] = {lab: {**_psnr_ssim(im[sl], gt[sl], m[sl]), **_detail(im[sl], gt[sl], m[sl])}
                                         for lab, im in ((la, A), (lb, B))}
        cx, cy = (X0 + X1) // 2, (Y0 + Y1) // 2; half = 200
        tiles = []
        for lab, im in (("source", gt), (la, A), (lb, B)):
            c = cv2.resize(im[cy - half:cy + half, cx - half:cx + half], (400, 400), interpolation=cv2.INTER_AREA)
            c = cv2.copyMakeBorder(c, 24, 0, 0, 4, cv2.BORDER_CONSTANT, value=(0, 0, 0))
            cv2.putText(c, f"{cn} | {lab}", (4, 17), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1); tiles.append(c)
        rows.append(np.hstack(tiles))
    cv2.imwrite(str(out / "crops_source_A_B.jpg"), np.vstack(rows), [cv2.IMWRITE_JPEG_QUALITY, 88])
    # native 1:1 detail tiles (no downscale) for the four finest-texture crops
    tiles = []
    for cn in ("ceiling_grid", "carpet", "chair_backs", "table_edges"):
        x0, y0, x1, y1 = CROPS_720[cn]; cx, cy = int((x0 + x1) / 2 * sc), int((y0 + y1) / 2 * sc); h = 128
        row = [cv2.resize(im[cy - h:cy + h, cx - h:cx + h], (512, 512), interpolation=cv2.INTER_NEAREST)
               for im in (gt, A, B)]
        tiles.append(np.hstack(row))
    cv2.imwrite(str(out / "crops_1to1_x2_source_A_B.jpg"), np.vstack(tiles), [cv2.IMWRITE_JPEG_QUALITY, 90])
    # walkthrough: order both by content against the golden ordered walk
    gdir = Path(f"{GOLD}/eval_full/walk_ordered")

    def thumb(p):
        a = cv2.resize(cv2.imread(str(p), 0), (64, 36), interpolation=cv2.INTER_AREA).astype(np.float32)
        a = a - a.mean(); return a.ravel() / (np.linalg.norm(a) + 1e-6)
    G = np.stack([thumb(gdir / f"{k:05d}.png") for k in range(800)])
    ordered = {}
    for lab in (la, lb):
        W = np.stack([thumb(runs[lab] / f"eval-render-{i:05d}.png") for i in idx[lab][1]])
        C = W @ G.T; best = C.argmax(1)
        ordered[lab] = {int(k): idx[lab][1][j] for j, k in enumerate(best)}
        res.setdefault("walkMatch", {})[lab] = {"unique": len(ordered[lab]), "medianNcc": round(float(np.median(C.max(1))), 4)}
    wd = out / "walk_A_B"; wd.mkdir(exist_ok=True)
    ks = [k for k in range(800) if k in ordered[la] and k in ordered[lb]]
    prev = {la: None, lb: None}; stats = {la: {"d1": [], "flick": [], "grad": []}, lb: {"d1": [], "flick": [], "grad": []}}
    hist = {la: [], lb: []}; ab_psnr = []
    for n, k in enumerate(ks):
        fr = {lab: cv2.imread(str(runs[lab] / f"eval-render-{ordered[lab][k]:05d}.png")) for lab in (la, lb)}
        for lab in (la, lb):
            g = cv2.cvtColor(fr[lab], cv2.COLOR_BGR2GRAY).astype(np.float32)
            stats[lab]["grad"].append(float(np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0, 3), cv2.Sobel(g, cv2.CV_32F, 0, 1, 3)).mean()))
            hist[lab].append(g)
            if len(hist[lab]) >= 2:
                stats[lab]["d1"].append(float(np.abs(hist[lab][-1] - hist[lab][-2]).mean()))
            if len(hist[lab]) >= 3:
                stats[lab]["flick"].append(float(np.abs(hist[lab][-2] - 0.5 * (hist[lab][-1] + hist[lab][-3])).mean()))
                hist[lab].pop(0)
        ab_psnr.append(_psnr_ssim(fr[la], fr[lb], np.ones(fr[la].shape[:2], bool))["psnr"])
        cv2.imwrite(str(wd / f"{n:05d}.png"), np.hstack([fr[la], fr[lb]]))
    res["walkthrough"] = {"frames": len(ks), "abPsnrMedian": round(float(np.median(ab_psnr)), 2),
                          **{lab: {"meanFrameDiff": round(float(np.mean(stats[lab]["d1"])), 3),
                                   "flicker2ndDiff": round(float(np.mean(stats[lab]["flick"])), 3),
                                   "meanGradEnergy": round(float(np.mean(stats[lab]["grad"])), 3)} for lab in (la, lb)}}
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "20", "-i", str(wd / "%05d.png"), "-c:v",
                    "libx264", "-crf", "20", "-pix_fmt", "yuv420p", str(out / "walkthrough_A_left_B_right.mp4")])
    for k in (100, 400, 700):
        if k < len(ks):
            cv2.imwrite(str(out / f"walk_{k:05d}_A_B.jpg"), cv2.imread(str(wd / f"{k:05d}.png")), [cv2.IMWRITE_JPEG_QUALITY, 88])
    return res
