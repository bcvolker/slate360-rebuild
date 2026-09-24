"""Step-0 diagnostic: WHY is the 1M model soft vs the source in the six fixed Room 213 crops? No training, no tuning.

Per crop of the fixed eval view (camera2/frame_00103, an eval-only duplicate of a training frame, so this is the fit
residual on a view the model was trained on):
  noise     source sensor-noise sigma (Immerkaer) and the part of the render-vs-source MSE it explains
  exposure  per-channel affine fit render->source: gain/offset and the MSE fraction it removes
  blur      best Gaussian sigma s.t. blur(source) ~= render, and the MSE fraction that blur explains beyond noise
  bands     render/source std ratio in fine / mid / coarse DoG bands, fine band noise-corrected
  contrast  local contrast (7px-window std of the sigma-2 smoothed image) ratio render/source
  splats    Gaussians projected into the crop: coarse per-cell front-to-back alpha compositing on center positions ->
            visible contributors' pixel footprint (1-sigma), opacity, #splats to reach alpha 0.5, alpha from low-opacity
            (<0.3) splats in front of the cell surface (haze proxy), SH rest-vs-DC energy (view-dependence use)."""

from __future__ import annotations

import json
import math
from pathlib import Path

GOLD = "/vol/room213/2026-09-21/spirula_bench_v1"
CROPS_720 = {"ceiling_grid": (200, 60, 560, 300), "window_frames": (140, 350, 440, 470),
             "chair_backs": (360, 420, 560, 540), "table_edges": (380, 450, 580, 560),
             "door_hardware": (575, 340, 660, 430), "carpet": (60, 520, 250, 640)}


def _noise_sigma(g):
    """Immerkaer fast noise variance estimate on a grayscale float image."""
    import numpy as np
    from scipy.signal import convolve2d
    M = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]], float)
    h, w = g.shape
    s = np.abs(convolve2d(g, M, mode="valid")).sum()
    return float(s * math.sqrt(0.5 * math.pi) / (6 * (w - 2) * (h - 2)))


def _dog(g, s0, s1):
    import cv2
    a = cv2.GaussianBlur(g, (0, 0), s0) if s0 > 0 else g
    return a - cv2.GaussianBlur(g, (0, 0), s1)


def _image_metrics(r, s, m):
    """r, s: float32 BGR crops (0..255); m: bool mask."""
    import cv2
    import numpy as np
    rg = cv2.cvtColor(r, cv2.COLOR_BGR2GRAY); sg = cv2.cvtColor(s, cv2.COLOR_BGR2GRAY)
    mse = float(((r - s) ** 2)[m].mean())
    ns = _noise_sigma(sg); nr = _noise_sigma(rg)
    # exposure: per-channel affine r -> s
    fit = r.copy(); gains = []
    for c in range(3):
        A = np.stack([r[..., c][m], np.ones(m.sum())], 1); coef, *_ = np.linalg.lstsq(A, s[..., c][m], rcond=None)
        fit[..., c] = r[..., c] * coef[0] + coef[1]; gains.append([round(float(coef[0]), 3), round(float(coef[1]), 1)])
    mse_aff = float(((fit - s) ** 2)[m].mean())
    # blur: which blur of the SOURCE best matches the (exposure-corrected) render
    best = (0.0, float(((fit - s) ** 2)[m].mean()))
    for sig in (0.7, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0):
        e = float(((fit - cv2.GaussianBlur(s, (0, 0), sig)) ** 2)[m].mean())
        if e < best[1]:
            best = (sig, e)
    noise_var = ns ** 2                                     # per-channel-ish (gray estimate)
    # band energies (gray); fine band noise-corrected with the filter's white-noise gain
    rng = np.random.default_rng(0); wn = rng.normal(size=sg.shape).astype(np.float32)
    bands = {"fine": (0, 1.5), "mid": (1.5, 4.0), "coarse": (4.0, 12.0)}
    out_b = {}
    for bn, (a, b) in bands.items():
        rs, ss = float(_dog(rg, a, b)[m].std()), float(_dog(sg, a, b)[m].std())
        gain = float(_dog(wn, a, b)[m].std())
        ss_sig = math.sqrt(max(ss ** 2 - (gain * ns) ** 2, 1e-6)); rs_sig = math.sqrt(max(rs ** 2 - (gain * nr) ** 2, 1e-6))
        out_b[bn] = {"ratio": round(rs / max(ss, 1e-6), 3), "ratioNoiseCorrected": round(rs_sig / ss_sig, 3),
                     "sourceNoiseShare": round(min((gain * ns) ** 2 / max(ss ** 2, 1e-6), 1.0), 3)}
    lc = lambda g: cv2.blur(cv2.GaussianBlur(g, (0, 0), 2) ** 2, (7, 7)) - cv2.blur(cv2.GaussianBlur(g, (0, 0), 2), (7, 7)) ** 2
    lcr = float(np.sqrt(np.clip(lc(rg), 0, None))[m].mean() / max(np.sqrt(np.clip(lc(sg), 0, None))[m].mean(), 1e-6))
    return {"mse": round(mse, 1), "sourceNoiseSigma": round(ns, 2), "renderNoiseSigma": round(nr, 2),
            "noiseShareOfMse": round(min(noise_var / max(mse, 1e-6), 1.0), 3),
            "exposureGainOffsetBGR": gains, "exposureShareOfMse": round(1 - mse_aff / mse, 3),
            "meanBGR_render": [round(float(r[..., c][m].mean()), 1) for c in range(3)],
            "meanBGR_source": [round(float(s[..., c][m].mean()), 1) for c in range(3)],
            "bestBlurSigmaPx": best[0], "blurShareOfMse": round((mse_aff - best[1]) / mse, 3),
            "residualAfterExposureBlur": round(best[1], 1), "bands": out_b, "localContrastRatio": round(lcr, 3)}


