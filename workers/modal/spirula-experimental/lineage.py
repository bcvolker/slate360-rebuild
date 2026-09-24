"""Feature lineage + local multi-view agreement for three frozen structural edges (read-only, no training).

For each target edge (anchor from the frozen source audit):
 A  lineage at the fixed view: .insv clip / lens stream / frame -> decoded frame -> dataset PNG -> Spirula's loss
    tensor (its eval-gt write-back) -> Spirula render at that training camera (1M, 3M, PPISP) -- identical pixel
    coordinates, edge width (FWHM of the cross-edge gradient), contrast, SNR at 7 points along the edge.
 B  every useful training observation: the 3D edge segment is projected through that camera's own fisheye model;
    the edge is located ONLY along the projected cross-edge direction (+-5 px, same polarity as the fixed view), so a
    repetitive neighbour (next slat) cannot be matched; residual across the edge in px and mm, width, contrast.
    Along-edge residual is not observable on a straight edge (aperture) and is reported as such.
 D  Gaussians around the 3D edge in the 1M and 3M models: count, footprint, opacity, 3M/1M ratio vs global ratio."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

from srcaudit import GOLD, Splats, _qR, project, unproject

UNIT_MM = 1110.6                      # 1 model unit = 1.1106 m (manifest)
EDGES = {"chair_slat": ("chair_slats", 1), "table_edge": ("table_edges", 1), "window_frame": ("window_frames", 1)}
# Manually verified in the fixed-view source (fisheye px): a stripe edge ON a chair-back slat (surface edge), the long
# table's top edge (depth taken on the bright table side = the physical edge), the window's left outer frame edge.
MANUAL = {"chair_slat": (2700, 2805, None), "table_edge": (2430, 3040, "bright"), "window_frame": (1802, 2280, None)}


def _profile(img, uv, d, half=6.0, step=0.1):
    import cv2
    t = np.arange(-half, half + 1e-9, step)
    xs = (uv[0] + t * d[0]).astype(np.float32); ys = (uv[1] + t * d[1]).astype(np.float32)
    p = cv2.remap(img, xs[None], ys[None], cv2.INTER_LINEAR)[0].astype(np.float64)
    return t, p


def _measure(img, uv, d, polarity=None, search=5.0):
    """Edge along direction d through uv: location (px, signed), FWHM width, contrast, noise, SNR, polarity."""
    t, p = _profile(img, uv, d)
    ps = np.convolve(p, np.ones(5) / 5, "same")
    g = np.gradient(ps, t)
    win = np.abs(t) <= search
    if polarity is None:
        i = int(np.argmax(np.where(win, np.abs(g), -1)))
        pol = float(np.sign(g[i]))
    else:
        pol = polarity
        i = int(np.argmax(np.where(win, g * pol, -1e9)))
        if g[i] * pol <= 0:
            return None
    pk = abs(g[i]); h = pk / 2
    l = i
    while l > 0 and abs(g[l]) > h:
        l -= 1
    r = i
    while r < len(g) - 1 and abs(g[r]) > h:
        r += 1
    if l == 0 or r == len(g) - 1:
        return None
    if 0 < i < len(g) - 1:                                   # sub-sample peak
        a, b_, c = abs(g[i - 1]), abs(g[i]), abs(g[i + 1]); den = a - 2 * b_ + c
        off = 0.5 * (a - c) / den * (t[1] - t[0]) if abs(den) > 1e-12 else 0.0
    else:
        off = 0.0
    loc = float(t[i] + off)
    contrast = float(abs(np.interp(loc + 3.5, t, ps) - np.interp(loc - 3.5, t, ps)))
    fl = p[(np.abs(t - loc) >= 3.0)]
    noise = float(np.median(np.abs(np.diff(fl, 2))) * 1.4826 / math.sqrt(6)) if len(fl) > 10 else float("nan")
    return {"loc": loc, "widthPx": float(t[r] - t[l]), "contrast": contrast, "noise": noise,
            "snr": contrast / noise if noise and noise > 1e-6 else None, "polarity": pol}


def run(frozen_audit: dict, ply_1m: str, ply_3m: str, renders: dict, decoded_bgr) -> dict:
    """renders: {'label': (fisheye BGR render at the fixed training camera)}; decoded_bgr: decoded .insv frame."""
    import cv2
    man = json.load(open(f"{GOLD}/dataset_manifest.json"))
    sp = Path(f"{GOLD}/dataset/sparse/0")
    cams = {}
    for ln in (sp / "cameras.txt").read_text().splitlines():
        if ln and not ln.startswith("#"):
            q = ln.split(); cams[int(q[0])] = [float(x) for x in q[4:]]
    poses = {}
    lines = (sp / "images.txt").read_text().splitlines()
    for i in range(0, len(lines), 2):
        q = lines[i].split()
        if q and not q[0].startswith("#"):
            poses[q[9]] = (_qR([float(x) for x in q[1:5]]), np.array([float(x) for x in q[5:8]]), int(q[8]))
    role = {m["new"]: m["role"] for m in man["images"]}
    fx_new = man["fixed_eval"]["camera2/frame_00103.png"]
    R0, t0, c0 = poses[fx_new]; p0 = cams[c0]; C0 = -R0.T @ t0
    gray = lambda im: cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
    stages = {"decoded_insv_frame": gray(decoded_bgr),
              "fullcircle_png": gray(cv2.imread(f"{GOLD.rsplit('/spirula_bench_v1', 1)[0]}/fullcircle/data/room213/images/camera2/frame_00103.png")),
              "spirula_dataset_png": gray(cv2.imread(f"{GOLD}/dataset/images/camera2/frame_00103_train.png")),
              "loss_tensor_evalgt": gray(cv2.imread(f"{GOLD}/runs/room213_spirula_full/eval-gt-"
                                                   f"{json.load(open(f'{GOLD}/eval_full/eval.json'))['identified'][fx_new]['eval_index']:05d}.png"))}
    for k, im in renders.items():
        stages[f"spirula_render_{k}"] = gray(im)
    spl = Splats(ply_1m)
    train = [n for n in poses if role.get(n) == "train"]
    exposure = {n: n.split("/")[1].split("_")[1] for n in poses}
    src_gray = stages["spirula_dataset_png"]
    out = {"fixedView": fx_new, "fixedLineage": {"clip": "VID_20260921_111410_00_075.insv", "lensStream": 1,
                                                  "frameIndex": 1120, "timeS": 37.371, "physicalLens": "camera2 = lens stream 1",
                                                  "datasetPng": "dataset/images/camera2/frame_00103_train.png (symlink of fullcircle images/camera2/frame_00103.png)",
                                                  "dims": list(src_gray.shape)}, "edges": {}}
    edges3d = {}
    for en, (tn, ai) in EDGES.items():
        mu, mv, side = MANUAL[en]
        gs = cv2.GaussianBlur(src_gray, (0, 0), 1.0)
        gx, gy = cv2.Sobel(gs, cv2.CV_32F, 1, 0, 3), cv2.Sobel(gs, cv2.CV_32F, 0, 1, 3)
        ys, xs = np.mgrid[mv - 8:mv + 9, mu - 8:mu + 9]
        mag = np.hypot(gx[ys, xs], gy[ys, xs]) * (np.hypot(ys - mv, xs - mu) <= 8)
        k = np.unravel_index(np.argmax(mag), mag.shape); ey, ex = int(ys[k]), int(xs[k])
        gdir = np.array([gx[ey, ex], gy[ey, ex]]); gdir /= np.linalg.norm(gdir); tdir = np.array([-gdir[1], gdir[0]])
        du, dv = (ex + 5 * gdir[0], ey + 5 * gdir[1]) if side == "bright" else (ex, ey)   # gradient points to brighter
        dd = None
        for rad in (3.0, 6.0, 10.0):
            dd = spl.surface_depth(R0, t0, p0, (du, dv), rad=rad)
            if dd is not None:
                break
        if dd is None:
            raise RuntimeError(f"{en}: no model surface near the edge")
        ray_d = R0.T @ unproject(du, dv, p0)
        P = C0 + ray_d * dd
        n = spl.normal(P, k=100)
        if n @ (C0 - P) < 0:
            n = -n
        u0, v0 = ex, ey
        def to_plane(u, v):
            ray = R0.T @ unproject(u, v, p0)
            s = ((P - C0) @ n) / (ray @ n)
            return C0 + s * ray
        E = to_plane(ex, ey); Eb = to_plane(ex + 6 * tdir[0], ey + 6 * tdir[1])
        dir3 = (Eb - E) / np.linalg.norm(Eb - E); per3 = np.cross(n, dir3); per3 /= np.linalg.norm(per3)
        px_len = np.linalg.norm(Eb - E) / 6                                   # 3D length of one fixed-view px along edge
        samples = [E + s * px_len * dir3 for s in (-12, -8, -4, 0, 4, 8, 12)]
        edges3d[en] = {"E": E, "dir": dir3, "perp": per3, "n": n, "samples": samples, "pxLen": px_len}

        def measure_view(img, R, t, p, polarity=None):
            recs = []
            for X in samples:
                uv, th, _ = project(X[None], R, t, p); uv = uv[0]
                e = 1e-4
                uvp, _, _ = project((X + e * per3)[None], R, t, p); d = uvp[0] - uv
                mm_per_px = (e * UNIT_MM) / np.linalg.norm(d); d = d / np.linalg.norm(d)
                m = _measure(img, uv, d, polarity)
                if m:
                    m.update({"uv": uv.round(2).tolist(), "mmPerPx": mm_per_px, "resMm": m["loc"] * mm_per_px})
                    recs.append(m)
            return recs
        # A: lineage at the fixed view, identical fisheye pixel coordinates
        def patch_noise(img, u, v):
            from scipy.signal import convolve2d
            g = img[int(v) - 24:int(v) + 24, int(u) - 24:int(u) + 24].astype(np.float64)
            M = np.array([[1, -2, 1], [-2, 4, -2], [1, -2, 1]], float)
            return float(np.abs(convolve2d(g, M, mode="valid")).sum() * math.sqrt(0.5 * math.pi) / (6 * 46 * 46))
        ref = measure_view(src_gray, R0, t0, p0)
        pol = float(np.median([r["polarity"] for r in ref])) if ref else None
        lin = {}
        for sname, img in stages.items():
            rr = measure_view(img, R0, t0, p0, pol)
            nz = patch_noise(img, ex, ey)
            lin[sname] = {"noiseSigmaPatch": round(nz, 2),
                          "snrContrastOverNoise": round(float(np.median([r["contrast"] for r in rr])) / max(nz, 1e-6), 1) if rr else None,
                          "points": len(rr), "widthPxMedian": round(float(np.median([r["widthPx"] for r in rr])), 3) if rr else None,
                          "contrastMedian": round(float(np.median([r["contrast"] for r in rr])), 2) if rr else None,
                          "snrMedian": round(float(np.median([r["snr"] for r in rr if r["snr"]])), 2) if rr else None,
                          "locPxMedian": round(float(np.median([r["loc"] for r in rr])), 3) if rr else None}
        # B: independent training observations
        obs = []
        for name in train:
            R, t, c = poses[name]; p = cams[c]; C = -R.T @ t
            uvE, th, _ = project(E[None], R, t, p)
            if th[0] > math.radians(95) or not (20 < uvE[0, 0] < 3820 and 20 < uvE[0, 1] < 3820):
                continue
            mk = cv2.imread(f"{GOLD}/dataset/masks/{name}", 0)
            if mk[int(uvE[0, 1]), int(uvE[0, 0])] < 128:
                continue
            vv = C - E; dist = float(np.linalg.norm(vv))
            inc = math.degrees(math.acos(abs(float(n @ vv)) / dist))
            if inc > 75:
                continue
            sd = spl.surface_depth(R, t, p, uvE[0])
            if sd is None or np.linalg.norm(E @ R.T + t) > sd * 1.04 + 0.01:
                continue
            img = cv2.imread(f"{GOLD}/dataset/images/{name}", cv2.IMREAD_GRAYSCALE).astype(np.float32)
            rr = measure_view(img, R, t, p, pol)
            if len(rr) < 4:
                continue
            mmpp = float(np.median([r["mmPerPx"] for r in rr]))
            obs.append({"view": name, "lens": name.split("/")[0], "independentExposure": exposure[name] != exposure[fx_new],
                        "distanceM": round(dist * UNIT_MM / 1000, 3), "incidenceDeg": round(inc, 1),
                        "mmPerPx": round(mmpp, 3), "projectedUv": uvE[0].round(1).tolist(),
                        "crossEdgeResidualPx": round(float(np.median([r["loc"] for r in rr])), 3),
                        "crossEdgeResidualMm": round(float(np.median([r["resMm"] for r in rr])), 3),
                        "withinViewResidualSpreadPx": round(float(np.std([r["loc"] for r in rr])), 3),
                        "edgeWidthPx": round(float(np.median([r["widthPx"] for r in rr])), 3),
                        "edgeWidthMm": round(float(np.median([r["widthPx"] * r["mmPerPx"] for r in rr])), 3),
                        "contrast": round(float(np.median([r["contrast"] for r in rr])), 1),
                        "snr": round(float(np.median([r["contrast"] for r in rr])) / max(patch_noise(img, *uvE[0]), 1e-6), 1),
                        "alongEdgeResidual": "not observable on a straight edge (aperture)"})
        # useful = independent exposure, fine enough sampling (<= 2x the fixed view's mm/px), decent contrast
        fixed_mmpp = float(np.median([r["mmPerPx"] for r in ref])) if ref else None
        useful = [o for o in obs if o["independentExposure"] and o["mmPerPx"] <= 2 * fixed_mmpp and o["contrast"] >= 15]
        useful.sort(key=lambda o: o["mmPerPx"])
        res_mm = np.array([o["crossEdgeResidualMm"] for o in useful])
        dev = np.abs(res_mm - np.median(res_mm)) if len(res_mm) else np.array([])
        src_w_mm = float(np.median([r["widthPx"] * r["mmPerPx"] for r in ref])) if ref else None
        out["edges"][en] = {"target": tn, "manualPick": [mu, mv], "fixedViewEdgePx": [int(ex), int(ey)],
                            "depthSide": side or "on-edge", "edgePointWorld": E.round(5).tolist(), "fixedMmPerPx": round(fixed_mmpp, 3),
                            "lineage": lin, "observationsAll": len(obs), "usefulIndependent": len(useful),
                            "crossEdgeDisagreementMm": {"median": round(float(np.median(dev)), 3) if len(dev) else None,
                                                        "p90": round(float(np.percentile(dev, 90)), 3) if len(dev) else None,
                                                        "worst": round(float(dev.max()), 3) if len(dev) else None},
                            "crossEdgeDisagreementFixedPx": {k: round(v / fixed_mmpp, 3) if v is not None else None for k, v in
                                                             {"median": float(np.median(dev)) if len(dev) else None,
                                                              "p90": float(np.percentile(dev, 90)) if len(dev) else None,
                                                              "worst": float(dev.max()) if len(dev) else None}.items()},
                            "sourceEdgeWidthMmFixed": round(src_w_mm, 3) if src_w_mm else None,
                            "usefulEdgeWidthMmMedian": round(float(np.median([o["edgeWidthMm"] for o in useful])), 3) if useful else None,
                            "observations": useful[:14]}
    # D: Gaussians around each edge, 1M vs 3M
    def load(ply):
        raw = Path(ply).read_bytes(); end = raw.find(b"end_header\n") + 11
        hdr = raw[:end].decode().splitlines(); nn = int([l for l in hdr if l.startswith("element vertex")][0].split()[-1])
        names = [l.split()[-1] for l in hdr if l.startswith("property")]
        a = np.frombuffer(raw[end:], "<f4").reshape(nn, len(names))
        return (a[:, :3].astype(np.float64), 1 / (1 + np.exp(-a[:, names.index("opacity")].astype(np.float64))),
                np.exp(a[:, [names.index(f"scale_{i}") for i in range(3)]].astype(np.float64)).max(1), nn)
    models = {"1M": load(ply_1m), "3M": load(ply_3m)}
    out["globalCountRatio3Mto1M"] = round(models["3M"][3] / models["1M"][3], 3)
    for en, e in edges3d.items():
        alloc = {}
        for lab, (X, op, sc, nn) in models.items():
            rel = X - e["E"]; along = rel @ e["dir"]; perp = np.linalg.norm(rel - np.outer(along, e["dir"]), axis=1)
            seg = np.abs(along) <= 12 * e["pxLen"]
            for rmm in (10, 30):
                sel = seg & (perp <= rmm / UNIT_MM)
                d = np.linalg.norm(X[sel] @ R0.T + t0, axis=1)
                fp = sc[sel] * p0[0] / np.maximum(d, 1e-6)
                alloc[f"{lab}_r{rmm}mm"] = {"count": int(sel.sum()),
                                            "footprintPxMedian": round(float(np.median(fp)), 2) if sel.any() else None,
                                            "opacityMedian": round(float(np.median(op[sel])), 3) if sel.any() else None,
                                            "opaqueCount": int((op[sel] > 0.3).sum())}
        for rmm in (10, 30):
            c1, c3 = alloc[f"1M_r{rmm}mm"]["count"], alloc[f"3M_r{rmm}mm"]["count"]
            alloc[f"ratio3Mto1M_r{rmm}mm"] = round(c3 / c1, 3) if c1 else None
        alloc["densificationHistory"] = "not exported by Spirula (no per-primitive split/relocation log or error map in outputs)"
        out["edges"][en]["gaussianAllocation"] = alloc
        out["edges"][en]["edge3d"] = {"E": e["E"].round(5).tolist(), "dir": e["dir"].round(5).tolist(),
                                      "perp": e["perp"].round(5).tolist(), "samples": [s.round(5).tolist() for s in e["samples"]]}
    return out


def sheets(res: dict) -> dict:
    """Manual-validation sheets: each observation resampled onto the SAME surface grid (edge along x, cross-edge along
    y, fixed-view pixel spacing, 96x96, x3 nearest), the frozen edge drawn in green at the centre row and the measured
    edge position in red. A wrong correspondence (e.g. the next slat) shows up as a red line off the green one or
    different content."""
    import cv2
    sp = Path(f"{GOLD}/dataset/sparse/0")
    cams = {}
    for ln in (sp / "cameras.txt").read_text().splitlines():
        if ln and not ln.startswith("#"):
            q = ln.split(); cams[int(q[0])] = [float(x) for x in q[4:]]
    poses = {}
    lines = (sp / "images.txt").read_text().splitlines()
    for i in range(0, len(lines), 2):
        q = lines[i].split()
        if q and not q[0].startswith("#"):
            poses[q[9]] = (_qR([float(x) for x in q[1:5]]), np.array([float(x) for x in q[5:8]]), int(q[8]))
    out = {}
    for en, e in res["edges"].items():
        E = np.array(e["edge3d"]["E"]); d = np.array(e["edge3d"]["dir"]); pp = np.array(e["edge3d"]["perp"])
        step = np.linalg.norm(np.array(e["edge3d"]["samples"][1]) - np.array(e["edge3d"]["samples"][0])) / 4
        gi = (np.arange(96) - 48 + 0.5) * step
        GX = E + gi[None, :, None] * d + gi[:, None, None] * pp
        views = [(res["fixedView"], 0.0)] + [(o["view"], o["crossEdgeResidualMm"] / UNIT_MM / step) for o in e["observations"][:11]]
        tiles = []
        for name, off in views:
            R, t, c = poses[name]
            uv, _, _ = project(GX, R, t, cams[c])
            im = cv2.imread(f"{GOLD}/dataset/images/{name}")
            patch = cv2.remap(im, uv[..., 0].astype(np.float32), uv[..., 1].astype(np.float32), cv2.INTER_LINEAR)
            patch = cv2.resize(patch, (288, 288), interpolation=cv2.INTER_NEAREST)
            cv2.line(patch, (0, 144), (287, 144), (0, 255, 0), 1)
            y = int(round(144 + off * 3)); cv2.line(patch, (0, y), (287, y), (0, 0, 255), 1)
            cv2.putText(patch, name.replace("_train.png", "").replace("_fixedeval.png", " FIXED"), (3, 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 255, 255), 1)
            tiles.append(patch)
        while len(tiles) % 4:
            tiles.append(np.zeros_like(tiles[0]))
        sheet = np.vstack([np.hstack(tiles[i:i + 4]) for i in range(0, len(tiles), 4)])
        ok, jpg = cv2.imencode(".jpg", sheet, [cv2.IMWRITE_JPEG_QUALITY, 90]); out[en] = jpg.tobytes()
    return out


def stage_sheet(res: dict, stage_imgs: dict) -> dict:
    """Native-pixel crops (identical fisheye coordinates, 64x64 around the edge point, x4 nearest) of every lineage
    stage at the fixed view."""
    import cv2
    out = {}
    for en, e in res["edges"].items():
        x, y = e["fixedViewEdgePx"]; tiles = []
        for sname, im in stage_imgs.items():
            c = im[y - 32:y + 32, x - 32:x + 32]
            c = cv2.resize(c, (256, 256), interpolation=cv2.INTER_NEAREST)
            c = cv2.copyMakeBorder(c, 18, 0, 0, 2, cv2.BORDER_CONSTANT, value=(0, 0, 0))
            cv2.putText(c, sname[:34], (2, 13), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (0, 255, 255), 1)
            tiles.append(c)
        ok, jpg = cv2.imencode(".jpg", np.hstack(tiles), [cv2.IMWRITE_JPEG_QUALITY, 92]); out[en] = jpg.tobytes()
    return out
