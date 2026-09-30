"""Room 213 source-to-render forensic audit (2026-09-30). READ/RENDER-ONLY: no training, no model changes.
For each target (3D point + local plane in the AX6c SfM frame) this reproduces the EXACT training-scale pixels Spirula
v2026.9.24 feeds its loss (code-derived, see FORENSIC report §1):
  fisheye 3840^2 -> 5 cube faces 1718^2, f=c=859 (CameraMath.cpp:400-404, uniform fit), panorama 11904x5952 -> 6 faces
  3438^2 f=c=1719; per-pixel ray at pixel centre, ONE bilinear tap in the source, no prefilter (ImageWarp.cu:43-57);
  train_resolution_divisor 0 = native (DatasetCommon.cpp:575); masks eroded by 0.005*sqrt(WH) px (DataManager.cpp:468).
Then samples every observation's training face onto a shared ortho grid on the target plane, so multi-view agreement
and render fidelity are measured on the same texels. Outputs /vol/room213/2026-09-29/forensic/<run>/.
  prep_v2(spec)         -> observations, exact face crops (.npy float), source crops, ortho textures, render view lists
  ortho_renders_v2(run, m) -> samples each rendered face the same way (after render_release_v2)"""
import modal

app = modal.App("slate360-room213-forensic")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = (modal.Image.from_registry("ubuntu:24.04", add_python="3.11").apt_install("libgl1", "libglib2.0-0t64")
         .pip_install("numpy", "opencv-python-headless", "pycolmap==4.2.0", "scipy").add_local_python_source("forensic_geom"))
COND = "/vol/room213/2026-09-29/capture/conditions"
OUT = "/vol/room213/2026-09-29/forensic"
RENDERS = "/vol/room213/2026-09-29/capture/renders"
from forensic_geom import face_plan, project, face_of, face_pixels, plane_frame, to_face, geom, plane_sweep  # noqa: E402


