"""Held-out camera evaluation. Landmarks (independent measurements) split FIT / HELD-OUT per class BEFORE any fit.
Stage 'prep': write fit.json (FIT landmarks, triangulated through the golden cameras) for rig_ba.py.
Stage 'eval': leave-one-exposure-out on every landmark through BEFORE (golden) and AFTER (rig) cameras; report native-px
errors for HELD-OUT (decision) and FIT (overfit check), with residual classification."""
import json, math, re, sys, collections
import numpy as np
import pycolmap
from scipy.optimize import least_squares

LM = json.load(open("landmarks.json"))["landmarks"]
G = json.load(open("geom.json")); c0, up, a1, a2 = (np.array(G[k]) for k in ("c0", "up", "a1", "a2"))


def split(lms):
    fit, held = [], []
    for c in sorted({L["cls"] for L in lms}):
        grp = sorted([L for L in lms if L["cls"] == c], key=lambda L: L["pid"])
        for i, L in enumerate(grp):
            (fit if i % 2 == 0 else held).append(L)
    return fit, held


def usable(L):
    obs = [(L["ref"]["image_id"], L["ref"]["xy"], 0.3)] + [(m["image_id"], m["xy"], m["unc"]) for m in L["measurements"] if m.get("ok")]
    return obs if len(obs) >= 4 else None


class Cams:
    def __init__(self, path):
        self.rec = pycolmap.Reconstruction(path)
        self.P = {}
        for iid, im in self.rec.images.items():
            cfw = im.cam_from_world(); self.P[iid] = (np.asarray(cfw.rotation.matrix()), np.asarray(cfw.translation), self.rec.cameras[im.camera_id])

    def proj(self, iid, X):
        R, t, cam = self.P[iid]; Xc = R @ X + t
        if Xc[2] <= 0: return None
        return np.asarray(cam.img_from_cam(Xc.reshape(1, 3)))[0]

    def ray(self, iid, xy):
        R, t, cam = self.P[iid]; d = np.asarray(cam.cam_from_img(np.array([xy], float)))[0]; d = np.array([d[0], d[1], 1.0])
        d /= np.linalg.norm(d); return R.T @ d, -R.T @ t

    def tri(self, obs):
        A = np.zeros((3, 3)); b = np.zeros(3)
        for iid, xy, _ in obs:
            d, c = self.ray(iid, xy); P = np.eye(3) - np.outer(d, d); A += P; b += P @ c
        X0 = np.linalg.lstsq(A, b, rcond=None)[0]
        def res(X):
            out = []
            for iid, xy, _ in obs:
                p = self.proj(iid, X); out += list((p - xy) if p is not None else (1e3, 1e3))
            return np.array(out)
        r = least_squares(res, X0, method="lm"); return r.x


def prep():
    fit, held = split(LM); out = []
    cams = Cams("fc_sparse")
    for L in fit:
        obs = usable(L)
        if obs: out.append({"pid": L["pid"], "obs": [{"image_id": i, "xy": xy} for i, xy, _ in obs], "X": cams.tri(obs).tolist()})
    json.dump(out, open("fit.json", "w")); print("FIT landmarks usable:", len(out), "of", len(fit), "| HELD:", sum(1 for L in held if usable(L)), "of", len(held))


def motion(cams):
    by = collections.defaultdict(dict)
    for iid, im in cams.rec.images.items():
        e = int(re.search(r"frame_(\d+)", im.name)[1]); R, t, _ = cams.P[iid]; by[e][int(im.name[6])] = (-R.T @ t, R)
    es = sorted(by); sp = {}; av = {}
    for i, e in enumerate(es):
        nb = [x for x in (es[i - 1] if i else None, es[i + 1] if i + 1 < len(es) else None) if x is not None and abs(x - e) == 1]
        C, R = by[e][1]
        d = [np.linalg.norm(C - by[n][1][0]) for n in nb]; a = [np.degrees(np.arccos(np.clip((np.trace(R @ by[n][1][1].T) - 1) / 2, -1, 1))) for n in nb]
        sp[e] = float(np.mean(d)) if d else np.nan; av[e] = float(np.mean(a)) if a else np.nan
    return sp, av


def loo(cams, lms, names):
    sp, av = motion(cams); rows = []
    for L in lms:
        obs = usable(L)
        if not obs: continue
        for k in range(len(obs)):
            others = obs[:k] + obs[k + 1:]
            X = cams.tri(others); iid, xy, unc = obs[k]; p = cams.proj(iid, X)
            if p is None: continue
            d = p - np.array(xy); rv = np.array(xy) - 1920; rn = max(np.linalg.norm(rv), 1e-9); ur = rv / rn; ut = np.array([-ur[1], ur[0]])
            R, t, _ = cams.P[iid]; C = -R.T @ t; fwd = R.T @ np.array([0, 0, 1.0])
            e = int(re.search(r"frame_(\d+)", names[str(iid)])[1])
            rows.append({"pid": L["pid"], "cls": L["cls"], "iid": iid, "expo": e, "lens": int(names[str(iid)][6]), "err": float(np.linalg.norm(d)),
                         "dr": float(d @ ur), "dt": float(d @ ut), "dx": float(d[0]), "dy": float(d[1]), "radius": rn, "row": float(xy[1]), "unc": unc,
                         "speed": sp.get(e, np.nan), "angvel": av.get(e, np.nan), "yaw": float(math.degrees(math.atan2(fwd @ a2, fwd @ a1))),
                         "u": L["uvh"][0], "v": L["uvh"][1], "depth": float(np.linalg.norm(X - C)), "is_ref": k == 0})
    return rows


