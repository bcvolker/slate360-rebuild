"""Frozen-target source audit (read-only). Is the fine structure of each predefined Room 213 target REPEATABLE across
independent, correctly aligned source observations?

Alignment is geometric, never by image similarity: each anchor is a 3D surface point (fixed-view ray x the 1M model's
composited surface depth); a local plane (PCA of nearby opaque splats) carries a 64x64 sampling grid spaced so the
fixed view samples it at ~1 px; that grid is projected through every training camera's own fisheye model and the
source pixels are bilinearly resampled onto it. Views are kept only if the grid is in frame and in mask, the anchor is
not occluded (anchor depth vs the view's composited surface depth), incidence <= 70 deg and sampling density >= 0.7x
the fixed view. Band-pass NCC to the fixed view (+-2 px search absorbs ~1 px pose error), sharpness, contrast."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

GOLD = "/vol/room213/2026-09-21/spirula_bench_v1"
TARGETS_720 = {"chair_slats": (360, 420, 560, 540), "table_edges": (380, 450, 580, 560),
               "window_frames": (140, 350, 440, 470), "carpet": (60, 520, 250, 640), "ceiling": (200, 60, 560, 300)}
G = 64


def _qR(q):
    from scipy.spatial.transform import Rotation as Rot
    return Rot.from_quat([q[1], q[2], q[3], q[0]]).as_matrix()


def project(Xw, R, t, p):
    Xc = Xw @ R.T + t
    fx, fy, cx, cy, k1, k2, k3, k4 = p
    x, y, z = Xc[..., 0], Xc[..., 1], Xc[..., 2]
    r = np.hypot(x, y); th = np.arctan2(r, z)
    thd = th * (1 + k1 * th ** 2 + k2 * th ** 4 + k3 * th ** 6 + k4 * th ** 8)
    s = np.where(r > 1e-12, thd / np.maximum(r, 1e-12), 0.0)
    return np.stack([fx * x * s + cx, fy * y * s + cy], -1), th, np.linalg.norm(Xc, axis=-1)


def unproject(u, v, p):
    fx, fy, cx, cy, k1, k2, k3, k4 = p
    mx, my = (u - cx) / fx, (v - cy) / fy; thd = math.hypot(mx, my); th = thd
    for _ in range(30):
        f = th * (1 + k1 * th ** 2 + k2 * th ** 4 + k3 * th ** 6 + k4 * th ** 8) - thd
        df = 1 + 3 * k1 * th ** 2 + 5 * k2 * th ** 4 + 7 * k3 * th ** 6 + 9 * k4 * th ** 8
        th -= f / df
    s = math.sin(th) / thd if thd > 1e-12 else 0.0
    return np.array([mx * s, my * s, math.cos(th)])


class Splats:
    def __init__(self, ply):
        raw = Path(ply).read_bytes(); end = raw.find(b"end_header\n") + 11
        hdr = raw[:end].decode().splitlines(); n = int([l for l in hdr if l.startswith("element vertex")][0].split()[-1])
        names = [l.split()[-1] for l in hdr if l.startswith("property")]
        a = np.frombuffer(raw[end:], "<f4").reshape(n, len(names))
        self.X = a[:, :3].astype(np.float64)
        self.op = 1 / (1 + np.exp(-a[:, names.index("opacity")].astype(np.float64)))
        self.opaque = self.X[self.op > 0.3]
        from scipy.spatial import cKDTree
        self.tree = cKDTree(self.opaque)

    def surface_depth(self, R, t, p, uv0, rad=4.0):
        """Front-to-back alpha of splat CENTRES projecting within `rad` px of uv0; depth where alpha crosses 0.5."""
        uv, th, d = self._proj_cache(R, t, p)
        m = (np.abs(uv[:, 0] - uv0[0]) < rad) & (np.abs(uv[:, 1] - uv0[1]) < rad) & (th < math.radians(100))
        idx = np.nonzero(m)[0]
        if len(idx) == 0:
            return None
        o = np.argsort(d[idx]); T = 1.0
        for i in idx[o]:
            T *= (1 - self.op[i])
            if T < 0.5:
                return float(d[i])
        return float(d[idx[o[-1]]])

    _cache = {}

    def _proj_cache(self, R, t, p):
        key = (tuple(np.round(t, 6)), tuple(np.round(R.ravel(), 6)))
        if key not in self._cache:
            self._cache.clear()
            self._cache[key] = project(self.X, R, t, p)
        return self._cache[key]

    def normal(self, P, k=200):
        _, ii = self.tree.query(P, k=k)
        Q = self.opaque[ii] - self.opaque[ii].mean(0)
        return np.linalg.svd(Q, full_matrices=False)[2][-1]


def _band(g, a, b):
    import cv2
    return (cv2.GaussianBlur(g, (0, 0), a) if a else g) - cv2.GaussianBlur(g, (0, 0), b)


def _ncc_shift(a, b, m=2):
    best = -1.0
    for dy in range(-m, m + 1):
        for dx in range(-m, m + 1):
            A = a[m:-m, m:-m]; B = b[m + dy:b.shape[0] - m + dy, m + dx:b.shape[1] - m + dx]
            A = A - A.mean(); B = B - B.mean()
            best = max(best, float((A * B).sum() / (math.sqrt((A * A).sum() * (B * B).sum()) + 1e-9)))
    return best


def audit() -> dict:
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
    src_of = {m["new"]: m["src"] for m in man["images"]}
    fx_new = man["fixed_eval"]["camera2/frame_00103.png"]
    R0, t0, c0 = poses[fx_new]; p0 = cams[c0]; C0 = -R0.T @ t0
    img0 = cv2.imread(f"{GOLD}/dataset/images/{fx_new}")
    spl = Splats(f"{GOLD}/runs/room213_spirula_full/step-000030000.ckpt/splat.ply")
    train = [n for n in poses if role.get(n) == "train"]
    exposure = {n: n.split("/")[1].split("_")[1] for n in poses}          # frame index = physical exposure
    sc = 3840 / 720.0
    out = {"fixedView": fx_new, "gridSize": G, "targets": {}}
    for tn, b in TARGETS_720.items():
        x0, y0, x1, y1 = (v * sc for v in b)
        anchors = []
        for fy in (0.3, 0.5, 0.7):
            for fxr in (0.3, 0.5, 0.7):
                u, v = x0 + fxr * (x1 - x0), y0 + fy * (y1 - y0)
                ray_c = unproject(u, v, p0); ray_w = R0.T @ ray_c
                d = spl.surface_depth(R0, t0, p0, (u, v))
                if d is None:
                    continue
                P = C0 + ray_w * d
                n = spl.normal(P)
                if n @ (C0 - P) < 0:
                    n = -n
                e1 = np.cross(n, [0, 0, 1.0]); e1 = e1 / (np.linalg.norm(e1) + 1e-12)
                if np.linalg.norm(np.cross(n, [0, 0, 1.0])) < 1e-3:
                    e1 = np.cross(n, [0, 1.0, 0]); e1 /= np.linalg.norm(e1)
                e2 = np.cross(n, e1)
                # spacing so the fixed view samples one grid step per pixel
                eps = 1e-3 * d
                uva, _, _ = project(np.stack([P, P + eps * e1, P + eps * e2]), R0, t0, p0)
                step = eps / max(np.linalg.norm(uva[1] - uva[0]), np.linalg.norm(uva[2] - uva[0]))
                gi = (np.arange(G) - G / 2 + 0.5) * step
                GX = P + gi[None, :, None] * e1 + gi[:, None, None] * e2      # [G,G,3]
                anchors.append({"uv": [round(u, 1), round(v, 1)], "P": P, "n": n, "GX": GX, "step": step, "depth": d})
        tres = {"anchors": len(anchors), "perAnchor": []}
        for a in anchors:
            uv0, _, _ = project(a["GX"], R0, t0, p0)
            ref = cv2.remap(cv2.cvtColor(img0, cv2.COLOR_BGR2GRAY).astype(np.float32), uv0[..., 0].astype(np.float32),
                            uv0[..., 1].astype(np.float32), cv2.INTER_LINEAR)
            obs = []
            for name in train:
                R, t, c = poses[name]; p = cams[c]; C = -R.T @ t
                uv, th, dd = project(a["GX"], R, t, p)
                if th.max() > math.radians(95) or uv.min() < 2 or uv.max() > 3837:
                    continue
                mk = cv2.imread(f"{GOLD}/dataset/masks/{name}", 0)
                if mk[int(uv[G // 2, G // 2, 1]), int(uv[G // 2, G // 2, 0])] < 128:
                    continue
                v = C - a["P"]; inc = math.degrees(math.acos(abs(float(a["n"] @ v)) / np.linalg.norm(v)))
                if inc > 70:
                    continue
                dens = float(np.median(np.linalg.norm(np.diff(uv, axis=1), axis=-1)))   # px per grid step
                if dens < 0.7:
                    continue
                cu = uv[G // 2, G // 2]
                sd = spl.surface_depth(R, t, p, cu)
                ad = float(np.linalg.norm(a["P"] @ R.T + t))
                if sd is None or ad > sd * 1.04 + 0.01:
                    continue                                             # occluded
                im = cv2.imread(f"{GOLD}/dataset/images/{name}", cv2.IMREAD_GRAYSCALE).astype(np.float32)
                patch = cv2.remap(im, uv[..., 0].astype(np.float32), uv[..., 1].astype(np.float32), cv2.INTER_LINEAR)
                indep = exposure[name] != exposure[fx_new]
                gradE = lambda g: float(np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0, 3), cv2.Sobel(g, cv2.CV_32F, 0, 1, 3)).mean())
                obs.append({"view": name, "independentExposure": indep, "incidenceDeg": round(inc, 1),
                            "pxPerStep": round(dens, 2), "nccMid": round(_ncc_shift(_band(patch, 1.0, 3.0), _band(ref, 1.0, 3.0)), 3),
                            "nccFine": round(_ncc_shift(_band(patch, 0, 1.2), _band(ref, 0, 1.2)), 3),
                            "sharpnessVsFixed": round(gradE(patch) / max(gradE(ref), 1e-6), 3),
                            "contrast": round(float(patch.std()), 2)})
            ind = [o for o in obs if o["independentExposure"]]
            rep = [o for o in ind if o["nccMid"] >= 0.5]
            tres["perAnchor"].append({"uv": a["uv"], "depth": round(a["depth"], 3), "gridStepUnits": float(a["step"]),
                                      "P": a["P"].round(5).tolist(), "n": a["n"].round(4).tolist(),
                                      "alignedObservations": len(obs), "independent": len(ind),
                                      "repeatableMid05": len(rep), "repeatableFine03": sum(o["nccFine"] >= 0.3 for o in ind),
                                      "medianNccMid": round(float(np.median([o["nccMid"] for o in ind])), 3) if ind else None,
                                      "medianNccFine": round(float(np.median([o["nccFine"] for o in ind])), 3) if ind else None,
                                      "bestObservations": sorted(ind, key=lambda o: -o["nccMid"])[:6]})
        pa = tres["perAnchor"]
        tres["anchorsWith3RepeatableMid"] = sum(x["repeatableMid05"] >= 3 for x in pa)
        tres["anchorsWith3RepeatableFine"] = sum(x["repeatableFine03"] >= 3 for x in pa)
        tres["repeatable"] = tres["anchorsWith3RepeatableMid"] >= max(3, len(pa) // 2)
        out["targets"][tn] = tres
    return out


FROZEN = {"chair_slats": [2, 5], "table_edges": [4, 8], "window_frames": [2, 3], "carpet": [0, 2, 3, 4, 5]}


def target_views(audit_res: dict) -> dict:
    """Pinhole target views (1280x720) from REAL source-camera centres looking at each frozen anchor, f=640
    (walkthrough scale) and f=1280 (2x), plus the source rectified into exactly that view (same centre, the camera's
    own fisheye model; no parallax). Spark renders the exported PLY at the same poses."""
    import base64
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
    fixed = audit_res["fixedView"]
    W, H = 1280, 720
    views, frozen = [], {}
    for tn, idxs in FROZEN.items():
        frozen[tn] = []
        for ai in idxs:
            a = audit_res["targets"][tn]["perAnchor"][ai]
            P = np.array(a["P"])
            best = a["bestObservations"][0]["view"] if a["bestObservations"] else None
            frozen[tn].append({"anchor": ai, "uv": a["uv"], "P": a["P"], "bestIndependentView": best})
            for which, vname in (("fixed", fixed), ("indep", best)):
                if vname is None:
                    continue
                R, t, c = poses[vname]; C = -R.T @ t
                z = P - C; z /= np.linalg.norm(z)
                down = R.T @ np.array([0.0, 1.0, 0.0])
                x = np.cross(down, z); x /= np.linalg.norm(x); y = np.cross(z, x)
                Rc2w = np.stack([x, y, z], 1)
                img = cv2.imread(f"{GOLD}/dataset/images/{vname}")
                for f in (640, 1280):
                    uu, vv = np.meshgrid(np.arange(W) + 0.5, np.arange(H) + 0.5)
                    rays = np.stack([(uu - W / 2) / f, (vv - H / 2) / f, np.ones_like(uu)], -1) @ Rc2w.T   # world dirs
                    Xw = C + rays                                                                    # 1 unit along ray
                    uv, th, _ = project(Xw, R, t, cams[c])
                    rect = cv2.remap(img, uv[..., 0].astype(np.float32), uv[..., 1].astype(np.float32), cv2.INTER_LINEAR)
                    tag = f"{tn}_a{ai}_{which}_f{f}"
                    ok, png = cv2.imencode(".png", rect)
                    views.append({"tag": tag, "k": len(views), "c2w_R": Rc2w.tolist(), "C": C.tolist(), "f": f,
                                  "sourceView": vname, "target": tn, "anchor": ai,
                                  "rectifiedSourcePng": base64.b64encode(png.tobytes()).decode()})
    return {"frozen": frozen, "views": views}
