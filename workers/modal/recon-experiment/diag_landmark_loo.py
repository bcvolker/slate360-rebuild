"""READ-ONLY: leave-one-view-out landmark validation of the frozen H1 rigid-rig cameras (Room 213, 2026-09-22).
Independent landmark localisation (NCC + ECC affine on the 2560 faces, seeded only by the old SIFT coordinate's
neighbourhood, never by H1's prediction), triangulation through the FROZEN H1 cameras from 3 physically distinct
exposures, prediction into a 4th held-out exposure, rotated over all 4. Nothing is modified.
Usage: modal run workers/modal/recon-experiment/diag_landmark_loo.py
"""
import modal

app = modal.App("room213-landmark-loo")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = (modal.Image.debian_slim(python_version="3.10").pip_install("pycolmap==4.2.0", "numpy", "opencv-python-headless", "scipy")
         .add_local_dir("workers/recon-experiment", remote_path="/root/recon-experiment"))

TPL = 64; SEARCH = 80; MIN_NCC = 0.5; MIN_UNIQ_GAP = 0.12; MAX_UNC = 1.5; MIN_BASE = 0.25; N_TARGET = 120
ROTS = list(range(-30, 31, 6)); SCALES = (0.8, 0.9, 1.0, 1.12, 1.25)   # viewpoint-tolerant template search (walking capture: heading/scale change between exposures)


