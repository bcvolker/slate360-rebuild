"""Extended read-only lineage: two unambiguous SURFACE edges and one surface-texture patch (no silhouettes, no
occlusion boundaries, no highlights, no repeated-neighbour matching, no fitted homographies).

 baseboard   dark baseboard top edge on the white wall (coplanar surface edge)
 tile_corner ceiling tile corner: the tile's vertical edge and horizontal edge against the T-bar flange, both on the
             ceiling plane; the two cross-edge residuals give a full 2D in-plane residual (cross AND along)
 carpet      64x64 carpet texture patch; 2D residual = sub-pixel shift maximizing NCC on the rectified surface patch

Correspondence is purely geometric: 3D point from the model's composited surface depth at the fixed-view pixel,
local plane from nearby opaque splats, projection through each camera's own fisheye model; search windows are
+-4 px along the measurement direction only."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

from lineage import UNIT_MM, _measure
from srcaudit import GOLD, Splats, _band, _qR, project, unproject

TARGETS = {"baseboard": {"kind": "edge", "px": (750, 2878)},
           "tile_corner": {"kind": "corner", "a": (990, 1015), "b": (955, 1047)},
           # carpet: the source-audit anchor proven repeatable (carpet a3: 5 independent views NCC-mid >= 0.5)
           "carpet": {"kind": "texture", "px": (1029, 3093), "P": [-5.18694, 2.03317, 2.20071]}}


def _setup():
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
    return man, cams, poses


def run(ply_1m: str, stages: dict, only: str = "") -> dict:
    """stages: {name: grayscale float image at the fixed view} (decoded, png, tensor, renders...)."""
    import cv2
    man, cams, poses = _setup()
    role = {m["new"]: m["role"] for m in man["images"]}
    fx_new = man["fixed_eval"]["camera2/frame_00103.png"]
    R0, t0, c0 = poses[fx_new]; p0 = cams[c0]; C0 = -R0.T @ t0
    spl = Splats(ply_1m)
    train = [n for n in poses if role.get(n) == "train"]
    exposure = {n: n.split("/")[1].split("_")[1] for n in poses}
    src = stages["spirula_dataset_png"]
    gs = cv2.GaussianBlur(src, (0, 0), 1.0)
    GX, GY = cv2.Sobel(gs, cv2.CV_32F, 1, 0, 3), cv2.Sobel(gs, cv2.CV_32F, 0, 1, 3)

    def surface_point(u, v):
        for rad in (3.0, 6.0, 10.0, 20.0, 40.0):          # ceiling = large sparse splats
            d = spl.surface_depth(R0, t0, p0, (u, v), rad=rad)
            if d is not None:
                return C0 + (R0.T @ unproject(u, v, p0)) * d
        raise RuntimeError(f"no surface at {u},{v}")

    def edge_at(u, v):
        ys, xs = np.mgrid[v - 6:v + 7, u - 6:u + 7]
        mag = np.hypot(GX[ys, xs], GY[ys, xs]) * (np.hypot(ys - v, xs - u) <= 6)
        k = np.unravel_index(np.argmax(mag), mag.shape); ey, ex = int(ys[k]), int(xs[k])
        g = np.array([GX[ey, ex], GY[ey, ex]]); g /= np.linalg.norm(g)
        return ex, ey, g

    def plane_edge(ex, ey, g, P, n):
        t = np.array([-g[1], g[0]])
        def tp(u, v):
            ray = R0.T @ unproject(u, v, p0); s = ((P - C0) @ n) / (ray @ n); return C0 + s * ray
        E = tp(ex, ey); Eb = tp(ex + 6 * t[0], ey + 6 * t[1])
        d = (Eb - E) / np.linalg.norm(Eb - E); pr = np.cross(n, d); pr /= np.linalg.norm(pr)
        return E, d, pr, np.linalg.norm(Eb - E) / 6

    def view_ok(name, X, n):
        R, t, c = poses[name]; p = cams[c]; C = -R.T @ t
        uv, th, _ = project(X[None], R, t, p)
        if th[0] > math.radians(95) or not (40 < uv[0, 0] < 3800 and 40 < uv[0, 1] < 3800):
            return None
        mk = cv2.imread(f"{GOLD}/dataset/masks/{name}", 0)
        if mk[int(uv[0, 1]), int(uv[0, 0])] < 128:
            return None
        vv = C - X; dist = float(np.linalg.norm(vv)); inc = math.degrees(math.acos(abs(float(n @ vv)) / dist))
        if inc > 75:
            return None
        sd = None
        for rad in (4.0, 10.0, 20.0, 40.0):
            sd = spl.surface_depth(R, t, p, uv[0], rad=rad)
            if sd is not None:
                break
        if sd is None or np.linalg.norm(X @ R.T + t) > sd * 1.04 + 0.01:
            return None
        cx, cy = p[2], p[3]
        return {"view": name, "lens": name.split("/")[0], "independentExposure": exposure[name] != exposure[fx_new],
                "distanceM": round(dist * UNIT_MM / 1000, 3), "incidenceDeg": round(inc, 1),
                "imageRadiusPx": round(float(math.hypot(uv[0, 0] - cx, uv[0, 1] - cy)), 1),
                "offAxisDeg": round(math.degrees(float(th[0])), 1), "projectedUv": uv[0].round(1).tolist()}

    def edge_meas(img, R, t, p, samples, pr, polarity, search=4.0):
        recs = []
        for X in samples:
            uv, _, _ = project(X[None], R, t, p); uv = uv[0]
            e = 1e-4; uvp, _, _ = project((X + e * pr)[None], R, t, p); dvec = uvp[0] - uv
            mmpp = (e * UNIT_MM) / np.linalg.norm(dvec); dvec /= np.linalg.norm(dvec)
            m = _measure(img, uv, dvec, polarity, search=search)
            if m:
                m["mmPerPx"] = mmpp; m["resMm"] = m["loc"] * mmpp; recs.append(m)
        return recs

    def stage_fid(sample_fn):
        return {s: sample_fn(im) for s, im in stages.items()}

    def summarize(vals):
        v = np.asarray(vals, float)
        if not len(v):
            return None
        dev = np.abs(v - np.median(v))
        return {"n": int(len(v)), "centre": round(float(np.median(v)), 3), "median": round(float(np.median(dev)), 3),
                "p90": round(float(np.percentile(dev, 90)), 3), "max": round(float(dev.max()), 3)}

    out = {"fixedView": fx_new, "targets": {}}
    obs, obs_c = [], []
    if only == "carpet":
        return _carpet(out, spl, poses, cams, train, exposure, fx_new, R0, t0, p0, C0, stages, src, view_ok)
    # ---------------- straight surface edge: baseboard
    u, v = TARGETS["baseboard"]["px"]
    ex, ey, g = edge_at(u, v)
    P = surface_point(ex, ey); n = spl.normal(P, k=100); n = n if n @ (C0 - P) > 0 else -n
    E, d, pr, pxl = plane_edge(ex, ey, g, P, n)
    samples = [E + s * pxl * d for s in (-15, -10, -5, 0, 5, 10, 15)]
    ref = edge_meas(src, R0, t0, p0, samples, pr, None)
    pol = float(np.median([r["polarity"] for r in ref]))
    fid = stage_fid(lambda im: (lambda rr: {"widthPx": round(float(np.median([r["widthPx"] for r in rr])), 3) if rr else None,
                                            "contrast": round(float(np.median([r["contrast"] for r in rr])), 2) if rr else None,
                                            "locPx": round(float(np.median([r["loc"] for r in rr])), 3) if rr else None})
                    (edge_meas(im, R0, t0, p0, samples, pr, pol)))
    fmmpp = float(np.median([r["mmPerPx"] for r in ref]))
    obs = []
    for name in train:
        o = view_ok(name, E, n)
        if not o or not o["independentExposure"]:
            continue
        R, t, c = poses[name]
        img = cv2.imread(f"{GOLD}/dataset/images/{name}", cv2.IMREAD_GRAYSCALE).astype(np.float32)
        rr = edge_meas(img, R, t, cams[c], samples, pr, pol)
        if len(rr) < 5:
            continue
        mm = float(np.median([r["mmPerPx"] for r in rr]))
        if mm > 2 * fmmpp or np.median([r["contrast"] for r in rr]) < 15:
            continue
        o.update({"mmPerPx": round(mm, 3), "crossEdgeResidualMm": round(float(np.median([r["resMm"] for r in rr])), 3),
                  "crossEdgeResidualOwnPx": round(float(np.median([r["loc"] for r in rr])), 3),
                  "withinViewSpreadPx": round(float(np.std([r["loc"] for r in rr])), 3),
                  "edgeWidthPx": round(float(np.median([r["widthPx"] for r in rr])), 3),
                  "contrast": round(float(np.median([r["contrast"] for r in rr])), 1),
                  "alongEdgeResidual": "not observable on a straight edge (aperture); see tile_corner"})
        obs.append(o)
    out["targets"]["baseboard"] = {"kind": "straight surface edge", "fixedEdgePx": [ex, ey], "fixedMmPerPx": round(fmmpp, 3),
                                   "lineageAtFixedView": fid, "usableIndependentObservations": len(obs),
                                   "crossEdgeResidualMm": summarize([o["crossEdgeResidualMm"] for o in obs]),
                                   "crossEdgeResidualFixedPx": summarize([o["crossEdgeResidualMm"] / fmmpp for o in obs]),
                                   "observations": obs, "E": E.tolist(), "dir": d.tolist(), "perp": pr.tolist(), "n": n.tolist(),
                                   "pxLen": pxl}
    # ---------------- tile corner: two surface edges on the ceiling plane -> 2D residual
    tc = {}
    (ua, va), (ub, vb) = TARGETS["tile_corner"]["a"], TARGETS["tile_corner"]["b"]
    exa, eya, ga = edge_at(ua, va); exb, eyb, gb = edge_at(ub, vb)
    Pc = surface_point(exa, eya); nc = spl.normal(Pc, k=100); nc = nc if nc @ (C0 - Pc) > 0 else -nc
    Ea, da, pa, la = plane_edge(exa, eya, ga, Pc, nc); Eb, db, pb, lb = plane_edge(exb, eyb, gb, Pc, nc)
    sa = [Ea + s * la * da for s in (-10, -6, -2, 2, 6, 10)]; sb = [Eb + s * lb * db for s in (-10, -6, -2, 2, 6, 10)]
    refa = edge_meas(src, R0, t0, p0, sa, pa, None); refb = edge_meas(src, R0, t0, p0, sb, pb, None)
    pola = float(np.median([r["polarity"] for r in refa])); polb = float(np.median([r["polarity"] for r in refb]))
    fida = stage_fid(lambda im: (lambda rr: {"widthPx": round(float(np.median([r["widthPx"] for r in rr])), 3) if rr else None,
                                             "contrast": round(float(np.median([r["contrast"] for r in rr])), 2) if rr else None})
                     (edge_meas(im, R0, t0, p0, sa, pa, pola)))
    fmm_c = float(np.median([r["mmPerPx"] for r in refa + refb]))
    A = np.array([[pa @ da, pa @ db], [pb @ da, pb @ db]])   # rows: perp directions expressed in (da, db) basis
    obs_c = []
    for name in train:
        o = view_ok(name, Ea, nc)
        if not o or not o["independentExposure"]:
            continue
        R, t, c = poses[name]
        img = cv2.imread(f"{GOLD}/dataset/images/{name}", cv2.IMREAD_GRAYSCALE).astype(np.float32)
        ra = edge_meas(img, R, t, cams[c], sa, pa, pola); rb = edge_meas(img, R, t, cams[c], sb, pb, polb)
        if len(ra) < 4 or len(rb) < 4:
            continue
        mm = float(np.median([r["mmPerPx"] for r in ra + rb]))
        if mm > 2 * fmm_c:
            continue
        xa = float(np.median([r["resMm"] for r in ra])); xb = float(np.median([r["resMm"] for r in rb]))
        # in-plane 2D displacement r = alpha*da + beta*db with pa.r = xa, pb.r = xb
        alpha, beta = np.linalg.solve(A, [xa, xb])
        rvec = alpha * da + beta * db
        o.update({"mmPerPx": round(mm, 3), "crossEdgeA_Mm": round(xa, 3), "crossEdgeB_Mm": round(xb, 3),
                  "alongEdgeA_Mm": round(float(rvec @ da), 3), "alongEdgeB_Mm": round(float(rvec @ db), 3),
                  "residual2DMm": round(float(np.linalg.norm(rvec)), 3),
                  "edgeWidthPxA": round(float(np.median([r["widthPx"] for r in ra])), 3),
                  "contrastA": round(float(np.median([r["contrast"] for r in ra])), 1)})
        obs_c.append(o)
    out["targets"]["tile_corner"] = {"kind": "planar corner (two surface edges)", "fixedEdgePxA": [exa, eya], "fixedEdgePxB": [exb, eyb],
                                     "angleBetweenEdgesDeg": round(math.degrees(math.acos(abs(float(da @ db)))), 1),
                                     "fixedMmPerPx": round(fmm_c, 3), "lineageAtFixedView": fida,
                                     "usableIndependentObservations": len(obs_c),
                                     "crossEdgeResidualMm": summarize([o["crossEdgeA_Mm"] for o in obs_c] + [o["crossEdgeB_Mm"] for o in obs_c]),
                                     "alongEdgeResidualMm": summarize([o["alongEdgeA_Mm"] for o in obs_c] + [o["alongEdgeB_Mm"] for o in obs_c]),
                                     "residual2DMm": summarize([o["residual2DMm"] for o in obs_c]),
                                     "crossEdgeResidualFixedPx": summarize([x / fmm_c for o in obs_c for x in (o["crossEdgeA_Mm"], o["crossEdgeB_Mm"])]),
                                     "observations": obs_c, "E": Ea.tolist(), "dirA": da.tolist(), "dirB": db.tolist(), "n": nc.tolist(),
                                     "pxLen": la}
    _carpet(out, spl, poses, cams, train, exposure, fx_new, R0, t0, p0, C0, stages, src, view_ok)
    good = [o for o in out['targets']['carpet']['observations'] if o['nccMidAtBestShift'] >= 0.5]
    # ---------------- cause attribution helpers (per target: lens means, radius correlation)
    def attrib(obs, key):
        if len(obs) < 4:
            return None
        v = np.array([o[key] for o in obs]); r = np.array([o["imageRadiusPx"] for o in obs])
        from scipy.stats import spearmanr
        lens = {}
        for L in ("camera1", "camera2"):
            s = [o[key] for o in obs if o["lens"] == L]
            if s:
                lens[L] = {"n": len(s), "median": round(float(np.median(s)), 3)}
        rho = spearmanr(r, np.abs(v - np.median(v))).correlation
        return {"perLens": lens, "spearmanAbsResidualVsImageRadius": round(float(rho), 3) if rho == rho else None}
    out["attribution"] = {"baseboard": attrib(obs, "crossEdgeResidualMm"),
                          "tile_corner": attrib(obs_c, "residual2DMm"),
                          "carpet": attrib(good, "shiftMm")}
    return out


def sheets(res: dict) -> dict:
    """Validation sheets on the rectified surface grid (baseboard: edge along x; tile corner: both edges; carpet)."""
    import cv2
    man, cams, poses = _setup()
    fx_new = res["fixedView"]; outs = {}
    for tn, t in res["targets"].items():
        if tn == "carpet":
            P = np.array(t["P"]); n = np.array(t["n"]); step = t["step"]
            e1 = np.cross(n, [0, 0, 1.0]); e1 /= np.linalg.norm(e1); e2 = np.cross(n, e1)
            names = [fx_new] + [o["view"] for o in t["observations"][:11]]
        elif tn == "baseboard":
            P = np.array(t["E"]); e1 = np.array(t["dir"]); e2 = np.array(t["perp"]); step = t["pxLen"]
            names = [fx_new] + [o["view"] for o in t["observations"][:11]]
        else:
            P = np.array(t["E"]); e1 = np.array(t["dirA"]); e2 = np.cross(np.array(t["n"]), e1); step = t["pxLen"]
            names = [fx_new] + [o["view"] for o in t["observations"][:11]]
        gi = (np.arange(96) - 48 + 0.5) * step
        GXX = P + gi[None, :, None] * e1 + gi[:, None, None] * e2
        tiles = []
        for name in names:
            R, tt, c = poses[name]
            uv, _, _ = project(GXX, R, tt, cams[c])
            im = cv2.imread(f"{GOLD}/dataset/images/{name}")
            pch = cv2.resize(cv2.remap(im, uv[..., 0].astype(np.float32), uv[..., 1].astype(np.float32), cv2.INTER_LINEAR),
                             (288, 288), interpolation=cv2.INTER_NEAREST)
            cv2.line(pch, (0, 144), (287, 144), (0, 255, 0), 1); cv2.line(pch, (144, 0), (144, 287), (0, 255, 0), 1)
            cv2.putText(pch, name.replace("_train.png", "").replace("_fixedeval.png", " FIXED"), (3, 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 255, 255), 1)
            tiles.append(pch)
        while len(tiles) % 4:
            tiles.append(np.zeros_like(tiles[0]))
        ok, jpg = cv2.imencode(".jpg", np.vstack([np.hstack(tiles[i:i + 4]) for i in range(0, len(tiles), 4)]),
                               [cv2.IMWRITE_JPEG_QUALITY, 90])
        outs[tn] = jpg.tobytes()
    return outs


def _carpet(out, spl, poses, cams, train, exposure, fx_new, R0, t0, p0, C0, stages, src, view_ok):
    import cv2
    def summarize(vals):
        v = np.asarray(vals, float)
        if not len(v):
            return None
        dev = np.abs(v - np.median(v))
        return {"n": int(len(v)), "centre": round(float(np.median(v)), 3), "median": round(float(np.median(dev)), 3),
                "p90": round(float(np.percentile(dev, 90)), 3), "max": round(float(dev.max()), 3)}
    u, v = TARGETS["carpet"]["px"]
    Pt = np.array(TARGETS["carpet"]["P"]); nt = spl.normal(Pt, k=100); nt = nt if nt @ (C0 - Pt) > 0 else -nt
    e1 = np.cross(nt, [0, 0, 1.0]); e1 /= np.linalg.norm(e1); e2 = np.cross(nt, e1)
    eps = 1e-3
    uva, _, _ = project(np.stack([Pt, Pt + eps * e1, Pt + eps * e2]), R0, t0, p0)
    step = eps / max(np.linalg.norm(uva[1] - uva[0]), np.linalg.norm(uva[2] - uva[0]))
    G = 64; gi = (np.arange(G) - G / 2 + 0.5) * step
    GXt = Pt + gi[None, :, None] * e1 + gi[:, None, None] * e2
    uv0, _, _ = project(GXt, R0, t0, p0)
    rs = lambda im: cv2.remap(im, uv0[..., 0].astype(np.float32), uv0[..., 1].astype(np.float32), cv2.INTER_LINEAR)
    ref_patch = rs(src)

    def ncc(a, b):
        a = a - a.mean(); b = b - b.mean(); return float((a * b).sum() / (math.sqrt((a * a).sum() * (b * b).sum()) + 1e-9))

    def shift2d(a, b, m=4):
        best, bs = -2, (0, 0)
        for dy in range(-m, m + 1):
            for dx in range(-m, m + 1):
                x = a[m:-m, m:-m]; y = b[m + dy:G - m + dy, m + dx:G - m + dx]
                c = ncc(x, y)
                if c > best:
                    best, bs = c, (dx, dy)
        return best, bs
    tex_fid = {}
    for s, im in stages.items():
        p = rs(im)
        tex_fid[s] = {"nccMidVsSource": round(ncc(_band(p, 1.0, 3.0), _band(ref_patch, 1.0, 3.0)), 3),
                      "nccFineVsSource": round(ncc(_band(p, 0, 1.2), _band(ref_patch, 0, 1.2)), 3),
                      "fineBandStdRatio": round(float(_band(p, 0, 1.2).std() / max(_band(ref_patch, 0, 1.2).std(), 1e-6)), 3),
                      "midBandStdRatio": round(float(_band(p, 1.0, 3.0).std() / max(_band(ref_patch, 1.0, 3.0).std(), 1e-6)), 3)}
    obs_t = []
    for name in train:
        o = view_ok(name, Pt, nt)
        if not o or not o["independentExposure"]:
            continue
        R, t, c = poses[name]
        uv, _, _ = project(GXt, R, t, cams[c])
        dens = float(np.median(np.linalg.norm(np.diff(uv, axis=1), axis=-1)))
        if dens < 0.6:
            continue
        img = cv2.imread(f"{GOLD}/dataset/images/{name}", cv2.IMREAD_GRAYSCALE).astype(np.float32)
        patch = cv2.remap(img, uv[..., 0].astype(np.float32), uv[..., 1].astype(np.float32), cv2.INTER_LINEAR)
        cm, (sx, sy) = shift2d(_band(patch, 1.0, 3.0), _band(ref_patch, 1.0, 3.0))
        cf = shift2d(_band(patch, 0, 1.2), _band(ref_patch, 0, 1.2))[0]
        o.update({"pxPerGridStep": round(dens, 2), "nccMidAtBestShift": round(cm, 3), "nccFineAtBestShift": round(cf, 3),
                  "shiftGridSteps": [sx, sy], "shiftMm": round(float(math.hypot(sx, sy) * step * UNIT_MM), 2)})
        obs_t.append(o)
    good = [o for o in obs_t if o["nccMidAtBestShift"] >= 0.5]
    out["targets"]["carpet"] = {"kind": "surface texture patch 64x64 (fixed-view px grid)", "gridStepMm": round(step * UNIT_MM, 3),
                                "lineageAtFixedView": tex_fid, "alignedObservations": len(obs_t),
                                "repeatableObservationsMid05": len(good),
                                "repeatableObservationsFine03": sum(o["nccFineAtBestShift"] >= 0.3 for o in good),
                                "residual2DMmAmongRepeatable": summarize([o["shiftMm"] for o in good]),
                                "observations": sorted(obs_t, key=lambda o: -o["nccMidAtBestShift"])[:14],
                                "P": Pt.tolist(), "n": nt.tolist(), "step": step}
    return out
