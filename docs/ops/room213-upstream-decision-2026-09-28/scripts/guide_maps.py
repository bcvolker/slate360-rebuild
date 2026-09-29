"""READ-ONLY guidance-map feasibility (no training). MoGe-2 (Spirula's default geometry model, moge2-vitb) on overlapping
pinhole faces of the NATIVE fisheye frames, face-scale aligned in the overlaps and cross-faded back into the fisheye
grid (the route Spirula's own `spirula geometry` / GeometryWarp takes). Output = ray-distance depth + camera-frame
OpenCV normals facing the camera, then checked against the golden solve: floor/ceiling planes, wall planarity,
SfM track depths per class, per-image scale. Usage: python -m modal run guide_maps.py
"""
import modal

app = modal.App("room213-guide-maps")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = (modal.Image.from_registry("nvidia/cuda:12.4.1-runtime-ubuntu22.04", add_python="3.11")
         .apt_install("git", "libgl1", "libglib2.0-0")
         .pip_install("torch==2.6.0", "torchvision==0.21.0", "numpy<2.1", "opencv-python-headless", "scipy", "pycolmap==4.2.0",
                      "huggingface_hub", "git+https://github.com/microsoft/MoGe.git")
         .add_local_file("../p1/geom.json", "/root/geom.json").add_local_file("../p1/pts_uvh.npy", "/root/pts_uvh.npy"))
ROOT = "/vol/room213/2026-09-21/fullcircle/data/room213"
OUT = "/vol/room213/2026-09-28/camera_guidance/guide"
IMAGES = ["camera1/frame_00036.png", "camera1/frame_00037.png", "camera2/frame_00103.png", "camera2/frame_00104.png",
          "camera1/frame_00103.png", "camera1/frame_00060.png"]
FACE = 1024; FOV = 80.0; TILT = 60.0; RING = 8; GRID = 960
PLANES = {"floor": -1.866, "ceiling": 0.638}