@app.function(image=image, volumes={"/vol": vol}, timeout=3600, cpu=16.0, memory=48 * 1024)
def run() -> dict:
    import json, sys, math, collections, numpy as np, cv2, pycolmap
    from scipy.optimize import least_squares
    sys.path.insert(0, "/root/recon-experiment")
    import room213_raw_build as B, room213_map_fit as F
    OUT = B.OUT; LD = OUT / "landmark_loo"; LD.mkdir(exist_ok=True)
    rec = pycolmap.Reconstruction(str(F.V2)); meta = json.load(open(OUT / "faces.json")); by_face = {m["face"]: m for m in meta}
    lenses, calib = B.load_calib()
    A = F.collect_observations(rec, by_face)          # x,y,px,py,lens,face,image_id,pid,idx
    img_frame = {iid: im.frame_id for iid, im in rec.images.items()}
    img_name = {iid: im.name[6:-4] for iid, im in rec.images.items()}
    walk_of_img = {iid: by_face[n]["video"].split("_00_")[1].split(".insv")[0] for iid, n in img_name.items()}
    C = {fid: -np.asarray(f.rig_from_world.rotation.matrix()).T @ np.asarray(f.rig_from_world.translation) for fid, f in rec.frames.items()}
    cams = {}
    for iid, im in rec.images.items():
        cfw = im.cam_from_world(); cams[iid] = (np.asarray(cfw.rotation.matrix()), np.asarray(cfw.translation))
    FACE_NAMES = [n for n, _, _ in B.FACES]
    # sensor radius of every observation
    srad = np.zeros(len(A))
    for L in (0, 1):
        for fi, fn in enumerate(FACE_NAMES):
            mk = (A[:, 4] == L) & (A[:, 5] == fi)
            if mk.any():
                p, v = F.frame_pixels(A[mk, 0:2], fn, lenses[L]); cx, cy, _ = B.FRAME_CIRCLE[L]; srad[mk] = np.hypot(p[:, 0] - cx, p[:, 1] - cy)
    resid = np.hypot(A[:, 0] - A[:, 2], A[:, 1] - A[:, 3])
    # ---- group observations per point, one observation per physical exposure (smallest sensor radius)
    by_pid = collections.defaultdict(list)
    for k in range(len(A)):
        by_pid[int(A[k, 7])].append(k)
    face_cache = {}
    def face_gray(iid):
        n = img_name[iid]
        if n not in face_cache:
            if len(face_cache) > 400: face_cache.clear()
            face_cache[n] = cv2.imread(str(OUT / "faces" / f"{n}.png"), 0)
        return face_cache[n]
    def crop(img, x, y, h):
        x0, y0 = int(round(x)) - h, int(round(y)) - h
        if x0 < 0 or y0 < 0 or x0 + 2 * h > img.shape[1] or y0 + 2 * h > img.shape[0]: return None, None
        return img[y0:y0 + 2 * h, x0:x0 + 2 * h], (x0, y0)
    rng = np.random.default_rng(213)
    cands = []
    for pid, ks in by_pid.items():
        per_frame = {}
        for k in ks:
            fid = img_frame[int(A[k, 6])]
            if fid not in per_frame or srad[k] < srad[per_frame[fid]]: per_frame[fid] = k
        if len(per_frame) < 5: continue
        ks2 = sorted(per_frame.values(), key=lambda k: srad[k])
        ref = ks2[0]
        # choose 4 test exposures with translation spread, greedy farthest-point, prefer other walk
        chosen = []; pool = ks2[1:]
        fref = img_frame[int(A[ref, 6])]
        while pool and len(chosen) < 4:
            def score(k):
                fid = img_frame[int(A[k, 6])]; d = [np.linalg.norm(C[fid] - C[img_frame[int(A[j, 6])]]) for j in chosen + [ref]]
                return min(d) + (0.3 if walk_of_img[int(A[k, 6])] != walk_of_img[int(A[ref, 6])] else 0)
            best = max(pool, key=score); pool.remove(best)
            fid = img_frame[int(A[best, 6])]
            if all(np.linalg.norm(C[fid] - C[img_frame[int(A[j, 6])]]) >= MIN_BASE for j in chosen + [ref]): chosen.append(best)
        if len(chosen) < 4: continue
        cands.append({"pid": pid, "ref": ref, "tests": chosen, "max_resid": float(max(resid[k] for k in ks)), "ref_srad": float(srad[ref]),
                      "test_srad": [float(srad[k]) for k in chosen], "lens": int(A[ref, 4]),
                      "cross_walk": len({walk_of_img[int(A[k, 6])] for k in chosen + [ref]}) > 1})
    # ---- distinctiveness screening on the reference patch (texture + uniqueness within 200 px)
    def screen(c):
        k = c["ref"]; g = face_gray(int(A[k, 6]))
        if g is None: return None
        T, _ = crop(g, A[k, 0], A[k, 1], TPL // 2); W, off = crop(g, A[k, 0], A[k, 1], 100)
        if T is None or W is None or T.std() < 10: return None
        res = cv2.matchTemplate(W, T, cv2.TM_CCOEFF_NORMED); cyx = np.unravel_index(np.argmax(res), res.shape)
        res2 = res.copy(); y0, x0 = cyx; res2[max(0, y0 - 8):y0 + 9, max(0, x0 - 8):x0 + 9] = -1
        second = float(res2.max()); return {"uniqueness_gap": float(1.0 - second), "second_peak": second, "texture_std": float(T.std())}
    screened = []
    for c in cands:
        s = screen(c)
        if s and s["second_peak"] < 0.75: c.update(s); screened.append(c)
    # ---- stratified selection: disputed first, then radius/lens/cross-walk quotas
    def bin_of(r): return "central" if r < 800 else ("middle" if r < 1300 else ("peripheral" if r < 1700 else "extreme"))
    for c in screened: c["test_bins"] = [bin_of(r) for r in c["test_srad"]]
    sel = []; used = set()
    def take(pool, n):
        pool = sorted(pool, key=lambda c: -c["uniqueness_gap"])
        for c in pool:
            if len(sel) >= N_TARGET or n <= 0: break
            if c["pid"] in used: continue
            sel.append(c); used.add(c["pid"]); n -= 1
    take([c for c in screened if c["max_resid"] > 20], 20)
    take([c for c in screened if "extreme" in c["test_bins"]], 16)
    take([c for c in screened if "peripheral" in c["test_bins"]], 24)
    take([c for c in screened if "central" in c["test_bins"]], 20)
    take([c for c in screened if c["cross_walk"]], 12)
    take([c for c in screened if c["lens"] == 1], 16)
    take([c for c in screened if "middle" in c["test_bins"]], 8)
    take(screened, N_TARGET - len(sel))
    # ---- independent measurement of the landmark in each test exposure (NCC seed near OLD SIFT xy, ECC affine refine)
    def measure(c, k, tpl):
        gref = face_gray(int(A[c["ref"], 6])); g = face_gray(int(A[k, 6]))
        big, _ = crop(gref, A[c["ref"], 0], A[c["ref"], 1], tpl)           # 2x template area so rotated/scaled templates stay filled
        W, off = crop(g, A[k, 0], A[k, 1], SEARCH + tpl // 2)
        if big is None or W is None: return None
        best = None
        for rot in ROTS:
            for sc0 in SCALES:
                Mw = cv2.getRotationMatrix2D((tpl, tpl), rot, sc0); Tw = cv2.warpAffine(big, Mw, (2 * tpl, 2 * tpl), flags=cv2.INTER_LINEAR)
                T = Tw[tpl // 2:tpl // 2 + tpl, tpl // 2:tpl // 2 + tpl]
                res = cv2.matchTemplate(W, T, cv2.TM_CCOEFF_NORMED); y0, x0 = np.unravel_index(np.argmax(res), res.shape); peak = float(res[y0, x0])
                if best is None or peak > best[0]: best = (peak, rot, sc0, x0, y0, res, T)
        peak, rot, sc0, x0, y0, res, T = best
        res2 = res.copy(); res2[max(0, y0 - 6):y0 + 7, max(0, x0 - 6):x0 + 7] = -1; second = float(res2.max())
        if peak < MIN_NCC or peak - second < MIN_UNIQ_GAP: return {"ok": False, "why": f"ncc {peak:.2f} second {second:.2f}"}
        warp = np.array([[1, 0, x0], [0, 1, y0]], np.float32)
        try:
            _, warp = cv2.findTransformECC(T.astype(np.float32), W.astype(np.float32), warp, cv2.MOTION_AFFINE,
                                           (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 60, 1e-4), None, 5)
        except cv2.error:
            return {"ok": False, "why": "ecc failed"}
        cx_t = np.array([tpl / 2, tpl / 2, 1.0]); m = warp @ cx_t           # template centre -> window coords
        # decompose the residual affine M = R(theta) * [[sx, sh],[0, sy]] and reject implausible local deformation
        a, b, cc, dd = float(warp[0, 0]), float(warp[0, 1]), float(warp[1, 0]), float(warp[1, 1])
        sx = math.hypot(a, cc); theta = math.atan2(cc, a)
        sh = b * math.cos(theta) + dd * math.sin(theta); sy = dd * math.cos(theta) - b * math.sin(theta)
        if sx < 1e-6 or sy < 1e-6: return {"ok": False, "why": "degenerate affine"}
        shear = sh / sy; tot_scale = sc0 * math.sqrt(abs(sx * sy)); tot_rot = rot + math.degrees(theta); aniso = sy / sx
        defo = {"total_scale": float(tot_scale), "total_rot_deg": float(tot_rot), "shear": float(shear), "anisotropy_sy_sx": float(aniso)}
        if not (0.65 <= tot_scale <= 1.55): return {"ok": False, "why": f"deformation scale {tot_scale:.2f}", "defo": defo}
        if abs(shear) > 0.30: return {"ok": False, "why": f"deformation shear {shear:.2f}", "defo": defo}
        if not (0.7 <= aniso <= 1.4): return {"ok": False, "why": f"deformation anisotropy {aniso:.2f}", "defo": defo}
        if abs(tot_rot) > 42: return {"ok": False, "why": f"deformation rot {tot_rot:.0f}deg", "defo": defo}
        return {"ok": True, "xy": (float(m[0] + off[0]), float(m[1] + off[1])), "ncc": peak, "second": second, "defo": defo}
    def measure_boot(c, k):
        r = [measure(c, k, t) for t in (48, 64, 80)]; good = [x for x in r if x and x.get("ok")]
        if len(good) < 2: return {"ok": False, "why": "; ".join(str(x.get("why") if x else "crop") for x in r)}
        xs = np.array([x["xy"] for x in good]); unc = float(max(xs.std(0)) + 0.3)
        defo = {kk: float(np.median([x["defo"][kk] for x in good])) for kk in good[0]["defo"]}
        return {"ok": unc <= MAX_UNC, "why": (None if unc <= MAX_UNC else f"uncertainty {unc:.2f}"), "xy": tuple(xs.mean(0).tolist()), "unc": unc,
                "ncc": float(np.mean([x["ncc"] for x in good])), "defo": defo}
    def ray(iid, xy):
        R, t = cams[iid]; d = np.array([(xy[0] - B.FACE / 2) / B.FL, (xy[1] - B.FACE / 2) / B.FL, 1.0]); d /= np.linalg.norm(d); return R.T @ d, -R.T @ t
    def triangulate(views):
        # linear least squares intersection of rays, then nonlinear reprojection refinement
        Am = np.zeros((3, 3)); b = np.zeros(3)
        for iid, xy in views:
            d, c = ray(iid, xy); P = np.eye(3) - np.outer(d, d); Am += P; b += P @ c
        X0 = np.linalg.lstsq(Am, b, rcond=None)[0]
        def res(X):
            out = []
            for iid, xy in views:
                R, t = cams[iid]; Xc = R @ X + t; out += [B.FL * Xc[0] / Xc[2] + B.FACE / 2 - xy[0], B.FL * Xc[1] / Xc[2] + B.FACE / 2 - xy[1]]
            return np.array(out)
        r = least_squares(res, X0, method="lm"); return r.x, float(np.sqrt(np.mean(r.fun ** 2)))
    def project(iid, X):
        R, t = cams[iid]; Xc = R @ X + t
        if Xc[2] <= 0: return None, None
        return np.array([B.FL * Xc[0] / Xc[2] + B.FACE / 2, B.FL * Xc[1] / Xc[2] + B.FACE / 2]), float(Xc[2])
    results = []; sift_vs_ind = []; overlays = {"PASS": [], "FAIL_ordinary": [], "FAIL_peripheral": [], "SIFT_bad_independent_good": []}
    for c in sel:
        ms = {}
        for k in c["tests"]:
            ms[k] = measure_boot(c, k)
        good = [k for k in c["tests"] if ms[k]["ok"]]
        entry = {"pid": c["pid"], "lens": c["lens"], "cross_walk": c["cross_walk"], "max_track_resid_px": c["max_resid"], "uniqueness_gap": c["uniqueness_gap"],
                 "ref_image": img_name[int(A[c["ref"], 6])], "ref_sensor_radius": c["ref_srad"], "n_measured": len(good),
                 "measurements": {img_name[int(A[k, 6])]: ({"ok": ms[k]["ok"], "why": ms[k].get("why"), "unc_px": ms[k].get("unc"), "ncc": ms[k].get("ncc"),
                                  "old_sift_xy": [float(A[k, 0]), float(A[k, 1])], "independent_xy": (list(ms[k]["xy"]) if "xy" in ms[k] else None),
                                  "sift_minus_independent_px": (float(np.hypot(A[k, 0] - ms[k]["xy"][0], A[k, 1] - ms[k]["xy"][1])) if "xy" in ms[k] else None),
                                  "sensor_radius": float(srad[k]), "walk": walk_of_img[int(A[k, 6])]}) for k in c["tests"]}, "tests": []}
        for k in good:
            if "xy" in ms[k]: sift_vs_ind.append((float(np.hypot(A[k, 0] - ms[k]["xy"][0], A[k, 1] - ms[k]["xy"][1])), float(srad[k]), int(A[k, 4]), c["max_resid"] > 20))
        if len(good) < 4:
            entry["verdict"] = "INCONCLUSIVE"; entry["why"] = f"only {len(good)}/4 independent measurements"; results.append(entry); continue
        for held in good:
            others = [k for k in good if k != held]
            X, rms3 = triangulate([(int(A[k, 6]), ms[k]["xy"]) for k in others])
            pred, depth = project(int(A[held, 6]), X)
            if pred is None: entry["tests"].append({"held": img_name[int(A[held, 6])], "verdict": "INCONCLUSIVE", "why": "behind camera"}); continue
            m = np.array(ms[held]["xy"]); e_face = float(np.linalg.norm(pred - m))
            fn = FACE_NAMES[int(A[held, 5])]; L = int(A[held, 4])
            ps, _ = F.frame_pixels(np.array([m, pred]), fn, lenses[L]); e_sensor = float(np.linalg.norm(ps[0] - ps[1]))
            cx_c, cy_c, _ = B.FRAME_CIRCLE[L]; rv = ps[0] - np.array([cx_c, cy_c]); rn = max(np.linalg.norm(rv), 1e-9)
            ur = rv / rn; ut = np.array([-ur[1], ur[0]]); dvec = ps[1] - ps[0]      # displacement = H1 prediction - independent measurement
            d1, _ = ray(int(A[held, 6]), m); d2, _ = ray(int(A[held, 6]), pred); ang = float(math.degrees(math.acos(np.clip(d1 @ d2, -1, 1))))
            cw = walk_of_img[int(A[held, 6])] not in {walk_of_img[int(A[k, 6])] for k in others}
            t = {"held": img_name[int(A[held, 6])], "walk": walk_of_img[int(A[held, 6])], "held_out_cross_walk": cw, "lens": L, "sensor_radius": float(srad[held]), "bin": bin_of(srad[held]),
                 "depth_m": depth, "face_err_px": e_face, "sensor_err_px": e_sensor, "angular_err_deg": ang, "triang_rms_3view_px": rms3, "meas_unc_px": ms[held]["unc"],
                 "disp_face_xy": [float(pred[0] - m[0]), float(pred[1] - m[1])], "disp_sensor_radial": float(dvec @ ur), "disp_sensor_tangential": float(dvec @ ut),
                 "deformation": ms[held]["defo"],
                 "old_sift_err_vs_pred_px": float(np.linalg.norm(pred - A[held, 0:2])), "verdict": "PASS" if e_face <= 2.0 else "FAIL"}
            entry["tests"].append(t)
            # overlay candidates
            key = None
            if t["verdict"] == "PASS" and t["old_sift_err_vs_pred_px"] > 5: key = "SIFT_bad_independent_good"
            elif t["verdict"] == "PASS": key = "PASS"
            elif t["bin"] in ("peripheral", "extreme"): key = "FAIL_peripheral"
            else: key = "FAIL_ordinary"
            if len(overlays[key]) < 6:
                g = face_gray(int(A[held, 6])); cr, off = crop(g, m[0], m[1], 80)
                if cr is not None:
                    o = cv2.cvtColor(cr, cv2.COLOR_GRAY2BGR); o = cv2.resize(o, (320, 320)); s2 = 2.0
                    def pt(p): return (int((p[0] - off[0]) * s2), int((p[1] - off[1]) * s2))
                    cv2.circle(o, pt(m), 7, (0, 255, 0), 2); cv2.circle(o, pt(pred), 7, (0, 0, 255), 2); cv2.circle(o, pt(A[held, 0:2]), 5, (0, 255, 255), 1)
                    cv2.putText(o, f"{key} {e_face:.1f}px L{L} {t['walk']} r{int(srad[held])} d{depth:.1f}m", (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 0), 1)
                    cv2.putText(o, "green=independent red=H1 pred yellow=old SIFT", (4, 312), cv2.FONT_HERSHEY_SIMPLEX, 0.36, (255, 255, 0), 1)
                    overlays[key].append(o)
        errs = [t["face_err_px"] for t in entry["tests"] if "face_err_px" in t]
        entry["median_face_err_px"] = float(np.median(errs)) if errs else None
        entry["verdict"] = ("PASS" if entry["median_face_err_px"] <= 2.0 else "FAIL") if errs else "INCONCLUSIVE"
        results.append(entry)
    for key, tiles in overlays.items():
        if tiles:
            while len(tiles) % 3: tiles.append(np.zeros_like(tiles[0]))
            cv2.imwrite(str(LD / f"overlay_{key}.png"), np.vstack([np.hstack(tiles[i:i + 3]) for i in range(0, len(tiles), 3)]))
    # ---- aggregates over individual held-out tests
    tests = [t for r in results for t in r.get("tests", []) if "face_err_px" in t]
    def agg(ts):
        if not ts: return {"n": 0}
        e = np.array([t["face_err_px"] for t in ts]); es = np.array([t["sensor_err_px"] for t in ts]); ea = np.array([t["angular_err_deg"] for t in ts])
        dr = np.array([t["disp_sensor_radial"] for t in ts]); dt_ = np.array([t["disp_sensor_tangential"] for t in ts])
        return {"n": int(len(e)), "face_median_px": float(np.median(e)), "face_p95_px": float(np.percentile(e, 95)), "sensor_median_px": float(np.median(es)), "sensor_p95_px": float(np.percentile(es, 95)),
                "angular_median_deg": float(np.median(ea)), "n_pass_le2px": int((e <= 2).sum()), "n_landmarks": len({r["pid"] for r in results for t2 in r.get("tests", []) if t2 in ts}),
                "coherence": {"mean_radial_px": float(dr.mean()), "mean_tangential_px": float(dt_.mean()), "abs_mean_over_median": float(math.hypot(dr.mean(), dt_.mean()) / max(np.median(es), 1e-9)),
                              "frac_radial_outward": float((dr > 0).mean())},
                "measurement_uncertainty_median_px": float(np.median([t["meas_unc_px"] for t in ts]))}
    aggr = {"overall": agg(tests), "lens0": agg([t for t in tests if t["lens"] == 0]), "lens1": agg([t for t in tests if t["lens"] == 1]),
            "central": agg([t for t in tests if t["bin"] == "central"]), "middle": agg([t for t in tests if t["bin"] == "middle"]), "peripheral": agg([t for t in tests if t["bin"] == "peripheral"]), "extreme_79_91": agg([t for t in tests if t["bin"] == "extreme"]),
            "walk021": agg([t for t in tests if t["walk"] == "021"]), "walk075": agg([t for t in tests if t["walk"] == "075"]), "cross_walk_heldout": agg([t for t in tests if t["held_out_cross_walk"]]),
            "disputed_tracks_resid_gt20": agg([t for r in results if r["max_track_resid_px"] > 20 for t in r.get("tests", []) if "face_err_px" in t]),
            "depth_lt2m": agg([t for t in tests if t["depth_m"] < 2]), "depth_2_5m": agg([t for t in tests if 2 <= t["depth_m"] < 5]), "depth_ge5m": agg([t for t in tests if t["depth_m"] >= 5])}
    sv = np.array([s[0] for s in sift_vs_ind]) if sift_vs_ind else np.array([])
    sift_cmp = {"n": int(len(sv)), "median_px": float(np.median(sv)) if len(sv) else None, "p95_px": float(np.percentile(sv, 95)) if len(sv) else None, "frac_gt2px": float((sv > 2).mean()) if len(sv) else None, "frac_gt5px": float((sv > 5).mean()) if len(sv) else None,
                "disputed_tracks": {"n": int(sum(1 for s in sift_vs_ind if s[3])), "median_px": float(np.median([s[0] for s in sift_vs_ind if s[3]])) if any(s[3] for s in sift_vs_ind) else None},
                "by_bin": {b: {"n": int(sum(1 for s in sift_vs_ind if bin_of(s[1]) == b)), "median_px": float(np.median([s[0] for s in sift_vs_ind if bin_of(s[1]) == b])) if any(bin_of(s[1]) == b for s in sift_vs_ind) else None} for b in ("central", "middle", "peripheral", "extreme")}}
    acc = [(m["sensor_radius"], m["unc_px"]) for r in results for m in r["measurements"].values() if m["ok"]]
    rej_defo = sum(1 for r in results for m in r["measurements"].values() if m["why"] and "deformation" in m["why"])
    counts = {"accepted_measurements_by_sensor_radius": {b: int(sum(1 for a2 in acc if bin_of(a2[0]) == b)) for b in ("central", "middle", "peripheral", "extreme")},
              "accepted_measurements_total": len(acc), "rejected_for_local_deformation": rej_defo,
              "candidates_ge5_exposures": len(cands), "screened_distinct": len(screened), "attempted": len(sel), "valid_4of4": sum(1 for r in results if r["verdict"] in ("PASS", "FAIL")),
              "inconclusive": sum(1 for r in results if r["verdict"] == "INCONCLUSIVE"), "landmark_pass": sum(1 for r in results if r["verdict"] == "PASS"), "landmark_fail": sum(1 for r in results if r["verdict"] == "FAIL"),
              "inconclusive_reasons": dict(collections.Counter(m["why"].split(" ")[0] for r in results for m in r["measurements"].values() if not m["ok"] and m["why"]))}
    out = {"design": "landmark = texture patch anchored in a reference exposure (smallest sensor radius; never a test view); independent measurement in 4 other exposures (pairwise rig translation >= 0.25 m) by NCC seed within +/-80 px of the OLD SIFT coordinate + ECC affine refinement, bootstrap over template sizes 48/64/80 for uncertainty (<=1.5 px), uniqueness gate on second NCC peak; triangulation from 3 through the FROZEN H1 cameras (rig_ba_v2 H1), prediction into the 4th, rotated; H1 prediction never used for measurement",
           "counts": counts, "aggregates": aggr, "old_sift_vs_independent": sift_cmp, "landmarks": results}
    json.dump(out, open(LD / "landmark_loo.json", "w"), indent=1); vol.commit()
    return {k: out[k] for k in ("counts", "aggregates", "old_sift_vs_independent")}


@app.local_entrypoint()
def main():
    import json; print(json.dumps(run.remote(), indent=1))
