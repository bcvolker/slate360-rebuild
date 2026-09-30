"""Room 213 close-pass finder (9/29 clips 077/078/079/080, A+ SfM). READ-ONLY.
Per extracted, registered frame pair: distance from the camera to the structure it actually observes (SfM points it
tracks, floor z<0.05 and ceiling z>2.3 excluded), which lens sees it, height, walking speed / turn rate from the
neighbouring extracted poses, shutter from the .insv trailer. Close intervals = runs of frames whose 5th-percentile
furniture distance < CLOSE_M. Outputs: close_frames.json, a route map (top view, close segments highlighted) and a
contact sheet of representative ORIGINAL lens frames (the extracted JPEGs = decoded physical-lens frames, q95)."""
import modal

app = modal.App("slate360-room213-closepass")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = (modal.Image.from_registry("ubuntu:24.04", add_python="3.11").apt_install("libgl1", "libglib2.0-0t64")
         .pip_install("numpy", "opencv-python-headless", "pycolmap==4.2.0", "scipy"))
WS = "/vol/room213/2026-09-29/capture/conditions/Aplus/ws"
OUT = "/vol/room213/2026-09-29/forensic/close2"
FPS, CLOSE_M = 29.97, 0.75


@app.function(image=image, cpu=8.0, memory=32768, timeout=3600, volumes={"/vol": vol})
def find_v2(exposure: dict) -> dict:
    import json, collections
    from pathlib import Path
    import cv2, numpy as np, pycolmap
    vol.reload(); O = Path(OUT); O.mkdir(parents=True, exist_ok=True)
    rec = pycolmap.Reconstruction(f"{WS}/sparse/0"); P = rec.points3D
    frames = collections.defaultdict(dict)
    for im in rec.images.values():
        clip, cam, f = im.name.split("/"); frames[(clip[-3:], int(f[:-4]))][cam] = im
    rows = []
    for (clip, idx), d in sorted(frames.items()):
        best = None
        for cam, im in d.items():
            cw = im.cam_from_world(); R, t = np.asarray(cw.rotation.matrix()), np.asarray(cw.translation)
            xyz = np.array([P[p.point3D_id].xyz for p in im.points2D if p.has_point3D()])
            if len(xyz) == 0: continue
            fur = xyz[(xyz[:, 2] > 0.05) & (xyz[:, 2] < 2.3)]
            if len(fur) < 20: continue
            dist = np.linalg.norm(fur @ R.T + t, axis=1); p5 = float(np.sort(dist)[min(19, len(dist) - 1)])   # 20th-nearest furniture-height point
            near = fur[dist <= np.percentile(dist, 5)]
            cand = {"cam": cam, "p5_m": p5, "p50_m": float(np.median(dist)), "near_z_m": float(np.median(near[:, 2])), "near_xyz": np.median(near, 0).tolist(), "n_obs": int(len(xyz))}
            if best is None or p5 < best["p5_m"]: best = cand
        if best is None: continue
        C = np.asarray(next(iter(d.values())).projection_center())
        e = exposure[clip]; tt = idx / FPS; k = int(np.searchsorted(e["t"], tt)); k = min(k, len(e["e"]) - 1)
        rows.append({"clip": clip, "idx": idx, "t_s": round(tt, 2), "C": C.tolist(), "lenses_registered": sorted(d), "shutter_s": e["e"][k], **best})
    by = collections.defaultdict(list)
    for r in rows: by[r["clip"]].append(r)
    for clip, v in by.items():                                    # speed / turn from neighbouring extracted frames
        v.sort(key=lambda r: r["idx"])
        for i, r in enumerate(v):
            a, b = v[max(0, i - 1)], v[min(len(v) - 1, i + 1)]; dt = (b["idx"] - a["idx"]) / FPS
            r["speed_m_s"] = float(np.linalg.norm(np.array(b["C"]) - np.array(a["C"])) / dt) if dt > 0 else None
    # excursions off the centre aisle (aisle = principal line of the 077/078 paths)
    A = np.array([r["C"][:2] for r in rows if r["clip"] in ("077", "078")]); a0 = A.mean(0); dvec = np.linalg.svd(A - a0)[2][0]
    for r in rows:
        v_ = np.array(r["C"][:2]) - a0; r["aisle_off_m"] = float(abs(v_[0] * dvec[1] - v_[1] * dvec[0]))
    exc = []
    for clip, v in by.items():
        cur = []
        for r in v:
            if r["aisle_off_m"] > 0.9: cur.append(r)
            elif cur: exc.append(cur); cur = []
        if cur: exc.append(cur)
    exc = [e for e in exc if len(e) >= 3]
    # intervals
    ivs = []
    for clip, v in by.items():
        cur = []
        for r in v:
            if r["p5_m"] < CLOSE_M and (not cur or r["t_s"] - cur[-1]["t_s"] <= 1.6): cur.append(r)
            elif r["p5_m"] < CLOSE_M: ivs.append(cur); cur = [r]
            else:
                if cur: ivs.append(cur); cur = []
        if cur: ivs.append(cur)
    ivs = exc
    summ = []
    for n, iv in enumerate(ivs):
        rep = min(iv, key=lambda r: r["p5_m"])
        summ.append({"id": n, "clip": iv[0]["clip"], "t0": iv[0]["t_s"], "t1": iv[-1]["t_s"], "n_extracted": len(iv), "rep_idx": rep["idx"], "rep_cam": rep["cam"],
                     "min_p5_m": rep["p5_m"], "median_p5_m": float(np.median([r["p5_m"] for r in iv])), "near_z_m": rep["near_z_m"],
                     "speed_m_s_median": float(np.median([r["speed_m_s"] for r in iv if r["speed_m_s"] is not None])),
                     "shutter_1_over": round(1 / float(np.median([r["shutter_s"] for r in iv]))), "spacing_m_median": float(np.median([r["speed_m_s"] * 0.5 for r in iv if r["speed_m_s"]])),
                     "max_aisle_off_m": float(max(r["aisle_off_m"] for r in iv)), "frac_frames_within_0.8m": float(np.mean([r["p5_m"] < 0.8 for r in iv]))})
    # contact sheet (representative original lens frame per interval)
    tiles = []
    for s in summ:
        clip_dir = next(p for p in Path(f"{WS}/images").iterdir() if p.name.endswith(s["clip"]))
        im = cv2.imread(str(clip_dir / s["rep_cam"] / f"{s['rep_idx']:05d}.jpg")); im = cv2.resize(im, (480, 480), interpolation=cv2.INTER_AREA)
        cv2.rectangle(im, (0, 0), (480, 64), (0, 0, 0), -1)
        cv2.putText(im, f"#{s['id']} clip {s['clip']}  {s['t0']:.1f}-{s['t1']:.1f}s  {s['rep_cam']}", (6, 20), 0, 0.55, (255, 255, 255), 1)
        cv2.putText(im, f"nearest(20th pt) {s['min_p5_m']:.2f} m  z {s['near_z_m']:.2f}  v {s['speed_m_s_median']:.2f} m/s  1/{s['shutter_1_over']}s", (6, 42), 0, 0.5, (120, 255, 120), 1)
        cv2.putText(im, f"{s['n_extracted']} extracted pairs, ~{s['spacing_m_median'] * 100:.0f} cm apart", (6, 60), 0, 0.45, (200, 200, 200), 1)
        tiles.append(im)
    while tiles and len(tiles) % 4: tiles.append(np.zeros_like(tiles[0]))
    if tiles: cv2.imwrite(str(O / "close_contact_sheet.jpg"), np.vstack([np.hstack(tiles[i:i + 4]) for i in range(0, len(tiles), 4)]), [cv2.IMWRITE_JPEG_QUALITY, 88])
    # route map (top view): points = furniture-height SfM points; paths per clip; close frames highlighted
    X = np.array([p.xyz for p in P.values()]); X = X[(X[:, 2] > 0.3) & (X[:, 2] < 1.1)]
    lo, hi = np.percentile(X[:, :2], 1, 0) - 0.5, np.percentile(X[:, :2], 99, 0) + 0.5; S = 1400 / (hi - lo).max()
    mp = np.full((int((hi[1] - lo[1]) * S) + 40, int((hi[0] - lo[0]) * S) + 40, 3), 255, np.uint8)
    q = lambda xy: (int((xy[0] - lo[0]) * S) + 20, int((hi[1] - xy[1]) * S) + 20)
    for x in X[::3]: mp[q(x)[1] % mp.shape[0], q(x)[0] % mp.shape[1]] = (170, 170, 170)
    col = {"077": (200, 120, 0), "078": (0, 150, 0), "079": (0, 0, 220), "080": (160, 0, 160)}
    for clip, v in by.items():
        for a, b in zip(v, v[1:]): cv2.line(mp, q(a["C"]), q(b["C"]), col[clip], 1)
        for r in v:
            if r["aisle_off_m"] > 0.9: cv2.circle(mp, q(r["C"]), 3, col[clip], -1)
    for s in summ:
        r = next(r for r in by[s["clip"]] if r["idx"] == s["rep_idx"]); cv2.putText(mp, f"#{s['id']}", q(r["C"]), 0, 0.5, (0, 0, 0), 1)
    y = 20
    for clip, c in col.items(): cv2.putText(mp, f"clip {clip}", (20, y), 0, 0.6, c, 2); y += 22
    cv2.putText(mp, f"dots = off-aisle excursion frames (>0.9 m from the aisle line); grey = SfM points 0.3-1.1 m", (20, y), 0, 0.5, (0, 0, 0), 1)
    cv2.imwrite(str(O / "route_map.png"), mp)
    json.dump({"frames": rows, "intervals": summ}, open(O / "close_frames.json", "w"), indent=1)
    vol.commit()
    return {"frames": len(rows), "excursion_frames": sum(r["aisle_off_m"] > 0.9 for r in rows), "intervals": summ}
