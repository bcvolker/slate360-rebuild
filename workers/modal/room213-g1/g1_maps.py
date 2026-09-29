"""R213-G1 normal maps (2026-09-28). Separate Modal app; reads the golden bench dataset READ-ONLY and writes only under
/vol/room213/2026-09-28/g1/. Pipeline = the validated diagnostic route: MoGe-2 vitb-normal on 9 overlapping pinhole
faces (front + 8 at 60 deg tilt, 80 deg FOV, 1024^2) sampled through the golden OPENCV_FISHEYE intrinsics, normals
rotated to the camera frame, cross-faded, renormalised, oriented toward the camera, written as 1920^2 8-bit RGB PNG
(byte/127.5-1, OpenCV camera frame). Black = no guidance: dataset mask 0 (operator/border), sensor radius > 1800 px,
face disagreement > 10 deg, luminance >= 250 dilated (>= 5 native px), invalid MoGe. No depth maps are written; the
per-image depth is used ONLY for the gate's room-shell classification and the adjacent-view check.
Usage: python -m modal run g1_maps.py::maps_all
"""
import modal

app = modal.App("slate360-room213-g1-maps")
vol = modal.Volume.from_name("slate360-recon-experiments")
image = (modal.Image.from_registry("nvidia/cuda:12.4.1-runtime-ubuntu22.04", add_python="3.11")
         .apt_install("git", "libgl1", "libglib2.0-0")
         .pip_install("torch==2.6.0", "torchvision==0.21.0", "numpy<2.1", "opencv-python-headless", "scipy", "pycolmap==4.2.0",
                      "huggingface_hub", "git+https://github.com/microsoft/MoGe.git")
         .add_local_file("geom.json", "/root/geom.json"))
BENCH = "/vol/room213/2026-09-21/spirula_bench_v1"
DS = f"{BENCH}/dataset"
FCS = "/vol/room213/2026-09-21/fullcircle/data/room213/sparse/0"
G1 = "/vol/room213/2026-09-28/g1"
FACE = 1024; FOV = 80.0; TILT = 60.0; RING = 8; GRID = 1920; SMALL = 480
R_MAX = 1800.0; FACE_DIS = 10.0; LUM = 250; PLANES = {"floor": -1.866, "ceiling": 0.638}
WALLS = {"u_lo": ("a1", -5.2), "u_hi": ("a1", 6.12), "v_lo": ("a2", -3.9), "v_hi": ("a2", 4.42)}