@app.function(image=image, cpu=16.0, memory=65536, timeout=3 * 3600, volumes={"/vol": vol})
def prep_v3(spec: dict) -> dict:
    """spec = {run, cond, targets: [{name, pano_image, pano_px, depth|floor_z, plane: 'fit'|'z', fit_r, vis_r, texel_mm, patch_mm}]}"""
    import json, numpy as np, cv2, pycolmap
    from pathlib import Path
    vol.reload(); run = spec["run"]; WS = f"{COND}/{spec['cond']}/ws"; O = Path(f"{OUT}/{run}"); O.mkdir(parents=True, exist_ok=True)
    rec = pycolmap.Reconstruction(f"{WS}/sparse/0"); ims = list(rec.images.values())
    pid = np.array(list(rec.points3D.keys())); P = np.array([rec.points3D[i].xyz for i in pid]); E = np.array([rec.points3D[i].error for i in pid])
    res = {"run": run, "cond": spec["cond"], "targets": {}}; renders = []
    for T in spec["targets"]:
        name = T["name"]; D = O / name; D.mkdir(exist_ok=True)
        pim = next(i for i in ims if i.name.endswith(T["pano_image"])); pc = rec.cameras[pim.camera_id]
        Rp = np.asarray(pim.cam_from_world().rotation.matrix()); Cp = np.asarray(pim.projection_center())
        dc = np.asarray(pc.cam_from_img(np.array([[T["pano_px"][0] + 0.5, T["pano_px"][1] + 0.5]])))[0]
        dc = np.append(dc, 1.0) if len(dc) == 2 else dc; dw = Rp.T @ (dc / np.linalg.norm(dc))
        if "floor_z" in T:
            X = Cp + (T["floor_z"] - Cp[2]) / dw[2] * dw; n = np.array([0, 0, 1.0])
        else:                                                # depth along the panorama ray; plane facing the ray
            X = Cp + T["depth"] * dw                         # (SfM is too sparse on the door/chair for a stable plane fit)
            n = -dw.copy()
            if T.get("normal") == "ray_h": n[2] = 0.0         # vertical architectural surface
        n, u, v = plane_frame(n)
        # candidates: X inside a face of the image, with SfM evidence (>=1 track hit within vis_r) or a panorama
        # (panoramas are too sparse in SfM for track evidence; occlusion is then checked on the crops and flagged).
        near = np.where(np.linalg.norm(P - X, axis=1) < T["vis_r"])[0]
        cnt = {}
        for i in near:
            for el in rec.points3D[int(pid[i])].track.elements: cnt[el.image_id] = cnt.get(el.image_id, 0) + 1
        texel = T["texel_mm"] / 1000.0; nt = int(T["patch_mm"] / T["texel_mm"])
        a = (np.arange(nt) - nt / 2 + 0.5) * texel; A_, B_ = np.meshgrid(a, a)
        G = X + A_.reshape(-1, 1) * u + B_.reshape(-1, 1) * v                       # ortho grid (row = +v, col = +u)
        ref_dir = (X - Cp) / np.linalg.norm(X - Cp); obs = []
        for im in ims:
            cam = rec.cameras[im.camera_id]; equi = "EQUIRECT" in str(cam.model); c = cnt.get(im.image_id, 0)
            if not equi and c < 1: continue
            C = np.asarray(im.projection_center()); dist = float(np.linalg.norm(C - X))
            if dist > T.get("max_dist", 8.0) or np.degrees(np.arccos(np.clip(((X - C) / dist) @ ref_dir, -1, 1))) > T.get("max_ang", 60): continue
            g = geom(im, cam, X, n, u, v)
            if g: obs.append(dict(image=im.name, image_id=int(im.image_id), camera_id=int(im.camera_id), pano=bool(equi), track_hits=int(c), **g))
        vid = sorted([o for o in obs if not o["pano"]], key=lambda o: -o["px_per_mm_train"])
        pan = sorted([o for o in obs if o["pano"]], key=lambda o: -o["px_per_mm_train"])
        sel = []; nvid = 0                                   # pass 1: loss-visible observations (eroded mask), images cached
        for o in pan + vid:
            if not o["pano"] and nvid >= T.get("max_video", 10): break
            img = cv2.imread(f"{WS}/images/{o['image']}", cv2.IMREAD_COLOR)[..., ::-1]                   # RGB like stb_image
            stem = o["image"].rsplit(".", 1)[0]; mk = cv2.imread(f"{WS}/masks/{stem}.png", 0); o["mask_valid"] = None
            if mk is not None:
                dt = cv2.distanceTransform((mk > 0).astype(np.uint8), cv2.DIST_L2, 5); sx, sy = [int(round(x - 0.5)) for x in o["src_px"]]
                o["mask_valid"] = bool(dt[min(max(sy, 0), dt.shape[0] - 1), min(max(sx, 0), dt.shape[1] - 1)] > 0.005 * np.sqrt(mk.size))
            if o["mask_valid"] is False and not o["pano"]: continue   # the loss never sees it
            sel.append((o, img)); nvid += 0 if o["pano"] else 1
        # plane sweep along n (video views only: the question is whether the SOURCES agree, panoramas are tested against them)
        vs = [(rec.images[o["image_id"]], rec.cameras[o["camera_id"]], cv2.cvtColor(np.ascontiguousarray(im_), cv2.COLOR_RGB2GRAY).astype(np.float32))
              for o, im_ in sel if not o["pano"]]
        dl = np.arange(-T.get("sweep_m", 0.2), T.get("sweep_m", 0.2) + 1e-9, 0.004)
        best, curve = plane_sweep(vs, X, n, u, v, T["patch_mm"] / 2000.0, 2 * texel, dl)
        X = X + best * n; G = X + A_.reshape(-1, 1) * u + B_.reshape(-1, 1) * v
        sweep = {"best_delta_m": best, "deltas": dl.tolist(), "score": curve}
        rows = []
        for j, (o, img) in enumerate(sel):
            im = rec.images[o["image_id"]]; cam = rec.cameras[im.camera_id]; axes, f, side, equi = face_plan(cam)
            g = geom(im, cam, X, n, u, v)
            if g is None: continue
            o.update(g)
            gp, gz = to_face(im, cam, o["face"], G)
            u0, v0 = int(np.floor(gp[:, 0].min())) - 3, int(np.floor(gp[:, 1].min())) - 3
            u1, v1 = int(np.ceil(gp[:, 0].max())) + 3, int(np.ceil(gp[:, 1].max())) + 3
            inside = (u0 >= 0) and (v0 >= 0) and (u1 <= side) and (v1 <= side) and gz.min() > 0
            o.update(face_bbox=[u0, v0, u1, v1], patch_inside_face=bool(inside))
            if not inside or (u1 - u0) * (v1 - v0) > 4000 * 4000: continue
            fc, mx, my = face_pixels(cam, img, o["face"], u0, v0, u1 - u0, v1 - v0)
            tag = f"o{j:02d}"
            np.save(D / f"{tag}_train_face.npy", fc.astype(np.float32))
            ortho = cv2.remap(fc, (gp[:, 0] - 0.5 - u0).reshape(nt, nt).astype(np.float32), (gp[:, 1] - 0.5 - v0).reshape(nt, nt).astype(np.float32),
                              cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
            np.save(D / f"{tag}_ortho_gt.npy", ortho.astype(np.float32))
            # native source crop around the target (for the lineage sheet), source pixel grid, no resampling
            sx, sy = [int(round(x)) for x in o["src_px"]]; hw = int(min(900, max(96, 0.6 * T["patch_mm"] * o["px_per_mm_native"])))
            cv2.imwrite(str(D / f"{tag}_src_native.png"), img[max(0, sy - hw):sy + hw, max(0, sx - hw):sx + hw, ::-1])
            cv2.imwrite(str(D / f"{tag}_train_face.png"), np.clip(fc[..., ::-1] * 255 + 0.5, 0, 255).astype(np.uint8))
            # the exact face camera for rendering (world->cam = M R, t -> M t)
            cw = im.cam_from_world(); Rf = np.array(axes[o["face"]], float) @ np.asarray(cw.rotation.matrix()); tf = np.array(axes[o["face"]], float) @ np.asarray(cw.translation)
            vname = f"{name}_{tag}"
            renders.append({"name": vname, "R": Rf.tolist(), "t": tf.tolist(), "f": f, "W": side, "H": side})
            o.update(tag=tag, render_view=vname); rows.append(o)
        # novel viewpoints: midpoints of consecutive kept video centres + the best panorama position shifted +-15 cm
        # sideways, each looking at X, sampled like a fisheye face (f=859, 1718^2)
        cents = [np.array(o["C"]) for o in rows if not o["pano"]][:6]; novel = []
        for i in range(len(cents) - 1): novel.append(0.5 * (cents[i] + cents[i + 1]))
        if pan:
            Cpb = np.array(pan[0]["C"]); side_dir = np.cross(X - Cpb, [0, 0, 1.0]); side_dir /= np.linalg.norm(side_dir)
            novel += [Cpb + 0.15 * side_dir, Cpb - 0.15 * side_dir]
        nov = []
        for i, Cn in enumerate(novel):
            fwd = (X - Cn) / np.linalg.norm(X - Cn); rt = np.cross(fwd, [0, 0, 1.0])
            if np.linalg.norm(rt) < 1e-3: rt = np.cross(fwd, [0, 1.0, 0])
            rt /= np.linalg.norm(rt); dn = np.cross(fwd, rt); Rw = np.stack([rt, dn, fwd], 0)
            vname = f"{name}_n{i:02d}"; renders.append({"name": vname, "R": Rw.tolist(), "t": (-Rw @ Cn).tolist(), "f": 859.0, "W": 1718, "H": 1718})
            nov.append({"name": vname, "C": Cn.tolist(), "dist_m": float(np.linalg.norm(X - Cn))})
        res["targets"][name] = {"sweep": sweep, "X": X.tolist(), "n": n.tolist(), "u": u.tolist(), "v": v.tolist(), "texel_mm": T["texel_mm"], "nt": nt,
                                "n_observers_total": len(obs), "n_video_total": len(vid), "n_pano_total": len(pan),
                                "observations": rows, "novel": nov}
    res["render_views"] = renders
    json.dump(res, open(O / "prep.json", "w"), indent=1); vol.commit()
    return {k: {"obs": v["n_observers_total"], "video": v["n_video_total"], "pano": v["n_pano_total"], "kept": len(v["observations"])} for k, v in res["targets"].items()}


@app.function(image=image, cpu=8.0, memory=32768, timeout=3600, volumes={"/vol": vol})
def ortho_renders_v3(run: str, model: str) -> dict:
    """Sample each rendered face (renders/<run>_<model>/<view>.png) on the target ortho grids exactly like the GT.
    Renders of other models were made at the SAME physical camera re-expressed in their frame, so the AX6c-frame camera
    projects the AX6c-frame grid to the right pixels (a similarity preserves projection)."""
    import json, numpy as np, cv2
    from pathlib import Path
    vol.reload(); O = Path(f"{OUT}/{run}"); prepj = json.load(open(O / "prep.json")); views = {v["name"]: v for v in prepj["render_views"]}
    out = {}
    for name, T in prepj["targets"].items():
        nt, texel = T["nt"], T["texel_mm"] / 1000
        X, u, v = (np.array(T[k]) for k in ("X", "u", "v"))
        a = (np.arange(nt) - nt / 2 + 0.5) * texel; A_, B_ = np.meshgrid(a, a)
        G = X + A_.reshape(-1, 1) * u + B_.reshape(-1, 1) * v
        for vn in [o["render_view"] for o in T["observations"]] + [n["name"] for n in T["novel"]]:
            p = Path(f"{RENDERS}/{run}_{model}/{vn}.png")
            if not p.exists(): out[vn] = "missing"; continue
            img = cv2.imread(str(p))[..., ::-1].astype(np.float32) / 255.0; vw = views[vn]
            Rw, tw = np.array(vw["R"]), np.array(vw["t"])            # AX6c-frame camera (same camera re-expressed per model)
            q = G @ Rw.T + tw
            gp = np.stack([vw["f"] * q[:, 0] / q[:, 2] + vw["W"] / 2, vw["f"] * q[:, 1] / q[:, 2] + vw["H"] / 2], 1)
            ortho = cv2.remap(img, (gp[:, 0] - 0.5).reshape(nt, nt).astype(np.float32), (gp[:, 1] - 0.5).reshape(nt, nt).astype(np.float32),
                              cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
            (O / name / model).mkdir(parents=True, exist_ok=True); np.save(O / name / model / f"{vn}_ortho.npy", ortho)
            # the render crop matching the GT face crop, for the lineage sheet
            if vn.split("_")[-1].startswith("o"):
                ob = next(o for o in T["observations"] if o["render_view"] == vn); u0, v0, u1, v1 = ob["face_bbox"]
                cv2.imwrite(str(O / name / model / f"{vn}_face_crop.png"), (img[v0:v1, u0:u1, ::-1] * 255).astype(np.uint8))
            out[vn] = "ok"
    vol.commit()
    return {"ok": sum(1 for x in out.values() if x == "ok"), "missing": [k for k, x in out.items() if x != "ok"]}


@app.function(image=image, cpu=16.0, memory=65536, timeout=3600, volumes={"/vol": vol})
def native_orthos_v3(run: str, cond: str = "AX6c", up: int = 4) -> dict:
    """Control for the projection stage: each observation's ortho texture sampled from the ORIGINAL decoded source at
    native resolution (supersampled `up`x per texel then box-averaged, i.e. band-limited, no face warp), next to the
    exact training-face ortho written by prep. Same grid, same plane."""
    import json, numpy as np, cv2, pycolmap
    from pathlib import Path
    from forensic_geom import ortho_from_source
    vol.reload(); O = Path(f"{OUT}/{run}"); P = json.load(open(O / "prep.json")); WS = f"{COND}/{cond}/ws"
    rec = pycolmap.Reconstruction(f"{WS}/sparse/0"); n_ok = 0
    for name, T in P["targets"].items():
        nt, tex = T["nt"], T["texel_mm"] / 1000; X, u, v = (np.array(T[k]) for k in ("X", "u", "v"))
        a = (np.arange(nt * up) - nt * up / 2 + 0.5) * tex / up; A_, B_ = np.meshgrid(a, a)
        G = X + A_.reshape(-1, 1) * u + B_.reshape(-1, 1) * v
        for o in T["observations"]:
            im = rec.images[o["image_id"]]; cam = rec.cameras[im.camera_id]
            img = cv2.imread(f"{WS}/images/{o['image']}", cv2.IMREAD_COLOR)[..., ::-1].astype(np.float32) / 255.0
            t = ortho_from_source(im, cam, img, G, (nt * up, nt * up))
            np.save(O / name / f"{o['tag']}_ortho_native.npy", cv2.resize(t, (nt, nt), interpolation=cv2.INTER_AREA).astype(np.float32)); n_ok += 1
    vol.commit()
    return {"native_orthos": n_ok}
