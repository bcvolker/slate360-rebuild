"""READ-ONLY Room 213 camera-consistency landmarks on the GOLDEN solve (FullCircle COLMAP 3.12.6 sparse/0).
Independent landmark localisation in the native 3840^2 fisheye frames: NCC rotation/scale search seeded ONLY by the
point's own SIFT coordinate neighbourhood (+/-80 px), ECC affine refinement, template-size bootstrap for uncertainty.
No camera prediction is used to find a match. Nothing on the volume is modified except the new output folder.
Usage: python -m modal run cam_landmarks.py
"""
import modal

app = modal.App("room213-cam-landmarks")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = (modal.Image.debian_slim(python_version="3.10")
         .pip_install("pycolmap==4.2.0", "numpy", "opencv-python-headless", "scipy")
         .add_local_file("geom.json", "/root/geom.json").add_local_file("pts_uvh.npy", "/root/pts_uvh.npy"))

ROOT = "/vol/room213/2026-09-21/fullcircle/data/room213"
OUT = "/vol/room213/2026-09-28/camera_guidance"
SEARCH = 80; MIN_NCC = 0.6; MIN_GAP = 0.12; MAX_UNC = 1.0; MIN_BASE = 0.25; N_PER_CLASS = 36; N_TESTS = 6
ROTS = list(range(-30, 31, 6)); SCALES = (0.8, 0.9, 1.0, 1.12, 1.25)
WALLS = {"u_lo": -5.3, "v_hi": 4.4, "v_lo": -3.9}


def klass(u, v, h):
    near_wall = (abs(u - WALLS["u_lo"]) < 0.2) or (abs(v - WALLS["v_hi"]) < 0.2) or (abs(v - WALLS["v_lo"]) < 0.2)
    if -1.97 <= h <= -1.82 and not near_wall: return "carpet"
    if 0.52 <= h <= 0.72: return "ceiling"
    if near_wall and -1.85 <= h <= -1.5: return "wall_baseboard"
    if not near_wall and -1.32 <= h <= -1.18: return "table"
    if not near_wall and -1.15 <= h <= -0.9: return "chair"
    return None