@app.function(image=image, gpu="L4", volumes={"/vol": vol}, timeout=3600, memory=32768, max_containers=8)
def maps_frame(names: list) -> list:
    import json, math, numpy as np, cv2, torch, pycolmap
    from pathlib import Path
    from scipy.spatial.transform import Rotation as Rot
    from moge.model.v2 import MoGeModel
    model = MoGeModel.from_pretrained("Ruicheng/moge-2-vitb-normal").cuda().eval()
    rec = pycolmap.Reconstruction(FCS); byname = {im.name: im for im in rec.images.values()}
    man = {m["new"]: m["src"] for m in json.load(open(f"{BENCH}/dataset_manifest.json"))["images"]}
    g = json.load(open("/root/geom.json")); c0, up, a1, a2 = (np.array(g[k]) for k in ("c0", "up", "a1", "a2")); ax = {"a1": a1, "a2": a2}
    rots = [np.eye(3)]
    for k in range(RING):
        az = 2 * math.pi * k / RING; axis = np.array([math.cos(az), math.sin(az), 0.0]); ta = np.cross([0, 0, 1.0], axis)
        rots.append(Rot.from_rotvec(math.radians(TILT) * ta / np.linalg.norm(ta)).as_matrix().T)
    ff = FACE / 2 / math.tan(math.radians(FOV / 2))
    yy, xx = np.mgrid[0:FACE, 0:FACE].astype(np.float64)
    dface = np.stack([(xx + 0.5 - FACE / 2) / ff, (yy + 0.5 - FACE / 2) / ff, np.ones_like(xx)], -1).reshape(-1, 3)
    gy, gx = np.mgrid[0:GRID, 0:GRID].astype(np.float64); sc = 3840 / GRID
    pix = np.stack([(gx + 0.5) * sc - 0.5, (gy + 0.5) * sc - 0.5], -1).reshape(-1, 2); rr = np.hypot(pix[:, 0] - 1920, pix[:, 1] - 1920)
    out = []
    for name in names:
        src = man[name]; im = byname[src]; cam = rec.cameras[im.camera_id]
        bgr = cv2.imread(f"{DS}/images/{name}"); rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        dsmask = cv2.imread(f"{DS}/masks/{name}", 0) > 127
        dc = np.asarray(cam.cam_from_img(pix)); dc = np.concatenate([dc, np.ones((len(dc), 1))], 1); dcn = dc / np.linalg.norm(dc, axis=1, keepdims=True)
        W = np.zeros(len(dcn)); Nsum = np.zeros((len(dcn), 3)); Rsum = np.zeros(len(dcn)); Msum = np.zeros(len(dcn)); per = []
        for R in rots:
            dcam = dface @ R; ok = dcam[:, 2] > 0.05
            srcp = np.full((len(dcam), 2), -1.0); srcp[ok] = np.asarray(cam.img_from_cam(dcam[ok]))
            mx = srcp[:, 0].reshape(FACE, FACE).astype(np.float32); my = srcp[:, 1].reshape(FACE, FACE).astype(np.float32)
            face = cv2.remap(rgb, mx, my, cv2.INTER_LINEAR, borderValue=(128, 128, 128))
            with torch.no_grad():
                o = model.infer(torch.from_numpy(face).float().div(255).permute(2, 0, 1).cuda(), fov_x=FOV)
            z = o["depth"].cpu().numpy(); n = o["normal"].cpu().numpy(); mm = (o["mask"].cpu().numpy() > 0.5) & np.isfinite(z)
            df = dcn @ R.T; okf = df[:, 2] > 0.05; iz = 1 / np.maximum(df[:, 2], 1e-6)
            u = np.where(okf, df[:, 0] * iz * ff + FACE / 2 - 0.5, -1); v = np.where(okf, df[:, 1] * iz * ff + FACE / 2 - 0.5, -1)
            inb = okf & (u > 1) & (v > 1) & (u < FACE - 2) & (v < FACE - 2)
            U = u.reshape(GRID, GRID).astype(np.float32); V = v.reshape(GRID, GRID).astype(np.float32)
            zi = cv2.remap(np.where(mm, z, np.nan).astype(np.float32), U, V, cv2.INTER_NEAREST).reshape(-1)
            mi = cv2.remap(mm.astype(np.float32), U, V, cv2.INTER_NEAREST).reshape(-1)
            ni = np.stack([cv2.remap(n[..., c].astype(np.float32), U, V, cv2.INTER_LINEAR).reshape(-1) for c in range(3)], -1) @ R
            rng_ = zi * np.sqrt((df[:, 0] * iz) ** 2 + (df[:, 1] * iz) ** 2 + 1)
            w = np.clip(np.minimum.reduce([u, v, FACE - 1 - u, FACE - 1 - v]) / (0.12 * FACE), 0, 1) * inb
            per.append((w, ni, rng_))
            W += w; Nsum += w[:, None] * ni; Msum += w * mi
        # face depth-scale alignment (only used for the gate's depth, never written)
        K = len(per); rows = []; rhs = []
        for a in range(K):
            for b in range(a + 1, K):
                ov = (per[a][0] > 0) & (per[b][0] > 0) & np.isfinite(per[a][2]) & np.isfinite(per[b][2])
                if ov.sum() > 2000: rows.append((a, b)); rhs.append(float(np.median(np.log(per[a][2][ov]) - np.log(per[b][2][ov]))))
        A = np.zeros((len(rows) + 1, K)); y = np.zeros(len(rows) + 1)
        for i, (a, b) in enumerate(rows): A[i, a] = 1; A[i, b] = -1; y[i] = -rhs[i]
        A[-1, 0] = 1; fs = np.exp(np.linalg.lstsq(A, y, rcond=None)[0])
        Wr = np.zeros(len(dcn))
        for (w, ni, r_), f in zip(per, fs):
            okr = (w > 0) & np.isfinite(r_); Rsum[okr] += w[okr] * r_[okr] * f; Wr[okr] += w[okr]
        npred = Nsum / np.maximum(np.linalg.norm(Nsum, axis=1, keepdims=True), 1e-9)
        npred[(npred * dcn).sum(1) > 0] *= -1
        dis = np.zeros(len(dcn))
        for w, ni, _ in per:
            s = w > 0.05; nn = ni[s] * np.where(((ni[s] * dcn[s]).sum(1) > 0), -1, 1)[:, None]
            dis[s] = np.maximum(dis[s], np.degrees(np.arccos(np.clip((nn * npred[s]).sum(1), -1, 1))))
        lum = (0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]) >= LUM
        lum2 = cv2.dilate(lum.reshape(GRID, 2, GRID, 2).max((1, 3)).astype(np.uint8), np.ones((7, 7), np.uint8)).reshape(-1) > 0
        m2 = dsmask.reshape(GRID, 2, GRID, 2).min((1, 3)).reshape(-1)
        why = {"dsmask": ~m2, "radius": rr > R_MAX, "face_dis": dis > FACE_DIS, "highlight": lum2, "moge_invalid": (W <= 0) | (Msum / np.maximum(W, 1e-9) < 0.5)}
        valid = np.ones(len(dcn), bool)
        for v_ in why.values(): valid &= ~v_
        circle = rr <= 1880
        # ---- gate A: room-shell raycast (floor/ceiling/walls), predicted range within 10 % of the analytic shell range
        cfw = im.cam_from_world(); Rw = np.asarray(cfw.rotation.matrix()); C = -Rw.T @ np.asarray(cfw.translation)
        dw = dcn @ Rw; rpred = np.where(Wr > 0, Rsum / np.maximum(Wr, 1e-9), np.nan)
        obs = [(np.linalg.norm(rec.points3D[p.point3D_id].xyz - C), int(p.xy[1] / sc) * GRID + int(p.xy[0] / sc)) for p in im.points2D if p.has_point3D()]
        pr = np.array([rpred[k] for _, k in obs]); tr = np.array([d for d, _ in obs]); okp = np.isfinite(pr) & (pr > 0)
        scale = float(np.median(tr[okp] / pr[okp])) if okp.sum() > 20 else float("nan"); rs = rpred * scale
        hC = (C - c0) @ up; best_t = np.full(len(dw), np.inf); cls = np.full(len(dw), -1); nrm = np.zeros((len(dw), 3))
        surfs = [("floor", up, PLANES["floor"] - hC), ("ceiling", up, PLANES["ceiling"] - hC)] + \
                [(k, ax[a], val - (C - c0) @ ax[a]) for k, (a, val) in WALLS.items()]
        for si, (nm, nv, off) in enumerate(surfs):
            den = dw @ nv; t = np.where(np.abs(den) > 1e-4, off / den, np.inf); t[t <= 0] = np.inf
            b = t < best_t; best_t[b] = t[b]; cls[b] = si; nrm[b] = nv
        nw = npred @ Rw; shell_ok = valid & np.isfinite(best_t) & (np.abs(rs - best_t) < 0.10 * best_t)
        ang = np.degrees(np.arccos(np.clip(np.abs((nw * nrm).sum(1)), 0, 1)))
        gateA = {}
        for grp, ids in (("floor", [0]), ("ceiling", [1]), ("walls", [2, 3, 4, 5])):
            s = shell_ok & np.isin(cls, ids)
            if s.sum() >= 3000: gateA[grp] = {"px": int(s.sum()), "median_deg": float(np.median(ang[s]))}
        tag = name.replace("/", "__")
        nm8 = np.where(valid[:, None], np.clip(np.round((npred + 1) * 127.5), 1, 255), 0).astype(np.uint8).reshape(GRID, GRID, 3)
        Path(f"{G1}/maps_raw").mkdir(parents=True, exist_ok=True); Path(f"{G1}/aux").mkdir(parents=True, exist_ok=True)
        cv2.imwrite(f"{G1}/maps_raw/{tag}", cv2.cvtColor(nm8, cv2.COLOR_RGB2BGR))          # file channels = R,G,B = x,y,z
        k4 = np.s_[::4]
        np.savez_compressed(f"{G1}/aux/{tag}.npz", range=rs.reshape(GRID, GRID)[k4, k4].astype(np.float32),
                            nworld=nw.reshape(GRID, GRID, 3)[k4, k4].astype(np.float16), valid=valid.reshape(GRID, GRID)[k4, k4],
                            preview=cv2.resize(bgr, (SMALL, SMALL), interpolation=cv2.INTER_AREA))
        rec_ = {"name": name, "src": src, "scale": scale, "gateA": gateA,
                    "valid_frac_of_circle": float(valid.sum() / circle.sum()),
                    "masked_frac_of_circle": {k: float((v_ & circle).sum() / circle.sum()) for k, v_ in why.items()},
                    "face_dis_median_deg": float(np.median(dis[W > 0]))}
        Path(f"{G1}/frames").mkdir(parents=True, exist_ok=True)
        json.dump(rec_, open(f"{G1}/frames/{tag}.json", "w")); out.append(rec_); vol.commit()
    vol.commit()
    return out


