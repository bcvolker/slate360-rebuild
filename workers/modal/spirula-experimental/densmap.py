"""Zero-GPU densification-map selection. Reconstructs the pinned Spirula (fd1afca1) densification loss map on the
golden 1M baseline's renders at the 14 training cameras that have baseline renders (the eval-only duplicates of
training frames), exactly as the trainer builds it:

  pyramid     3 loss scales at 3840^2 (loss_scale_min_pixels 1920): scale s = 2^s avg-pool of render and GT; each
              scale's map is upsampled back and the three are averaged (PerPixelLoss.cu avg_pool_upsample, 1/n)
  ssim_cs     1 - mean_c[(2*cov + C2) / (var_r + var_g + C2)], 11x11 Gaussian sigma 1.5, C2 = 0.03^2 (FusedSSIM.cu);
              masked pixels -> CS = 1 (no error)
  ssim_str    structure-only variant (info)
  robust_ea   BT.601-luma |render - GT|, Tukey biweight with c = per-image q-quantile (q = 0.9), then canny:
              5x5 /159 blur (mask-weighted), 3x3 sobel, 8-direction NMS, masked -> 0 (DensifySplitFilter.cu)
  edge_aware  canny of GT only (info)
  power       v -> max(v, 0)^p (DensifySampling.cu); clip/normalize off in the baseline

Priority is measured the way densification consumes the map: a splat's score is the mean of the powered map over its
footprint (densify_accum_mode = avg), so a region's priority ~ mean powered map in that region."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

GOLD = "/vol/room213/2026-09-21/spirula_bench_v1"
NAMED = {"carpet_texture": (1029, 3093), "chair_slat": (2701, 2811), "baseboard": (756, 2878),
         "window_frame": (1801, 2285), "ceiling_grid_corner": (995, 1018)}
C2 = 0.03 ** 2
BLUR5 = np.array([[2, 4, 5, 4, 2], [4, 9, 12, 9, 4], [5, 12, 15, 12, 5], [4, 9, 12, 9, 4], [2, 4, 5, 4, 2]], np.float32) / 159
SOB = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], np.float32)


def _down(x, s):
    import cv2
    for _ in range(s):
        x = cv2.resize(x, (x.shape[1] // 2, x.shape[0] // 2), interpolation=cv2.INTER_AREA)
    return x


def _up(x, shape):
    import cv2
    return cv2.resize(x, (shape[1], shape[0]), interpolation=cv2.INTER_NEAREST)


def ssim_cs_map(r, g, m):
    import cv2
    bl = lambda x: cv2.GaussianBlur(x, (11, 11), 1.5)
    acc = np.zeros(r.shape[:2], np.float32)
    for c in range(3):
        a, b = r[..., c], g[..., c]
        ma, mb = bl(a), bl(b)
        va = np.maximum(bl(a * a) - ma * ma, 0); vb = np.maximum(bl(b * b) - mb * mb, 0); cov = bl(a * b) - ma * mb
        acc += (2 * cov + C2) / (va + vb + C2)
    cs = acc / 3
    cs[~m] = 1.0
    return 1.0 - cs


def _canny(s, m):
    import cv2
    mf = m.astype(np.float32)
    num = cv2.filter2D(s * mf, -1, BLUR5, borderType=cv2.BORDER_REPLICATE)
    den = cv2.filter2D(mf, -1, BLUR5, borderType=cv2.BORDER_REPLICATE)
    bl = np.where(den > 0, num / np.maximum(den, 1e-9), 0).astype(np.float32)
    gx = cv2.filter2D(bl, -1, SOB, borderType=cv2.BORDER_REPLICATE)
    gy = cv2.filter2D(bl, -1, SOB.T, borderType=cv2.BORDER_REPLICATE)
    mag = np.hypot(gx, gy)
    dx = np.clip(np.round(gx / np.maximum(mag, 1e-12)), -1, 1).astype(int)
    dy = np.clip(np.round(gy / np.maximum(mag, 1e-12)), -1, 1).astype(int)
    H, W = mag.shape
    yy, xx = np.mgrid[0:H, 0:W]
    y1 = np.clip(yy + dy, 0, H - 1); x1 = np.clip(xx + dx, 0, W - 1)
    y2 = np.clip(yy - dy, 0, H - 1); x2 = np.clip(xx - dx, 0, W - 1)
    keep = (mag >= mag[y1, x1]) & (mag >= mag[y2, x2])
    out = np.where(keep, mag, 0).astype(np.float32)
    out[~m] = 0
    return out


def robust_ea_map(r, g, m, q=0.9):
    res = np.abs(0.299 * (r[..., 0] - g[..., 0]) + 0.587 * (r[..., 1] - g[..., 1]) + 0.114 * (r[..., 2] - g[..., 2])).astype(np.float32)
    v = res[m & (res > 0)]
    c = float(np.quantile(v, q)) if len(v) else 0.0
    u = res / max(c, 1e-12)
    w = np.where((res < c) & m, res * (1 - u * u) ** 2, 0).astype(np.float32)
    return _canny(w, m)


def edge_aware_map(g, m):
    lum = (0.299 * g[..., 0] + 0.587 * g[..., 1] + 0.114 * g[..., 2]).astype(np.float32)
    return _canny(lum, m)


def pyramid(fn, r, g, m, n=3):
    H, W = m.shape
    acc = np.zeros((H, W), np.float32)
    for s in range(n):
        rs, gs = _down(r, s), _down(g, s)
        ms = _down(m.astype(np.float32), s) > 0.5
        acc += _up(fn(rs, gs, ms), (H, W))
    return acc / n


CANDIDATES = {  # name: (mode, power, singleFactorVsBaseline)
    "ssim_cs_p4 (baseline)": ("ssim_cs", 4.0, True),
    "ssim_cs_p2": ("ssim_cs", 2.0, True),
    "ssim_cs_p1": ("ssim_cs", 1.0, True),
    "robust_edge_aware_q0.9_p4": ("robust_ea", 4.0, True),
    "edge_aware_p4 (info)": ("edge_aware", 4.0, True),
    "robust_edge_aware_q0.9_p1 (info, 2 factors)": ("robust_ea", 1.0, False),
}


def run() -> dict:
    import cv2
    man = json.load(open(f"{GOLD}/dataset_manifest.json"))
    ev = json.load(open(f"{GOLD}/eval_full/eval.json"))
    run_dir = Path(f"{GOLD}/runs/room213_spirula_full")
    views = []
    for src, new in man["fixed_eval"].items():
        if new in ev["identified"]:
            views.append((src, new, ev["identified"][new]["eval_index"]))
    fixed_new = man["fixed_eval"]["camera2/frame_00103.png"]
    out = {"views": [v[0] for v in views], "candidates": {}}
    per_view_maps = {}
    raw = {}
    for src, new, idx in views:
        g = cv2.imread(f"{GOLD}/dataset/images/{new}")[..., ::-1].astype(np.float32) / 255
        r = cv2.imread(str(run_dir / f"eval-render-{idx:05d}.png"))[..., ::-1].astype(np.float32) / 255
        m = cv2.imread(f"{GOLD}/dataset/masks/{new}", 0) > 127
        base = {"ssim_cs": pyramid(lambda a, b, mm: ssim_cs_map(a, b, mm), r, g, m),
                "robust_ea": pyramid(lambda a, b, mm: robust_ea_map(a, b, mm), r, g, m),
                "edge_aware": pyramid(lambda a, b, mm: edge_aware_map(b, mm), r, g, m)}
        # pixel classes from the SOURCE only: structured (top 20 % of sigma-3 gradient) vs flat (bottom 40 %)
        gl = cv2.GaussianBlur((0.299 * g[..., 0] + 0.587 * g[..., 1] + 0.114 * g[..., 2]), (0, 0), 3.0)
        gm = np.hypot(cv2.Sobel(gl, cv2.CV_32F, 1, 0, 3), cv2.Sobel(gl, cv2.CV_32F, 0, 1, 3))
        v = gm[m]
        hi, lo = np.quantile(v, 0.8), np.quantile(v, 0.4)
        raw[new] = (base, m, gm >= hi, gm <= lo, g)
    # grain regions on the fixed view: flattest 64-px tiles (source sigma-3 gradient) with wall / ceiling brightness,
    # chosen from the source alone (no map involved)
    base_f, m_f, st_f, fl_f, g_f = raw[fixed_new]
    gl_f = (0.299 * g_f[..., 0] + 0.587 * g_f[..., 1] + 0.114 * g_f[..., 2])
    gm_f = np.hypot(cv2.Sobel(cv2.GaussianBlur(gl_f, (0, 0), 3.0), cv2.CV_32F, 1, 0, 3),
                    cv2.Sobel(cv2.GaussianBlur(gl_f, (0, 0), 3.0), cv2.CV_32F, 0, 1, 3))
    tiles = []
    for y in range(64, 3776 - 64, 64):
        for x in range(64, 3776 - 64, 64):
            if m_f[y - 32:y + 32, x - 32:x + 32].mean() < 0.99:
                continue
            tiles.append((float(gm_f[y - 32:y + 32, x - 32:x + 32].mean()), x, y, float(gl_f[y - 32:y + 32, x - 32:x + 32].mean())))
    wall = sorted([t for t in tiles if 1900 < t[2] < 2700 and t[3] > 0.6], key=lambda t: t[0])[:1]
    ceil = sorted([t for t in tiles if t[2] < 1500 and t[3] > 0.6], key=lambda t: t[0])[:1]
    regions = dict(NAMED)
    regions["grainy_wall"] = (wall[0][1], wall[0][2]); regions["grainy_ceiling"] = (ceil[0][1], ceil[0][2])
    out["regions"] = regions
    useful = ["carpet_texture", "chair_slat", "baseboard", "window_frame", "ceiling_grid_corner"]
    grain = ["grainy_wall", "grainy_ceiling"]
    for cname, (mode, p, single) in CANDIDATES.items():
        pm = np.maximum(base_f[mode], 0) ** p
        win = cv2.blur(pm, (33, 33)); valid = win[m_f]
        reg = {}
        for rn, (x, y) in regions.items():
            val = float(win[y, x])
            reg[rn] = {"score": val, "percentile": round(float((valid < val).mean() * 100), 1)}
        u = np.mean([reg[k]["score"] for k in useful]); gr = np.mean([reg[k]["score"] for k in grain])
        # whole-view class mass over all 14 views
        smass, fmass, tot = 0.0, 0.0, 0.0
        for new, (base, m, st, fl, _) in raw.items():
            q = np.maximum(base[mode], 0) ** p
            smass += float(q[st & m].sum()); fmass += float(q[fl & m].sum()); tot += float(q[m].sum())
        out["candidates"][cname] = {"mode": mode, "power": p, "singleFactorChangeFromBaseline": single,
                                    "regions": {k: {"score": round(v["score"], 6), "percentile": v["percentile"]} for k, v in reg.items()},
                                    "usefulOverGrainPriority": round(float(u / max(gr, 1e-12)), 3),
                                    "carpetOverGrain": round(float(reg["carpet_texture"]["score"] / max(gr, 1e-12)), 3),
                                    "massShareStructured": round(smass / tot, 4), "massShareFlat": round(fmass / tot, 4),
                                    "structuredOverFlatMeanRatio": round((smass / 0.2) / max(fmass / 0.4, 1e-12), 3)}
    return out


def gaussian_history(points: dict, ply_paths: dict, R0, t0, fx) -> dict:
    """points: {name: (P, radius_units)}; ply_paths: {label: [(step, path)]} -> counts/footprint/opacity per step."""
    out = {}
    for lab, seq in ply_paths.items():
        out[lab] = {}
        for step, path in seq:
            raw = Path(path).read_bytes(); end = raw.find(b"end_header\n") + 11
            hdr = raw[:end].decode().splitlines(); n = int([l for l in hdr if l.startswith("element vertex")][0].split()[-1])
            names = [l.split()[-1] for l in hdr if l.startswith("property")]
            a = np.frombuffer(raw[end:], "<f4").reshape(n, len(names))
            X = a[:, :3].astype(np.float64); op = 1 / (1 + np.exp(-a[:, names.index("opacity")].astype(np.float64)))
            sc = np.exp(a[:, [names.index(f"scale_{i}") for i in range(3)]].astype(np.float64)).max(1)
            rec = {"total": n}
            for pn, (P, rad) in points.items():
                sel = np.linalg.norm(X - np.asarray(P), axis=1) <= rad
                d = np.linalg.norm(X[sel] @ R0.T + t0, axis=1)
                fp = sc[sel] * fx / np.maximum(d, 1e-6)
                rec[pn] = {"count": int(sel.sum()), "opaque": int((op[sel] > 0.3).sum()),
                           "footprintPxMedian": round(float(np.median(fp)), 2) if sel.any() else None,
                           "opacityMedian": round(float(np.median(op[sel])), 3) if sel.any() else None}
            out[lab][str(step)] = rec
    return out