def _fisheye_project(Xc, p):
    import numpy as np
    fx, fy, cx, cy, k1, k2, k3, k4 = p
    x, y, z = Xc[:, 0], Xc[:, 1], Xc[:, 2]
    r = np.hypot(x, y); th = np.arctan2(r, z)
    thd = th * (1 + k1 * th ** 2 + k2 * th ** 4 + k3 * th ** 6 + k4 * th ** 8)
    s = np.where(r > 1e-12, thd / np.maximum(r, 1e-12), 1.0 / np.maximum(z, 1e-12))
    return np.stack([fx * x * s + cx, fy * y * s + cy], 1), th


def _splat_metrics(ply, cam, q, t, boxes, sh_deg=3):
    import numpy as np
    from scipy.spatial.transform import Rotation as Rot
    raw = Path(ply).read_bytes(); end = raw.find(b"end_header\n") + 11
    hdr = raw[:end].decode().splitlines(); n = int([l for l in hdr if l.startswith("element vertex")][0].split()[-1])
    names = [l.split()[-1] for l in hdr if l.startswith("property")]
    a = np.frombuffer(raw[end:], "<f4").reshape(n, len(names))
    X = a[:, :3].astype(np.float64)
    R = Rot.from_quat([q[1], q[2], q[3], q[0]]).as_matrix()
    Xc = X @ R.T + np.asarray(t)
    uv, th = _fisheye_project(Xc, cam["params"])
    depth = np.linalg.norm(Xc, axis=1)
    op = 1 / (1 + np.exp(-a[:, names.index("opacity")]))
    sc = np.exp(a[:, [names.index(f"scale_{i}") for i in range(3)]])
    fdc = a[:, [names.index(f"f_dc_{i}") for i in range(3)]]
    rest = a[:, [i for i, nm in enumerate(names) if nm.startswith("f_rest_")]]
    fx = cam["params"][0]
    vis = (th < math.radians(100)) & (depth > 0.05)
    res = {}
    for cn, (x0, y0, x1, y1) in boxes.items():
        inb = vis & (uv[:, 0] >= x0) & (uv[:, 0] < x1) & (uv[:, 1] >= y0) & (uv[:, 1] < y1)
        idx = np.nonzero(inb)[0]
        cell = 16
        cx_ = ((uv[idx, 0] - x0) // cell).astype(int); cy_ = ((uv[idx, 1] - y0) // cell).astype(int)
        key = cy_ * 10000 + cx_
        order = np.lexsort((depth[idx], key))
        idx, key = idx[order], key[order]
        contrib, n_half, haze = [], [], []
        start = 0
        for i in range(1, len(idx) + 1):
            if i == len(idx) or key[i] != key[start]:
                g = idx[start:i]; T = 1.0; k_half = None; surf = None; w_list = []
                for j, gi in enumerate(g):
                    w = T * op[gi]; w_list.append((gi, w)); T *= (1 - op[gi])
                    if k_half is None and T <= 0.5:
                        k_half = j + 1
                    if T < 0.01:
                        break
                if w_list:
                    ws = np.array([w for _, w in w_list]); gs = np.array([gi for gi, _ in w_list])
                    surf = float(np.average(depth[gs], weights=ws + 1e-9))
                    front = depth[gs] < 0.85 * surf
                    haze.append(float(ws[front & (op[gs] < 0.3)].sum()))
                    contrib.append((gs, ws))
                    n_half.append(k_half if k_half is not None else len(g) + 1)
                start = i
        if not contrib:
            res[cn] = None; continue
        gs = np.concatenate([c[0] for c in contrib]); ws = np.concatenate([c[1] for c in contrib])
        # pixel footprint (1-sigma) of each contributor: largest axis scale * local angular->pixel scale
        fp = sc[gs].max(1) * fx / depth[gs]
        wmed = lambda v: float(np.interp(0.5, np.cumsum(ws[np.argsort(v)]) / ws.sum(), np.sort(v)))
        e_dc = (fdc[gs] ** 2).sum(1); e_rest = (rest[gs] ** 2).sum(1)
        res[cn] = {"splatsCenteredInCrop": int(len(idx)), "cells": len(contrib),
                   "footprintPxWeightedMedian": round(wmed(fp), 2),
                   "footprintPxP90": round(float(np.percentile(fp, 90)), 2),
                   "opacityWeightedMedian": round(wmed(op[gs]), 3),
                   "splatsToReachAlpha50Median": float(np.median(n_half)),
                   "hazeAlphaFrontLowOpacityMean": round(float(np.mean(haze)), 4),
                   "shRestEnergyShare": round(float((ws * e_rest).sum() / max((ws * (e_dc + e_rest)).sum(), 1e-9)), 3)}
    return res


def run() -> dict:
    import cv2
    import numpy as np
    man = json.load(open(f"{GOLD}/dataset_manifest.json"))
    ev = json.load(open(f"{GOLD}/eval_full/eval.json"))
    run_dir = Path(f"{GOLD}/runs/room213_spirula_full")
    fx_new = man["fixed_eval"]["camera2/frame_00103.png"]
    gi = ev["identified"][fx_new]["eval_index"]
    src = cv2.imread(f"{GOLD}/dataset/images/{fx_new}").astype(np.float32)
    ren = cv2.imread(str(run_dir / f"eval-render-{gi:05d}.png")).astype(np.float32)
    mask = cv2.imread(f"{GOLD}/dataset/masks/{fx_new}", 0) > 127
    sc = src.shape[1] / 720.0
    boxes = {k: tuple(int(v * sc) for v in b) for k, b in CROPS_720.items()}
    # camera + pose of the fixed view from the dataset's own COLMAP text model
    sp = Path(f"{GOLD}/dataset/sparse/0")
    cams = {}
    for ln in (sp / "cameras.txt").read_text().splitlines():
        if ln and not ln.startswith("#"):
            p = ln.split(); cams[int(p[0])] = {"model": p[1], "params": [float(x) for x in p[4:]]}
    pose = None
    lines = (sp / "images.txt").read_text().splitlines()
    for i in range(0, len(lines), 2):
        p = lines[i].split()
        if p and not p[0].startswith("#") and p[9] == fx_new:
            pose = ([float(x) for x in p[1:5]], [float(x) for x in p[5:8]], int(p[8]))
    out = {"view": fx_new, "evalIndex": gi, "crops": {}}
    for cn, (x0, y0, x1, y1) in boxes.items():
        out["crops"][cn] = {"image": _image_metrics(ren[y0:y1, x0:x1], src[y0:y1, x0:x1], mask[y0:y1, x0:x1])}
    splat = _splat_metrics(run_dir / "step-000030000.ckpt/splat.ply", cams[pose[2]], pose[0], pose[1], boxes)
    for cn in boxes:
        out["crops"][cn]["splats"] = splat[cn]
    # cross-view exposure consistency over the 24 holdouts (render vs GT mean gain spread)
    gains = []
    for name, v in ev["identified"].items():
        if "_eval" not in name or name == fx_new:
            continue
        g = cv2.imread(str(run_dir / f"eval-gt-{v['eval_index']:05d}.png")).astype(np.float32)
        r = cv2.imread(str(run_dir / f"eval-render-{v['eval_index']:05d}.png")).astype(np.float32)
        m = cv2.imread(f"{GOLD}/dataset/masks/{name}", 0) > 127
        gains.append(float(g[m].mean() / max(r[m].mean(), 1e-6)))
    out["holdoutExposureGain"] = {"n": len(gains), "mean": round(float(np.mean(gains)), 4) if gains else None,
                                  "std": round(float(np.std(gains)), 4) if gains else None,
                                  "min": round(min(gains), 4) if gains else None, "max": round(max(gains), 4) if gains else None}
    return out


def crossview() -> dict:
    """Is the source's fine texture REAL (repeats in neighbouring views) or noise/codec grain (does not)? For each
    crop: the 3 nearest same-lens TRAINING views, SIFT homography on a context window around the crop, warp the
    neighbour onto the fixed view, then correlate fine/mid band-pass signals. Render-vs-source is the reference."""
    import cv2
    import numpy as np
    man = json.load(open(f"{GOLD}/dataset_manifest.json"))
    ev = json.load(open(f"{GOLD}/eval_full/eval.json"))
    run_dir = Path(f"{GOLD}/runs/room213_spirula_full")
    fx_new = man["fixed_eval"]["camera2/frame_00103.png"]
    gi = ev["identified"][fx_new]["eval_index"]
    src = cv2.imread(f"{GOLD}/dataset/images/{fx_new}"); ren = cv2.imread(str(run_dir / f"eval-render-{gi:05d}.png"))
    sp = Path(f"{GOLD}/dataset/sparse/0"); lines = (sp / "images.txt").read_text().splitlines()
    from scipy.spatial.transform import Rotation as Rot
    poses = {}
    for i in range(0, len(lines), 2):
        p = lines[i].split()
        if p and not p[0].startswith("#"):
            q = [float(x) for x in p[1:5]]; t = np.array([float(x) for x in p[5:8]])
            R = Rot.from_quat([q[1], q[2], q[3], q[0]]).as_matrix(); poses[p[9]] = (-R.T @ t, R, int(p[8]))
    C0, R0, cam0 = poses[fx_new]
    cands = [n for n in poses if n.startswith("camera2/") and "_train" in n and poses[n][2] == cam0
             and np.linalg.norm(poses[n][0] - C0) > 1e-4]
    def score(n):  # near in position AND looking the same way
        return np.linalg.norm(poses[n][0] - C0) + 0.5 * np.linalg.norm(poses[n][1] - R0)
    neigh = sorted(cands, key=score)[:3]
    sc = src.shape[1] / 720.0
    sift = cv2.SIFT_create(nfeatures=6000)
    g0 = cv2.cvtColor(src, cv2.COLOR_BGR2GRAY)
    band = lambda g, a, b: ((cv2.GaussianBlur(g, (0, 0), a) if a else g) - cv2.GaussianBlur(g, (0, 0), b))
    def corr(a, b, m):
        a = a[m]; b = b[m]; a = a - a.mean(); b = b - b.mean()
        return float((a * b).sum() / (np.sqrt((a * a).sum() * (b * b).sum()) + 1e-9))
    out = {"view": fx_new, "neighbours": [], "crops": {}}
    nimgs = {}
    for n in neigh:
        nimgs[n] = cv2.cvtColor(cv2.imread(f"{GOLD}/dataset/images/{n}"), cv2.COLOR_BGR2GRAY)
        out["neighbours"].append({"name": n, "baselineUnits": round(float(np.linalg.norm(poses[n][0] - C0)), 4)})
    for cn, b720 in CROPS_720.items():
        x0, y0, x1, y1 = (int(v * sc) for v in b720)
        pad = 300; X0, Y0 = max(x0 - pad, 0), max(y0 - pad, 0); X1, Y1 = min(x1 + pad, g0.shape[1]), min(y1 + pad, g0.shape[0])
        ctx = g0[Y0:Y1, X0:X1]
        k0, d0 = sift.detectAndCompute(ctx, None)
        rec = {"renderVsSource": {}, "neighbours": []}
        s_crop = g0[y0:y1, x0:x1].astype(np.float32)
        r_crop = cv2.cvtColor(ren[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY).astype(np.float32)
        m = np.ones(s_crop.shape, bool); m[:8] = m[-8:] = False; m[:, :8] = m[:, -8:] = False
        for bn, (a, b) in (("fine", (0, 1.5)), ("mid", (1.5, 4.0))):
            rec["renderVsSource"][bn] = round(corr(band(r_crop, a, b), band(s_crop, a, b), m), 3)
        for n, gn in nimgs.items():
            k1, d1 = sift.detectAndCompute(gn, None)
            mt = cv2.BFMatcher().knnMatch(d0, d1, k=2) if d0 is not None and d1 is not None else []
            good = [a for a, b in (x for x in mt if len(x) == 2) if a.distance < 0.75 * b.distance]
            if len(good) < 12:
                rec["neighbours"].append({"name": n, "matches": len(good)}); continue
            P0 = np.float32([k0[g.queryIdx].pt for g in good]) + [X0, Y0]; P1 = np.float32([k1[g.trainIdx].pt for g in good])
            H, inl = cv2.findHomography(P1, P0, cv2.RANSAC, 2.0)
            if H is None:
                rec["neighbours"].append({"name": n, "matches": len(good), "homography": None}); continue
            warped = cv2.warpPerspective(gn, H, (g0.shape[1], g0.shape[0]), flags=cv2.INTER_CUBIC)[y0:y1, x0:x1].astype(np.float32)
            valid = m & (cv2.warpPerspective(np.ones_like(gn), H, (g0.shape[1], g0.shape[0]))[y0:y1, x0:x1] > 0)
            nb = {"name": n, "matches": len(good), "inliers": int(inl.sum())}
            for bn, (a, b) in (("fine", (0, 1.5)), ("mid", (1.5, 4.0)), ("coarse", (4.0, 12.0))):
                nb[bn] = round(corr(band(warped, a, b), band(s_crop, a, b), valid), 3)
            rec["neighbours"].append(nb)
        out["crops"][cn] = rec
    return out


def grain_floor() -> dict:
    """Single-image noise-floor test: fine/mid band std of 128-px tiles. 'Flat' tiles (lowest coarse-band structure)
    at the same brightness as each crop give the sensor/codec grain floor; a crop whose band energy sits at that floor
    has no recoverable texture beyond noise. Render values alongside show what the model keeps."""
    import cv2
    import numpy as np
    man = json.load(open(f"{GOLD}/dataset_manifest.json"))
    ev = json.load(open(f"{GOLD}/eval_full/eval.json"))
    fx_new = man["fixed_eval"]["camera2/frame_00103.png"]; gi = ev["identified"][fx_new]["eval_index"]
    src = cv2.cvtColor(cv2.imread(f"{GOLD}/dataset/images/{fx_new}"), cv2.COLOR_BGR2GRAY).astype(np.float32)
    ren = cv2.cvtColor(cv2.imread(f"{GOLD}/runs/room213_spirula_full/eval-render-{gi:05d}.png"), cv2.COLOR_BGR2GRAY).astype(np.float32)
    mask = cv2.imread(f"{GOLD}/dataset/masks/{fx_new}", 0) > 127
    band = lambda g, a, b: ((cv2.GaussianBlur(g, (0, 0), a) if a else g) - cv2.GaussianBlur(g, (0, 0), b))
    B = {k: band(src, *v) for k, v in (("fine", (0, 1.5)), ("mid", (1.5, 4.0)), ("coarse", (6.0, 24.0)))}
    BR = {k: band(ren, *v) for k, v in (("fine", (0, 1.5)), ("mid", (1.5, 4.0)))}
    T = 128; tiles = []
    for y in range(0, src.shape[0] - T, T):
        for x in range(0, src.shape[1] - T, T):
            if mask[y:y + T, x:x + T].mean() < 0.99:
                continue
            sl = (slice(y, y + T), slice(x, x + T))
            tiles.append({"x": x, "y": y, "mean": float(src[sl].mean()), "coarse": float(B["coarse"][sl].std()),
                          "fine": float(B["fine"][sl].std()), "mid": float(B["mid"][sl].std())})
    sc = src.shape[1] / 720.0; out = {"tiles": len(tiles), "crops": {}}
    for cn, b in CROPS_720.items():
        x0, y0, x1, y1 = (int(v * sc) for v in b)
        m = mask[y0:y1, x0:x1]; sl = (slice(y0, y1), slice(x0, x1))
        mean = float(src[sl][m].mean())
        same = [t for t in tiles if abs(t["mean"] - mean) < 12]
        flat = sorted(same, key=lambda t: t["coarse"])[:max(3, len(same) // 10)] if same else []
        out["crops"][cn] = {"brightness": round(mean, 1),
                            "sourceFine": round(float(B["fine"][sl][m].std()), 2), "sourceMid": round(float(B["mid"][sl][m].std()), 2),
                            "renderFine": round(float(BR["fine"][sl][m].std()), 2), "renderMid": round(float(BR["mid"][sl][m].std()), 2),
                            "flatFloorFine": round(float(np.median([t["fine"] for t in flat])), 2) if flat else None,
                            "flatFloorMid": round(float(np.median([t["mid"] for t in flat])), 2) if flat else None,
                            "flatTiles": len(flat), "flatTileCoarseMedian": round(float(np.median([t["coarse"] for t in flat])), 2) if flat else None}
    return out