@app.function(image=image, volumes={"/vol": vol}, timeout=7200, cpu=4.0, memory=16384)
def maps_all() -> dict:
    import json
    man = json.load(open(f"{BENCH}/dataset_manifest.json"))["images"]
    from pathlib import Path
    vol.reload()
    names = [m["new"] for m in man if m["role"] in ("train", "holdout_eval")]
    todo = [n for n in names if not Path(f"{G1}/frames/{n.replace('/', '__')}.json").is_file()]
    chunks = [todo[i:i + 8] for i in range(0, len(todo), 8)]
    list(maps_frame.map(chunks)) if chunks else None
    vol.reload()
    res = [json.load(open(f"{G1}/frames/{n.replace('/', '__')}.json")) for n in names]
    json.dump(res, open(f"{G1}/maps_frames.json", "w"), indent=1); vol.commit()
    return {"frames": len(res), "computed_now": len(todo)}
    chunks = [names[i:i + 8] for i in range(0, len(names), 8)]
    res = [r for part in maps_frame.map(chunks) for r in part]
    json.dump(res, open(f"{G1}/maps_frames.json", "w"), indent=1); vol.commit()
    return {"frames": len(res)}


@app.local_entrypoint()
def smoke():
    import json
    print(json.dumps(maps_frame.remote(["camera1/frame_00036_train.png", "camera2/frame_00104_train.png"]), indent=1))