@app.function(image=image, volumes={"/vol": vol}, timeout=3600, cpu=16.0, memory=65536)
def run() -> dict:
    import json, math, re, collections, numpy as np, cv2, pycolmap
    from pathlib import Path
    from concurrent.futures import ThreadPoolExecutor
    out = Path(OUT); out.mkdir(parents=True, exist_ok=True)
    rec = pycolmap.Reconstruction(f"{ROOT}/sparse/0")
    uvh = np.load("/root/pts_uvh.npy"); cls = {int(p): klass(u, v, h) for p, u, v, h in uvh}
    loc = {int(p): (float(u), float(v), float(h)) for p, u, v, h in uvh}
    names = {iid: im.name for iid, im in rec.images.items()}
    expo = {iid: int(re.search(r"frame_(\d+)", n)[1]) for iid, n in names.items()}
    lens = {iid: int(n[6]) for iid, n in names.items()}
    Cw = {}
    for iid, im in rec.images.items():
        cfw = im.cam_from_world(); Cw[iid] = -np.asarray(cfw.rotation.matrix()).T @ np.asarray(cfw.translation)
    def load(iid):
        g = cv2.imread(f"{ROOT}/images/{names[iid]}", cv2.IMREAD_GRAYSCALE)
        mp = Path(f"{ROOT}/masks-colmap/{names[iid]}.png"); mp2 = Path(f"{ROOT}/masks-colmap/{names[iid]}")
        m = cv2.imread(str(mp if mp.exists() else mp2), 0) if (mp.exists() or mp2.exists()) else None
        return iid, g, m
    with ThreadPoolExecutor(16) as ex:
        loaded = list(ex.map(load, list(rec.images)))
    gray = {i: g for i, g, _ in loaded}; mask = {i: m for i, _, m in loaded}
    mask_info = {"with_mask": sum(m is not None for m in mask.values()),
                 "sample_values": (np.unique(next(m for m in mask.values() if m is not None)).tolist()[:10] if any(m is not None for m in mask.values()) else None)}
    def srad(xy): return float(math.hypot(xy[0] - 1920, xy[1] - 1920))
    def crop(img, x, y, h):
        x0, y0 = int(round(x)) - h, int(round(y)) - h
        if x0 < 0 or y0 < 0 or x0 + 2 * h > img.shape[1] or y0 + 2 * h > img.shape[0]: return None, None
        return img[y0:y0 + 2 * h, x0:x0 + 2 * h], (x0, y0)
    def keep(iid, xy):
        m = mask[iid]
        if m is None: return True
        x0, y0 = int(xy[0]), int(xy[1])
        win = m[max(0, y0 - 50):y0 + 51, max(0, x0 - 50):x0 + 51]
        return win.size > 0 and win.min() > 0
    # ---- candidates: one observation per exposure (smallest sensor radius), >= 5 exposures, physically distinct
    cands = collections.defaultdict(list)
    for pid, p in rec.points3D.items():
        c = cls.get(pid)
        if c is None: continue
        per = {}
        for el in p.track.elements:
            iid = el.image_id; xy = np.asarray(rec.images[iid].points2D[el.point2D_idx].xy)
            if not keep(iid, xy): continue
            e = expo[iid]
            if e not in per or srad(xy) < per[e][2]: per[e] = (iid, xy, srad(xy))
        if len(per) < 5: continue
        obs = sorted(per.values(), key=lambda o: o[2]); ref = obs[0]; chosen = []; pool = obs[1:]
        while pool and len(chosen) < N_TESTS:
            best = max(pool, key=lambda o: min(np.linalg.norm(Cw[o[0]] - Cw[j[0]]) for j in chosen + [ref])); pool.remove(best)
            if all(np.linalg.norm(Cw[best[0]] - Cw[j[0]]) >= MIN_BASE for j in chosen + [ref]): chosen.append(best)
        if len(chosen) < 4: continue
        cands[c].append({"pid": pid, "cls": c, "ref": ref, "tests": chosen})
    def screen(c):
        iid, xy, _ = c["ref"]; g = gray[iid]
        T, _ = crop(g, xy[0], xy[1], 32); W, _ = crop(g, xy[0], xy[1], 100)
        if T is None or W is None or T.std() < 8 or (T > 245).mean() > 0.2: return None   # texture; not a saturated light/window highlight
        res = cv2.matchTemplate(W, T, cv2.TM_CCOEFF_NORMED); y0, x0 = np.unravel_index(np.argmax(res), res.shape)
        r2 = res.copy(); r2[max(0, y0 - 8):y0 + 9, max(0, x0 - 8):x0 + 9] = -1; sec = float(r2.max())
        return None if sec >= 0.75 else {"gap": 1 - sec, "std": float(T.std())}
    rng = np.random.default_rng(213); sel = []
    for c, lst in cands.items():
        rng.shuffle(lst); taken = 0
        for cd in lst:
            s = screen(cd)
            if s: cd.update(s); sel.append(cd); taken += 1
            if taken >= N_PER_CLASS: break
    def measure(ref, tst, tpl):
        riid, rxy, _ = ref; tiid, txy, _ = tst
        big, _ = crop(gray[riid], rxy[0], rxy[1], tpl); W, off = crop(gray[tiid], txy[0], txy[1], SEARCH + tpl // 2)
        if big is None or W is None: return None
        best = None
        for rot in ROTS:
            for sc in SCALES:
                Mw = cv2.getRotationMatrix2D((tpl, tpl), rot, sc); Tw = cv2.warpAffine(big, Mw, (2 * tpl, 2 * tpl))
                T = Tw[tpl // 2:tpl // 2 + tpl, tpl // 2:tpl // 2 + tpl]
                res = cv2.matchTemplate(W, T, cv2.TM_CCOEFF_NORMED); y0, x0 = np.unravel_index(np.argmax(res), res.shape)
                if best is None or res[y0, x0] > best[0]: best = (float(res[y0, x0]), rot, sc, x0, y0, res, T)
        pk, rot, sc, x0, y0, res, T = best
        r2 = res.copy(); r2[max(0, y0 - 6):y0 + 7, max(0, x0 - 6):x0 + 7] = -1; sec = float(r2.max())
        if pk < MIN_NCC or pk - sec < MIN_GAP: return {"ok": False, "why": "ncc"}
        warp = np.array([[1, 0, x0], [0, 1, y0]], np.float32)
        try:
            _, warp = cv2.findTransformECC(T.astype(np.float32), W.astype(np.float32), warp, cv2.MOTION_AFFINE,
                                           (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 80, 1e-5), None, 5)
        except cv2.error:
            return {"ok": False, "why": "ecc"}
        a, b, cc, dd = map(float, (warp[0, 0], warp[0, 1], warp[1, 0], warp[1, 1]))
        sx = math.hypot(a, cc); th = math.atan2(cc, a); sh = b * math.cos(th) + dd * math.sin(th); sy = dd * math.cos(th) - b * math.sin(th)
        if sx < 1e-6 or sy < 1e-6: return {"ok": False, "why": "degenerate"}
        tot = sc * math.sqrt(abs(sx * sy))
        if not (0.65 <= tot <= 1.55) or abs(sh / sy) > 0.3 or not (0.7 <= sy / sx <= 1.4) or abs(rot + math.degrees(th)) > 42:
            return {"ok": False, "why": "deformation"}
        m = warp @ np.array([tpl / 2, tpl / 2, 1.0])
        return {"ok": True, "xy": (float(m[0] + off[0]), float(m[1] + off[1])), "ncc": pk}
    def measure_boot(ref, tst):
        r = [measure(ref, tst, t) for t in (48, 64, 80)]; good = [x for x in r if x and x.get("ok")]
        if len(good) < 2: return {"ok": False, "why": ",".join(str((x or {}).get("why", "crop" if x is None else "ok")) for x in r)}
        xs = np.array([x["xy"] for x in good]); unc = float(np.max(xs.std(0)) + 0.3)
        return {"ok": unc <= MAX_UNC, "why": None if unc <= MAX_UNC else "uncertainty", "xy": xs.mean(0).tolist(), "unc": unc,
                "ncc": float(np.mean([x["ncc"] for x in good]))}
    def do(cd):
        ms = [{"image_id": int(t[0]), "sift_xy": t[1].tolist(), **measure_boot(cd["ref"], t)} for t in cd["tests"]]
        return {"pid": int(cd["pid"]), "cls": cd["cls"], "uvh": loc[cd["pid"]], "ref": {"image_id": int(cd["ref"][0]), "xy": cd["ref"][1].tolist()},
                "gap": cd["gap"], "measurements": ms}
    with ThreadPoolExecutor(16) as ex:
        res = list(ex.map(do, sel))
    # crops for the correspondence sheet (colour, 1:1, 96 px half-size) of every accepted measurement + ref
    need = collections.defaultdict(list)
    for li, L in enumerate(res):
        need[L["ref"]["image_id"]].append((li, -1, L["ref"]["xy"]))
        for mi, m in enumerate(L["measurements"]):
            if m.get("ok"): need[m["image_id"]].append((li, mi, m["xy"]))
    crops = {}
    for iid, lst in need.items():
        im = cv2.imread(f"{ROOT}/images/{names[iid]}")
        for li, mi, xy in lst:
            c, off = crop(im, xy[0], xy[1], 48)
            if c is not None: crops[f"{li}_{mi}"] = c; res[li].setdefault("crop_off", {})[str(mi)] = off
    np.savez_compressed(out / "landmark_crops.npz", **crops)
    summary = {"mask_info": mask_info, "candidates": {k: len(v) for k, v in cands.items()},
               "selected": dict(collections.Counter(L["cls"] for L in res)),
               "accepted_measurements": dict(collections.Counter(L["cls"] for L in res for m in L["measurements"] if m.get("ok"))),
               "reject_reasons": dict(collections.Counter(m.get("why") for L in res for m in L["measurements"] if not m.get("ok")))}
    json.dump({"summary": summary, "landmarks": res, "names": {str(k): v for k, v in names.items()}}, open(out / "landmarks.json", "w"))
    vol.commit()
    return summary


@app.local_entrypoint()
def main():
    import json; print(json.dumps(run.remote(), indent=1))