@app.function(image=image, gpu="L4", volumes={"/vol": vol}, timeout=3600, memory=32768)
def run() -> dict:
    import json, math, numpy as np, cv2, torch, pycolmap
    from pathlib import Path
    from scipy.spatial.transform import Rotation as Rot
    from moge.model.v2 import MoGeModel
    out = Path(OUT); out.mkdir(parents=True, exist_ok=True)
    model = MoGeModel.from_pretrained("Ruicheng/moge-2-vitb-normal").cuda().eval()
    rec = pycolmap.Reconstruction(f"{ROOT}/sparse/0"); byname = {im.name: im for im in rec.images.values()}
    g = json.load(open("/root/geom.json")); c0, up, a1, a2 = (np.array(g[k]) for k in ("c0", "up", "a1", "a2"))
    uvh = np.load("/root/pts_uvh.npy"); loc = {int(p): (u, v, h) for p, u, v, h in uvh}
    def klass(u, v, h):
        nw = abs(u + 5.2) < 0.25 or abs(v - 4.42) < 0.25 or abs(v + 3.9) < 0.25 or abs(u - 6.12) < 0.25
        if -1.97 <= h <= -1.82: return "floor"
        if 0.52 <= h <= 0.72: return "ceiling"
        if nw and -1.8 <= h <= 0.45: return "wall"
        if not nw and -1.32 <= h <= -1.18: return "table"
        if not nw and -1.15 <= h <= -0.9: return "chair"
        return "other"
    # face rotations: R_k maps camera-frame vectors into face frame
    rots = [np.eye(3)]
    for k in range(RING):
        az = 2 * math.pi * k / RING
        axis = np.array([math.cos(az), math.sin(az), 0.0])       # tilt the optical axis away from centre toward azimuth
        tilt_axis = np.cross([0, 0, 1.0], axis)
        rots.append(Rot.from_rotvec(math.radians(TILT) * tilt_axis / np.linalg.norm(tilt_axis)).as_matrix().T)
    ff = FACE / 2 / math.tan(math.radians(FOV / 2))
    yy, xx = np.mgrid[0:FACE, 0:FACE].astype(np.float64)
    dface = np.stack([(xx + 0.5 - FACE / 2) / ff, (yy + 0.5 - FACE / 2) / ff, np.ones_like(xx)], -1)   # z = 1
    gy, gx = np.mgrid[0:GRID, 0:GRID].astype(np.float64); sc = 3840 / GRID
    results = {}
    for name in IMAGES:
        im = byname[name]; cam = rec.cameras[im.camera_id]
        bgr = cv2.imread(f"{ROOT}/images/{name}"); rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        # fisheye output grid rays (camera frame, unit)
        pix = np.stack([(gx + 0.5) * sc - 0.5, (gy + 0.5) * sc - 0.5], -1).reshape(-1, 2)
        dc = np.asarray(cam.cam_from_img(pix)); dc = np.concatenate([dc, np.ones((len(dc), 1))], 1)
        rr = np.hypot(pix[:, 0] - 1920, pix[:, 1] - 1920); inside = rr < 1880   # circle; theta beyond ~95 deg excluded
        dcn = dc / np.linalg.norm(dc, axis=1, keepdims=True)
        faces = []
        for k, R in enumerate(rots):
            dcam = dface.reshape(-1, 3) @ R          # face->camera: R^T d  (row form)
            ok = dcam[:, 2] > 0.05
            src = np.full((len(dcam), 2), -1.0); src[ok] = np.asarray(cam.img_from_cam(dcam[ok]))
            mx = src[:, 0].reshape(FACE, FACE).astype(np.float32); my = src[:, 1].reshape(FACE, FACE).astype(np.float32)
            face = cv2.remap(rgb, mx, my, cv2.INTER_AREA if False else cv2.INTER_LINEAR, borderValue=(128, 128, 128))
            t = torch.from_numpy(face).float().div(255).permute(2, 0, 1).cuda()
            with torch.no_grad():
                o = model.infer(t, fov_x=FOV)
            z = o["depth"].cpu().numpy(); n = o["normal"].cpu().numpy(); m = o["mask"].cpu().numpy() > 0.5
            valid_src = (src[:, 0] >= 0).reshape(FACE, FACE) & np.hypot(mx - 1920, my - 1920).__lt__(1880)
            faces.append({"R": R, "z": z, "n": n, "m": m & valid_src & np.isfinite(z)})
        # sample every face at the grid rays
        samp = []
        for f in faces:
            df = dcn @ f["R"].T
            okf = df[:, 2] > 0.05
            u = np.where(okf, df[:, 0] / np.maximum(df[:, 2], 1e-6) * ff + FACE / 2 - 0.5, -1)
            v = np.where(okf, df[:, 1] / np.maximum(df[:, 2], 1e-6) * ff + FACE / 2 - 0.5, -1)
            inb = okf & (u > 1) & (v > 1) & (u < FACE - 2) & (v < FACE - 2)
            U = u.reshape(GRID, GRID).astype(np.float32); V = v.reshape(GRID, GRID).astype(np.float32)
            zi = cv2.remap(np.where(f["m"], f["z"], np.nan).astype(np.float32), U, V, cv2.INTER_NEAREST).reshape(-1)
            ni = np.stack([cv2.remap(f["n"][..., c].astype(np.float32), U, V, cv2.INTER_LINEAR).reshape(-1) for c in range(3)], -1)
            rng_ = zi * np.linalg.norm(np.stack([df[:, 0] / np.maximum(df[:, 2], 1e-6), df[:, 1] / np.maximum(df[:, 2], 1e-6), np.ones(len(df))], -1), axis=1)
            edge = np.minimum.reduce([u, v, FACE - 1 - u, FACE - 1 - v]) / (0.12 * FACE)
            w = np.clip(edge, 0, 1) * inb * np.isfinite(rng_)
            samp.append({"r": np.where(w > 0, rng_, np.nan), "n": ni @ f["R"], "w": w})
        # face scale alignment in the overlaps: log-scale per face, front fixed (least squares on pair medians)
        K = len(samp); rows = []; rhs = []
        for a in range(K):
            for b in range(a + 1, K):
                ov = (samp[a]["w"] > 0) & (samp[b]["w"] > 0)
                if ov.sum() > 500:
                    rows.append((a, b)); rhs.append(float(np.median(np.log(samp[a]["r"][ov]) - np.log(samp[b]["r"][ov]))))
        A = np.zeros((len(rows) + 1, K)); y = np.zeros(len(rows) + 1)
        for i, (a, b) in enumerate(rows): A[i, a] = 1; A[i, b] = -1; y[i] = -rhs[i]
        A[-1, 0] = 1
        ls = np.linalg.lstsq(A, y, rcond=None)[0]; face_scale = np.exp(ls)
        seam_before = float(np.median(np.abs(rhs))) if rhs else None
        seam_after = float(np.median([abs(rhs[i] + ls[a] - ls[b]) for i, (a, b) in enumerate(rows)])) if rows else None
        W = np.zeros(len(dcn)); Rsum = np.zeros(len(dcn)); Nsum = np.zeros((len(dcn), 3))
        for s, f in zip(samp, face_scale):
            ok = s["w"] > 0; W[ok] += s["w"][ok]; Rsum[ok] += s["w"][ok] * s["r"][ok] * f; Nsum[ok] += s["w"][ok, None] * s["n"][ok]
        good = (W > 0) & inside
        rpred = np.where(good, Rsum / np.maximum(W, 1e-9), 0.0)
        npred = Nsum / np.maximum(np.linalg.norm(Nsum, axis=1, keepdims=True), 1e-9)
        flip = (npred * dcn).sum(1) > 0; npred[flip] *= -1          # face the camera
        # ---------------- evaluation against the golden solve (COLMAP units)
        cfw = im.cam_from_world(); Rw = np.asarray(cfw.rotation.matrix()); C = -Rw.T @ np.asarray(cfw.translation)
        dw = dcn @ Rw                                                 # world rays (R^T d, row form)
        # per-image scale from ALL SfM observations in this image (range)
        obs = []
        for p2 in im.points2D:
            if not p2.has_point3D(): continue
            X = rec.points3D[p2.point3D_id].xyz; px_, py_ = p2.xy
            gi = int(py_ / sc); gj = int(px_ / sc)
            if 0 <= gi < GRID and 0 <= gj < GRID and good[gi * GRID + gj]:
                obs.append((np.linalg.norm(X - C), rpred[gi * GRID + gj], klass(*loc.get(p2.point3D_id, (99, 99, 99))), rr[gi * GRID + gj], gi * GRID + gj))
        obs_r = np.array([o[0] for o in obs]); obs_p = np.array([o[1] for o in obs])
        scale = float(np.median(obs_r / obs_p)); rs = rpred * scale
        per_class = {}
        for c in ("floor", "ceiling", "wall", "table", "chair", "other"):
            idx = [i for i, o in enumerate(obs) if o[2] == c]
            if len(idx) >= 10:
                e = (scale * obs_p[idx] - obs_r[idx]) / obs_r[idx]
                per_class[c] = {"n": len(idx), "median_rel_err": float(np.median(e)), "mad_rel": float(np.median(np.abs(e))), "frac_within_5pct": float((np.abs(e) < 0.05).mean())}
        # thin-object merge test: chair/table points whose predicted range is nearer the background (floor along the same ray) than the object
        merge = {}
        for c in ("chair", "table"):
            idx = [i for i, o in enumerate(obs) if o[2] == c]; cnt = 0; tot = 0
            for i in idx:
                d = dw[obs[i][4]]; hC = (C - c0) @ up; dup = d @ up
                if dup >= -1e-3: continue
                tb = (PLANES["floor"] - hC) / dup; tot += 1
                if abs(scale * obs_p[i] - tb) < abs(scale * obs_p[i] - obs_r[i]): cnt += 1
            merge[c] = {"n": tot, "frac_nearer_background": (cnt / tot if tot else None)}
        # floor / ceiling analytic ranges + normals
        hC = float((C - c0) @ up); dup = dw @ up
        plane_eval = {}; errmap = np.full(len(dcn), np.nan)
        nw = npred @ Rw                                                # camera->world normals
        for nm, hp, sgn in (("floor", PLANES["floor"], -1), ("ceiling", PLANES["ceiling"], 1)):
            t = (hp - hC) / np.where(np.abs(dup) > 1e-3, dup, np.nan)
            sel = good & (t > 0) & np.isfinite(t) & (np.sign(dup) == sgn)
            # restrict to the room footprint so the ray hits the plane inside the walls
            P = C + dw * t[:, None]; pu = (P - c0) @ a1; pv = (P - c0) @ a2
            sel &= (pu > -5.0) & (pu < 5.9) & (pv > -3.6) & (pv < 4.2)
            e = (rs - t) / t; errmap[sel] = e[sel]
            ang = np.degrees(np.arccos(np.clip(np.abs(nw[sel] @ up), -1, 1)))
            radial = {}
            for lo, hi in ((0, 800), (800, 1300), (1300, 1700), (1700, 1880)):
                s2 = sel & (rr >= lo) & (rr < hi)
                if s2.sum() > 200: radial[f"{lo}-{hi}"] = {"median_rel_err": float(np.nanmedian(((rs - t) / t)[s2])), "normal_err_deg_median": float(np.median(np.degrees(np.arccos(np.clip(np.abs(nw[s2] @ up), -1, 1)))))}
            plane_eval[nm] = {"pixels": int(sel.sum()), "median_rel_err": float(np.nanmedian(e[sel])) if sel.any() else None,
                              "p25_p75": [float(np.nanpercentile(e[sel], 25)), float(np.nanpercentile(e[sel], 75))] if sel.any() else None,
                              "frac_within_5pct": float((np.abs(e[sel]) < 0.05).mean()) if sel.any() else None,
                              "normal_err_deg_median": float(np.median(ang)) if len(ang) else None,
                              "normal_err_deg_p90": float(np.percentile(ang, 90)) if len(ang) else None, "by_sensor_radius": radial}
        # walls: points whose normal is horizontal and whose 3D position lies within 0.3 of a wall plane; plane-fit planarity
        Pw = C + dw * rs[:, None]; pu = (Pw - c0) @ a1; pv = (Pw - c0) @ a2; ph = (Pw - c0) @ up
        walls = {"u_lo": (pu, -5.2, a1), "v_hi": (pv, 4.42, a2), "v_lo": (pv, -3.9, a2), "u_hi": (pu, 6.12, a1)}
        wall_eval = {}
        for wn, (q, q0, ax) in walls.items():
            sel = good & (np.abs(q - q0) < 0.35) & (ph > -1.6) & (ph < 0.4)
            if sel.sum() < 2000: continue
            pts = Pw[sel]; cen = np.median(pts, 0); u_, s_, vt = np.linalg.svd(pts[::max(1, len(pts) // 20000)] - cen, full_matrices=False)
            nrm = vt[2]; res = (pts - cen) @ nrm
            wall_eval[wn] = {"pixels": int(sel.sum()), "plane_rms_units": float(np.sqrt(np.mean(res ** 2))), "plane_p95_abs_units": float(np.percentile(np.abs(res), 95)),
                             "plane_offset_vs_sfm_units": float(np.median(q[sel]) - q0), "normal_vs_wall_axis_deg": float(np.degrees(np.arccos(min(1, abs(nrm @ ax))))),
                             "normal_vs_horizontal_deg": float(np.degrees(np.arcsin(min(1, abs(nrm @ up))))),
                             "pred_normal_vs_wall_axis_deg_median": float(np.median(np.degrees(np.arccos(np.clip(np.abs(nw[sel] @ ax), 0, 1)))))}
        tag = name.replace("/", "_").replace(".png", "")
        dep16 = np.clip(rpred / max(np.nanpercentile(rpred[good], 99.5), 1e-6) * 60000, 0, 65535).astype(np.uint16).reshape(GRID, GRID)
        nrm8 = np.where(good[:, None], np.clip((npred + 1) * 127.5, 1, 255), 0).astype(np.uint8).reshape(GRID, GRID, 3)
        cv2.imwrite(str(out / f"{tag}_depth16.png"), dep16)
        cv2.imwrite(str(out / f"{tag}_normal.png"), cv2.cvtColor(nrm8, cv2.COLOR_RGB2BGR))
        small = cv2.resize(bgr, (GRID, GRID), interpolation=cv2.INTER_AREA)
        dvis = cv2.applyColorMap((np.clip(rs.reshape(GRID, GRID) / 9.0, 0, 1) * 255).astype(np.uint8), cv2.COLORMAP_TURBO); dvis[~good.reshape(GRID, GRID)] = 0
        em = errmap.reshape(GRID, GRID); evis = np.zeros((GRID, GRID, 3), np.uint8)
        ok = np.isfinite(em); cl = np.clip(em, -0.15, 0.15) / 0.15
        evis[ok & (cl >= 0)] = np.stack([np.zeros_like(cl), np.zeros_like(cl), (cl * 255)], -1)[ok & (cl >= 0)].astype(np.uint8)
        evis[ok & (cl < 0)] = np.stack([(-cl * 255), np.zeros_like(cl), np.zeros_like(cl)], -1)[ok & (cl < 0)].astype(np.uint8)
        evis[ok & (np.abs(em) < 0.05)] = (0, 160, 0)
        np.save(out / f"{tag}_range_scaled.npy", rs.reshape(GRID, GRID).astype(np.float32))
        cv2.imwrite(str(out / f"{tag}_sheet.png"), np.vstack([np.hstack([small, dvis]), np.hstack([cv2.cvtColor(nrm8, cv2.COLOR_RGB2BGR), evis])]))
        results[name] = {"scale_colmap_units_per_moge_unit": scale, "sfm_obs_used": len(obs), "face_scales": face_scale.tolist(),
                         "seam_log_mismatch_median_before_after": [seam_before, seam_after], "per_class_sfm": per_class, "thin_merge": merge,
                         "planes": plane_eval, "walls": wall_eval}
    json.dump(results, open(out / "guide_eval.json", "w"), indent=1); vol.commit()
    return results


@app.local_entrypoint()
def main():
    import json; print(json.dumps(run.remote(), indent=1))