def agg(rows):
    if not rows: return {"n": 0}
    e = np.array([r["err"] for r in rows])
    return {"n": len(e), "median": round(float(np.median(e)), 3), "mean": round(float(e.mean()), 3), "p75": round(float(np.percentile(e, 75)), 3),
            "p95": round(float(np.percentile(e, 95)), 3), "frac_le_0.5": round(float((e <= 0.5).mean()), 3), "frac_le_1": round(float((e <= 1).mean()), 3),
            "mean_radial": round(float(np.mean([r["dr"] for r in rows])), 3), "mean_tangential": round(float(np.mean([r["dt"] for r in rows])), 3)}


def evaluate(after_dir):
    names = json.load(open("landmarks.json"))["names"]
    fit, held = split(LM)
    res = {}
    for tag, path in (("before", "fc_sparse"), ("after", after_dir)):
        cams = Cams(path)
        res[tag] = {"held": loo(cams, held, names), "fit": loo(cams, fit, names)}
    json.dump(res, open("loo_rows.json", "w"))
    out = {}
    for tag in ("before", "after"):
        H = res[tag]["held"]; F = res[tag]["fit"]
        o = {"HELD_overall": agg(H), "FIT_overall": agg(F)}
        for c in sorted({r["cls"] for r in H}): o[f"held_cls_{c}"] = agg([r for r in H if r["cls"] == c])
        for L_ in (1, 2): o[f"held_lens{L_}"] = agg([r for r in H if r["lens"] == L_])
        for lo, hi in ((0, 800), (800, 1300), (1300, 1700), (1700, 2000)): o[f"held_radius_{lo}_{hi}"] = agg([r for r in H if lo <= r["radius"] < hi])
        for lo, hi in ((0, 1280), (1280, 2560), (2560, 3840)): o[f"held_row_{lo}_{hi}"] = agg([r for r in H if lo <= r["row"] < hi])
        sp = np.array([r["speed"] for r in H]); ok = np.isfinite(sp)
        if ok.sum() > 10:
            med = np.nanmedian(sp); o["held_slow"] = agg([r for r in H if r["speed"] <= med]); o["held_fast"] = agg([r for r in H if r["speed"] > med])
            from scipy.stats import spearmanr
            o["spearman_err_speed"] = round(float(spearmanr([r["err"] for r in H if np.isfinite(r["speed"])], sp[ok]).correlation), 3)
            av = np.array([r["angvel"] for r in H]); ok2 = np.isfinite(av)
            o["spearman_err_angvel"] = round(float(spearmanr(np.array([r["err"] for r in H])[ok2], av[ok2]).correlation), 3)
        for q in range(4): o[f"held_yaw_q{q}"] = agg([r for r in H if -180 + 90 * q <= r["yaw"] < -90 + 90 * q])
        for nm, sel in (("room_u<0", lambda r: r["u"] < 0), ("room_u>=0", lambda r: r["u"] >= 0), ("room_v<0", lambda r: r["v"] < 0), ("room_v>=0", lambda r: r["v"] >= 0)):
            o[f"held_{nm}"] = agg([r for r in H if sel(r)])
        # per-image coherence: share of residual explained by a per-image mean displacement (pose-error signature)
        byimg = collections.defaultdict(list)
        for r in H: byimg[r["iid"]].append((r["dx"], r["dy"]))
        mv = [np.linalg.norm(np.mean(v, 0)) for v in byimg.values() if len(v) >= 3]; sd = [np.mean(np.linalg.norm(np.array(v) - np.mean(v, 0), axis=1)) for v in byimg.values() if len(v) >= 3]
        o["per_image_coherence"] = {"images_ge3": len(mv), "median_mean_disp": round(float(np.median(mv)), 3) if mv else None, "median_within_spread": round(float(np.median(sd)), 3) if sd else None}
        o["annotation_unc_median"] = round(float(np.median([r["unc"] for r in H if not r["is_ref"]])), 3)
        out[tag] = o
    json.dump(out, open("eval_summary.json", "w"), indent=1)
    b, a = out["before"]["HELD_overall"], out["after"]["HELD_overall"]
    print(json.dumps({"HELD before": b, "HELD after": a, "FIT before": out["before"]["FIT_overall"], "FIT after": out["after"]["FIT_overall"]}, indent=1))
    return out


if __name__ == "__main__":
    prep() if sys.argv[1] == "prep" else evaluate(sys.argv[2])
